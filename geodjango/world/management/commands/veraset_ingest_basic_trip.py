"""
Django management command to ingest basic trip data from CSV files.

This command imports basic trip records from a CSV file into the BasicTrip model. It processes
records in batches for better performance and includes error handling and validation.

Usage:
    python manage.py veraset_ingest_basic_trip <csv_file> [options]

Required Arguments:
    csv_file: Path to the CSV file containing basic trip data

Optional Arguments:
    --batch-size N: Number of records to process in each batch (default: 1000)
    --clear-existing: Clear all existing BasicTrip records before import
    --skip-errors: Skip records with errors and continue processing

Examples:
    # Basic import from a CSV file
    python manage.py veraset_ingest_basic_trip data/trips.csv

    # Import with custom batch size for better performance on large files
    python manage.py veraset_ingest_basic_trip data/trips.csv --batch-size 5000

    # Clear existing trips and import fresh data
    python manage.py veraset_ingest_basic_trip data/trips.csv --clear-existing

    # Import and skip records with errors (useful for partial imports)
    python manage.py veraset_ingest_basic_trip data/trips.csv --skip-errors

    # Combine options: clear existing, custom batch size, and skip errors
    python manage.py veraset_ingest_basic_trip data/trips.csv --clear-existing --batch-size 2000 --skip-errors

CSV File Format:
    The CSV file should contain the following columns:
    - caid (or ca_id): Required. Customer/device identifier
    - utc_timestamp: Required. Timestamp in format 'YYYY-MM-DD HH:MM:SS' or 'YYYY-MM-DD HH:MM:SS.ffffff'
    - latitude: Required. Latitude coordinate
    - longitude: Required. Longitude coordinate
    - horizontal_accuracy: Optional. Horizontal accuracy value in meters
    - id_type: Optional. Identifier type (idfa, aaid, etc.)
    - ip_address: Optional. IP address
    - iso_country_code: Optional. ISO country code (2 chars)
    - poi_ids: Optional. POI IDs (comma-separated or empty)

Notes:
    - Records with missing required fields (caid, utc_timestamp, latitude, longitude) are skipped
    - The command processes records in batches within database transactions
    - Progress is reported every batch_size records
    - Final statistics show total processed, created, skipped, and error counts
"""

import csv
import os
from datetime import datetime
from django.core.management.base import BaseCommand
from django.contrib.gis.geos import Point
from django.db import transaction
from world.models import BasicTrip


def safe_float(value, default=None):
    """Convert value to float, return default if conversion fails."""
    if value is None or value == '':
        return default
    try:
        return float(value)
    except (ValueError, TypeError):
        return default


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


def safe_ip_address(value):
    """Convert value to valid IP address, return None if invalid."""
    if not value or value in ['unknown', 'null', '']:
        return None
    try:
        import ipaddress
        ipaddress.ip_address(value)
        return str(value)
    except (ValueError, TypeError):
        return None


def parse_datetime(value):
    """Parse datetime string, return None if conversion fails."""
    if not value or value == '' or value == 'None':
        return None
    try:
        # Try various datetime formats
        formats = [
            '%Y-%m-%d %H:%M:%S.%f',
            '%Y-%m-%d %H:%M:%S',
            '%Y-%m-%d %H:%M:%S.0',
        ]
        for fmt in formats:
            try:
                return datetime.strptime(str(value), fmt)
            except ValueError:
                continue
        return None
    except (ValueError, TypeError):
        return None


