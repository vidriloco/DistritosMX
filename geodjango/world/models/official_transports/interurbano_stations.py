from django.contrib.gis.db import models
from django.utils.translation import gettext_lazy as _
from django.contrib.gis.geos import Point
import geojson
from django.contrib.gis.geos import GEOSGeometry
import json
from .metadata import StationMetadata
from .metadata import Status
from .metadata import StationType
from world.utils.string_utils import parse_line_number

class InterurbanoStation(models.Model):
    """Model representing an interurban bus station."""
    
    name = models.CharField(
        max_length=255,
        verbose_name=_('Name'),
        help_text=_('Name of the station')
    )
    
    station_id = models.CharField(
        max_length=10,
        unique=True,
        verbose_name=_('Station ID'),
        help_text=_('Unique identifier for the station (e.g., INT0101)')
    )
    
    station_type = models.CharField(
        max_length=100,
        choices=StationType.choices,
        verbose_name=_('Station Type'),
        help_text=_('Type of station (Terminal, Transfer, or Intermediate)')
    )
    
    line_number = models.CharField(
        max_length=10,
        verbose_name=_('Line Number'),
        help_text=_('The line number this station belongs to')
    )
    
    borough = models.CharField(
        max_length=100,
        blank=True,
        verbose_name=_('Borough'),
        help_text=_('The borough where the station is located')
    )
    
    location = models.PointField(
        srid=4326,
        dim=3,
        verbose_name=_('Location'),
        help_text=_('The station location in WGS84 coordinates'), 
        null=False
    )
    
    # Metadata
    metadata = models.OneToOneField(
        StationMetadata,
        on_delete=models.CASCADE,
        related_name='interurbano_station',
        help_text="Status metadata for this station",
        null=True,
        blank=True
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = _('Interurbano Station')
        verbose_name_plural = _('Interurbano Stations')
        ordering = ['station_id']
        indexes = [
            models.Index(fields=['station_id']),
            models.Index(fields=['line_number']),
        ]
    
    def __str__(self):
        return f"{self.station_id} - {self.name}"
        
    @classmethod
    def load_from_geojson(cls, file_path):
        """
        Load station data from a GeoJSON file.
        
        Args:
            file_path (str): Path to the GeoJSON file
            
        Returns:
            int: Number of stations loaded
        """
        with open(file_path) as f:
            data = geojson.load(f)
            
        count = 0
        for feature in data['features']:
            properties = feature['properties']
            geometry = feature['geometry']
            
            # Create station record
            station = cls.objects.create(
                name=properties['name'],
                station_id=properties['station_id'],
                station_type=properties['station_type'],
                line_number=parse_line_number(properties['line_number']),
                borough=properties.get('borough', ''),
                location=Point(
                    geometry['coordinates'][0],
                    geometry['coordinates'][1],
                    0,
                    srid=4326
                )
            )
            count += 1
            
        return count 