from django.db import models


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

    class Meta:
        ordering = ["orden"]
        unique_together = [("pregunta", "valor")]

    def __str__(self):
        return self.etiqueta


class Respuesta(models.Model):
    """One citizen's pass through the questionnaire, kept so the aggregate can be shown."""

    creado = models.DateTimeField(auto_now_add=True)
    municipio = models.CharField(max_length=120, blank=True)
    # {"pregunta-slug": "valor", ...} and {"area-slug": "free text", ...}
    elecciones = models.JSONField(default=dict)
    comentarios = models.JSONField(default=dict)
    texto = models.TextField(blank=True)

    def __str__(self):
        return f"Respuesta {self.pk} ({self.creado:%Y-%m-%d})"
