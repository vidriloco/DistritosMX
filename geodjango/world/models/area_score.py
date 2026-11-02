from django.contrib.gis.db import models
from django.utils.translation import gettext_lazy as _

# The six axes of the livability index, in the order the radar draws them.
AXES = (
    ('vivienda', 'Vivienda'),
    ('transporte', 'Transporte'),
    ('seguridad', 'Seguridad'),
    ('oportunidades', 'Oportunidades'),
    ('agua', 'Agua'),
    ('riesgo', 'Riesgo'),
)


class AreaScore(models.Model):
    """
    The Ciudad MX livability index of one AGEB or colonia of CDMX.

    Written by `manage.py build_area_scores` (world/area_scores.py), which
    explains how each axis is measured. Every axis is 0-10: the average of its
    indicators' percentiles among the areas of the same type, so 7 means "better
    than 70% of the AGEBs" (or colonias). Higher is always better, including
    Riesgo, where 10 is the safest ground.

    A row edited by hand in the admin is marked `edited`, and a rerun keeps its
    axes as they are: the overall score and the ranks are still recomputed.
    """

    class AreaType(models.TextChoices):
        AGEB = 'ageb', _('AGEB')
        COLONIA = 'colonia', _('Colonia')

    area_type = models.CharField('tipo', max_length=10, choices=AreaType.choices)
    code = models.CharField('clave', max_length=20, help_text='CVEGEO del AGEB, o clave de la colonia')
    name = models.CharField('nombre', max_length=200, blank=True)
    municipality = models.CharField('alcaldía', max_length=200, blank=True)
    geometry = models.PolygonField('contorno', srid=4326)
    population = models.IntegerField('habitantes', null=True, blank=True)

    vivienda = models.FloatField(null=True, blank=True)
    transporte = models.FloatField(null=True, blank=True)
    seguridad = models.FloatField(null=True, blank=True)
    oportunidades = models.FloatField(null=True, blank=True)
    agua = models.FloatField(null=True, blank=True)
    riesgo = models.FloatField(null=True, blank=True)

    score = models.FloatField('índice', null=True, blank=True, help_text='Promedio de los ejes, 0 a 10')
    rank = models.IntegerField('lugar', null=True, blank=True, help_text='Lugar entre las áreas del mismo tipo')
    rank_of = models.IntegerField('de', null=True, blank=True)
    rankable = models.BooleanField(
        'comparable', default=True, help_text='Falso cuando el área tiene muy pocos habitantes para compararla')

    indicators = models.JSONField('indicadores', default=dict, blank=True,
                                  help_text='Valores medidos y su percentil, por eje')
    edited = models.BooleanField(
        'editado', default=False, help_text='Editado a mano: el recálculo conserva sus ejes')
    note = models.TextField('nota', blank=True, help_text='Por qué se editó, o cualquier aclaración')
    computed_at = models.DateTimeField('calculado', null=True, blank=True)
    updated_at = models.DateTimeField('modificado', auto_now=True)

    class Meta:
        db_table = 'area_scores'
        verbose_name = 'Índice de habitabilidad'
        verbose_name_plural = 'Índice de habitabilidad'
        ordering = ['area_type', 'rank']
        constraints = [models.UniqueConstraint(fields=['area_type', 'code'], name='area_score_unique_code')]
        indexes = [models.Index(fields=['area_type', 'rank'])]

    def __str__(self):
        label = self.name or self.code
        return f'{self.get_area_type_display()} {label}'

    def axis_values(self):
        return {key: getattr(self, key) for key, _label in AXES}

    def compute_score(self):
        values = [v for v in self.axis_values().values() if v is not None]
        self.score = round(sum(values) / len(values), 2) if values else None
        return self.score

    @classmethod
    def rerank(cls, area_type):
        """Number the rankable areas of a type by score, best first."""
        rows = list(cls.objects.filter(area_type=area_type).only('id', 'score', 'rankable'))
        ranked = sorted((r for r in rows if r.rankable and r.score is not None), key=lambda r: -r.score)
        total = len(ranked)
        for position, row in enumerate(ranked, start=1):
            row.rank, row.rank_of = position, total
        for row in rows:
            if not (row.rankable and row.score is not None):
                row.rank, row.rank_of = None, total
        cls.objects.bulk_update(rows, ['rank', 'rank_of'], batch_size=1000)


class AreaScoreRun(models.Model):
    """One execution of build_area_scores, from the admin or the command line."""

    class Status(models.TextChoices):
        RUNNING = 'running', _('En curso')
        OK = 'ok', _('Terminada')
        FAILED = 'failed', _('Falló')

    class Trigger(models.TextChoices):
        ADMIN = 'admin', _('Manual desde el admin')
        COMMAND = 'command', _('Línea de comandos')

    status = models.CharField(max_length=20, choices=Status.choices, default=Status.RUNNING)
    trigger = models.CharField(max_length=20, choices=Trigger.choices, default=Trigger.ADMIN)
    actor = models.CharField(max_length=150, blank=True)
    area_types = models.CharField(max_length=40, blank=True)
    log = models.TextField(blank=True)
    started_at = models.DateTimeField(auto_now_add=True)
    finished_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'area_score_runs'
        verbose_name = 'Cálculo del índice'
        verbose_name_plural = 'Cálculos del índice'
        ordering = ['-started_at']

    def __str__(self):
        return f'{self.started_at:%Y-%m-%d %H:%M} — {self.get_status_display()}'

    @property
    def duration_seconds(self):
        if not self.finished_at:
            return None
        return (self.finished_at - self.started_at).total_seconds()

    def append(self, line):
        self.log = f'{self.log}{line}\n' if self.log else f'{line}\n'
        self.save(update_fields=['log'])
