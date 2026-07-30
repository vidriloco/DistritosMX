from django.contrib.gis.db import models
from django.contrib.gis.geos import Point
import json
from typing import List, Dict, Any
from .metadata import StationMetadata
from world.utils.string_utils import parse_line_number

class RTPStation(models.Model):
    """Model representing a station in the Red de Transporte de Pasajeros (RTP) system."""
    
    # Location information
    location = models.PointField(geography=True, dim=3, srid=4326)
    
    # Route information
    route = models.CharField(max_length=100, help_text="Route identifier")
    module = models.CharField(max_length=100, help_text="Module identifier")
    direction = models.CharField(max_length=10, help_text="Direction of travel (e.g., SN for North-South)")
    origin_destination = models.CharField(max_length=200, help_text="Origin and destination of the route")
    corridor = models.CharField(max_length=100, null=True, blank=True, help_text="Corridor identifier if applicable")
    intersection = models.CharField(max_length=200, help_text="Intersection or location name", null=True, blank=True)
    system = models.CharField(max_length=100, help_text="Transportation system name")
    
    # Metadata
    metadata = models.OneToOneField(
        StationMetadata,
        on_delete=models.CASCADE,
        related_name='rtp_station',
        help_text="Status metadata for this station",
        null=True,
        blank=True
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = "RTP Station"
        verbose_name_plural = "RTP Stations"
    
    def __str__(self) -> str:
        return f"{self.intersection} - {self.route}"
    
    @classmethod
    def load_from_geojson(cls, file_path: str) -> List['RTPStation']:
        """
        Load RTP stations from a GeoJSON file.
        
        Args:
            file_path: Path to the GeoJSON file
            
        Returns:
            List of created RTPStation objects
        """
        with open(file_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        stations = []
        for feature in data['features']:
            properties = feature['properties']
            coordinates = feature['geometry']['coordinates']
            
            station = cls(
                location=Point(coordinates[0], coordinates[1], 0, srid=4326),
                route=parse_line_number(properties['RUTA']),
                module=properties['MODULO'],
                direction=properties['SENTIDO'],
                origin_destination=properties['ORIG_DEST'],
                corridor=properties['CORREDOR'],
                intersection=properties['INSTERSECC'],
                system=properties['SISTEMA']
            )
            stations.append(station)
        
        cls.objects.bulk_create(stations)
        return len(stations)
