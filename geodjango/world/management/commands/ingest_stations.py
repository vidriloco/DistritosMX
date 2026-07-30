import csv
from django.core.management.base import BaseCommand
from world.models import Station
from django.contrib.gis.geos import Point

class Command(BaseCommand):
    help = 'Import stations from a CSV file'

    def add_arguments(self, parser):
        parser.add_argument('csv_file', type=str, help='The path to the CSV file')

    def handle(self, *args, **kwargs):
        csv_file_path = kwargs['csv_file']
        
        with open(csv_file_path, mode='r', encoding='utf-8') as csv_file:
            reader = csv.DictReader(csv_file)
            for row in reader:
                Station.objects.create(
                    coordinates=Point(float(row['X']), float(row['Y']), srid=4326),
                    system=row['SISTEMA'],
                    name=row['NOMBRE'],
                    line=row['LINEA'],
                    station_number=row['EST'] if 'EST' in row else '', 
                    station_key=row['CVE_EST'],
                    station_eod_key=row['CVE_EOD17'] if 'CVE_EOD17' in row else '',
                    type=row['TIPO'],
                    municipalities_served=row['ALCALDIAS'],
                    year=int(row['AÑO']) if 'AÑO' in row and row['AÑO'] else 0
                )
        self.stdout.write(self.style.SUCCESS(f'Successfully imported stations from {csv_file_path}'))