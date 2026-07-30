"""
Django management command to import trip data from CSV files.

This command imports trip records from a CSV file into the Trip model. It processes
records in batches for better performance and includes error handling and validation.

Usage:
    python manage.py veraset_import_trips_from_csv <csv_file> [options]

Required Arguments:
    csv_file: Path to the CSV file containing trip data

Optional Arguments:
    --batch-size N: Number of records to process in each batch (default: 1000)
    --clear-existing: Clear all existing trip records before import
    --skip-errors: Skip records with errors and continue processing

Examples:
    # Basic import from a CSV file
    python manage.py veraset_import_trips_from_csv data/output/csv/date=2024-11-01_concatenated.csv

    # Import with custom batch size for better performance on large files
    python manage.py veraset_import_trips_from_csv data/output/csv/trips.csv --batch-size 5000

    # Clear existing trips and import fresh data
    python manage.py veraset_import_trips_from_csv data/output/csv/trips.csv --clear-existing

    # Import and skip records with errors (useful for partial imports)
    python manage.py veraset_import_trips_from_csv data/output/csv/trips.csv --skip-errors

    # Combine options: clear existing, custom batch size, and skip errors
    python manage.py veraset_import_trips_from_csv data/output/csv/trips.csv --clear-existing --batch-size 2000 --skip-errors

CSV File Format:
    The CSV file should contain the following columns:
    - caid: Required. Customer/device identifier
    - utc_timestamp: Required. Timestamp in format 'YYYY-MM-DD HH:MM:SS' or 'YYYY-MM-DD HH:MM:SS.ffffff'
    - latitude: Required. Latitude coordinate
    - longitude: Required. Longitude coordinate
    - horizontal_accuracy: Optional. Horizontal accuracy value
    - id_type: Optional. Identifier type (max 10 chars)
    - ip_address: Optional. IP address
    - iso_country_code: Optional. ISO country code (2 chars)
    - poi_ids: Optional. POI IDs as array string (e.g., "[1, 2, 3]" or "[None]")
    - trip_fields: Required. Trip fields as string representation of array
    - trip_ping_fields: Optional. Trip ping fields as JSON string
    - trip_to_trip_fields: Optional. Trip-to-trip fields as JSON string

Notes:
    - Records with missing required fields (caid, utc_timestamp, latitude, longitude) are skipped
    - Records with empty or invalid trip_fields are skipped
    - The command processes records in batches within database transactions
    - Progress is reported every batch_size records
    - Final statistics show total processed, created, skipped, and error counts
"""

import csv
import os
import re
import ast
import subprocess
from datetime import datetime
from django.core.management.base import BaseCommand
from django.contrib.gis.geos import Point
from django.db import transaction
from django.utils import timezone
from world.models import Trip


def safe_int(value, default=None):
    """Convert value to integer, return default if conversion fails."""
    if value is None or value == '':
        return default
    try:
        return int(value)
    except (ValueError, TypeError):
        return default


def safe_float(value, default=None):
    """Convert value to float, return default if conversion fails."""
    if value is None or value == '':
        return default
    try:
        return float(value)
    except (ValueError, TypeError):
        return default


def safe_str(value, max_length=None):
    """Convert value to string, truncate if needed."""
    if value is None:
        return None
    result = str(value).strip()
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


def safe_bool(value):
    """Convert value to boolean, return None if conversion fails."""
    if value is None or value == '':
        return None
    value_str = str(value).lower().strip()
    if value_str in ['true', '1', 'yes']:
        return True
    elif value_str in ['false', '0', 'no']:
        return False
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


def parse_poi_ids(value):
    """Parse POI IDs from string representation of array."""
    if not value or value == '' or value == '[None]':
        return None
    
    # Remove brackets and quotes
    value = str(value).strip()
    if value.startswith('[') and value.endswith(']'):
        value = value[1:-1]
    
    # Handle [None] case
    if value == 'None' or value == '':
        return None
    
    # Split by comma and clean
    try:
        # Try to parse as Python list literal
        parsed = ast.literal_eval('[' + value + ']')
        # Filter out None values
        result = [str(item) for item in parsed if item is not None and str(item) != 'None']
        return result if result else None
    except:
        # Fallback: split by comma
        items = [item.strip().strip("'\"") for item in value.split(',')]
        items = [item for item in items if item and item != 'None']
        return items if items else None


