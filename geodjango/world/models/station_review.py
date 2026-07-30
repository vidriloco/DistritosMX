from django.contrib.gis.db import models
from django.contrib.gis.geos import Point
from django.utils.translation import gettext_lazy as _
from django.contrib.auth.models import User

class StationReview(models.Model):
    """Model for storing station reviews."""
    
    happiness_value = models.IntegerField(
        verbose_name=_('Happiness Value'),
        help_text=_('User happiness rating for the station')
    )
    
    report_type = models.CharField(
        max_length=50,
        verbose_name=_('Report Type'),
        help_text=_('Type of report (e.g., stolen, maintenance, etc.)')
    )
    
    location = models.PointField(
        srid=4326,
        verbose_name=_('Location'),
        help_text=_('Geographic coordinates of the review')
    )
    
    message = models.TextField(
        verbose_name=_('Message'),
        help_text=_('User message or description')
    )
    
    image = models.ImageField(
        upload_to='station_reviews/',
        null=True,
        blank=True,
        verbose_name=_('Image'),
        help_text=_('Optional image attached to the review')
    )
    
    transport_id = models.IntegerField(
        verbose_name=_('Transport ID'),
        help_text=_('ID of the transport system')
    )
    
    transport_identifier = models.CharField(
        max_length=50,
        verbose_name=_('Transport Identifier'),
        help_text=_('Identifier of the transport (e.g., STC0219)')
    )
    
    transport_system = models.CharField(
        max_length=50,
        verbose_name=_('Transport System'),
        help_text=_('Name of the transport system (e.g., metro)')
    )
    
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        verbose_name=_('User'),
        help_text=_('User associated with the review')
    )
    
    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name=_('Created At'),
        help_text=_('When the review was created')
    )

    review_date = models.DateField(
        auto_now_add=True,
        verbose_name=_('Review Date'),
        help_text=_('Date of the review (day only)')
    )

    reviewed_object_location = models.PointField(
        srid=4326,
        verbose_name=_('Reviewed Object Location'),
        help_text=_('Geographic coordinates of the reviewed object')
    )
    
    class Meta:
        verbose_name = _('Station Review')
        verbose_name_plural = _('Station Reviews')

        unique_together = (('transport_id', 'transport_identifier', 'review_date', 'user'))

        indexes = [
            models.Index(fields=['transport_id']),
            models.Index(fields=['transport_system']),
            models.Index(fields=['user']),
            models.Index(fields=['review_date']),
        ]
    
    def __str__(self):
        return f"Review for {self.transport_system} {self.transport_identifier} - {self.created_at}" 