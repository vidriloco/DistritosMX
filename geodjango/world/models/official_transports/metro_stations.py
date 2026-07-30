from django.contrib.gis.db import models
from django.contrib.gis.geos import GEOSGeometry
import json
from .metadata import StationMetadata
from world.utils.string_utils import parse_line_number


class MetroStation(models.Model):
    """Model representing a metro station in the system."""
    
    # Basic information
    system = models.CharField(max_length=100, help_text="The transportation system name")
    name = models.CharField(max_length=200, help_text="The station name")
    line = models.CharField(max_length=10, help_text="The line number or identifier")
    station_number = models.CharField(max_length=10, help_text="The station number on the line")
    station_code = models.CharField(max_length=20, help_text="The station code (e.g. STC0101)")
    eod_code = models.CharField(max_length=20, help_text="The EOD code for the station")
    type = models.CharField(max_length=50, help_text="The station type (e.g. Terminal, Intermedia)")
    borough = models.CharField(max_length=100, help_text="The borough where the station is located")
    year = models.IntegerField(help_text="The year the station was opened")
    
    # Geometry
    geometry = models.PointField(srid=4326, dim=3, help_text="The station location in WGS84")
    
    # Metadata
    metadata = models.OneToOneField(
        StationMetadata,
        on_delete=models.CASCADE,
        related_name='metro_station',
        help_text="Status metadata for this station",
        null=True,
        blank=True
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = "Metro Station"
        verbose_name_plural = "Metro Stations"
        indexes = [
            models.Index(fields=['system']),
            models.Index(fields=['line']),
            models.Index(fields=['station_code']),
            models.Index(fields=['name']),
        ]
    
    def __str__(self):
        return f"{self.name} ({self.station_code})"
    
    @classmethod
    def load_from_geojson(cls, file_path):
        """
        Load metro stations from a GeoJSON file.
        
        Args:
            file_path (str): Path to the GeoJSON file
            
        Returns:
            list: List of created MetroStation instances
        """
        with open(file_path, 'r') as f:
            data = json.load(f)
        
        created_stations = []
        for feature in data['features']:
            properties = feature['properties']
            geometry = GEOSGeometry(json.dumps(feature['geometry']))
            
            station = cls.objects.create(
                system=properties['SISTEMA'],
                name=properties['NOMBRE'],
                line=parse_line_number(properties['LINEA']),
                station_number=properties['EST'],
                station_code=properties['CVE_EST'],
                eod_code=properties['CVE_EOD17'],
                type=properties['TIPO'],
                borough=properties['ALCALDIAS'],
                year=properties['AÑO'],
                geometry=geometry
            )
            created_stations.append(station)
        
        return len(created_stations)
