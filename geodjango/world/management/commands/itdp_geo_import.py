import geojson
from django.core.management import BaseCommand
from django.contrib.gis.geos import Point, Polygon

# Import the model 
from world.models import GeoZone

class Command(BaseCommand):
    # Show this when the user types help
    help = "Loads data from demographics/data.geojson"

    def handle(self, *args, **options):
        print("Remove existing geo zones data")
        GeoZone.objects.all().delete()
            
        # Show this before loading the data into the database
        print("Ingesting GeoZone data")

        #Code to load the data into database
        with open('./data/itdp/data.geojson') as f:
            gj = geojson.load(f)
            features = gj['features']

            index = 0

            for feature in features:
                index += 1
                geozone_key = feature['properties']['CVEGEO']
                population = feature['properties']['pob1']
                population_employed = feature['properties']['eco4_r']
                population_unemployed = feature['properties']['eco25_r']
                population_density = feature['properties']['densidad']
                houses = feature['properties']['viv0']
                population_disabled = feature['properties']['disc1_r']
                population_with_car = feature['properties']['viv28_r']
                houses_empty = feature['properties']['viv1_r']
                socioeconomic_category = feature['properties']['nse']
                poverty_category = feature['properties']['gmu']
                geometry = feature['geometry']['coordinates']

                print(feature['geometry']['coordinates'])

                geom = Polygon(geometry[0][0])
                
                geo_zone = GeoZone(
                    geozone_key=geozone_key,
                    population=population,
                    population_employed=population_employed,
                    population_unemployed=population_unemployed,
                    population_density=population_density,
                    houses=houses,
                    population_disabled=population_disabled,
                    population_with_car=population_with_car,
                    houses_empty=houses_empty,
                    socioeconomic_category=socioeconomic_category,
                    poverty_category=poverty_category,
                    geometry=geom
                )
                geo_zone.save()
                print(f"Processed zone: {index}")
            