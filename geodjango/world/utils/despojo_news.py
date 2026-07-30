"""
The despojo news harvester.

Reads the feeds configured in the admin, keeps what looks like coverage of
despojo in Mexico City, and files it for review. Nothing here decides what gets
published — every item lands as pending and waits for a person.

Runs are started by hand, from the admin or from `manage.py despojo_news_fetch`.
There is deliberately no scheduler: the volume is a few dozen notes a week and
somebody has to read them anyway, so a run that nobody is watching would only
fill the queue between reviews.
"""

import traceback
import unicodedata
from datetime import timedelta
from urllib.parse import urlparse

from django.db import close_old_connections
from django.utils import timezone

from world.models.despojo_news import (
    DespojoNewsFeed,
    DespojoNewsItem,
    DespojoNewsKeyword,
    DespojoNewsRun,
)
from world.utils.feeds import fetch_feed

# Google News names about half the outlets properly ("El Sol de México") and
# gives the bare domain for the rest ("jornada.com.mx"). The rail prints this
# name, so the ones that recur on this beat are spelled out here. Anything not
# listed keeps its domain, which is at least true — and the field is editable
# in the admin for the day an outlet shows up once and never again.
OUTLET_NAMES = {
    'jornada.com.mx': 'La Jornada',
    'cronica.com.mx': 'La Crónica de Hoy',
    'excelsior.com.mx': 'Excélsior',
    'eluniversal.com.mx': 'El Universal',
    'publimetro.com.mx': 'Publimetro',
    'milenio.com': 'Milenio',
    'elsoldemexico.com.mx': 'El Sol de México',
    'lasillarota.com': 'La Silla Rota',
    'proceso.com.mx': 'Proceso',
    'aristeguinoticias.com': 'Aristegui Noticias',
    'reporteindigo.com': 'Reporte Índigo',
    'heraldodemexico.com.mx': 'El Heraldo de México',
    'razon.com.mx': 'La Razón',
    'eleconomista.com.mx': 'El Economista',
    'infobae.com': 'Infobae',
    'adn40.mx': 'ADN40',
    'sdpnoticias.com': 'SDPnoticias',
    'enfoquenoticias.com.mx': 'Enfoque Noticias',
    'elindependiente.mx': 'El Independiente',
    'diariodemexico.com': 'Diario de México',
    'abcnoticias.mx': 'ABC Noticias',
    'expansion.mx': 'Expansión',
    'wradio.com.mx': 'W Radio',
    'nmas.com.mx': 'N+',
}

URL_MAX_LENGTH = DespojoNewsItem._meta.get_field('url').max_length


def _fold(value):
    """Lowercase and strip accents and punctuation, for term matching."""
    if not value:
        return ''
    stripped = unicodedata.normalize('NFKD', str(value))
    stripped = ''.join(c for c in stripped if not unicodedata.combining(c))
    stripped = ''.join(c if c.isalnum() else ' ' for c in stripped.lower())
    return ' '.join(stripped.split())


def _domain_of(url):
    """Bare hostname of a URL, without the `www.` prefix."""
    host = urlparse(url).netloc.lower().split(':')[0]
    return host[4:] if host.startswith('www.') else host


def _outlet_name(entry, feed):
    """
    What to print as the byline on the rail.

    Prefers a name we recognise over whatever the aggregator supplies, because
    the aggregator is inconsistent about it within a single response.
    """
    domain = _domain_of(entry.get('source_url') or entry['link'])
    if domain in OUTLET_NAMES:
        return OUTLET_NAMES[domain]

    reported = (entry.get('source') or '').strip()
    if reported:
        # A <source> that is itself a domain gets one more look-up: the element
        # text and the url attribute do not always agree.
        return OUTLET_NAMES.get(_domain_of(f'//{reported}'), reported)

    return feed.name or domain


def _split_outlet(title, source):
    """
    Google News appends ` - Outlet` to every headline. Strip it when we already
    know the outlet from <source>, so the rail shows the headline as published.
    """
    if source and title.endswith(f' - {source}'):
        return title[: -(len(source) + 3)].strip()
    return title


