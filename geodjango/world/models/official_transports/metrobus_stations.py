from django.contrib.gis.db import models
from django.utils.translation import gettext_lazy as _
from .metadata import StationMetadata
from world.utils.string_utils import parse_line_number

class MetrobusStation(models.Model):
    """Model representing a Metrobus station in Mexico City."""
    
    system = models.CharField(
        max_length=50,
        verbose_name=_('System'),
        help_text=_('Name of the transportation system')
    )
    
    name = models.CharField(
        max_length=100,
        verbose_name=_('Name'),
        help_text=_('Name of the station')
    )
    
    line = models.CharField(
        max_length=10,
        verbose_name=_('Line'),
        help_text=_('Line number of the station')
    )
    
    station_number = models.CharField(
        max_length=10,
        null=True,
        blank=True,
        verbose_name=_('Station Number'),
        help_text=_('Number of the station')
    )
    
    eod17_code = models.CharField(
        max_length=20,
        null=True,
        blank=True,
        verbose_name=_('EOD17 Code'),
        help_text=_('EOD17 code of the station')
    )
    
    type = models.CharField(
        max_length=50,
        verbose_name=_('Type'),
        help_text=_('Type of service'),
        null=True,
        blank=True
    )
    
    boroughs = models.CharField(
        max_length=100,
        verbose_name=_('Boroughs'),
        help_text=_('Boroughs where the station is located'),
        null=True,
        blank=True
    )
    
    year = models.IntegerField(
        verbose_name=_('Year'),
        help_text=_('Year of operation'),
        null=True,
        blank=True
    )
    
    station_code = models.CharField(
        max_length=20,
        null=True,
        blank=True,
        verbose_name=_('Station Code'),
        help_text=_('Code of the station')
    )
    
    location = models.PointField(
        srid=4326,
        dim=3,
        verbose_name=_('Location'),
        help_text=_('Geographic coordinates of the station'),
    )

    # Metadata
    metadata = models.OneToOneField(
        StationMetadata,
        on_delete=models.CASCADE,
        related_name='metrobus_station',
        help_text="Status metadata for this station",
        null=True,
        blank=True
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = _('Metrobus Station')
        verbose_name_plural = _('Metrobus Stations')
        indexes = [
            models.Index(fields=['line']),
            models.Index(fields=['name']),
        ]

    def __str__(self):
        return f"{self.name} - Line {self.line}"

    @classmethod
    def load_from_geojson(cls, file_path):
        """Load Metrobus stations from a GeoJSON file.
        
        Args:
            file_path (str): Path to the GeoJSON file containing station data.
        """
        import json
        from django.contrib.gis.geos import Point
        
        with open(file_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
            
        for feature in data['features']:
            properties = feature['properties']
            coordinates = feature['geometry']['coordinates']
            
            cls.objects.create(
                system=properties['SISTEMA'],
                name=properties['NOMBRE'],
                line=parse_line_number(properties['LINEA']),
                station_number=properties['EST'],
                eod17_code=properties['CVE_EOD17'],
                type=properties['TIPO'],
                boroughs=properties['ALCALDIAS'],
                year=properties['AÑO'],
                station_code=properties['CVE_EST'],
                location=Point(coordinates[0], coordinates[1], 0, srid=4326)
            )

        return len(data['features'])
