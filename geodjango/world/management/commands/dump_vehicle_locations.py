import csv
from datetime import datetime, timedelta
from django.core.management.base import BaseCommand
from world.models import *

class Command(BaseCommand):
    help = 'Interpolate missing coordinates in line geometries'

    def add_arguments(self, parser):
        parser.add_argument('days', type=int, help='Number of days to look back for vehicle locations')

    def handle(self, *args, **kwargs):
        days = kwargs['days']
        start_date = datetime.now() - timedelta(days=days)
        end_date = datetime.now()
        
        print("Executing query")
        vehicles = VehicleLocation.objects.all().filter(created_at__range=(start_date, end_date))

        with open('vehicle_locations.csv', mode='w', newline='') as file:
            writer = csv.writer(file)
            writer.writerow(['station_number', 'vehicle_id', 'time_minutes_left', 'vehicle_line', 'vehicle_destination', 'vehicle_location', 'coordinates', 'created_at'])

            for vehicle in vehicles:
                print("Writing vehicle record {0}".format(vehicle.id))
                writer.writerow([vehicle.station_number, vehicle.vehicle_id, vehicle.time_minutes_left, vehicle.vehicle_line, vehicle.vehicle_destination, vehicle.vehicle_location, vehicle.coordinates(), vehicle.created_at])
        
        print("Finished writing vehicles")