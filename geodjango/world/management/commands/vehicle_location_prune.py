from django.core.management.base import BaseCommand
from world.models import VehicleLocation, Line
from django.contrib.gis.geos import Polygon
from turfpy.transformation import circle
from geojson import Point

class Command(BaseCommand):
    help = 'Prune vehicle locations'

    def add_arguments(self, parser):
        parser.add_argument('date_start', type=str, help='date start')
        parser.add_argument('date_end', type=str, help='date end')
        parser.add_argument('vehicle_id', type=int, help='vehicle identifier')
        parser.add_argument('distance', type=int, help='radius in meters')

    def handle(self, *args, **kwargs):
        date_start = kwargs['date_start']
        date_end = kwargs['date_end']
        vehicle_id = kwargs['vehicle_id']
        distance = kwargs['distance']

        print(f"Pruning vehicle locations {vehicle_id}")

        self.delete_outsider(vehicle_id, date_start, date_end, distance)

    def delete_outsider(self, vehicle_id, date_start, date_end, min_distance):
        vehicle_trail = VehicleLocation.get_vehicle_trail(vehicle_id, date_start, date_end)
        
        for vehicle in vehicle_trail:
            line = Line.objects.get(identifier=vehicle_trail[0].line())
            point = Point((vehicle.vehicle_location.x, vehicle.vehicle_location.y))
            circle_geom = circle(point, radius=min_distance, units='m')
            polygon = Polygon(circle_geom['geometry']['coordinates'][0])

            if not polygon.intersects(line.geom):
                vehicle.is_outside_line = True
                vehicle.save()
                print(f"Marked {vehicle.pk} as outside line")