def parse_trip_fields_string(trip_fields_str):
    """
    Parse trip_fields string which can be in two formats:
    1. List of tuples: "[('traverse_time', '61000'), ('heading', '292.1845'), ...]"
    2. Array format: "[array(['traverse_time', '433'], dtype=object) ...]"
    
    Returns a dictionary with consolidated values.
    For velocity and displacement, sums multiple occurrences.
    """
    if not trip_fields_str or trip_fields_str.strip() == '':
        return {}
    
    result = {}
    velocity_values = []
    displacement_values = []
    
    # Try to parse as list of tuples first (most common format)
    try:
        # Use ast.literal_eval to safely parse the string representation
        parsed_list = ast.literal_eval(trip_fields_str)
        
        if isinstance(parsed_list, list):
            for item in parsed_list:
                if isinstance(item, tuple) and len(item) >= 2:
                    key = str(item[0]).strip()
                    value = item[1]
                    
                    # Convert None to string for consistency
                    if value is None:
                        value = None
                    else:
                        value = str(value).strip()
                    
                    # Handle special cases for velocity and displacement - collect all values
                    if key == 'velocity':
                        if value and value != 'None' and value != '':
                            try:
                                velocity_values.append(float(value))
                            except (ValueError, TypeError):
                                pass
                    elif key == 'displacement':
                        if value and value != 'None' and value != '':
                            try:
                                displacement_values.append(float(value))
                            except (ValueError, TypeError):
                                pass
                    else:
                        # For other fields, use the last value if multiple exist
                        if value is not None and value != 'None' and value != '':
                            result[key] = value
            
            # Sum velocity and displacement values
            if velocity_values:
                result['velocity'] = sum(velocity_values)
            if displacement_values:
                result['displacement'] = sum(displacement_values)
            
            return result
    except (ValueError, SyntaxError):
        # If literal_eval fails, try the old array format
        pass
    
    # Fallback to old array format parsing
    # Pattern to match: array(['key', 'value'], dtype=object)
    pattern = r"array\(\[(['\"])([^'\"]+)\1,\s*(['\"])([^'\"]*?)\3\s*\]"
    matches = re.finditer(pattern, trip_fields_str, re.DOTALL)
    
    for match in matches:
        key = match.group(2).strip()
        value = match.group(4).strip()
        
        # Clean up value
        if value:
            value = re.sub(r'\s*dtype=.*$', '', value).strip()
            value = value.strip("'\"")
        
        # Handle special cases for velocity and displacement
        if key == 'velocity':
            if value and value != 'None' and value != '':
                try:
                    velocity_values.append(float(value))
                except (ValueError, TypeError):
                    pass
        elif key == 'displacement':
            if value and value != 'None' and value != '':
                try:
                    displacement_values.append(float(value))
                except (ValueError, TypeError):
                    pass
        else:
            if value and value != 'None' and value != '':
                result[key] = value
    
    # Sum velocity and displacement values
    if velocity_values:
        result['velocity'] = sum(velocity_values)
    if displacement_values:
        result['displacement'] = sum(displacement_values)
    
    return result


