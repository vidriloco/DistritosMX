from django.db import models


class TripHome(models.Model):
    """
    Model to store home location and processing status for trips by CAID.
    """
    
    # Device identification
    caid = models.CharField(
        max_length=64,
        db_index=True,
        unique=True,
        help_text="Cryptographic advertising ID (hashed device identifier)"
    )
    
    # Processing status
    has_been_processed = models.BooleanField(
        default=False,
        db_index=True,
        help_text="Whether this CAID has been processed"
    )
    
    # Country information
    country_iso = models.CharField(
        max_length=2,
        db_index=True,
        null=True,
        blank=True,
        help_text="ISO 2-letter country code"
    )
    
    # Metadata
    created_at = models.DateTimeField(
        auto_now_add=True,
        help_text="When this record was created"
    )
    updated_at = models.DateTimeField(
        auto_now=True,
        help_text="When this record was last updated"
    )
    
    class Meta:
        db_table = 'trip_home'
        verbose_name = 'Trip Home'
        verbose_name_plural = 'Trip Homes'
        indexes = [
            models.Index(fields=['caid']),
            models.Index(fields=['has_been_processed']),
            models.Index(fields=['country_iso']),
        ]
    
    def __str__(self):
        processed_status = "Processed" if self.has_been_processed else "Not Processed"
        return f"{self.caid[:16]}... - {processed_status} ({self.country_iso or 'N/A'})"

