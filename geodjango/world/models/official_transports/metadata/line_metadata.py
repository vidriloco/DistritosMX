from django.db import models
from django.utils.translation import gettext_lazy as _
from .choices import Status
class LineMetadata(models.Model):
    """Model for storing metadata characteristics of transportation lines."""
    
    color = models.CharField(
        max_length=7,  # Hex color code format (#RRGGBB)
        help_text=_("Color of the line in hex format (e.g., #FF0000 for red)")
    )
    
    stroke = models.FloatField(
        default=2.0,
        help_text=_("Thickness of the line in pixels")
    )
    
    status = models.CharField(
        max_length=50,
        choices=Status.choices,
        default=Status.ACTIVE,
        help_text=_("Current status of the line")
    )
    
    hidden = models.BooleanField(
        default=False,
        help_text=_("Whether the line is listed but should not be visible on the map")
    )

    class Meta:
        verbose_name = _("Line Metadata")
        verbose_name_plural = _("Line Metadata")
        
    def __str__(self):
        return f"Line Metadata - {self.get_status_display()}" 