class Command(BaseCommand):
    help = 'Import trip data from CSV file'

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
            help='Clear all existing trip records before import'
        )
        parser.add_argument(
            '--skip-errors',
            action='store_true',
            help='Skip records with errors and continue processing'
        )

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
        
        # Count total records first using wc -l for faster counting
        try:
            result = subprocess.run(
                ['wc', '-l', csv_file],
                capture_output=True,
                text=True,
                check=True
            )
            # wc -l returns total lines including header, subtract 1 for header row
            total_records = int(result.stdout.strip().split()[0]) - 1
        except (subprocess.CalledProcessError, ValueError, IndexError) as e:
            # Fallback to Python counting if wc fails
            with open(csv_file, 'r', encoding='utf-8') as file:
                reader = csv.DictReader(file)
                total_records = sum(1 for _ in reader)
        
        if total_records <= 0:
            self.stdout.write('No records found in CSV file')
            return
        
        # Clear existing records if requested
        if clear_existing:
            count = Trip.objects.count()
            Trip.objects.all().delete()
        
        # Counters for progress reporting
        processed = 0
        created = 0
        skipped = 0
        errors = 0
        
        try:
            with open(csv_file, 'r', encoding='utf-8') as file:
                reader = csv.DictReader(file)
                
                # Process records one by one to output individual status
                for row in reader:
                    processed += 1
                    record_num = processed
                    
                    try:
                        trip_data = self.prepare_trip_data(row)
                        
                        if trip_data is None:
                            skipped += 1
                            self.stdout.write(f'Inserted record {record_num}/{total_records} - Unsuccessful')
                            continue
                        
                        # Process single record
                        self.process_single_record(trip_data)
                        created += 1
                        self.stdout.write(f'Inserted record {record_num}/{total_records} - Successful')
                            
                    except Exception as e:
                        errors += 1
                        skipped += 1
                        self.stdout.write(f'Inserted record {record_num}/{total_records} - Unsuccessful')
                        
                        if skip_errors:
                            continue
                        else:
                            raise
            
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'Failed to import data: {str(e)}')
            )
            raise
    
    def prepare_trip_data(self, row):
        """Prepare trip data from CSV row"""
        # Required fields validation
        caid = safe_str(row.get('caid'))
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
        
        # Create Point object for spatial data
        location = Point(longitude, latitude, srid=4326)
        
        # Parse trip_fields string
        trip_fields_str = safe_str(row.get('trip_fields'))
        
        # Skip records where trip_fields is empty or [None]
        if not trip_fields_str or trip_fields_str.strip() == '' or trip_fields_str.strip() == '[None]':
            return None
        
        trip_fields_parsed = parse_trip_fields_string(trip_fields_str)
        
        # Parse trip_ping_fields and trip_to_trip_fields as JSON
        trip_ping_fields = safe_str(row.get('trip_ping_fields'))
        trip_to_trip_fields = safe_str(row.get('trip_to_trip_fields'))
        
        # Parse POI IDs
        poi_ids = parse_poi_ids(row.get('poi_ids'))
        
        # Extract trip field values with proper type conversion
        traverse_time = safe_int(trip_fields_parsed.get('traverse_time'))
        heading = safe_float(trip_fields_parsed.get('heading'))
        heading_cardinal = safe_str(trip_fields_parsed.get('heading_cardinal'), 10)
        start_time = parse_datetime(trip_fields_parsed.get('start_time'))
        pings = safe_int(trip_fields_parsed.get('pings'))
        end_time = parse_datetime(trip_fields_parsed.get('end_time'))
        overlap_flag = safe_bool(trip_fields_parsed.get('overlap_flag'))
        high_velocity_flag = safe_bool(trip_fields_parsed.get('high_velocity_flag'))
        high_velocity_pings = safe_int(trip_fields_parsed.get('high_velocity_pings'))
        overlap_trip_list = safe_str(trip_fields_parsed.get('overlap_trip_list'))
        velocity = safe_float(trip_fields_parsed.get('velocity'))  # Already summed if multiple
        displacement = safe_float(trip_fields_parsed.get('displacement'))  # Already summed if multiple
        trip_index = safe_int(trip_fields_parsed.get('index'))
        
        # Validate required trip fields - skip record if any are missing
        if traverse_time is None or displacement is None or velocity is None or trip_index is None:
            missing_fields = []
            if traverse_time is None:
                missing_fields.append('traverse_time')
            if displacement is None:
                missing_fields.append('displacement')
            if velocity is None:
                missing_fields.append('velocity')
            if trip_index is None:
                missing_fields.append('trip_index')
            print(f"Missing required trip fields: {missing_fields}")
            print(f"Parsed trip_fields: {trip_fields_parsed}")
            print(f"Original trip_fields string (first 200 chars): {trip_fields_str[:200]}")
            return None
        
        # Prepare the data dictionary
        trip_data = {
            'caid': caid,
            'utc_timestamp': utc_timestamp,
            'latitude': latitude,
            'longitude': longitude,
            'horizontal_accuracy': safe_float(row.get('horizontal_accuracy')),
            'location': location,
            'id_type': safe_str(row.get('id_type'), 10),
            'ip_address': safe_ip_address(row.get('ip_address')),
            'iso_country_code': safe_str(row.get('iso_country_code'), 2),
            'poi_ids': poi_ids,
            # Trip fields
            'traverse_time': traverse_time,
            'heading': heading,
            'heading_cardinal': heading_cardinal,
            'start_time': start_time,
            'pings': pings,
            'end_time': end_time,
            'overlap_flag': overlap_flag,
            'high_velocity_flag': high_velocity_flag,
            'high_velocity_pings': high_velocity_pings,
            'overlap_trip_list': overlap_trip_list,
            'velocity': velocity,
            'displacement': displacement,
            'trip_index': trip_index,
            # Raw JSON fields
            'trip_fields': trip_fields_str if trip_fields_str else None,
            'trip_ping_fields': trip_ping_fields if trip_ping_fields else None,
            'trip_to_trip_fields': trip_to_trip_fields if trip_to_trip_fields else None,
        }

        return trip_data
    
    def process_single_record(self, trip_data):
        """Process a single trip record, raises exception on error"""
        with transaction.atomic():
            # Remove None values to avoid setting them explicitly (except for fields that should be None)
            clean_data = {}
            for key, value in trip_data.items():
                # Keep None for nullable fields, but skip empty strings for some fields
                if value is not None:
                    clean_data[key] = value
                elif key in ['trip_fields', 'trip_ping_fields', 'trip_to_trip_fields', 'poi_ids']:
                    # These fields can be None
                    clean_data[key] = None
            
            # Create the Trip record
            Trip.objects.create(**clean_data)
    
    def process_batch(self, batch):
        """Process a batch of trip records"""
        created_count = 0
        
        with transaction.atomic():
            for trip_data in batch:
                try:
                    # Remove None values to avoid setting them explicitly (except for fields that should be None)
                    clean_data = {}
                    for key, value in trip_data.items():
                        # Keep None for nullable fields, but skip empty strings for some fields
                        if value is not None:
                            clean_data[key] = value
                        elif key in ['trip_fields', 'trip_ping_fields', 'trip_to_trip_fields', 'poi_ids']:
                            # These fields can be None
                            clean_data[key] = None
                    
                    # Create the Trip record
                    Trip.objects.create(**clean_data)
                    created_count += 1
                except Exception as e:
                    # Re-raise with more context about the data
                    raise Exception(f"Failed to create Trip record: {str(e)}. Data: {trip_data}")
        
        return created_count

