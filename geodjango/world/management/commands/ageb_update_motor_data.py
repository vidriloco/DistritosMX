import geojson
from django.core.management import BaseCommand
from django.contrib.gis.geos import Point
from world.models import GeoZone
import csv

class Command(BaseCommand):
    help = "Update geozones with motorization data"

    def handle(self, *args, **options):
        self.update_geozones('data/eod/cdmx.geojson', 'ageb', 'TASA_BICI', 'TASA_AUT', 'TASA_MOTO', 'cdmx')
        self.update_geozones('data/eod/edomex.geojson', 'CVEGEO', 'BICI', 'auto', 'moto', 'edomex')

    def update_geozones(self, file_path, cvegeo_key, bikes_key, cars_key, motorcycles_key, region_name):
        with open(file_path, 'r') as f:
            gj = geojson.load(f)
            features = gj['features']

            for index, feature in enumerate(features, start=1):
                CVEGEO = feature['properties'][cvegeo_key]
                bikes = feature['properties'][bikes_key]
                cars = feature['properties'][cars_key]
                motorcycles = feature['properties'][motorcycles_key]
                try:
                    geozone = GeoZone.objects.get(CVEGEO=CVEGEO)
                    population = geozone.population
                    if cars != None and cars != 0:
                        geozone.cars = (1000 / cars) * (population / 1000)
                    if bikes != None and bikes != 0:
                        geozone.bikes = (1000 / bikes) * (population / 1000)
                    if motorcycles != None and motorcycles != 0:
                        geozone.motorcycles = (1000 / motorcycles) * (population / 1000)
                    geozone.save()
                except GeoZone.DoesNotExist:
                    print(f"GeoZone with CVEGEO={CVEGEO} does not exist.")

                print(f"Processed zone in {region_name}: {index}")
