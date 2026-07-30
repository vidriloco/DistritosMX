from django.core.management.base import BaseCommand
from world.models import VehicleLocation
from django.contrib.gis.geos import Point
import random
import string
import requests
import json
import urllib3
from django.utils import timezone

urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

class Command(BaseCommand):
    help = 'Scrap vehicle locations from URL'
    
    def generate_random_device_id(self):
        part1 = ''.join(random.choices(string.ascii_letters + string.digits, k=8))
        part2 = ''.join(random.choices(string.ascii_letters + string.digits, k=12))
        part3 = ''.join(random.choices(string.ascii_letters + string.digits + '-_', k=152))
        return f"{part1}-{part2}:{part3}"
    
    def generate_random_ios_version(self):
        return f"{random.randint(14, 18)}.{random.randint(0,1)}.{random.randint(0, 3)}"
    
    def add_arguments(self, parser):
        parser.add_argument('servers_file', type=str, help='The path to the servers file')
        parser.add_argument('line_number', type=int, help='Line number')

    def handle(self, *args, **kwargs):
        servers_file = kwargs['servers_file']
        line_number = kwargs['line_number']
        
        ip_addresses = []
        with open(servers_file, 'r') as file:
            ip_addresses = file.read().splitlines()

        max_stations = 10
        if line_number == 1:
            max_stations = 46
        elif line_number == 2:
            max_stations = 37
        elif line_number == 3:
            max_stations = 38
        elif line_number == 4:
            max_stations = 39
        elif line_number == 5:
            max_stations = 51
        elif line_number == 6:
            max_stations = 37
        elif line_number == 7:
            max_stations = 31

        
        for i in range(0, max_stations):
            station_number = f"mb_l{line_number}_e{i}"
            self.fetch_vehicle_locations(ip_addresses, station_number)

    def fetch_vehicle_locations(self, ip_addresses, station_number):
        random_device_id = self.generate_random_device_id()
        random_ios_version = self.generate_random_ios_version()

        url = f"https://apiapp.cdmx.gob.mx/index.php/v1/MovilidadIntegrada/MetrobusArrivalTime?station_id_metrobus={station_number}&os=iphone&os_version={random_ios_version}&app_version=3.3.1&lang=en&device_id={random_device_id}&user_id="
        proxies = {
            'http': random.choice(ip_addresses)
        }

        response = requests.get(url, proxies=proxies, verify=False)
        response_json = response.json()

        json_response = "200 - OK"
        if response.status_code != 200:
            json_response = response_json

        print(f"Scraping station with number: {station_number}")

        for arrival_collection in response_json.get('response', {}).get('arrivals_collection', []):
            for vehicle in arrival_collection.get('arrivals', []):
                VehicleLocation.objects.create(
                    station_number=station_number,
                    vehicle_id=vehicle['metrobus_vehicle_id'],
                    time_minutes_left=vehicle['metrobus_time_minutes_left'],
                    vehicle_line=vehicle['metrobus_vehicle_line'],
                    vehicle_destination=vehicle['metrobus_vehicle_destination'],
                    vehicle_location=Point(vehicle['metrobus_vehicle_longitude'], vehicle['metrobus_vehicle_latitude'], srid=4326),
                    json_response=json_response,
                    created_at=timezone.now()
                )