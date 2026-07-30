from django.contrib.gis.db import models
from django.contrib.gis.geos import MultiLineString
import json
from typing import List, Dict, Any
from django.contrib.gis.geos import GEOSGeometry
from .metadata import LINE_COLORS
from .metadata import LINE_STROKES
from .metadata import TransportSystem
from .metadata import LineMetadata
from .metadata import Status
from world.utils.string_utils import parse_line_number


class TrenLigeroLine(models.Model):
    """Model representing a line in the Tren Ligero system."""
    
    # Geometry information
    geometry = models.MultiLineStringField(geography=True, dim=3, srid=4326)
    
    # Line information
    system = models.CharField(max_length=100, help_text="Transportation system name")
    line = models.CharField(max_length=10, help_text="Line identifier")
    route = models.CharField(max_length=200, help_text="Route description")
    
    # Metadata
    metadata = models.OneToOneField(
        LineMetadata,
        on_delete=models.CASCADE,
        related_name='tren_ligero_line',
        help_text="Visual and status metadata for this line",
        null=True,
        blank=True
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = "Tren Ligero Line"
        verbose_name_plural = "Tren Ligero Lines"
        indexes = [
            models.Index(fields=['line']),
            models.Index(fields=['route']),
        ]
    
    def __str__(self) -> str:
        return f"Line {self.line} - {self.route}"
    
    def save(self, *args, **kwargs):
        is_new = self._state.adding
        super().save(*args, **kwargs)
        
        if is_new and not self.metadata:
            metadata = LineMetadata.objects.create(
                color=LINE_COLORS[TransportSystem.TREN_LIGERO].get(self.line, '#000000'),
                stroke=LINE_STROKES[TransportSystem.TREN_LIGERO],
                status=Status.ACTIVE
            )
            self.metadata = metadata
            self.save()
    
    @classmethod
    def load_from_geojson(cls, file_path):
        """Load Tren Ligero lines from a GeoJSON file.
        
        Args:
            file_path (str): Path to the GeoJSON file
            
        Returns:
            int: Number of lines created
        """
        with open(file_path, 'r') as f:
            data = json.load(f)
        
        created_count = 0
        for feature in data['features']:
            properties = feature['properties']

            # Convert coordinates to MultiLineString
            geometry = GEOSGeometry(json.dumps(feature['geometry']))
            
            line = cls(
                geometry=geometry,
                system=properties['SISTEMA'],
                line=parse_line_number(properties['LINEA']),
                route=properties['RUTA']
            )
            line.save()  # Save individually to trigger metadata creation

            # Get status from properties or use default
            status = properties.get('status', Status.ACTIVE)
            # Update metadata status if it exists
            if line.metadata:
                line.metadata.status = status
                line.metadata.save()

            created_count += 1
        
        return created_count