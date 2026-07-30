import csv
from datetime import datetime, timedelta
from django.core.management.base import BaseCommand
from world.models import *
import json

class Command(BaseCommand):
    help = 'Dump JSON records between two dates'

    def add_arguments(self, parser):
        parser.add_argument('date_start', type=str, help='date start')

    def handle(self, *args, **kwargs):
        date_start = kwargs['date_start']

        date_end = datetime.strptime(date_start, "%Y-%m-%d") + timedelta(days=1)
        date_end_str = date_end.strftime("%Y-%m-%d")

        print(f"Prepare cache for day {date_start}")
        
        vehicle_trail = VehicleLocation.all_vehicles_trails_between(date_start, date_end_str)

        output_filename = f"world/static/data/{date_start}.json"

        with open(output_filename, 'w') as json_file:
            json.dump(vehicle_trail, json_file, indent=4)

