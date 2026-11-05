from django.db import models

# The "No sé / no tengo opinión" answer the site offers on every question: it never reaches the letter or the counts.
NO_SE = "no-se"


class Area(models.Model):
    """One of the big topics the POZMVM covers, with what the plan proposes and what it found."""

    slug = models.SlugField(unique=True)
    orden = models.PositiveSmallIntegerField(default=0)
    titulo = models.CharField(max_length=120)
    icono = models.CharField(max_length=8, blank=True)
    resumen = models.TextField()
    # Lists of {"texto", "pagina"} and {"texto", "pagina", "clave"}; page numbers refer to the consultation PDF.
    diagnostico = models.JSONField(default=list)
    propuestas = models.JSONField(default=list)

    class Meta:
        ordering = ["orden"]

    def __str__(self):
        return self.titulo


class Pregunta(models.Model):
    area = models.ForeignKey(Area, related_name="preguntas", on_delete=models.CASCADE)
    slug = models.SlugField(unique=True)
    orden = models.PositiveSmallIntegerField(default=0)
    texto = models.CharField(max_length=300)
    corto = models.CharField(max_length=40, blank=True, default="")

    class Meta:
        ordering = ["area__orden", "orden"]

    def __str__(self):
        return self.texto


class Opcion(models.Model):
    pregunta = models.ForeignKey(Pregunta, related_name="opciones", on_delete=models.CASCADE)
    valor = models.SlugField()
    orden = models.PositiveSmallIntegerField(default=0)
    etiqueta = models.CharField(max_length=200)
    # The sentence the citizen can send to the consultation if they pick this option.
    opinion = models.TextField()
    # Starting count for this option, added to the real ones while the sample is on (see MuestraInicial).
    base = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["orden"]
        unique_together = [("pregunta", "valor")]

    def __str__(self):
        return self.etiqueta


class MuestraInicial(models.Model):
    """
    A starting sample for the public results, switched on and off from /dashboard.

    One row, always. While `activa`, each option's `base` is added to its real
    count and `respuestas` to the number of people, and /resultados says that
    the figures include this sample.
    """

    activa = models.BooleanField(default=False)
    respuestas = models.PositiveIntegerField(default=0, help_text="Personas que representa la muestra.")
    updated_at = models.DateTimeField(auto_now=True)
    updated_by = models.CharField(max_length=150, blank=True)

    class Meta:
        verbose_name = "Muestra inicial de resultados"
        verbose_name_plural = "Muestra inicial de resultados"

    def __str__(self):
        return f"Muestra inicial: {self.respuestas} ({'activa' if self.activa else 'apagada'})"

    def save(self, *args, **kwargs):
        # One sample, so one row, even if something calls create() directly.
        self.pk = 1
        super().save(*args, **kwargs)

    @classmethod
    def load(cls):
        """The settings row, created switched off the first time it is read."""
        obj, _created = cls.objects.get_or_create(pk=1)
        return obj


class Respuesta(models.Model):
    """One browser's answers, kept anonymously so the aggregate can be shown.

    The site sends them as they are given; `visitante` is a random id the
    browser makes for itself, so later changes update this row instead of
    adding another.
    """

    creado = models.DateTimeField(auto_now_add=True)
    actualizado = models.DateTimeField(auto_now=True)
    visitante = models.CharField(max_length=36, blank=True, db_index=True)
    municipio = models.CharField(max_length=120, blank=True)
    # {"pregunta-slug": "valor", ...} and {"area-slug": "free text", ...}
    elecciones = models.JSONField(default=dict)
    comentarios = models.JSONField(default=dict)
    texto = models.TextField(blank=True)

    def __str__(self):
        return f"Respuesta {self.pk} ({self.creado:%Y-%m-%d})"
