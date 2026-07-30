from django.contrib.gis.db import models
from django.utils.html import format_html
from world.models.official_transports.metadata import LineMetadata, Status, LINE_COLORS, LINE_STROKES, TransportSystem
from world.utils.string_utils import parse_line_number


class MexicableLine(models.Model):
    system = models.CharField(max_length=50)
    line_number = models.CharField(max_length=10)
    route = models.CharField(max_length=200)
    description = models.TextField(blank=True, null=True)
    geometry = models.LineStringField()
    metadata = models.OneToOneField(LineMetadata, on_delete=models.CASCADE, null=True, blank=True)

    def __str__(self):
        return f"{self.system} Línea {self.line_number}"

    def save(self, *args, **kwargs):
        is_new = self._state.adding
        super().save(*args, **kwargs)
        
        if is_new and not self.metadata:            
            metadata = LineMetadata.objects.create(
                color=LINE_COLORS[TransportSystem.MEXICABLE][self.line_number],  # Default to black if line not found
                stroke=LINE_STROKES[TransportSystem.MEXICABLE],
                status=Status.ACTIVE
            )
            self.metadata = metadata
            self.save()

    @classmethod
    def load_from_geojson(cls, file_path):
        import json
        from django.contrib.gis.geos import LineString

        with open(file_path, 'r') as f:
            data = json.load(f)

        count = 0
        for feature in data['features']:
            props = feature['properties']
            coords = feature['geometry']['coordinates']

            # Create line with metadata
            line = cls.objects.create(
                system=props['Name'],
                line_number=parse_line_number(props['LINEA']),
                route=props.get('RUTA', ''),
                description=props.get('description', ''),
                geometry=LineString(coords, srid=4326)
            )
            count += 1

        return count 