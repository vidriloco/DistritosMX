from django.core.management.base import BaseCommand, CommandError
from world.models.ageb_risk import AgebRisk
import os

class Command(BaseCommand):
    help = 'Ingest GeoJSON data into the AgebRisk model'

    def add_arguments(self, parser):
        parser.add_argument('geojson_file', type=str, help='Path to the GeoJSON file')
        parser.add_argument('risk_type', type=str, help='Type of risk to ingest (sexual-abuse, metrobus-agression, taxi-theft, robbery, harassment)')

    def handle(self, *args, **options):
        geojson_file = options['geojson_file']
        risk_type = options['risk_type']

        # Validate file exists
        if not os.path.exists(geojson_file):
            raise CommandError(f'GeoJSON file not found: {geojson_file}')

        # Validate risk type
        valid_risk_types = ['sexual-abuse', 'metrobus-agression', 'taxi-theft', 'microbus-theft', 'harassment']
        if risk_type not in valid_risk_types:
            raise CommandError(f'Invalid risk type. Must be one of: {", ".join(valid_risk_types)}')

        try:
            self.stdout.write(self.style.SUCCESS(f'Starting ingestion of {risk_type} data from {geojson_file}'))
            created, updated = AgebRisk.ingest_geojson(geojson_file, risk_type)
            self.stdout.write(self.style.SUCCESS(
                f'Successfully processed GeoJSON data:\n'
                f'- Created {created} new records\n'
                f'- Updated {updated} existing records'
            ))
        except Exception as e:
            raise CommandError(f'Error processing GeoJSON file: {str(e)}') 