from django.contrib.gis.db import models
from django.contrib.gis.geos import Point
import json
from pathlib import Path
from .metadata import StationMetadata
from world.utils.string_utils import parse_line_number

class ConcesionadosStation(models.Model):
    system = models.CharField(max_length=100)
    company = models.CharField(max_length=100)
    origin_destination = models.CharField(max_length=200, null=True, blank=True)
    nomenclature_od = models.CharField(max_length=10, null=True, blank=True)
    route = models.CharField(max_length=200)
    address = models.CharField(max_length=200, null=True, blank=True)
    nomenclature = models.CharField(max_length=10, null=True, blank=True)
    corridor = models.CharField(max_length=100)
    corridor_nomenclature = models.CharField(max_length=10, null=True, blank=True)
    location = models.PointField(srid=4326, dim=3, null=False)

    metadata = models.OneToOneField(
        StationMetadata,
        on_delete=models.CASCADE,
        related_name='concesionados_station',
        help_text="Status metadata for this station",
        null=True,
        blank=True
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"{self.nomenclature} - {self.location}"

    @classmethod
    def load_from_geojson(cls, file_path):

        with open(file_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        count = 0
        for feature in data['features']:
            props = feature['properties']
            coords = feature['geometry']['coordinates']
            
            station = cls(
                system=props['SISTEMA'],
                company=props['EMPRESA'],
                origin_destination=props['ORIG_DEST'],
                nomenclature_od=props['NOMEN_OD'],
                route=props['RUTA'],
                address=props['UBICACION'],
                nomenclature=parse_line_number(props['NOMENCL']),
                corridor=props['CORREDOR'],
                corridor_nomenclature=props['NOMEN_CORR'],
                location=Point(coords[0], coords[1], 0, srid=4326)
            )
            station.save()
            count += 1

        return count
