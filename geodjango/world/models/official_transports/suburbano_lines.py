from django.contrib.gis.db import models
from django.contrib.gis.geos import GEOSGeometry, MultiLineString, LineString
import json
from .metadata import LINE_COLORS
from .metadata import LINE_STROKES
from .metadata import TransportSystem
from .metadata import LineMetadata
from .metadata import Status
from world.utils.string_utils import parse_line_number


class SuburbanoLine(models.Model):
    """Model representing a Suburbano train line in the system."""
    
    # Basic information
    system = models.CharField(max_length=100, help_text="The transportation system name")
    line_number = models.CharField(max_length=10, help_text="The line number")
    route = models.CharField(max_length=200, help_text="The route description (start - end stations)")
    description = models.TextField(help_text="Additional description of the line", blank=True)
    
    # Geometry
    path = models.MultiLineStringField(srid=4326, dim=3, help_text="The line path in WGS84")
    
    # Metadata
    metadata = models.OneToOneField(
        LineMetadata,
        on_delete=models.CASCADE,
        related_name='suburbano_line',
        help_text="Visual and status metadata for this line",
        null=True,
        blank=True
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = "Suburbano Line"
        verbose_name_plural = "Suburbano Lines"
        indexes = [
            models.Index(fields=['system']),
            models.Index(fields=['line_number']),
        ]
    
    def __str__(self):
        return f"{self.system} - Line {self.line_number}: {self.route}"
    
    def save(self, *args, **kwargs):
        is_new = self._state.adding
        super().save(*args, **kwargs)
        
        if is_new and not self.metadata:
            metadata = LineMetadata.objects.create(
                color=LINE_COLORS[TransportSystem.SUBURBANO].get(self.line_number, '#000000'),
                stroke=LINE_STROKES[TransportSystem.SUBURBANO],
                status=Status.ACTIVE
            )
            self.metadata = metadata
            self.save()
    
    @classmethod
    def _add_z_dimension(cls, coords):
        """Add Z dimension (zero) to coordinates if not present."""
        if isinstance(coords[0], (int, float)):
            return [coords[0], coords[1], 0]
        return [cls._add_z_dimension(coord) for coord in coords]
    
    @classmethod
    def load_from_geojson(cls, file_path):
        """
        Load Suburbano lines from a GeoJSON file.
        
        Args:
            file_path (str): Path to the GeoJSON file
            
        Returns:
            list: List of created SuburbanoLine instances
        """
        with open(file_path, 'r') as f:
            data = json.load(f)
        
        created_lines = []
        for feature in data['features']:
            properties = feature['properties']
            geometry = feature['geometry']
            
            # Add Z dimension to coordinates if not present
            geometry['coordinates'] = cls._add_z_dimension(geometry['coordinates'])
            
            # Create geometry object
            geom = GEOSGeometry(json.dumps(geometry))
            
            # Convert LineString to MultiLineString if needed
            if geom.geom_type == 'LineString':
                geom = MultiLineString(geom)
                        
            line = cls(
                system=properties['system'],
                line_number=parse_line_number(properties['line_number']),
                route=properties['route'],
                description=properties.get('description', ''),
                path=geom
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