class Command(BaseCommand):
    help = 'Import basic trip data from CSV file'

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
            help='Clear all existing BasicTrip records before import'
        )
        parser.add_argument(
            '--skip-errors',
            action='store_true',
            help='Skip records with errors and continue processing'
        )

    def prepare_basic_trip_data(self, row):
        """Prepare basic trip data from CSV row"""
        # Get caid (handle both 'caid' and 'ca_id' column names)
        caid = safe_str(row.get('caid') or row.get('ca_id'))
        if not caid:
            return None
        
        # Parse timestamp
        timestamp_str = safe_str(row.get('utc_timestamp'))
        if not timestamp_str:
            return None
        
        utc_timestamp = parse_datetime(timestamp_str)
        if not utc_timestamp:
            return None
        
        # Parse coordinates
        latitude = safe_float(row.get('latitude'))
        longitude = safe_float(row.get('longitude'))
        
        # Skip records with invalid coordinates
        if latitude is None or longitude is None:
            return None
        
        # Validate coordinate ranges
        if not (-90 <= latitude <= 90) or not (-180 <= longitude <= 180):
            return None
        
        # Build basic trip data dictionary
        trip_data = {
            'caid': caid,
            'utc_timestamp': utc_timestamp,
            'latitude': latitude,
            'longitude': longitude,
        }
        
        # Optional fields
        horizontal_accuracy = safe_float(row.get('horizontal_accuracy'))
        if horizontal_accuracy is not None:
            trip_data['horizontal_accuracy'] = horizontal_accuracy
        
        id_type = safe_str(row.get('id_type'), max_length=10)
        if id_type and id_type.lower() in ['idfa', 'aaid']:
            trip_data['id_type'] = id_type.lower()
        
        ip_address = safe_ip_address(row.get('ip_address'))
        if ip_address:
            trip_data['ip_address'] = ip_address
        
        iso_country_code = safe_str(row.get('iso_country_code'), max_length=2)
        if iso_country_code:
            trip_data['iso_country_code'] = iso_country_code.upper()
        
        poi_ids = safe_str(row.get('poi_ids'))
        if poi_ids:
            trip_data['poi_ids'] = poi_ids
        
        return trip_data

    def process_batch(self, batch):
        """Process a batch of basic trip records"""
        created = 0
        
        with transaction.atomic():
            for trip_data in batch:
                try:
                    BasicTrip.objects.create(**trip_data)
                    created += 1
                except Exception as e:
                    # If there's an error creating a record, skip it
                    # This could happen due to database constraints
                    continue
        
        return created

    def handle(self, *args, **options):
        csv_file = options['csv_file']
        batch_size = options['batch_size']
        clear_existing = options['clear_existing']
        skip_errors = options['skip_errors']
        
        # Validate file exists
        if not os.path.exists(csv_file):
            self.stdout.write(
                self.style.ERROR(f'CSV file not found: {csv_file}')
            )
            return
        
        self.stdout.write(f'Starting import from {csv_file}...')
        
        # Clear existing records if requested
        if clear_existing:
            count = BasicTrip.objects.count()
            BasicTrip.objects.all().delete()
            self.stdout.write(
                self.style.WARNING(f'Cleared {count} existing records')
            )
        
        # Counters for progress reporting
        processed = 0
        created = 0
        skipped = 0
        errors = 0
        
        try:
            with open(csv_file, 'r', encoding='utf-8') as file:
                # Detect delimiter with fallback
                sample = file.read(8192)  # Larger sample size
                file.seek(0)
                
                delimiter = ','
                try:
                    sniffer = csv.Sniffer()
                    delimiter = sniffer.sniff(sample).delimiter
                    self.stdout.write(f'Detected delimiter: {repr(delimiter)}')
                except (csv.Error, AttributeError):
                    # Fallback: try to detect manually by counting occurrences
                    comma_count = sample.count(',')
                    semicolon_count = sample.count(';')
                    tab_count = sample.count('\t')
                    
                    if semicolon_count > comma_count and semicolon_count > tab_count:
                        delimiter = ';'
                        self.stdout.write('Using semicolon delimiter (detected manually)')
                    elif tab_count > comma_count and tab_count > semicolon_count:
                        delimiter = '\t'
                        self.stdout.write('Using tab delimiter (detected manually)')
                    else:
                        delimiter = ','
                        self.stdout.write('Using comma delimiter (default)')
                
                reader = csv.DictReader(file, delimiter=delimiter)
                
                # Process in batches for better performance
                batch = []
                
                for row in reader:
                    try:
                        trip_data = self.prepare_basic_trip_data(row)
                        
                        if trip_data is None:
                            skipped += 1
                            continue
                        
                        batch.append(trip_data)
                        
                        # Process batch when it reaches the batch size
                        if len(batch) >= batch_size:
                            batch_created = self.process_batch(batch)
                            created += batch_created
                            processed += len(batch)
                            batch = []
                            
                            # Progress reporting
                            self.stdout.write(
                                f'Processed {processed} records... '
                                f'(Created: {created}, Skipped: {skipped}, Errors: {errors})'
                            )
                            
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
                    batch_created = self.process_batch(batch)
                    created += batch_created
                    processed += len(batch)
            
            # Final summary
            self.stdout.write('')
            self.stdout.write(
                self.style.SUCCESS('=' * 60)
            )
            self.stdout.write(
                self.style.SUCCESS('Import Summary:')
            )
            self.stdout.write(
                self.style.SUCCESS(f'  Total records processed: {processed}')
            )
            self.stdout.write(
                self.style.SUCCESS(f'  Successfully created: {created}')
            )
            self.stdout.write(
                self.style.WARNING(f'  Skipped: {skipped}')
            )
            self.stdout.write(
                self.style.ERROR(f'  Errors: {errors}')
            )
            self.stdout.write(
                self.style.SUCCESS('=' * 60)
            )
            
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'Failed to import data: {str(e)}')
            )
            import traceback
            self.stdout.write(
                self.style.ERROR(traceback.format_exc())
            )
            raise

