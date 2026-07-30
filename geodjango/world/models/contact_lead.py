from django.db import models
from django.utils.translation import gettext_lazy as _


class ContactLead(models.Model):
    """
    A message sent through the "Contacto" form in the navigation bar.

    These are inbound leads — people or organisations asking about the
    platform. Nothing submitted here is served back out through a public
    endpoint: leads are read from the Django admin and answered by email.
    """

    class ReviewStatus(models.TextChoices):
        NEW = "new", _("Sin revisar")
        CONTACTED = "contacted", _("Contactado")
        CLOSED = "closed", _("Cerrado")

    # What the form asks for
    name = models.CharField(max_length=120)
    email = models.EmailField(max_length=254)
    message = models.TextField(max_length=4000)

    # Which page the form was opened from. A lead that arrives from /negocios
    # wants something different from one that arrives from a project map, and
    # the message alone rarely says which.
    source_path = models.CharField(max_length=200, blank=True)

    # Internal triage
    review_status = models.CharField(
        max_length=20, choices=ReviewStatus.choices, default=ReviewStatus.NEW
    )
    internal_notes = models.TextField(blank=True)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'contact_leads'
        verbose_name = 'Lead de contacto'
        verbose_name_plural = 'Leads de contacto'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['-created_at']),
            models.Index(fields=['review_status']),
        ]

    def __str__(self):
        return f"{self.name} <{self.email}> ({self.created_at:%Y-%m-%d})"
