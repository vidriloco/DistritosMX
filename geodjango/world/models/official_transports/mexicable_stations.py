from django.contrib.gis.db import models
from django.utils.html import format_html
from world.models.official_transports.metadata import StationMetadata, Status
from world.utils.string_utils import parse_line_number


class MexicableStation(models.Model):
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True, null=True)
    system = models.CharField(max_length=50)
    line = models.CharField(max_length=10)
    station_number = models.CharField(max_length=10, blank=True, null=True)
    station_code = models.CharField(max_length=10, unique=True)
    station_type = models.CharField(max_length=50)
    location = models.PointField()
    metadata = models.OneToOneField(StationMetadata, on_delete=models.CASCADE, null=True, blank=True)

    def __str__(self):
        return f"{self.name} ({self.station_code})"

    @classmethod
    def load_from_geojson(cls, file_path):
        import json
        from django.contrib.gis.geos import Point

        with open(file_path, 'r') as f:
            data = json.load(f)

        count = 0
        for feature in data['features']:
            props = feature['properties']
            coords = feature['geometry']['coordinates']
            
            # Create metadata first
            metadata = StationMetadata.objects.create(
                status=Status.ACTIVE
            )

            # Create station with metadata
            station = cls.objects.create(
                name=props['Name'],
                description=props.get('description', ''),
                system=props['SISTEMA'],
                line=parse_line_number(props['LINEA']),
                station_number=props['EST'],
                station_code=props['CVE_EST'],
                station_type=props['TIPO'],
                location=Point(coords[0], coords[1], srid=4326),
                metadata=metadata
            )
            count += 1

        return count 