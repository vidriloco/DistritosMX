from django.contrib.gis.db import models
from django.contrib.gis.geos import Point
from django.utils.translation import gettext_lazy as _
from .metadata import StationMetadata, StationType
from world.utils.string_utils import parse_line_number
 

class MexibusStation(models.Model):
    name = models.CharField(max_length=255, verbose_name=_("Name"))
    system = models.CharField(max_length=50, default="mexibus", verbose_name=_("System"))
    line_number = models.CharField(max_length=50, verbose_name=_("Line Number"))
    station_number = models.IntegerField(verbose_name=_("Station Number"))
    station_code = models.CharField(max_length=50, verbose_name=_("Station Code"))
    station_type = models.CharField(
        max_length=50,
        choices=StationType.choices,
        verbose_name=_("Station Type"),
        blank=True,
        null=True
    )
    location = models.PointField(verbose_name=_("Location"))
    metadata = models.OneToOneField(
        StationMetadata,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='mexibus_station'
    )

    class Meta:
        verbose_name = _("Mexibus Station")
        verbose_name_plural = _("Mexibus Stations")
        ordering = ['line_number', 'station_number']

    def __str__(self):
        return f"{self.name} ({self.line_number})"

    @classmethod
    def load_from_geojson(cls, geojson_data):
        """
        Load station data from a GeoJSON file.
        
        Args:
            geojson_data (dict): GeoJSON data containing station features
            
        Returns:
            list: List of created stations
        """
        import json
        from django.contrib.gis.geos import Point
        
        data = {}
        with open(geojson_data, 'r', encoding='utf-8') as f:
            data = json.load(f)

        stations = []
        
        for feature in data.get('features', []):
            properties = feature.get('properties', {})
            geometry = feature.get('geometry', {})
            
            if geometry.get('type') != 'Point':
                continue
                
            coordinates = geometry.get('coordinates', [])
            if not coordinates:
                continue
                
            # Map GeoJSON properties to model fields
            station_data = {
                'name': properties.get('Name', '').strip(),
                'system': properties.get('SISTEMA', 'mexibus').lower(),
                'line_number': parse_line_number(properties.get('LINEA', '')),
                'station_number': int(properties.get('EST', 0)),
                'station_code': properties.get('CVE_EST', ''),
                'station_type': properties.get('TIPO', ''),
                'location': Point(coordinates[0], coordinates[1]),
            }
            
            station = cls.objects.create(**station_data)
            stations.append(station)
            
        return len(stations)