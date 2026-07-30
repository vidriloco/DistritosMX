from django.db import models
from django.contrib.gis.db import models as gis_models
from django.utils import timezone
import pytz

class PhoneLocation(models.Model):
    # Device identification fields
    device_id = models.CharField(max_length=255, help_text="Unique device advertising identifier")
    id_type = models.CharField(max_length=10, choices=[
        ('IDFA', 'IDFA (iOS)'),
        ('ADID', 'ADID (Android)')
    ], help_text="Ad ID device type: IDFA (iOS) or ADID (Android)")
    
    # Location fields
    latitude = models.FloatField(help_text="Latitude of the event")
    longitude = models.FloatField(help_text="Longitude of the event")
    horizontal_accuracy = models.FloatField(null=True, blank=True, help_text="GPS accuracy in meters")
    location = gis_models.PointField(srid=4326, null=True, blank=True, help_text="Geographic point for the location")
    
    # Timestamp field
    timestamp = models.BigIntegerField(help_text="Unix timestamp of the event (millisecond)")
    created_at = models.DateTimeField(auto_now_add=True, help_text="When this record was created in our system")
    
    # Network and device information
    ip_address = models.GenericIPAddressField(null=True, blank=True, help_text="IP address of the event")
    device_os = models.CharField(max_length=10, choices=[
        ('iOS', 'iOS'),
        ('android', 'Android')
    ], help_text="Device operating system: iOS or android")
    os_version = models.CharField(max_length=50, null=True, blank=True, help_text="Device operating system version")
    user_agent = models.TextField(null=True, blank=True, help_text="Web browser version and operating system")
    
    # Geographic information
    country = models.CharField(max_length=2, null=True, blank=True, help_text="ISO2 2-digit alpha country code of the event")
    geohash = models.CharField(max_length=20, null=True, blank=True, help_text="Unique location alphanumeric string")
    
    # Application and publisher information
    source_id = models.CharField(max_length=255, null=True, blank=True, help_text="Quadrant unique identifier for data source")
    publisher_id = models.CharField(max_length=255, null=True, blank=True, help_text="Unique developer identifier")
    app_id = models.CharField(max_length=255, null=True, blank=True, help_text="Unique application identifier")
    is_within_cdmx = models.BooleanField(default=False, help_text="Whether the location is within the CDMX")
    
    # Context and consent
    location_context = models.CharField(max_length=1, choices=[
        ('0', 'Foreground'),
        ('1', 'Background')
    ], null=True, blank=True, help_text="0 = foreground | 1 = background")
    consent = models.CharField(max_length=1, choices=[
        ('0', 'NA'),
        ('1', 'Yes')
    ], null=True, blank=True, help_text="0 = NA | 1 = yes")
    
    # Quadrant specific
    quad_id = models.CharField(max_length=255, null=True, blank=True, help_text="Quadrant's unique device identifier")
    
    class Meta:
        db_table = 'phone_location'
        verbose_name = 'Phone Location'
        verbose_name_plural = 'Phone Locations'
        indexes = [
            models.Index(fields=['device_id']),
            models.Index(fields=['timestamp']),
            models.Index(fields=['created_at']),
            models.Index(fields=['device_os']),
            models.Index(fields=['country']),
            models.Index(fields=['app_id']),
            models.Index(fields=['quad_id']),
        ]
    
    def __str__(self):
        return f"{self.device_id} - {self.get_device_os_display()} - {self.timestamp}"
    
    def save(self, *args, **kwargs):
        # Auto-populate the location field from latitude/longitude if not set
        if self.latitude and self.longitude and not self.location:
            from django.contrib.gis.geos import Point
            self.location = Point(self.longitude, self.latitude, srid=4326)
        super().save(*args, **kwargs)
    
    def get_timestamp_datetime(self):
        """Convert Unix timestamp to datetime object"""
        return timezone.datetime.fromtimestamp(self.timestamp / 1000, tz=pytz.UTC)
    
    def get_mexico_time(self):
        """Convert timestamp to Mexico City timezone"""
        mexico_city_tz = pytz.timezone('America/Mexico_City')
        return self.get_timestamp_datetime().astimezone(mexico_city_tz)
    
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
        return self.device_os == 'iOS'
    
    @property
    def is_android(self):
        """Check if device is Android"""
        return self.device_os == 'android'
    
    @property
    def is_foreground(self):
        """Check if location was captured in foreground"""
        return self.location_context == '0'
    
    @property
    def is_background(self):
        """Check if location was captured in background"""
        return self.location_context == '1'
    
    @property
    def has_consent(self):
        """Check if user has given consent"""
        return self.consent == '1'
    
    @staticmethod
    def get_device_locations(device_id, start_date=None, end_date=None):
        """Get all locations for a specific device within a date range"""
        queryset = PhoneLocation.objects.filter(device_id=device_id)
        
        if start_date:
            queryset = queryset.filter(created_at__gte=start_date)
        if end_date:
            queryset = queryset.filter(created_at__lte=end_date)
            
        return queryset.order_by('timestamp')
    
    @staticmethod
    def get_locations_by_app(app_id, start_date=None, end_date=None):
        """Get all locations for a specific app within a date range"""
        queryset = PhoneLocation.objects.filter(app_id=app_id)
        
        if start_date:
            queryset = queryset.filter(created_at__gte=start_date)
        if end_date:
            queryset = queryset.filter(created_at__lte=end_date)
            
        return queryset.order_by('timestamp')
