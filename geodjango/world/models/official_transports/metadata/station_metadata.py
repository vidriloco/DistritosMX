from django.db import models
from django.utils.translation import gettext_lazy as _
from .choices import Status

class StationMetadata(models.Model):
    """Model for storing metadata characteristics of transportation stations."""
    
    status = models.CharField(
        max_length=50,
        choices=Status.choices,
        default=Status.ACTIVE,
        help_text=_("Current status of the station")
    )
    
    class Meta:
        verbose_name = _("Station Metadata")
        verbose_name_plural = _("Station Metadata")
        
    def __str__(self):
        return f"Station Metadata - {self.get_status_display()}" 