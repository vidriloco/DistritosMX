from django.core.management.base import BaseCommand
from world.models import TripsMatching
import csv
import os


class Command(BaseCommand):
    help = 'Export all TripsMatching records to a CSV file'

    def add_arguments(self, parser):
        parser.add_argument(
            'output_file',
            type=str,
            help='Path to the output CSV file'
        )
        parser.add_argument(
            '--batch-size',
            type=int,
            default=1000,
            help='Number of records to process in each batch (default: 1000)'
        )

    def handle(self, *args, **options):
        output_file = options['output_file']
        batch_size = options.get('batch_size', 1000)

        # Get the directory of the output file
        output_dir = os.path.dirname(output_file)
        if output_dir and not os.path.exists(output_dir):
            os.makedirs(output_dir, exist_ok=True)

        # Get total count
        total_count = TripsMatching.objects.count()
        self.stdout.write(f'Found {total_count} TripsMatching records to export')

        if total_count == 0:
            self.stdout.write(self.style.WARNING('No records to export'))
            return

        # Define CSV columns
        fieldnames = [
            'trip_id',
            'origin_polygon',
            'origin_polygon_name',
            'destination_polygon',
            'destination_polygon_name',
            'date',
            'time_of_day',
            'created_at',
            'updated_at'
        ]

        # Write CSV file
        records_exported = 0
        with open(output_file, 'w', newline='', encoding='utf-8') as csvfile:
            writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
            writer.writeheader()

            # Process records using iterator for memory efficiency
            queryset = TripsMatching.objects.all().order_by('-date')
            
            for record in queryset.iterator(chunk_size=batch_size):
                writer.writerow({
                    'trip_id': record.trip_id or '',
                    'origin_polygon': record.origin_polygon or '',
                    'origin_polygon_name': record.origin_polygon_name or '',
                    'destination_polygon': record.destination_polygon or '',
                    'destination_polygon_name': record.destination_polygon_name or '',
                    'date': record.date.isoformat() if record.date else '',
                    'time_of_day': record.time_of_day or '',
                    'created_at': record.created_at.isoformat() if record.created_at else '',
                    'updated_at': record.updated_at.isoformat() if record.updated_at else '',
                })
                records_exported += 1

                # Progress update
                if records_exported % batch_size == 0:
                    self.stdout.write(
                        f'Exported {records_exported}/{total_count} records...'
                    )

        self.stdout.write(
            self.style.SUCCESS(
                f'\nSuccessfully exported {records_exported} records to {output_file}'
            )
        )

