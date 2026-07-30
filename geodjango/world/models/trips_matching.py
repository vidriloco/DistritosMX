from django.db import models
from django.db.models import Q


class TripsMatching(models.Model):
    """
    Model to store trip matching data with origin and destination polygons.
    Represents trips matched to geographic polygons.
    """
    
    # Trip identification
    trip_id = models.CharField(
        max_length=255,
        null=True,
        blank=True,
        db_index=True,
        help_text="Unique identifier for the trip"
    )
    
    # Polygon fields
    origin_polygon = models.CharField(
        max_length=50,
        null=True,
        blank=True,
        db_index=True,
        help_text="Origin polygon identifier (Polígono Orígen). Can be 'NA' if not available."
    )
    
    origin_polygon_name = models.CharField(
        max_length=255,
        null=True,
        blank=True,
        help_text="Name of the origin polygon (e.g., settlement name)"
    )
    
    destination_polygon = models.CharField(
        max_length=50,
        null=True,
        blank=True,
        db_index=True,
        help_text="Destination polygon identifier (Polígono Destino). Can be 'NA' if not available."
    )
    
    destination_polygon_name = models.CharField(
        max_length=255,
        null=True,
        blank=True,
        help_text="Name of the destination polygon (e.g., settlement name)"
    )
    
    # Date field
    date = models.DateField(
        db_index=True,
        help_text="Date of the trip (Fecha)"
    )
    
    # Time of day field
    time_of_day = models.CharField(
        max_length=20,
        null=True,
        blank=True,
        db_index=True,
        help_text="Time of day category (e.g., 'morning', 'afternoon', 'evening', 'night')"
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
        db_table = 'trips_matching'
        verbose_name = 'Trip Matching'
        verbose_name_plural = 'Trips Matching'
        indexes = [
            models.Index(fields=['trip_id']),
            models.Index(fields=['origin_polygon']),
            models.Index(fields=['destination_polygon']),
            models.Index(fields=['date']),
            models.Index(fields=['time_of_day']),
            models.Index(fields=['origin_polygon', 'destination_polygon', 'date']),
        ]
        ordering = ['-date']
    
    @staticmethod
    def get_time_of_day(dt):
        """
        Determine time of day category from a datetime object.
        Returns: 'mañana', 'tarde', 'noche', or 'madrugada'
        """
        if dt is None:
            return None
        
        hour = dt.hour
        
        if 5 <= hour < 12:
            return 'mañana'
        elif 12 <= hour < 17:
            return 'tarde'
        elif 17 <= hour < 22:
            return 'noche'
        else:  # 22-4
            return 'madrugada'
    
    def __str__(self):
        origen = self.origin_polygon or 'NA'
        destino = self.destination_polygon or 'NA'
        return f"{self.origin_polygon} - {origen} -> {destino} ({self.date})"
