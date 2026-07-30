import hashlib
from urllib.parse import quote_plus

from django.core.exceptions import ValidationError
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models
from django.utils.translation import gettext_lazy as _


class DespojoNewsFeed(models.Model):
    """
    A source the despojo news job reads.

    Kept in the database rather than in settings so the searches can be tuned
    from the admin: which terms are worth watching is an editorial question that
    changes with the beat, and it should not need a deploy.
    """

    class Kind(models.TextChoices):
        SEARCH = "search", _("Búsqueda en Google Noticias")
        DIRECT = "direct", _("Feed RSS de un medio")

    class Status(models.TextChoices):
        OK = "ok", _("Correcto")
        FAILED = "failed", _("Falló")

    slug = models.SlugField(max_length=60, unique=True)
    kind = models.CharField(max_length=20, choices=Kind.choices, default=Kind.SEARCH)

    # What to search for, when kind is SEARCH. This is the knob: one row per
    # phrase you want watched.
    query = models.CharField(max_length=200, blank=True)

    # Where to read, when kind is DIRECT.
    url = models.URLField(max_length=500, blank=True)
    # Byline for a direct feed, which usually does not name its own outlet.
    name = models.CharField(max_length=120, blank=True)

    # True when the source is already limited to Mexico City, so an item does
    # not have to name the city again to qualify. A national outlet's section
    # feed is not scoped; a search containing "CDMX" is.
    scoped = models.BooleanField(
        default=True,
        help_text='La fuente ya está acotada a la CDMX. Si no, la nota deberá '
                  'mencionar la ciudad o una alcaldía para ser considerada.',
    )
    is_active = models.BooleanField(default=True)
    notes = models.CharField(max_length=200, blank=True)

    # Denormalised from the last run so the list view answers "is this source
    # still working?" without opening the log.
    last_run_at = models.DateTimeField(null=True, blank=True)
    last_status = models.CharField(max_length=20, choices=Status.choices, blank=True)
    last_message = models.CharField(max_length=300, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'despojo_news_feeds'
        verbose_name = 'Fuente de noticias (despojo)'
        verbose_name_plural = 'Fuentes de noticias (despojo)'
        ordering = ['-is_active', 'slug']

    def __str__(self):
        return f"{self.slug} ({self.query or self.url})"

    @property
    def feed_url(self):
        """The URL to actually request."""
        if self.kind == self.Kind.SEARCH:
            return (
                'https://news.google.com/rss/search'
                f'?q={quote_plus(self.query)}&hl=es-419&gl=MX&ceid=MX:es-419'
            )
        return self.url

    def clean(self):
        if self.kind == self.Kind.SEARCH and not self.query.strip():
            raise ValidationError({'query': 'Una búsqueda necesita términos.'})
        if self.kind == self.Kind.DIRECT and not self.url.strip():
            raise ValidationError({'url': 'Un feed de medio necesita su URL.'})


class DespojoNewsSetting(models.Model):
    """
    How the approved notes are shown on the map, edited from the panel.

    One row, always. This is an editorial dial rather than a deployment
    concern — how much of the rail is worth reading depends on how much
    coverage there is that week — so it lives next to the review queue that
    fills it and not in a constant somebody has to redeploy to change.
    """

    # The rail is an aside on a map, not a section front: one note is a valid
    # choice on a quiet week, and past a couple of dozen it stops being a rail.
    RAIL_LIMIT_MIN = 1
    RAIL_LIMIT_MAX = 20
    RAIL_LIMIT_DEFAULT = 4

    rail_limit = models.PositiveSmallIntegerField(
        default=RAIL_LIMIT_DEFAULT,
        validators=[MinValueValidator(RAIL_LIMIT_MIN), MaxValueValidator(RAIL_LIMIT_MAX)],
        verbose_name='Notas visibles en el mapa',
        help_text='Cuántas notas publicadas muestra el riel del mapa, de la más '
                  'reciente hacia atrás.',
    )

    updated_at = models.DateTimeField(auto_now=True)
    updated_by = models.CharField(max_length=150, blank=True)

    class Meta:
        db_table = 'despojo_news_settings'
        verbose_name = 'Ajustes del riel de noticias (despojo)'
        verbose_name_plural = 'Ajustes del riel de noticias (despojo)'

    def __str__(self):
        return f"Riel de noticias: {self.rail_limit} nota(s)"

    def save(self, *args, **kwargs):
        # Pinning the key keeps the singleton a singleton even if something
        # calls create() directly: there is one rail, so there is one row.
        self.pk = 1
        super().save(*args, **kwargs)

    @classmethod
    def load(cls):
        """The settings row, created with its defaults the first time it is read."""
        obj, _created = cls.objects.get_or_create(pk=1)
        return obj


class DespojoNewsKeyword(models.Model):
    """
    A term the harvester matches against a headline.

    Three roles, and all three are needed: the topic terms decide what counts as
    a story about despojo, the exclusions cut the other senses the word carries
    in Spanish, and the city terms keep an unscoped national feed on the map's
    subject. Matching folds accents and case, so `invasión` and `INVASION` are
    the same term — write them however reads best.
    """

    class Kind(models.TextChoices):
        TOPIC = "topic", _("Tema — la nota debe mencionar alguno")
        EXCLUDE = "exclude", _("Descarte — si aparece, se ignora la nota")
        CITY = "city", _("Ciudad — exigido a las fuentes sin acotar")

    term = models.CharField(max_length=80)
    kind = models.CharField(max_length=20, choices=Kind.choices, default=Kind.TOPIC)
    is_active = models.BooleanField(default=True)
    notes = models.CharField(max_length=200, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'despojo_news_keywords'
        verbose_name = 'Palabra clave (despojo)'
        verbose_name_plural = 'Palabras clave (despojo)'
        ordering = ['kind', 'term']
        constraints = [
            models.UniqueConstraint(fields=['term', 'kind'], name='despojo_keyword_unique'),
        ]

    def __str__(self):
        return f"{self.get_kind_display()}: {self.term}"


class DespojoNewsRun(models.Model):
    """
    One execution of the harvester, kept so a run can be read after the fact.

    There is no scheduler behind this: runs are started by hand from the admin
    or from the command line, and this table is the only record that a run
    happened, what it looked at and what it decided.
    """

    class Status(models.TextChoices):
        RUNNING = "running", _("En curso")
        OK = "ok", _("Terminada")
        PARTIAL = "partial", _("Terminada con fuentes caídas")
        FAILED = "failed", _("Falló")

    class Trigger(models.TextChoices):
        DASHBOARD = "dashboard", _("Manual desde el panel")
        ADMIN = "admin", _("Manual desde el admin")
        COMMAND = "command", _("Línea de comandos")

    status = models.CharField(max_length=20, choices=Status.choices, default=Status.RUNNING)
    trigger = models.CharField(max_length=20, choices=Trigger.choices, default=Trigger.ADMIN)
    actor = models.CharField(max_length=150, blank=True)
    days = models.IntegerField(default=7)

    feeds_read = models.IntegerField(default=0)
    feeds_failed = models.IntegerField(default=0)
    entries_read = models.IntegerField(default=0)
    matched = models.IntegerField(default=0)
    created = models.IntegerField(default=0)
    duplicates = models.IntegerField(default=0)
    undated = models.IntegerField(default=0)
    skipped = models.IntegerField(default=0)

    log = models.TextField(blank=True)

    started_at = models.DateTimeField(auto_now_add=True)
    finished_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'despojo_news_runs'
        verbose_name = 'Ejecución del buscador (despojo)'
        verbose_name_plural = 'Ejecuciones del buscador (despojo)'
        ordering = ['-started_at']
        indexes = [models.Index(fields=['-started_at'])]

    def __str__(self):
        return f"{self.started_at:%Y-%m-%d %H:%M} — {self.get_status_display()}"

    @property
    def duration_seconds(self):
        if not self.finished_at:
            return None
        return (self.finished_at - self.started_at).total_seconds()

    def append(self, line):
        """Add a line to the log without holding the whole run in memory."""
        self.log = f"{self.log}{line}\n" if self.log else f"{line}\n"


class DespojoNewsItem(models.Model):
    """
    A press item about despojo, harvested from RSS by the `despojo_news_fetch`
    job and shown on the proyectos/mapas/despojos-viviendas rail.

    Nothing here reaches the map until somebody approves it. The feeds are
    keyword filters over general news, so they also catch the other senses the
    word carries in Spanish ("despojos mortales", despojo agrario, a football
    headline) — publishing them unread would put noise on a housing map.

    Items are kept after they scroll off the rail rather than deleted: the
    archive is what lets us say when coverage of an alcaldía started, and a
    rejected item stays rejected instead of being re-proposed on every run.
    """

    class ReviewStatus(models.TextChoices):
        PENDING = "pending", _("Por revisar")
        APPROVED = "approved", _("Publicada")
        REJECTED = "rejected", _("Descartada")

    source = models.CharField(max_length=120)
    headline = models.CharField(max_length=400)
    # Generous on purpose. Aggregator links are a base64 blob and run past 950
    # characters in practice; a truncated URL is a dead link, not a short one.
    url = models.URLField(max_length=2000)
    summary = models.TextField(blank=True)
    published_at = models.DateTimeField(null=True, blank=True)

    # Uniqueness lives on a hash, not on `url`: aggregator links run to several
    # hundred characters and a unique btree index over a column that wide is a
    # row-size gamble in Postgres. Built from the feed's guid when it has one.
    dedupe_key = models.CharField(max_length=40, unique=True, editable=False)

    # Which entry of DESPOJO_NEWS_FEEDS produced this, so a source that starts
    # returning junk can be found and dropped.
    feed_slug = models.CharField(max_length=60, blank=True)

    review_status = models.CharField(
        max_length=20, choices=ReviewStatus.choices, default=ReviewStatus.PENDING
    )
    internal_notes = models.TextField(blank=True)

    fetched_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'despojo_news_items'
        verbose_name = 'Nota de prensa (despojo)'
        verbose_name_plural = 'Notas de prensa (despojo)'
        ordering = ['-published_at', '-fetched_at']
        indexes = [
            models.Index(fields=['review_status', '-published_at']),
            models.Index(fields=['-published_at']),
        ]

    def __str__(self):
        when = self.published_at.strftime('%Y-%m-%d') if self.published_at else 'sin fecha'
        return f"{self.source} — {self.headline[:60]} ({when})"

    @staticmethod
    def build_dedupe_key(guid_or_url):
        """
        The identity of an item across runs.

        A feed's guid is preferred over its link — several outlets rewrite the
        URL when a note is updated, and matching on the link alone would file
        the same story twice.
        """
        return hashlib.sha1(guid_or_url.strip().encode('utf-8')).hexdigest()
