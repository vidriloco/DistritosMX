from django.contrib.gis.db import models
from django.contrib.gis.geos import GEOSGeometry
import json
from .metadata import StationMetadata
from world.utils.string_utils import parse_line_number


class SuburbanoStation(models.Model):
    """Model representing a Suburbano train station in the system."""
    
    # Basic information
    system = models.CharField(max_length=100, help_text="The transportation system name")
    name = models.CharField(max_length=200, help_text="The station name")
    line_number = models.CharField(max_length=10, help_text="The line number")
    station_id = models.CharField(max_length=20, help_text="The station identifier (e.g. SUB0101)")
    station_type = models.CharField(max_length=50, help_text="The station type (e.g. end-of-line, inter-station)")
    borough = models.CharField(max_length=100, help_text="The borough where the station is located", blank=True)
    
    # Geometry
    location = models.PointField(srid=4326, dim=3, help_text="The station location in WGS84")
    
    # Metadata
    metadata = models.OneToOneField(
        StationMetadata,
        on_delete=models.CASCADE,
        related_name='suburbano_station',
        help_text="Status metadata for this station",
        null=True,
        blank=True
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = "Suburbano Station"
        verbose_name_plural = "Suburbano Stations"
        indexes = [
            models.Index(fields=['system']),
            models.Index(fields=['line_number']),
            models.Index(fields=['station_id']),
            models.Index(fields=['name']),
        ]
    
    def __str__(self):
        return f"{self.name} ({self.station_id})"
    
    @classmethod
    def load_from_geojson(cls, file_path):
        """
        Load Suburbano stations from a GeoJSON file.
        
        Args:
            file_path (str): Path to the GeoJSON file
            
        Returns:
            list: List of created SuburbanoStation instances
        """
        with open(file_path, 'r') as f:
            data = json.load(f)
        
        created_stations = []
        for feature in data['features']:
            properties = feature['properties']
            geometry = GEOSGeometry(json.dumps(feature['geometry']))
            
            # Ensure geometry has z-coordinate
            if geometry.hasz is False:
                # For Point geometries, we can directly access the coordinates
                x, y = geometry.coords
                geometry = GEOSGeometry(f'POINT Z ({x} {y} 0)')
            
            station = cls.objects.create(
                system=properties['system'],
                name=properties['name'],
                line_number=parse_line_number(properties['line_number']),
                station_id=properties['station_id'],
                station_type=properties['station_type'],
                borough=properties['borough'],
                location=geometry
            )
            created_stations.append(station)
        
        return len(created_stations)
