import geojson
from django.core.management import BaseCommand
from django.contrib.gis.geos import Point
from world.models import GeoZone
import csv


def safe_int(value, default=0):
    """Convert value to integer, return default if conversion fails."""
    try:
        return int(value)
    except (ValueError, TypeError):
        return default


def safe_float(value, default=0.0):
    """Convert value to float, return default if conversion fails."""
    try:
        return float(value)
    except (ValueError, TypeError):
        return default


class Command(BaseCommand):
    help = "Update geozones from population file"

    def handle(self, *args, **options):
        self.load_city('cdmx')
        self.load_city('edomex')

    def load_city(self, city_name):
        with open(f'data/scitel/{city_name}.csv', newline='', encoding='utf-8') as csvfile:
            reader = csv.DictReader(csvfile)
            index = 0
            for row in reader:
                print(f"Processing row: {index}")
                index += 1
                state = row['\ufeffENTIDAD']
                municipality = row['MUN']
                locality = row['LOC']
                ageb = row['AGEB']

                if safe_int(state) > 0 and safe_int(municipality) > 0 and safe_int(locality) > 0 and safe_int(locality) < 9000:

                    CVEGEO = state + municipality + locality + ageb
                    
                    try:
                        geozone = GeoZone.objects.get(CVEGEO=CVEGEO)
                        geozone.population = safe_int(row['POBTOT'])
                        geozone.population_men = safe_int(row['POBMAS'])
                        geozone.population_women = safe_int(row['POBFEM'])
                        geozone.population_men_older_than_60 = safe_int(row['P_60YMAS_M'])
                        geozone.population_women_older_than_60 = safe_int(row['P_60YMAS_F'])
                        geozone.population_ratio_men_women = safe_float(row['REL_H_M'])
                        geozone.population_with_disability = safe_int(row['PCON_DISC'])
                        geozone.population_with_no_healthcare = safe_int(row['PSINDER'])
                        geozone.population_with_healthcare = safe_int(row['PDER_SS'])
                        geozone.housing_no_automotor = safe_int(row['VPH_NDACMM'])
                        geozone.housing_with_automotor = safe_int(row['VPH_AUTOM'])
                        geozone.housing_with_motorcycle = safe_int(row['VPH_MOTO'])
                        geozone.housing_with_bicycle = safe_int(row['VPH_BICI'])
                        geozone.housing_with_internet = safe_int(row['VPH_INTER'])
                        geozone.housing_with_pay_tv = safe_int(row['VPH_STVP'])
                        geozone.housing_without_internet = safe_int(row['VPH_SINCINT'])
                        geozone.population_education_level = safe_float(row['GRAPROES'])
                        geozone.population_education_level_men = safe_float(row['GRAPROES_M'])
                        geozone.population_education_level_women = safe_float(row['GRAPROES_F'])

                        geozone.save()
                    except GeoZone.DoesNotExist:
                        print(f"GeoZone with CVEGEO={CVEGEO} does not exist.")

    def load_old_edomex(self):
        with open('data/scitel/population-edomex.csv', newline='', encoding='utf-8') as csvfile:
            reader = csv.DictReader(csvfile)
            index = 0
            for row in reader:
                index += 1
                population = row['POBTOT']
                CVEGEO = row['ClaveAgeb']

                try:
                    geozone = GeoZone.objects.get(CVEGEO=CVEGEO)
                    geozone.population = population
                    geozone.save()
                except GeoZone.DoesNotExist:
                    print(f"GeoZone with CVEGEO={CVEGEO} does not exist.")            
                print(f"Processed zone in edomex: {index}")

    def load_old_cdmx(self):
        with open(f'./data/scitel/population-cdmx.geojson') as f:
            gj = geojson.load(f)
            features = gj['features']

            index = 0

            for feature in features:
                index += 1
                CVEGEO = feature['properties']['ageb']
                population = feature['properties']['pob']
                try:
                    geozone = GeoZone.objects.get(CVEGEO=CVEGEO)
                    geozone.population = population
                    geozone.save()
                except GeoZone.DoesNotExist:
                    print(f"GeoZone with CVEGEO={CVEGEO} does not exist.")

                print(f"Processed zone in cdmx: {index}")
        return

    def load_yucatan(self):
        with open('data/scitel/population-yucatan.csv', newline='', encoding='utf-8') as csvfile:
            reader = csv.DictReader(csvfile)
            index = 0
            for row in reader:
                index += 1
                state = row['ENTIDAD']
                municipality = row['MUN']
                locality = row['LOC']
                ageb = row['AGEB']

                if int(state) > 0 and int(municipality) > 0 and int(locality) > 0 and int(locality) < 9000:
                    population = row['POBTOT']
                    CVEGEO = state + municipality + locality + ageb
                    
                    try:
                        geozone = GeoZone.objects.get(CVEGEO=CVEGEO)
                        geozone.population = population
                        geozone.save()
                    except GeoZone.DoesNotExist:
                        print(f"GeoZone with CVEGEO={CVEGEO} does not exist.")