def _useful_summary(summary, headline):
    """
    The entry's own words, or nothing.

    Google News fills <description> with a link whose text is the headline, so
    keeping it verbatim would show the reviewer the same sentence twice.
    """
    folded = _fold(summary)
    if not folded or folded.startswith(_fold(headline)):
        return ''
    return summary


class Keywords:
    """The active terms, folded once per run instead of once per entry."""

    def __init__(self):
        rows = DespojoNewsKeyword.objects.filter(is_active=True).values_list('kind', 'term')
        buckets = {kind: [] for kind, _ in DespojoNewsKeyword.Kind.choices}
        for kind, term in rows:
            folded = _fold(term)
            if folded:
                buckets.setdefault(kind, []).append(folded)
        self.topic = buckets[DespojoNewsKeyword.Kind.TOPIC]
        self.exclude = buckets[DespojoNewsKeyword.Kind.EXCLUDE]
        self.city = buckets[DespojoNewsKeyword.Kind.CITY]

    def matches(self, headline, summary, scoped):
        """
        Whether an entry belongs in the review queue at all.

        A first pass, not an editorial judgement: it only has to cut the volume
        down to something a person can read through, and it errs towards keeping
        an item — a false positive costs one click to reject, a false negative
        never gets seen.
        """
        text = _fold(f'{headline} {summary}')
        if any(term in text for term in self.exclude):
            return False
        if self.topic and not any(term in text for term in self.topic):
            return False
        if scoped or not self.city:
            return True
        return any(term in text for term in self.city)


