"""
Django management command to generate a txt file with CAID values that match
displacement criteria: displacement > 2 and < 20.

This command queries the Trip table and extracts unique CAID values where
the displacement field is greater than 2 and less than 20.

Usage:
    python manage.py veraset_generate_fit_trips [options]

Optional Arguments:
    --output-file PATH: Path to output txt file (default: fit_trips_caids.txt)
    --batch-size N: Number of records to process in each batch (default: 10000)

Examples:
    # Basic usage - generate fit_trips_caids.txt in current directory
    python manage.py veraset_generate_fit_trips

    # Specify custom output file
    python manage.py veraset_generate_fit_trips --output-file /path/to/output.txt

    # Use custom batch size for better performance
    python manage.py veraset_generate_fit_trips --batch-size 50000
"""

import os
from django.core.management.base import BaseCommand
from world.models import Trip


class Command(BaseCommand):
    help = 'Generate a txt file with CAID values where displacement > 2 and < 20'

    def add_arguments(self, parser):
        parser.add_argument(
            '--output-file',
            type=str,
            default='fit_trips_caids.txt',
            help='Path to output txt file (default: fit_trips_caids.txt)'
        )
        parser.add_argument(
            '--batch-size',
            type=int,
            default=10000,
            help='Number of records to process in each batch (default: 10000)'
        )

    def handle(self, *args, **options):
        output_file = options['output_file']
        batch_size = options['batch_size']
        
        self.stdout.write('Starting to generate fit trips CAID list...')
        self.stdout.write(f'Filtering trips where displacement > 2 and < 20')
        
        # Query trips with displacement > 2 and < 20
        # Get distinct CAIDs
        queryset = Trip.objects.filter(
            displacement__gt=2,
            displacement__lt=20
        ).exclude(
            displacement__isnull=True
        )
        
        # Get distinct CAIDs
        caids = queryset.values_list('caid', flat=True).distinct()
        total_caids = caids.count()
        
        if total_caids == 0:
            self.stdout.write(
                self.style.WARNING('No CAIDs found matching the criteria.')
            )
            return
        
        self.stdout.write(f'Found {total_caids} unique CAIDs matching the criteria')
        
        # Create output directory if it doesn't exist
        output_dir = os.path.dirname(os.path.abspath(output_file))
        if output_dir and not os.path.exists(output_dir):
            os.makedirs(output_dir)
            self.stdout.write(f'Created output directory: {output_dir}')
        
        # Write CAIDs to file
        try:
            written_count = 0
            with open(output_file, 'w', encoding='utf-8') as f:
                # Process in batches to handle large datasets efficiently
                for i in range(0, total_caids, batch_size):
                    batch_caids = list(caids[i:i + batch_size])
                    for caid in batch_caids:
                        if caid:  # Only write non-empty CAIDs
                            f.write(f'{caid}\n')
                            written_count += 1
                    
                    if (i + batch_size) < total_caids:
                        batch_num = (i // batch_size) + 1
                        total_batches = (total_caids + batch_size - 1) // batch_size
                        self.stdout.write(
                            f'Processed batch {batch_num}/{total_batches} '
                            f'({written_count} CAIDs written so far)...'
                        )
            
            self.stdout.write(
                self.style.SUCCESS(
                    f'\nSuccessfully generated output file: {output_file}\n'
                    f'Total CAIDs written: {written_count}'
                )
            )
            
        except IOError as e:
            self.stdout.write(
                self.style.ERROR(f'Failed to write output file {output_file}: {str(e)}')
            )
            raise
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'Unexpected error: {str(e)}')
            )
            raise

