from django.db import models
from django.utils import timezone


class TripOutstanding(models.Model):
    """
    Model to store aggregated trip statistics by CAID (Customer/Device Identifier).
    
    This model represents outstanding trip data with aggregated statistics including:
    - Total number of trip records
    - Date range (start and end dates)
    - Total traverse time across all trips
    - Total displacement distance
    - Total number of pings
    """
    
    # Primary identifier
    caid = models.CharField(
        max_length=64,
        db_index=True,
        unique=True,
        help_text="Cryptographic advertising ID (hashed device identifier)"
    )
    
    # Record count
    record_count = models.IntegerField(
        help_text="Number of trip records for this CAID"
    )
    
    # Date range
    start_date = models.DateTimeField(
        db_index=True,
        help_text="UTC timestamp of the first trip"
    )
    end_date = models.DateTimeField(
        db_index=True,
        help_text="UTC timestamp of the last trip plus its traverse_time"
    )
    
    # Aggregated statistics
    total_traverse_time = models.BigIntegerField(
        help_text="Sum of all traverse_time values (in seconds or milliseconds)"
    )
    total_displacement = models.FloatField(
        help_text="Sum of all displacement values (distance in meters)"
    )
    total_pings = models.BigIntegerField(
        help_text="Sum of all pings values"
    )
    
    # Metadata
    created_at = models.DateTimeField(
        auto_now_add=True,
        help_text="When this record was created in our system"
    )
    updated_at = models.DateTimeField(
        auto_now=True,
        help_text="When this record was last updated"
    )
    
    class Meta:
        db_table = 'trip_outstanding'
        verbose_name = 'Trip Outstanding'
        verbose_name_plural = 'Trips Outstanding'
        indexes = [
            models.Index(fields=['caid']),
            models.Index(fields=['start_date']),
            models.Index(fields=['end_date']),
            models.Index(fields=['total_displacement']),
            models.Index(fields=['created_at']),
        ]
        ordering = ['-total_displacement']
    
    def __str__(self):
        return f"{self.caid} - {self.record_count} records ({self.start_date} to {self.end_date})"
    
    @property
    def duration_seconds(self):
        """Calculate total duration in seconds from start_date to end_date"""
        if self.start_date and self.end_date:
            return (self.end_date - self.start_date).total_seconds()
        return None
    
    @property
    def average_displacement_per_record(self):
        """Calculate average displacement per record"""
        if self.record_count > 0:
            return self.total_displacement / self.record_count
        return 0
    
    @property
    def average_traverse_time_per_record(self):
        """Calculate average traverse time per record"""
        if self.record_count > 0:
            return self.total_traverse_time / self.record_count
        return 0

