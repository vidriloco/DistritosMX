from django.contrib.gis.db import models
from django.contrib.gis.geos import Point
import json
from typing import List, Dict, Any
from .metadata import StationMetadata
from world.utils.string_utils import parse_line_number

class TrenLigeroStation(models.Model):
    """Model representing a station in the Tren Ligero system."""
    
    # Location information
    location = models.PointField(geography=True, dim=3, srid=4326)
    
    # Station information
    system = models.CharField(max_length=100, help_text="Transportation system name")
    name = models.CharField(max_length=100, help_text="Station name")
    line = models.CharField(max_length=10, help_text="Line identifier")
    station_number = models.CharField(max_length=10, help_text="Station number")
    station_code = models.CharField(max_length=10, help_text="Station code")
    eod_code = models.CharField(max_length=10, help_text="EOD code")
    station_type = models.CharField(max_length=20, help_text="Station type (e.g., Terminal, Intermedia)")
    boroughs = models.CharField(max_length=100, help_text="Boroughs where the station is located")
    year = models.IntegerField(help_text="Year of construction")
    has_ramp = models.BooleanField(help_text="Whether the station has a ramp")
    has_elevators = models.BooleanField(help_text="Whether the station has elevators")
    has_tactile_guide = models.BooleanField(help_text="Whether the station has tactile guides")
    
    # Metadata
    metadata = models.OneToOneField(
        StationMetadata,
        on_delete=models.CASCADE,
        related_name='tren_ligero_station',
        help_text="Status metadata for this station",
        null=True,
        blank=True
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = "Tren Ligero Station"
        verbose_name_plural = "Tren Ligero Stations"
        indexes = [
            models.Index(fields=['line']),
            models.Index(fields=['station_number']),
            models.Index(fields=['station_code']),
            models.Index(fields=['name']),
        ]
    
    def __str__(self) -> str:
        return f"{self.name} (Line {self.line})"
    
    @classmethod
    def load_from_geojson(cls, file_path: str) -> List['TrenLigeroStation']:
        """
        Load Tren Ligero stations from a GeoJSON file.
        
        Args:
            file_path: Path to the GeoJSON file
            
        Returns:
            List of created TrenLigeroStation objects
        """
        with open(file_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        stations = []
        for feature in data['features']:
            properties = feature['properties']
            coordinates = feature['geometry']['coordinates']
            
            station = cls(
                location=Point(coordinates[0], coordinates[1], coordinates[2], srid=4326),
                system=properties['SISTEMA'],
                name=properties['NOMBRE'],
                line=parse_line_number(properties['LINEA']),
                station_number=properties['EST'],
                station_code=properties['CVE_EST'],
                eod_code=properties['CVE_EOD17'],
                station_type=properties['TIPO'],
                boroughs=properties['ALCALDIAS'],
                year=properties['AÑO'],
                has_ramp=properties['Ramp_s_rue'] == 'Sí',
                has_elevators=properties['Elevadores'] == 'Sí',
                has_tactile_guide=properties['Guia_tact'] == 'Sí'
            )
            stations.append(station)
        
        cls.objects.bulk_create(stations)
        return len(stations) 