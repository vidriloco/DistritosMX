"""
Django management command to ingest home device data from CSV files.

This command imports home device records from a CSV file into the TripHome model. It processes
records in batches for better performance and includes error handling and validation.

Usage:
    python manage.py veraset_ingest_home_devices <csv_file> [options]

Required Arguments:
    csv_file: Path to the CSV file containing home device data

Optional Arguments:
    --batch-size N: Number of records to process in each batch (default: 1000)
    --clear-existing: Clear all existing TripHome records before import
    --skip-errors: Skip records with errors and continue processing
    --update-existing: Update existing records if they already exist (default: skip)

Examples:
    # Basic import from a CSV file
    python manage.py veraset_ingest_home_devices data/home_devices.csv

    # Import with custom batch size for better performance on large files
    python manage.py veraset_ingest_home_devices data/home_devices.csv --batch-size 5000

    # Clear existing records and import fresh data
    python manage.py veraset_ingest_home_devices data/home_devices.csv --clear-existing

    # Import and skip records with errors (useful for partial imports)
    python manage.py veraset_ingest_home_devices data/home_devices.csv --skip-errors

    # Update existing records instead of skipping them
    python manage.py veraset_ingest_home_devices data/home_devices.csv --update-existing

CSV File Format:
    The CSV file should be semicolon-delimited and contain the following columns:
    - ad_id: Required. Advertising ID (device identifier) - maps to caid
    - id_type: Optional. Identifier type (aaid, idfa, etc.)
    - iso_country_code: Optional. ISO 2-letter country code - maps to country_iso
    - country: Optional. Full country name
    - region: Optional. State/province/region
    - city: Optional. City name
    - zipcode: Optional. ZIP/postal code
    - geohash_5: Optional. 5-character geohash

Notes:
    - Records with missing ad_id are skipped
    - The command processes records in batches within database transactions
    - Progress is reported every batch_size records
    - Final statistics show total processed, created, updated, skipped, and error counts
    - Home devices are marked as has_been_processed=False by default
"""

import csv
import os
from django.core.management.base import BaseCommand
from django.db import transaction
from world.models import TripHome


def safe_str(value, max_length=None):
    """Convert value to string, strip whitespace, and truncate if needed."""
    if value is None:
        return None
    result = str(value).strip()
    if result.lower() in ['null', 'none', '']:
        return None
    if max_length and len(result) > max_length:
        return result[:max_length]
    return result if result else None


class Command(BaseCommand):
    help = 'Import home device data from CSV file'

    def add_arguments(self, parser):
        parser.add_argument('csv_file', type=str, help='Path to the CSV file')
        parser.add_argument(
            '--batch-size',
            type=int,
            default=1000,
            help='Number of records to process in each batch (default: 1000)'
        )
        parser.add_argument(
            '--clear-existing',
            action='store_true',
            help='Clear all existing TripHome records before import'
        )
        parser.add_argument(
            '--skip-errors',
            action='store_true',
            help='Skip records with errors and continue processing'
        )
        parser.add_argument(
            '--update-existing',
            action='store_true',
            help='Update existing records if they already exist (default: skip)'
        )

    def handle(self, *args, **options):
        csv_file = options['csv_file']
        batch_size = options['batch_size']
        clear_existing = options['clear_existing']
        skip_errors = options['skip_errors']
        update_existing = options['update_existing']
        
        # Validate file exists
        if not os.path.exists(csv_file):
            self.stdout.write(
                self.style.ERROR(f'CSV file not found: {csv_file}')
            )
            return
        
        self.stdout.write(f'Starting import from {csv_file}...')
        
        # Clear existing records if requested
        if clear_existing:
            count = TripHome.objects.count()
            TripHome.objects.all().delete()
            self.stdout.write(f'Cleared {count} existing records')
        
        # Counters for progress reporting
        processed = 0
        created = 0
        updated = 0
        skipped = 0
        errors = 0
        
        try:
            with open(csv_file, 'r', encoding='utf-8') as file:
                # Use semicolon as delimiter
                reader = csv.DictReader(file, delimiter=';')
                
                # Process in batches for better performance
                batch = []
                
                for row in reader:
                    try:
                        home_data = self.prepare_home_data(row)
                        
                        if home_data is None:
                            skipped += 1
                            continue
                        
                        batch.append(home_data)
                        
                        # Process batch when it reaches the batch size
                        if len(batch) >= batch_size:
                            batch_created, batch_updated = self.process_batch(batch, update_existing)
                            created += batch_created
                            updated += batch_updated
                            processed += len(batch)
                            batch = []
                            
                            # Progress reporting
                            self.stdout.write(f'Processed {processed} records...')
                            
                    except Exception as e:
                        errors += 1
                        error_msg = f'Error processing record {processed + len(batch) + 1}: {str(e)}'
                        
                        if skip_errors:
                            self.stdout.write(
                                self.style.WARNING(error_msg)
                            )
                            continue
                        else:
                            self.stdout.write(
                                self.style.ERROR(error_msg)
                            )
                            raise
                
                # Process remaining records in the last batch
                if batch:
                    batch_created, batch_updated = self.process_batch(batch, update_existing)
                    created += batch_created
                    updated += batch_updated
                    processed += len(batch)
            
            # Final statistics
            self.stdout.write(
                self.style.SUCCESS(
                    f'\nImport completed!\n'
                    f'Total processed: {processed}\n'
                    f'Created: {created}\n'
                    f'Updated: {updated}\n'
                    f'Skipped: {skipped}\n'
                    f'Errors: {errors}'
                )
            )
            
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'Failed to import data: {str(e)}')
            )
            raise
    
    def prepare_home_data(self, row):
        """Prepare home device data from CSV row"""
        # Required field: ad_id (maps to caid)
        ad_id = safe_str(row.get('caid'))
        if not ad_id:
            return None
        
        # Validate ad_id length (caid field has max_length=64)
        if len(ad_id) > 64:
            return None
        
        # Optional field: iso_country_code (maps to country_iso)
        iso_country_code = safe_str(row.get('iso_country_code'), max_length=2)
        
        # Prepare the data dictionary
        home_data = {
            'caid': ad_id,
            'country_iso': iso_country_code,
            'has_been_processed': False,  # Home devices start as unprocessed
        }
        
        return home_data
    
    def process_batch(self, batch, update_existing):
        """Process a batch of home device records"""
        created_count = 0
        updated_count = 0
        
        with transaction.atomic():
            for home_data in batch:
                try:
                    caid = home_data['caid']
                    
                    if update_existing:
                        # Update or create
                        obj, was_created = TripHome.objects.update_or_create(
                            caid=caid,
                            defaults={
                                'country_iso': home_data.get('country_iso'),
                                'has_been_processed': home_data.get('has_been_processed', False),
                            }
                        )
                        if was_created:
                            created_count += 1
                        else:
                            updated_count += 1
                    else:
                        # Only create if doesn't exist (skip duplicates)
                        obj, was_created = TripHome.objects.get_or_create(
                            caid=caid,
                            defaults={
                                'country_iso': home_data.get('country_iso'),
                                'has_been_processed': home_data.get('has_been_processed', False),
                            }
                        )
                        if was_created:
                            created_count += 1
                        else:
                            # Skip existing records when update_existing is False
                            pass
                            
                except Exception as e:
                    # Re-raise with more context about the data
                    raise Exception(f"Failed to create/update TripHome record: {str(e)}. Data: {home_data}")
        
        return created_count, updated_count

