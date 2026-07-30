from django.contrib.gis.db import models
from django.contrib.gis.geos import MultiLineString, LineString
import json
from typing import List, Dict, Any
from django.contrib.gis.geos import GEOSGeometry
from .metadata import LINE_COLORS
from .metadata import LINE_STROKES
from .metadata import TransportSystem
from .metadata import LineMetadata
from .metadata import Status
from world.utils.string_utils import parse_line_number

class TrolebusLine(models.Model):
    """Model representing a line in the Trolebús system."""
    
    # Geometry information
    geometry = models.MultiLineStringField(geography=True, dim=3, srid=4326)
    
    # Line information
    circuit = models.CharField(max_length=100, null=True, blank=True, help_text="Circuit identifier")
    route = models.CharField(max_length=200, help_text="Route description")
    system = models.CharField(max_length=100, help_text="Transportation system name")
    line = models.CharField(max_length=10, help_text="Line identifier")
    
    # Metadata
    metadata = models.OneToOneField(
        LineMetadata,
        on_delete=models.CASCADE,
        related_name='trolebus_line',
        help_text="Visual and status metadata for this line",
        null=True,
        blank=True
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = "Trolebús Line"
        verbose_name_plural = "Trolebús Lines"
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
                color=LINE_COLORS[TransportSystem.TROLEBUS]['default'],
                stroke=LINE_STROKES[TransportSystem.TROLEBUS],
                status=Status.ACTIVE
            )
            self.metadata = metadata
            self.save()
    
    @classmethod
    def load_from_geojson(cls, file_path):
        """Load Trolebús lines from a GeoJSON file.
        
        Args:
            file_path (str): Path to the GeoJSON file
            
        Returns:
            list: List of created TrolebúsLine instances
        """
        with open(file_path, 'r') as f:
            data = json.load(f)
        
        created_lines = []
        for feature in data['features']:
            properties = feature['properties']
            
            # Convert coordinates to MultiLineString and ensure z-dimension
            geometry = GEOSGeometry(json.dumps(feature['geometry']))
            
            # Check if coordinates have z-dimension by examining the first point
            coords = geometry.coords
            if coords and coords[0] and coords[0][0] and len(coords[0][0]) == 2:
                # Add z=0 to each coordinate and create LineString objects
                line_strings = []
                for line in coords:
                    coords_with_z = [(x, y, 0) for x, y in line]
                    line_strings.append(LineString(coords_with_z))
                # Create new geometry with z-dimension
                geometry = MultiLineString(line_strings)
            
            line = cls(
                geometry=geometry,
                circuit=properties['circuito'],
                route=properties['RUTA'],
                system=properties['SISTEMA'],
                line=parse_line_number(properties['LINEA'])
            )
            line.save()  # Save individually to trigger metadata creation

            # Get status from properties or use default
            status = properties.get('status', Status.ACTIVE)
            # Update metadata status if it exists
            if line.metadata:
                line.metadata.status = status
                line.metadata.save()

            created_lines.append(line)
        
        return len(created_lines)