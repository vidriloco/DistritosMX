import geojson
from django.core.management import BaseCommand
from django.contrib.gis.geos import Point
from world.models import GeoZone
import csv
from django.contrib.gis.geos import Polygon

class Command(BaseCommand):
    help = "Update geozones from population file"

    def handle(self, *args, **options):

        with open(f'./data/kei/yucatan-agebs.geojson') as f:
            gj = geojson.load(f)
            features = gj['features']

            index = 0

            for feature in features:
                index += 1
                CVEGEO = feature['properties']['CVEGEO']
                population = feature['properties']['POPTOT']
                housing = feature['properties']['VIVTOT']
                cars_rate = feature['properties']['TASA_AUTO']
                bikes_rate = feature['properties']['TASA_BICI']
                motorcycles_rate = feature['properties']['TASA_MOTO']
                geometry = feature['geometry']['coordinates']
                CVE_ENT = feature['properties']['CVE_ENT']
                CVE_MUN = feature['properties']['CVE_MUN']
                CVE_LOC = feature['properties']['CVE_LOC']
                CVE_AGEB = feature['properties']['CVE_AGEB']

                geometry = Polygon(geometry[0][0])

                geozone, created = GeoZone.objects.get_or_create(CVEGEO=CVEGEO, defaults={
                    'population': population or 0,
                    'housing': housing,
                    'cars_rate': cars_rate,
                    'bikes_rate': bikes_rate,
                    'motorcycles_rate': motorcycles_rate,
                    'geometry': geometry,
                    'CVE_ENT': CVE_ENT,
                    'CVE_MUN': CVE_MUN,
                    'CVE_LOC': CVE_LOC,
                    'CVE_AGEB': CVE_AGEB
                })

                if not created:
                    geozone.population = population or 0
                    geozone.housing = housing or 0
                    geozone.cars_rate = cars_rate
                    geozone.bikes_rate = bikes_rate
                    geozone.motorcycles_rate = motorcycles_rate
                    geozone.geometry = geometry
                    geozone.CVE_ENT = CVE_ENT
                    geozone.CVE_MUN = CVE_MUN
                    geozone.CVE_LOC = CVE_LOC
                    geozone.CVE_AGEB = CVE_AGEB

                try:
                    geozone.save()
                    print(f'Update item {index} - {CVEGEO}')
                except Exception as e:
                    print(f'Error updating item {index} - {CVEGEO}: {e}')
                