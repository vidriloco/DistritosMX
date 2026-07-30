from django.contrib.gis.db import models
from django.contrib.gis.geos import Point
import json
from typing import List, Dict, Any
from .metadata import StationMetadata
from world.utils.string_utils import parse_line_number

class TrolebusStation(models.Model):
    """Model representing a station in the Trolebús system."""
    
    # Location information
    location = models.PointField(geography=True, dim=3, srid=4326)
    
    # Station information
    station_code = models.CharField(max_length=100, null=True, blank=True, help_text="Station code")
    circuit = models.CharField(max_length=100, null=True, blank=True, help_text="Circuit identifier")
    system = models.CharField(max_length=100, help_text="Transportation system name")
    name = models.CharField(max_length=100, help_text="Station name")
    station_type = models.CharField(max_length=100, help_text="Station type (e.g., Terminal, Intermedia)")
    line = models.CharField(max_length=10, help_text="Line identifier")
    boroughs = models.CharField(max_length=100, help_text="Boroughs where the station is located", null=True, blank=True)
    has_ramp = models.BooleanField(help_text="Whether the station has a ramp", default=False)
    
    # Metadata
    metadata = models.OneToOneField(
        StationMetadata,
        on_delete=models.CASCADE,
        related_name='trolebus_station',
        help_text="Status metadata for this station",
        null=True,
        blank=True
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = "Trolebús Station"
        verbose_name_plural = "Trolebús Stations"
        indexes = [
            models.Index(fields=['line']),
            models.Index(fields=['station_code']),
            models.Index(fields=['name']),
        ]
    
    def __str__(self) -> str:
        return f"{self.name} (Line {self.line})"
    
    @classmethod
    def load_from_geojson(cls, file_path: str) -> List['TrolebusStation']:
        """
        Load Trolebús stations from a GeoJSON file.
        
        Args:
            file_path: Path to the GeoJSON file
            
        Returns:
            List of created TrolebusStation objects
        """
        with open(file_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        stations = []
        for feature in data['features']:
            properties = feature['properties']
            coordinates = feature['geometry']['coordinates']
            
            # Convert coordinates to Point and ensure z-dimension
            if len(coordinates) == 2:
                point = Point(coordinates[0], coordinates[1], 0, srid=4326)
            else:
                point = Point(coordinates[0], coordinates[1], coordinates[2], srid=4326)
            
            station = cls(
                location=point,
                station_code=properties['CVE_EST'],
                circuit=properties.get('circuito', None),
                system=properties['SISTEMA'],
                name=properties['NOMBRE'],
                station_type=properties['TIPO'],
                line=parse_line_number(properties['LINEA']),
                boroughs=properties.get('ALCALDIAS', None),
                has_ramp=properties.get('Ramp_s_rue', None) == 'Sí' if properties.get('Ramp_s_rue', None) is not None else False
            )
            stations.append(station)
        
        cls.objects.bulk_create(stations)
        return len(stations)