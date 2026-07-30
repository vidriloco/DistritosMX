from django.core.management.base import BaseCommand
from convert_shp_to_csv import convert_shp_to_csv
import os

class Command(BaseCommand):
    help = 'Convert a shapefile to CSV format'

    def add_arguments(self, parser):
        parser.add_argument('input_shapefile', type=str, help='Path to the input Shapefile (.shp)')
        parser.add_argument('output_csvfile', type=str, help='Path to save the output CSV file')

    def handle(self, *args, **kwargs):
        input_shapefile = kwargs['input_shapefile']
        output_csvfile = kwargs['output_csvfile']

        # Ensure the input file exists
        if not os.path.exists(input_shapefile):
            self.stdout.write(self.style.ERROR(f"Shapefile '{input_shapefile}' does not exist."))
            return

        try:
            # Convert shapefile to CSV
            convert_shp_to_csv(input_shapefile, output_csvfile)
            self.stdout.write(self.style.SUCCESS(f'Successfully converted {input_shapefile} to {output_csvfile}'))
        except Exception as e:
            self.stdout.write(self.style.ERROR(f"Error converting shapefile: {str(e)}"))
