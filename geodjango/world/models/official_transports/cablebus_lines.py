from django.contrib.gis.db import models
import json
from django.contrib.gis.geos import MultiLineString, GEOSGeometry
from pathlib import Path
from .metadata import LINE_COLORS
from .metadata import LINE_STROKES
from .metadata import TransportSystem
from .metadata import LineMetadata
from .metadata import Status
from world.utils.string_utils import parse_line_number

class CablebusLine(models.Model):
    """Model representing Cablebús lines in Mexico City."""
    
    system = models.CharField(
        max_length=100,
        help_text="Name of the transport system"
    )
    line_number = models.CharField(
        max_length=10,
        help_text="Line number or identifier"
    )
    route = models.CharField(
        max_length=100,
        help_text="Route name or description"
    )
    geometry = models.MultiLineStringField(
        srid=4326,
        dim=3,
        help_text="Geographic coordinates of the line"
    )
    metadata = models.OneToOneField(
        LineMetadata,
        on_delete=models.CASCADE,
        related_name='cablebus_line',
        help_text="Visual and status metadata for this line",
        null=True,
        blank=True
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Cablebús Line"
        verbose_name_plural = "Cablebús Lines"
        unique_together = ['system', 'line_number', 'route']

    def __str__(self):
        return f"{self.system} - Line {self.line_number}: {self.route}"

    def save(self, *args, **kwargs):
        is_new = self._state.adding
        super().save(*args, **kwargs)
        
        if is_new and not self.metadata:
            metadata = LineMetadata.objects.create(
                color=LINE_COLORS[TransportSystem.CABLEBUS]['default'],
                stroke=LINE_STROKES[TransportSystem.CABLEBUS],
                status=Status.ACTIVE
            )
            self.metadata = metadata
            self.save()

    @classmethod
    def load_from_geojson(cls, geojson_path):
        """
        Ingest data from a GeoJSON file into the database.
        
        Args:
            geojson_path (str): Path to the GeoJSON file
            
        Returns:
            int: Number of records created
        """
        # Convert string path to Path object
        geojson_path = Path(geojson_path)
        
        # Read and parse the GeoJSON file
        with open(geojson_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        created_count = 0
        
        # Process each feature in the GeoJSON
        for feature in data['features']:
            properties = feature['properties']
            geometry = feature['geometry']
            
            # Create geometry from GeoJSON
            geos_geometry = GEOSGeometry(json.dumps(geometry))
            
            # Create or update the record
            line = cls(
                system=properties['SISTEMA'],
                line_number=parse_line_number(properties['LINEA']),
                route=properties['RUTA'],
                geometry=geos_geometry
            )
            line.save()   # Save individually to trigger metadata creation
            
            # Get status from properties or use default
            status = properties.get('status', Status.ACTIVE)
            # Update metadata status if it exists
            if line.metadata:
                line.metadata.status = status
                line.metadata.save()
                
            created_count += 1
        return created_count
