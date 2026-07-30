from django.contrib.gis.db import models
from django.contrib.gis.geos import GEOSGeometry, MultiLineString
import json
from .metadata import LINE_COLORS
from .metadata import LINE_STROKES
from .metadata import TransportSystem
from .metadata import LineMetadata
from .metadata import Status
from world.utils.string_utils import parse_line_number

class MetrobusLine(models.Model):
    system = models.CharField(max_length=50, verbose_name="System")
    route = models.CharField(max_length=100, verbose_name="Route")
    section = models.CharField(max_length=100, verbose_name="Section", null=True, blank=True)
    line = models.CharField(max_length=10, verbose_name="Line")
    geometry = models.MultiLineStringField(srid=4326, dim=3, verbose_name="Geometry")
    # Metadata
    metadata = models.OneToOneField(
        LineMetadata,
        on_delete=models.CASCADE,
        related_name='metrobus_line',
        help_text="Visual and status metadata for this line",
        null=True,
        blank=True
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Metrobus Line"
        verbose_name_plural = "Metrobus Lines"
        ordering = ['line', 'route']

    def __str__(self):
        return f"{self.system} - Line {self.line}: {self.route}"
    
    def save(self, *args, **kwargs):
        is_new = self._state.adding
        super().save(*args, **kwargs)
        
        if is_new and not self.metadata:

            metadata = LineMetadata.objects.create(
                color=LINE_COLORS[TransportSystem.METROBUS].get(self.line, '#000000'),  # Default to black if line not found
                stroke=LINE_STROKES[TransportSystem.METROBUS],
                status=Status.ACTIVE
            )
            self.metadata = metadata
            self.save()
    
    @classmethod
    def load_from_geojson(cls, geojson_path):
        """
        Load Metrobus lines from a GeoJSON file.
        
        Args:
            geojson_path (str): Path to the GeoJSON file containing Metrobus lines data.
        """
        with open(geojson_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
            
        for feature in data['features']:
            properties = feature['properties']
            geometry = GEOSGeometry(json.dumps(feature['geometry']))
            
            # Convert LineString to MultiLineString if needed
            if geometry.geom_type == 'LineString':
                geometry = MultiLineString([geometry])
            
            line = cls(
                system=properties['SISTEMA'],
                route=properties['RUTA'],
                section=properties['TRAMO'],
                line=parse_line_number(properties['LINEA']),
                geometry=geometry
            ) 
            line.save()  # Save individually to trigger metadata creation
            
            # Get status from properties or use default
            status = properties.get('status', Status.ACTIVE)
            # Update metadata status if it exists
            if line.metadata:
                line.metadata.status = status
                line.metadata.save()

        return len(data['features'])