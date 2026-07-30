import csv
from django.core.management.base import BaseCommand
from django.utils.dateparse import parse_datetime
from world.models import Station

class Command(BaseCommand):
    help = 'Import Metro transaction data from CSV file and output to another CSV file'

    def add_arguments(self, parser):
        parser.add_argument('input_file', type=str, help='Path to the input CSV file')
        parser.add_argument('--output_file', type=str, help='Path to the output CSV file')

    def handle(self, *args, **options):
        input_csv_file_path = options['input_file']
        output_csv_file_path = options['output_file']

        # Preload all stations into a dictionary for faster lookup
        stations = {f"{station.name.upper()}-{station.system}": station for station in Station.objects.all()}

        # Prepare a list to store rows for the output CSV
        output_rows = []

        with open(input_csv_file_path, 'r') as csvfile:
            reader = csv.DictReader(csvfile)
            for index, row in enumerate(reader):                
                station_name_upper = row['estacion'].strip().upper()

                system_identifier = row['organismo']

                if system_identifier == "50":
                    system_identifier = "STC Metro"
                elif system_identifier == "1":
                    system_identifier = "Metrobús"
                elif system_identifier == "60":
                    system_identifier = "STE Cablebús"
                elif system_identifier == "90":
                    system_identifier = "STE Tren ligero"

                station = stations.get(f'{station_name_upper}-{system_identifier}')

                if not station and system_identifier == "STE Tren ligero":
                    system_identifier = "STE Trolebús"
                    print(f"Looking up for {system_identifier}")
                    continue

                station = stations.get(f'{station_name_upper}-{system_identifier}')

                if not station and system_identifier == "STE Trolebús":
                    system_identifier = "STE Trolebús Elevado"
                    print(f"Looking up for {system_identifier}")
                    continue

                station = stations.get(f'{station_name_upper}-{system_identifier}')

                if not station:
                    print(self.style.WARNING(f'Station not found for {row["estacion"]}'))
                    continue

                # Prepare the output row
                output_row = {
                    'station_key': station.station_key,
                    'card_identifier': int(row['csdec']),
                    'system_identifier': system_identifier,
                    'line': row['linea'],
                    'station_name': station.name,
                    'operation': row['operacion'],
                    'amount': float(row['monto']),
                    'final_amount': float(row['saldo_final']),
                    'datetime': parse_datetime(row['fecha_hora']),
                    'station_id': station.id,
                    'lat':  station.lat(),
                    'lng': station.lng()
                }
                
                print("Processing #"+str(index))

                output_rows.append(output_row)

        # Write the output rows to a new CSV file
        with open(output_csv_file_path, 'w', newline='') as outfile:
            fieldnames = output_rows[0].keys() if output_rows else []
            writer = csv.DictWriter(outfile, fieldnames=fieldnames)

            writer.writeheader()
            for output_row in output_rows:
                writer.writerow(output_row)

        self.stdout.write(self.style.SUCCESS(f'Successfully exported Metro transaction data to {output_csv_file_path}'))