def harvest(days=7, feed_slugs=None, dry_run=False, approve=False,
            run=None, trigger=DespojoNewsRun.Trigger.COMMAND, actor='', writer=None):
    """
    Read every active feed and file what matches.

    Returns the DespojoNewsRun that recorded the work, or None for a dry run —
    a rehearsal is not an execution and should not show up in the log.

    `writer` receives the same lines that go into the run's log, so the command
    can stream them to a terminal. `run` lets a caller create the row first and
    hand it over, which is how the admin can redirect to a run that is still in
    progress.
    """
    def say(line):
        if run is not None:
            run.append(line)
        if writer:
            writer(line)

    feeds = DespojoNewsFeed.objects.filter(is_active=True)
    if feed_slugs:
        feeds = feeds.filter(slug__in=feed_slugs)
    feeds = list(feeds)

    if run is None and not dry_run:
        run = DespojoNewsRun.objects.create(trigger=trigger, actor=actor, days=days)
    if run is not None:
        run.days = days

    keywords = Keywords()
    cutoff = timezone.now() - timedelta(days=max(1, days))
    status = DespojoNewsItem.ReviewStatus.APPROVED if approve else DespojoNewsItem.ReviewStatus.PENDING

    say(f"Ventana: notas publicadas desde {timezone.localtime(cutoff):%Y-%m-%d %H:%M}.")
    say(f"Fuentes activas: {len(feeds)}. "
        f"Términos: {len(keywords.topic)} de tema, {len(keywords.exclude)} de descarte, "
        f"{len(keywords.city)} de ciudad.")
    if not feeds:
        say("No hay ninguna fuente activa que leer.")
    if not keywords.topic:
        say("Aviso: no hay términos de tema activos, así que no se filtra por asunto.")

    totals = {'entries': 0, 'matched': 0, 'created': 0, 'duplicates': 0,
              'undated': 0, 'skipped': 0, 'failed': 0}

    for feed in feeds:
        entries, error = fetch_feed(feed.feed_url)
        now = timezone.now()

        if error:
            totals['failed'] += 1
            say(f"  {feed.slug}: NO SE PUDO LEER — {error}")
            DespojoNewsFeed.objects.filter(pk=feed.pk).update(
                last_run_at=now,
                last_status=DespojoNewsFeed.Status.FAILED,
                last_message=error[:300],
            )
            continue

        counts = {'matched': 0, 'created': 0, 'duplicates': 0, 'undated': 0, 'skipped': 0}
        totals['entries'] += len(entries)

        for entry in entries:
            published = entry['published']
            if published is None:
                # Undated items cannot be placed inside the window the job
                # exists to enforce, so they are counted and dropped rather
                # than admitted on a guess.
                counts['undated'] += 1
                continue
            if published < cutoff:
                continue

            outlet = _outlet_name(entry, feed) or feed.slug
            headline = _split_outlet(entry['title'], entry['source'])
            summary = _useful_summary(entry['summary'], headline)

            if not keywords.matches(headline, summary, feed.scoped):
                continue
            counts['matched'] += 1

            if len(entry['link']) > URL_MAX_LENGTH:
                # Storing it would mean cutting it, and half a URL is worse than
                # no entry: the rail would link somewhere that 404s.
                counts['skipped'] += 1
                say(f"    · enlace demasiado largo, omitida: {headline[:70]}")
                continue

            if dry_run:
                say(f"    · [{timezone.localtime(published):%Y-%m-%d}] {outlet}: {headline}")
                continue

            _, created = DespojoNewsItem.objects.get_or_create(
                dedupe_key=DespojoNewsItem.build_dedupe_key(entry['guid']),
                defaults={
                    'source': outlet[:120],
                    'headline': headline[:400],
                    'url': entry['link'],
                    'summary': summary[:2000],
                    'published_at': published,
                    'feed_slug': feed.slug,
                    'review_status': status,
                },
            )
            # An item already in the table has either been reviewed or is
            # waiting to be; either way its stored copy wins over the feed's.
            counts['created' if created else 'duplicates'] += 1

        for key in counts:
            totals[key] += counts[key]

        say(
            f"  {feed.slug}: {len(entries)} entradas, {counts['matched']} sobre despojo, "
            f"{counts['created']} nuevas, {counts['duplicates']} ya registradas"
            + (f", {counts['undated']} sin fecha (omitidas)" if counts['undated'] else '')
            + (f", {counts['skipped']} omitidas por enlace" if counts['skipped'] else '')
        )
        DespojoNewsFeed.objects.filter(pk=feed.pk).update(
            last_run_at=now,
            last_status=DespojoNewsFeed.Status.OK,
            last_message=f"{counts['created']} nuevas de {len(entries)} entradas"[:300],
        )

    say(f"Total: {totals['created']} nota(s) nueva(s) de {totals['entries']} entradas leídas.")

    if run is None:
        return None

    run.feeds_read = len(feeds) - totals['failed']
    run.feeds_failed = totals['failed']
    run.entries_read = totals['entries']
    run.matched = totals['matched']
    run.created = totals['created']
    run.duplicates = totals['duplicates']
    run.undated = totals['undated']
    run.skipped = totals['skipped']
    run.finished_at = timezone.now()
    run.status = (
        DespojoNewsRun.Status.PARTIAL if totals['failed'] and totals['failed'] < len(feeds)
        else DespojoNewsRun.Status.FAILED if totals['failed']
        else DespojoNewsRun.Status.OK
    )
    run.save()
    return run


def harvest_in_background(days, actor, feed_slugs=None,
                          trigger=DespojoNewsRun.Trigger.ADMIN):
    """
    Start a run in a worker thread and hand back its row immediately.

    Reading a dozen feeds takes half a minute of mostly waiting, which is longer
    than a request should hold a worker. The row exists before the thread does,
    so the caller can redirect to a log that fills in as it goes.
    """
    import threading

    run = DespojoNewsRun.objects.create(trigger=trigger, actor=actor, days=days)

    def work():
        try:
            harvest(days=days, feed_slugs=feed_slugs, run=run)
        except Exception:
            # The thread has no request to fail into, so the traceback is only
            # useful if it lands in the run the operator is looking at.
            run.append('ERROR INESPERADO:')
            run.append(traceback.format_exc())
            run.status = DespojoNewsRun.Status.FAILED
            run.finished_at = timezone.now()
            run.save()
        finally:
            close_old_connections()

    threading.Thread(target=work, daemon=True, name=f'despojo-news-{run.pk}').start()
    return run
