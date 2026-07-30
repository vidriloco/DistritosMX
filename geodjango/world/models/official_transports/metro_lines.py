from django.contrib.gis.db import models
from django.contrib.gis.geos import GEOSGeometry
import json
from .metadata import LINE_COLORS
from .metadata import LINE_STROKES
from .metadata import TransportSystem
from .metadata import LineMetadata
from .metadata import Status
from world.utils.string_utils import parse_line_number

class MetroLine(models.Model):
    """Model representing a metro line in the system."""
    
    # Basic information
    system = models.CharField(max_length=100, help_text="The transportation system name")
    line = models.CharField(max_length=10, help_text="The line number or identifier")
    route = models.CharField(max_length=200, help_text="The route description (start - end stations)")
    
    # Geometry
    geometry = models.MultiLineStringField(srid=4326, dim=3, help_text="The line geometry in WGS84")
    
    # Metadata
    metadata = models.OneToOneField(
        LineMetadata,
        on_delete=models.CASCADE,
        related_name='metro_line',
        help_text="Visual and status metadata for this line",
        null=True,
        blank=True
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = "Metro Line"
        verbose_name_plural = "Metro Lines"
        indexes = [
            models.Index(fields=['system']),
            models.Index(fields=['line']),
        ]
    
    def __str__(self):
        return f"{self.system} - Line {self.line}: {self.route}"
    
    def save(self, *args, **kwargs):
        is_new = self._state.adding
        super().save(*args, **kwargs)
        
        if is_new and not self.metadata:            
            metadata = LineMetadata.objects.create(
                color=LINE_COLORS[TransportSystem.METRO][self.line],  # Default to black if line not found
                stroke=LINE_STROKES[TransportSystem.METRO],
                status=Status.ACTIVE
            )
            self.metadata = metadata
            self.save()
    
    @classmethod
    def load_from_geojson(cls, file_path):
        """
        Load metro lines from a GeoJSON file.
        
        Args:
            file_path (str): Path to the GeoJSON file
            
        Returns:
            list: List of created MetroLine instances
        """
        with open(file_path, 'r') as f:
            data = json.load(f)
        
        created_lines = []
        for feature in data['features']:
            properties = feature['properties']
            geometry = GEOSGeometry(json.dumps(feature['geometry']))
            
            line = cls(
                system=properties['SISTEMA'],
                line=parse_line_number(properties['LINEA']),
                route=properties['RUTA'],
                geometry=geometry
            )
            line.save()  # Save individually to trigger metadata creation
            
            # Get status from properties or use default
            status = properties.get('STATUS', Status.ACTIVE)
            # Update metadata status if it exists
            if line.metadata:
                line.metadata.status = status
                line.metadata.save()
                
            created_lines.append(line)
        
        return len(created_lines)
