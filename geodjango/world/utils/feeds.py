"""
A small RSS 2.0 / Atom reader.

Written against the standard library rather than feedparser: the only consumer
is the despojo news job, the shapes it has to survive are the two above, and
adding a dependency means rebuilding the image for a hundred lines of parsing.

Everything here is defensive. These are third-party feeds on somebody else's
CMS — a missing date, an entity-escaped title or a truncated document is
Tuesday, not an exception worth raising.
"""

import html
import re
import xml.etree.ElementTree as ET
from datetime import datetime, timezone as dt_timezone
from email.utils import parsedate_to_datetime

import requests

# Feeds are read by a scheduled job with nobody watching, so a slow origin has
# to fail rather than hold the worker.
REQUEST_TIMEOUT = 20
USER_AGENT = 'DistritosMX/1.0 (+https://distritos.mx; news archive bot)'

_TAG_RE = re.compile(r'<[^>]+>')
_WS_RE = re.compile(r'\s+')


def _local(tag):
    """Element name without its namespace: `{...}entry` -> `entry`."""
    if not isinstance(tag, str):
        return ''
    return tag.rsplit('}', 1)[-1].lower()


def _text(node):
    """Flattened text of an element, entities resolved and markup removed."""
    if node is None:
        return ''
    raw = ''.join(node.itertext())
    # Two unescape passes: several CMSs double-escape their descriptions, so a
    # single pass leaves `&amp;oacute;` sitting in the headline.
    plain = _TAG_RE.sub(' ', html.unescape(html.unescape(raw)))
    return _WS_RE.sub(' ', plain).strip()


def _first_child(node, names):
    for child in node:
        if _local(child.tag) in names:
            return child
    return None


def _link_of(entry):
    """
    The article URL.

    RSS keeps it as the text of <link>; Atom keeps it in the href of the
    alternate <link>, of which there may be several (self, replies, enclosure).
    """
    fallback = ''
    for child in entry:
        if _local(child.tag) != 'link':
            continue
        href = (child.get('href') or '').strip()
        if href:
            rel = (child.get('rel') or 'alternate').lower()
            if rel == 'alternate':
                return href
            fallback = fallback or href
        elif (child.text or '').strip():
            return child.text.strip()
    return fallback


def parse_datetime(value):
    """
    A feed date as an aware datetime, or None when it cannot be read.

    Covers RFC 822 (`Tue, 28 Jul 2026 09:14:00 -0600`, what RSS uses) and
    ISO 8601 (what Atom and dc:date use). A date that parses to neither is
    reported as missing rather than guessed at — the job filters on a one-week
    window, and a wrong date silently widens it.
    """
    if not value:
        return None
    value = value.strip()

    parsed = None
    try:
        parsed = parsedate_to_datetime(value)
    except (TypeError, ValueError, IndexError):
        parsed = None

    if parsed is None:
        try:
            parsed = datetime.fromisoformat(value.replace('Z', '+00:00'))
        except ValueError:
            return None

    if parsed.tzinfo is None:
        # A feed that omits the offset is, in practice, publishing UTC.
        parsed = parsed.replace(tzinfo=dt_timezone.utc)
    return parsed


def parse_feed(document):
    """
    Entries of an RSS or Atom document, as plain dicts.

    Returns `[]` for anything that is not parseable XML: a feed that answers
    with an error page should cost this run one source, not the whole job.
    """
    if isinstance(document, str):
        document = document.encode('utf-8')
    try:
        root = ET.fromstring(document)
    except ET.ParseError:
        return []

    entries = []
    for node in root.iter():
        if _local(node.tag) not in ('item', 'entry'):
            continue

        title = _text(_first_child(node, {'title'}))
        link = _link_of(node)
        if not title or not link:
            continue

        guid_node = _first_child(node, {'guid', 'id'})
        date_node = _first_child(node, {'pubdate', 'published', 'updated', 'date'})
        summary_node = _first_child(node, {'description', 'summary', 'content', 'encoded'})

        # Google News names the originating outlet in <source>; native feeds
        # generally do not carry one, and the caller falls back to its config.
        # The url attribute is kept too — for a good half of the outlets the
        # element's text is the bare domain, and the caller can do better with it.
        source_node = _first_child(node, {'source'})

        entries.append({
            'title': title,
            'link': link,
            'guid': _text(guid_node) or link,
            'published': parse_datetime(_text(date_node)),
            'summary': _text(summary_node),
            'source': _text(source_node),
            'source_url': (source_node.get('url') or '').strip() if source_node is not None else '',
        })
    return entries


def fetch_feed(url, timeout=REQUEST_TIMEOUT):
    """
    Download and parse one feed.

    Returns `(entries, error)`; exactly one of the two is meaningful. Network
    failure is an expected outcome here, not an exception to propagate.
    """
    try:
        response = requests.get(
            url,
            timeout=timeout,
            headers={
                'User-Agent': USER_AGENT,
                'Accept': 'application/rss+xml, application/atom+xml, application/xml;q=0.9, */*;q=0.8',
            },
        )
        response.raise_for_status()
    except requests.RequestException as exc:
        return [], str(exc)

    entries = parse_feed(response.content)
    if not entries:
        return [], 'la respuesta no contiene entradas legibles'
    return entries, None
