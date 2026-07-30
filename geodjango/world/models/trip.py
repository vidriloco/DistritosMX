from django.db import models
from django.contrib.gis.db import models as gis_models
from django.contrib.postgres.fields import ArrayField
from django.utils import timezone
import pytz


class Trip(models.Model):
    """
    Model to store trip data from location tracking.
    """
    
    # Base identification fields
    caid = models.CharField(
        max_length=64,
        db_index=True,
        help_text="Cryptographic advertising ID (hashed device identifier)"
    )
    
    # Timestamp
    utc_timestamp = models.DateTimeField(
        db_index=True,
        help_text="UTC timestamp of the trip event"
    )
    
    # Location fields
    latitude = models.FloatField(help_text="Latitude of the trip location")
    longitude = models.FloatField(help_text="Longitude of the trip location")
    horizontal_accuracy = models.FloatField(
        null=True,
        blank=True,
        help_text="GPS accuracy in meters"
    )
    location = gis_models.PointField(
        srid=4326,
        null=True,
        blank=True,
        help_text="Geographic point for the location"
    )
    
    # Device identification
    id_type = models.CharField(
        max_length=10,
        choices=[
            ('idfa', 'IDFA (iOS)'),
            ('aaid', 'AAID (Android)'),
        ],
        help_text="Ad ID device type: IDFA (iOS) or AAID (Android)"
    )
    
    # Network information
    ip_address = models.GenericIPAddressField(
        null=True,
        blank=True,
        help_text="IP address of the event"
    )
    
    # Geographic information
    iso_country_code = models.CharField(
        max_length=2,
        db_index=True,
        help_text="ISO 2-letter country code"
    )
    
    # POI information
    poi_ids = ArrayField(
        models.CharField(max_length=255),
        null=True,
        blank=True,
        help_text="Array of Point of Interest IDs"
    )
    
    # Trip fields (parsed from trip_fields array)
    traverse_time = models.IntegerField(
        null=True,
        blank=True,
        help_text="Trip traverse time in seconds"
    )
    heading = models.FloatField(
        null=True,
        blank=True,
        help_text="Heading direction in degrees"
    )
    heading_cardinal = models.CharField(
        max_length=10,
        null=True,
        blank=True,
        help_text="Cardinal direction (North, South, East, West, etc.)"
    )
    start_time = models.DateTimeField(
        null=True,
        blank=True,
        help_text="Trip start time"
    )
    pings = models.IntegerField(
        null=True,
        blank=True,
        help_text="Number of pings in the trip"
    )
    end_time = models.DateTimeField(
        null=True,
        blank=True,
        help_text="Trip end time"
    )
    overlap_flag = models.BooleanField(
        null=True,
        blank=True,
        help_text="Whether the trip overlaps with another trip"
    )
    high_velocity_flag = models.BooleanField(
        null=True,
        blank=True,
        help_text="Whether the trip has high velocity"
    )
    is_visitor = models.BooleanField(
        null=True,
        blank=True,
        default=None,
        db_index=True,
        help_text="Whether the trip is from a visitor"
    )
    high_velocity_pings = models.IntegerField(
        null=True,
        blank=True,
        help_text="Number of high velocity pings"
    )
    overlap_trip_list = models.TextField(
        null=True,
        blank=True,
        help_text="List of overlapping trip IDs"
    )
    velocity = models.FloatField(
        null=True,
        blank=True,
        help_text="Trip velocity"
    )
    displacement = models.FloatField(
        null=True,
        blank=True,
        help_text="Trip displacement distance"
    )
    trip_index = models.IntegerField(
        null=True,
        blank=True,
        help_text="Trip index number"
    )
    
    # Raw array fields (for storing original data if needed)
    trip_fields = models.JSONField(
        null=True,
        blank=True,
        help_text="Original trip_fields array data"
    )
    trip_ping_fields = models.JSONField(
        null=True,
        blank=True,
        help_text="Original trip_ping_fields array data"
    )
    trip_to_trip_fields = models.JSONField(
        null=True,
        blank=True,
        help_text="Original trip_to_trip_fields array data"
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
        db_table = 'trip'
        verbose_name = 'Trip'
        verbose_name_plural = 'Trips'
        indexes = [
            models.Index(fields=['caid']),
            models.Index(fields=['utc_timestamp']),
            models.Index(fields=['id_type']),
            models.Index(fields=['iso_country_code']),
            models.Index(fields=['created_at']),
            models.Index(fields=['start_time', 'end_time']),
            models.Index(fields=['caid', 'trip_fields']),
        ]
    
    def __str__(self):
        return f"{self.caid} - {self.utc_timestamp}"
    
    def save(self, *args, **kwargs):
        # Auto-populate the location field from latitude/longitude if not set
        if self.latitude and self.longitude and not self.location:
            from django.contrib.gis.geos import Point
            self.location = Point(self.longitude, self.latitude, srid=4326)
        super().save(*args, **kwargs)
    
    def coordinates(self):
        """Return coordinates as a list [longitude, latitude]"""
        if self.location:
            return [self.location.x, self.location.y]
        elif self.latitude and self.longitude:
            return [self.longitude, self.latitude]
        return None
    
    @property
    def is_ios(self):
        """Check if device is iOS"""
        return self.id_type == 'idfa'
    
    @property
    def is_android(self):
        """Check if device is Android"""
        return self.id_type == 'aaid'
    
    @property
    def duration_seconds(self):
        """Calculate trip duration in seconds"""
        if self.start_time and self.end_time:
            return (self.end_time - self.start_time).total_seconds()
        return None
    
    @staticmethod
    def get_trips_by_caid(caid, start_date=None, end_date=None):
        """Get all trips for a specific CAID within a date range"""
        queryset = Trip.objects.filter(caid=caid)
        
        if start_date:
            queryset = queryset.filter(utc_timestamp__gte=start_date)
        if end_date:
            queryset = queryset.filter(utc_timestamp__lte=end_date)
            
        return queryset.order_by('utc_timestamp')


class BasicTrip(models.Model):
    """
    Model to store basic trip data from CSV files.
    Represents the raw CSV structure without complex trip fields.
    """
    
    # Base identification fields
    caid = models.CharField(
        max_length=64,
        db_index=True,
        help_text="Cryptographic advertising ID (hashed device identifier)"
    )
    
    # Timestamp
    utc_timestamp = models.DateTimeField(
        db_index=True,
        help_text="UTC timestamp of the trip event"
    )
    
    # Location fields
    latitude = models.FloatField(help_text="Latitude of the trip location")
    longitude = models.FloatField(help_text="Longitude of the trip location")
    horizontal_accuracy = models.FloatField(
        null=True,
        blank=True,
        help_text="GPS accuracy in meters"
    )
    location = gis_models.PointField(
        srid=4326,
        null=True,
        blank=True,
        help_text="Geographic point for the location"
    )
    
    # Device identification
    id_type = models.CharField(
        max_length=10,
        null=True,
        blank=True,
        choices=[
            ('idfa', 'IDFA (iOS)'),
            ('aaid', 'AAID (Android)'),
        ],
        help_text="Ad ID device type: IDFA (iOS) or AAID (Android)"
    )
    
    # Network information
    ip_address = models.GenericIPAddressField(
        null=True,
        blank=True,
        help_text="IP address of the event"
    )
    
    # Geographic information
    iso_country_code = models.CharField(
        max_length=2,
        null=True,
        blank=True,
        db_index=True,
        help_text="ISO 2-letter country code"
    )
    
    # POI information (stored as text, can be empty or comma-separated)
    poi_ids = models.TextField(
        null=True,
        blank=True,
        help_text="Point of Interest IDs (comma-separated or empty)"
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
        db_table = 'basic_trip'
        verbose_name = 'Basic Trip'
        verbose_name_plural = 'Basic Trips'
        indexes = [
            models.Index(fields=['caid']),
            models.Index(fields=['utc_timestamp']),
            models.Index(fields=['id_type']),
            models.Index(fields=['iso_country_code']),
            models.Index(fields=['created_at']),
            models.Index(fields=['caid', 'utc_timestamp']),
        ]
        ordering = ['-utc_timestamp']
    
    def __str__(self):
        return f"{self.caid} - {self.utc_timestamp}"
    
    def save(self, *args, **kwargs):
        # Auto-populate the location field from latitude/longitude if not set
        if self.latitude and self.longitude and not self.location:
            from django.contrib.gis.geos import Point
            self.location = Point(self.longitude, self.latitude, srid=4326)
        super().save(*args, **kwargs)
    
    def coordinates(self):
        """Return coordinates as a list [longitude, latitude]"""
        if self.location:
            return [self.location.x, self.location.y]
        elif self.latitude and self.longitude:
            return [self.longitude, self.latitude]
        return None
    
    @property
    def is_ios(self):
        """Check if device is iOS"""
        return self.id_type == 'idfa'
    
    @property
    def is_android(self):
        """Check if device is Android"""
        return self.id_type == 'aaid'
    
    def get_poi_ids_list(self):
        """Return poi_ids as a list, splitting by comma if present"""
        if not self.poi_ids or self.poi_ids.strip() == '':
            return []
        return [poi_id.strip() for poi_id in self.poi_ids.split(',') if poi_id.strip()]
    
    @staticmethod
    def get_trips_by_caid(caid, start_date=None, end_date=None):
        """Get all basic trips for a specific CAID within a date range"""
        queryset = BasicTrip.objects.filter(caid=caid)
        
        if start_date:
            queryset = queryset.filter(utc_timestamp__gte=start_date)
        if end_date:
            queryset = queryset.filter(utc_timestamp__lte=end_date)
            
        return queryset.order_by('utc_timestamp')

