from django.contrib.gis.db import models
from django.utils.translation import gettext_lazy as _
from django.contrib.gis.geos import MultiLineString, GEOSGeometry
import json
from pathlib import Path
from .metadata import LINE_COLORS
from .metadata import LINE_STROKES
from .metadata import TransportSystem
from .metadata import LineMetadata
from .metadata import Status
from world.utils.string_utils import parse_line_number

class RTPLine(models.Model):
    """Model representing RTP (Red de Transporte de Pasajeros) lines in Mexico City."""
    
    name = models.CharField(
        max_length=200,
        verbose_name=_('Name'),
        help_text=_('Name of the route (e.g., "San Bartolo - Chapultepec")')
    )
    
    system = models.CharField(
        max_length=100,
        verbose_name=_('System'),
        help_text=_('Name of the transport system')
    )
    
    route = models.CharField(
        max_length=20,
        verbose_name=_('Route'),
        help_text=_('Route number (e.g., "115-A")')
    )
    
    module = models.CharField(
        max_length=10,
        verbose_name=_('Module'),
        help_text=_('Module number')
    )
    
    origin = models.CharField(
        max_length=100,
        verbose_name=_('Origin'),
        help_text=_('Origin of the route')
    )
    
    destination = models.CharField(
        max_length=100,
        verbose_name=_('Destination'),
        help_text=_('Destination of the route')
    )
    
    ordinary = models.BooleanField(
        default=False,
        verbose_name=_('Ordinary Service'),
        help_text=_('Whether the route has ordinary service')
    )
    
    atenea = models.BooleanField(
        default=False,
        verbose_name=_('Atenea Service'),
        help_text=_('Whether the route has Atenea service')
    )
    
    express = models.BooleanField(
        default=False,
        verbose_name=_('Express Service'),
        help_text=_('Whether the route has express service')
    )
    
    ecobus = models.BooleanField(
        default=False,
        verbose_name=_('Ecobus Service'),
        help_text=_('Whether the route has Ecobus service')
    )
    
    express_di = models.BooleanField(
        default=False,
        verbose_name=_('Express DI Service'),
        help_text=_('Whether the route has Express DI service')
    )
    
    nightbus = models.BooleanField(
        default=False,
        verbose_name=_('Nightbus Service'),
        help_text=_('Whether the route has Nightbus service')
    )
    
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.ACTIVE,
        verbose_name=_('Status'),
        help_text=_('Current status of the line')
    )
    
    geometry = models.MultiLineStringField(
        srid=4326,
        dim=3,
        verbose_name=_('Geometry'),
        help_text=_('Geographic coordinates of the line')
    )

    # Metadata
    metadata = models.OneToOneField(
        LineMetadata,
        on_delete=models.CASCADE,
        related_name='rtp_line',
        help_text="Visual and status metadata for this line",
        null=True,
        blank=True
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = _('RTP Line')
        verbose_name_plural = _('RTP Lines')
        ordering = ['route']
        indexes = [
            models.Index(fields=['route', 'system', 'origin', 'destination'])
        ]

    def __str__(self):
        return f"{self.system} - {self.route}: {self.name}"

    def save(self, *args, **kwargs):
        is_new = self._state.adding
        super().save(*args, **kwargs)
        
        if is_new and not self.metadata:
            metadata = LineMetadata.objects.create(
                color=LINE_COLORS[TransportSystem.RTP]['default'],
                stroke=LINE_STROKES[TransportSystem.RTP],
                status=Status.ACTIVE
            )
            self.metadata = metadata
            self.save()

    @classmethod
    def load_from_geojson(cls, geojson_path):
        """
        Load RTP lines from a GeoJSON file into the database.
        Only creates new records, skips existing ones.
        
        Args:
            geojson_path (str): Path to the GeoJSON file containing RTP lines data.
            
        Returns:
            int: Number of records created
        """
        # Convert string path to Path object
        geojson_path = Path(geojson_path)
        
        # Read and parse the GeoJSON file
        with open(geojson_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        created_count = 0
        route_59a_created = False
        
        # Process each feature in the GeoJSON
        for feature in data['features']:
            properties = feature['properties']
            geometry = feature['geometry']
            
            # Create geometry from GeoJSON
            geos_geometry = GEOSGeometry(json.dumps(geometry))
            
            # Get status from properties or use default
            status = properties.get('ESTATUS', Status.ACTIVE)
            
            # Create and save the record
            line = cls(
                route=parse_line_number(properties['RUTA']),
                name=properties['NOMBRE'],
                system=properties['SISTEMA'],
                module=properties['MODULO'],
                origin=properties['ORIGEN'],
                destination=properties['DESTINO'],
                ordinary=properties.get('ORDINARIO', "NO") == "SI",
                atenea=properties.get('ATENEA', "NO") == "SI",
                express=properties.get('EXPRESO', "NO") == "SI",
                ecobus=properties.get('ECOBUS', "NO") == "SI",
                express_di=properties.get('EXPRESO_DI', "NO") == "SI",
                nightbus=properties.get('NOCHEBUS', "NO") == "SI",
                status=status,
                geometry=geos_geometry
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
