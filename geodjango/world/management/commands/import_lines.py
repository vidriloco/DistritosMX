import geojson
from django.core.management import BaseCommand
from django.contrib.gis.geos import Point
from world.models import GeoZone, Station, Line
from django.contrib.gis.geos import GEOSGeometry
from datetime import datetime
from django.contrib.auth.models import User

class Command(BaseCommand):
    help = "Import a line from the data directory"

    def handle(self, *args, **options):
        user = User.objects.filter(username='wikiando').first()
        # Create a user named wikiando
        if not user:
            user = User.objects.create_user(username='wikiando', email='alex@tallerdeapps.mx', password='password123')

        line = None
        with open(f'./data/lines/vayven/la-plancha-path.geojson') as f:
            gj = geojson.load(f)
            features = gj['features']

            for feature in features:
                geometry = feature['geometry']
                coordinates = geometry['coordinates'][0]

                line = GEOSGeometry(geojson.dumps(geometry))
                
                line = Line.objects.create(
                    route='IETRAM La Plancha a CETRAM Uman',
                    identifier='L1',
                    geom=line,
                    mode=Line.Mode.DRAFT,
                    operative_status=Line.OperativeStatus.OPEN,
                    system=Line.System.VA_Y_VEN,
                    updated_at=datetime.now(),
                    user_id=user.pk
                )
        
        with open(f'./data/lines/vayven/la-plancha-stations.geojson') as f:
            gj = geojson.load(f)
            features = gj['features']

            for index, feature in enumerate(features):
                properties = feature['properties']
                geometry = feature['geometry']
                coordinates = geometry['coordinates'][0]
                name = properties.get('Nombre', 'Unknown')
                point = Point(coordinates[0], coordinates[1])
                
                station = Station.objects.create(
                    name=name,
                    coordinates=point,
                    station_key=f"VYVL01{index}",
                    station_number=index
                )
                station.lines.set([line.pk])
            print(f"Imported {len(features)} stations.")