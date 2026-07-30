from django.contrib.gis.db import models
from django.utils.translation import gettext_lazy as _
from django.contrib.gis.geos import LineString, GEOSGeometry
import json
from pathlib import Path
from .metadata import LINE_COLORS
from .metadata import LINE_STROKES
from .metadata import TransportSystem
from .metadata import LineMetadata
from .metadata import Status
from world.utils.string_utils import parse_line_number

class InterurbanoLine(models.Model):
    """Model representing an interurban bus line."""
    
    line_number = models.CharField(
        max_length=10,
        verbose_name=_('Line Number'),
        help_text=_('The number or identifier of the bus line')
    )
    
    route = models.CharField(
        max_length=255,
        verbose_name=_('Route'),
        help_text=_('The route description (e.g., "Observatorio - Zinacantepec")')
    )
    
    description = models.TextField(
        blank=True,
        verbose_name=_('Description'),
        help_text=_('Additional information about the line')
    )
    
    geometry = models.LineStringField(
        srid=4326,
        dim=3,
        verbose_name=_('Geometry'),
        help_text=_('The line geometry in WGS84 coordinates')
    )

    system = models.CharField(
        max_length=20,
        default="INTERURBANO",
        verbose_name=_('System'),
        help_text=_('The transportation system this line belongs to')
    )
    
    metadata = models.OneToOneField(
        LineMetadata,
        on_delete=models.CASCADE,
        related_name='interurbano_line',
        help_text="Visual and status metadata for this line",
        null=True,
        blank=True
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = _('Interurbano Line')
        verbose_name_plural = _('Interurbano Lines')
        ordering = ['line_number']
        indexes = [
            models.Index(fields=['line_number']),
            models.Index(fields=['system']),
        ]
    
    def __str__(self):
        return f"{self.line_number} - {self.route}"

    def save(self, *args, **kwargs):
        is_new = self._state.adding
        super().save(*args, **kwargs)
        
        if is_new and not self.metadata:
            metadata = LineMetadata.objects.create(
                color=LINE_COLORS[TransportSystem.INTERURBANO][self.line_number],
                stroke=LINE_STROKES[TransportSystem.INTERURBANO],
                status=Status.ACTIVE
            )
            self.metadata = metadata
            self.save()

    @classmethod
    def load_from_geojson(cls, geojson_path):
        """
        Load interurban lines from a GeoJSON file into the database.
        
        Args:
            geojson_path (str): Path to the GeoJSON file containing the lines
            
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
            
            # Create LineString from coordinates
            coordinates = geometry['coordinates']
            line_string = LineString(coordinates, srid=4326)

            # Get system from properties or use default
            system = properties.get('system', 'INTERURBANO')
            
            # Create or update the record
            line = cls(
                line_number=parse_line_number(properties['line_number']),
                route=properties['route'],
                description=properties.get('description', ''),
                geometry=line_string,
                system=system
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
