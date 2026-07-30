from django.contrib.gis.db import models
from django.utils.translation import gettext_lazy as _

from world.models.official_transports.metadata.line_colors import LINE_COLORS
from world.models.official_transports.metadata.line_strokes import LINE_STROKES
from world.models.official_transports.metadata.systems import TransportSystem
from world.models.official_transports.metadata import LineMetadata
from world.models.official_transports.metadata import Status
from world.utils.string_utils import parse_line_number

class MexibusLine(models.Model):
    """Model for Mexibus lines."""
    
    system = models.CharField(
        max_length=50,
        default='Mexibus',
        verbose_name=_('System')
    )
    line_number = models.CharField(
        max_length=10,
        verbose_name=_('Line Number')
    )
    route = models.CharField(
        max_length=255,
        verbose_name=_('Route')
    )
    year = models.CharField(
        max_length=4,
        verbose_name=_('Year')
    )
    length = models.FloatField(
        verbose_name=_('Length (km)')
    )
    geometry = models.LineStringField(
        srid=4326,
        verbose_name=_('Geometry')
    )
    metadata = models.OneToOneField(
        LineMetadata,
        on_delete=models.CASCADE,
        related_name='mexibus_line',
        null=True,
        blank=True
    )

    class Meta:
        verbose_name = _('Mexibus Line')
        verbose_name_plural = _('Mexibus Lines')
        ordering = ['line_number']

    def __str__(self):
        return f"{self.system} Línea {self.line_number} - {self.route}"

    def save(self, *args, **kwargs):
        is_new = self._state.adding
        super().save(*args, **kwargs)
        
        if is_new and not self.metadata:
            metadata = LineMetadata.objects.create(
                color=LINE_COLORS[TransportSystem.MEXIBUS].get(self.line_number, '#7C1D4E'),
                stroke=LINE_STROKES[TransportSystem.MEXIBUS],
                status=Status.ACTIVE,
                hidden=False
            )
            self.metadata = metadata
            self.save()

    @classmethod
    def load_from_geojson(cls, geojson_file):
        """Load Mexibus lines data from a GeoJSON file."""
        import json
        from django.contrib.gis.geos import LineString

        with open(geojson_file, 'r', encoding='utf-8') as f:
            data = json.load(f)

        lines = []
        for feature in data['features']:
            properties = feature['properties']
            geometry = feature['geometry']
            
            # Create new line (don't use get_or_create to ensure we always create)
            line = cls.objects.create(
                system='Mexibus',
                line_number=parse_line_number(properties['LINEA']),
                route=properties['RUTA'],
                year=properties['AÑO'],
                length=float(properties['LONGITUD']),
                geometry=LineString(geometry['coordinates'])
            )

            lines.append(line)

        return len(lines)
