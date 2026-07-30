from django.contrib.gis.db import models
from django.utils.translation import gettext_lazy as _


class DespojoCaseReport(models.Model):
    """
    A case of despojo submitted by a member of the public through the
    proyectos/mapas/despojos-viviendas page.

    Contains personal data of crime victims. It is never exposed through a
    public endpoint and never plotted on the map: reports are read from the
    Django admin only, and republishing any of it requires separate written
    consent from the person who sent it.
    """

    class DenunciaStatus(models.TextChoices):
        WITH_FOLIO = "with_folio", _("Denunció y tiene número de carpeta")
        WITHOUT_FOLIO = "without_folio", _("Denunció pero no tiene el número")
        NOT_REPORTED = "not_reported", _("No ha denunciado")
        REFUSED = "refused", _("Lo intentó y no se la recibieron")

    class ReviewStatus(models.TextChoices):
        NEW = "new", _("Sin revisar")
        CONTACTED = "contacted", _("Contactado")
        CLOSED = "closed", _("Cerrado")

    # Contact details — the reason the form exists
    name = models.CharField(max_length=120)
    email = models.EmailField(max_length=254)

    # Where and when
    borough = models.CharField(max_length=80, blank=True)
    neighborhood = models.CharField(max_length=120, blank=True)
    year_of_events = models.IntegerField(null=True, blank=True)

    # What happened
    denuncia_status = models.CharField(
        max_length=20, choices=DenunciaStatus.choices, blank=True
    )
    account = models.TextField(max_length=4000, blank=True)

    # Consent is required to submit; stored so we can prove it was given
    consent_contact = models.BooleanField(default=False)

    # Internal triage
    review_status = models.CharField(
        max_length=20, choices=ReviewStatus.choices, default=ReviewStatus.NEW
    )
    internal_notes = models.TextField(blank=True)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'despojo_case_reports'
        verbose_name = 'Reporte de despojo'
        verbose_name_plural = 'Reportes de despojo'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['-created_at']),
            models.Index(fields=['review_status']),
        ]

    def __str__(self):
        return f"{self.name} — {self.borough or 'sin alcaldía'} ({self.created_at:%Y-%m-%d})"
