import csv
import os
import ipaddress
from datetime import datetime
from django.core.management.base import BaseCommand
from django.contrib.gis.geos import Point
from django.db import transaction
from django.utils import timezone
from world.models import PhoneLocation


def safe_int(value, default=0):
    """Convert value to integer, return default if conversion fails."""
    try:
        return int(value) if value else default
    except (ValueError, TypeError):
        return default


def safe_float(value, default=0.0):
    """Convert value to float, return default if conversion fails."""
    try:
        return float(value) if value else default
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
        # Validate IP address format
        ipaddress.ip_address(value)
        return str(value)
    except (ValueError, TypeError):
        return None


class Command(BaseCommand):
    help = 'Import phone location data from CSV file'

    def add_arguments(self, parser):
        parser.add_argument('csv_file', type=str, help='Path to the CSV file')
        parser.add_argument(
            '--provider',
            type=str,
            choices=['quadrant', 'veraset'],
            default='quadrant',
            help='Data provider format: quadrant (default) or veraset'
        )
        parser.add_argument(
            '--batch-size',
            type=int,
            default=1000,
            help='Number of records to process in each batch (default: 1000)'
        )
        parser.add_argument(
            '--clear-existing',
            action='store_true',
            help='Clear all existing phone location records before import'
        )
        parser.add_argument(
            '--skip-errors',
            action='store_true',
            help='Skip records with errors and continue processing'
        )
        parser.add_argument(
            '--no-headers',
            action='store_true',
            help='CSV file has no headers, use positional columns'
        )

    def handle(self, *args, **options):
        csv_file = options['csv_file']
        provider = options['provider']
        batch_size = options['batch_size']
        clear_existing = options['clear_existing']
        skip_errors = options['skip_errors']
        no_headers = options['no_headers']
        
        # Validate file exists
        if not os.path.exists(csv_file):
            self.stdout.write(
                self.style.ERROR(f'CSV file not found: {csv_file}')
            )
            return
        
        self.stdout.write(f'Starting import from {csv_file} using {provider} provider...')
        
        # Clear existing records if requested
        if clear_existing:
            count = PhoneLocation.objects.count()
            PhoneLocation.objects.all().delete()
            self.stdout.write(f'Cleared {count} existing records')
        
        # Counters for progress reporting
        processed = 0
        created = 0
        skipped = 0
        errors = 0
        
        try:
            with open(csv_file, 'r', encoding='utf-8') as file:
                if no_headers:
                    reader = csv.reader(file)
                else:
                    reader = csv.DictReader(file)
                
                # Process in batches for better performance
                batch = []
                
                for row in reader:
                    try:
                        # Clean and prepare the data based on provider
                        if provider == 'veraset':
                            location_data = self.parse_veraset_row(row)
                        elif no_headers:
                            location_data = self.prepare_location_data_from_list(row)
                        else:
                            location_data = self.prepare_location_data(row)
                        
                        if location_data is None:
                            skipped += 1
                            continue
                        
                        batch.append(location_data)
                        
                        # Process batch when it reaches the batch size
                        if len(batch) >= batch_size:
                            created += self.process_batch(batch)
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
                    created += self.process_batch(batch)
                    processed += len(batch)
            
            # Final statistics
            self.stdout.write(
                self.style.SUCCESS(
                    f'\nImport completed!\n'
                    f'Total processed: {processed}\n'
                    f'Created: {created}\n'
                    f'Skipped: {skipped}\n'
                    f'Errors: {errors}'
                )
            )
            
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'Failed to import data: {str(e)}')
            )
    
    def prepare_location_data(self, row):
        """Prepare location data from CSV row"""
        # Required fields validation
        device_id = safe_str(row.get('device_id'))
        if not device_id:
            return None
        
        # Parse timestamp
        timestamp = safe_int(row.get('timestamp'))
        if timestamp == 0:
            return None
        
        # Parse coordinates
        latitude = safe_float(row.get('latitude'))
        longitude = safe_float(row.get('longitude'))
        
        # Skip records with invalid coordinates
        if latitude == 0.0 and longitude == 0.0:
            return None
        
        # Create Point object for spatial data
        location = Point(longitude, latitude, srid=4326)
        
        # Prepare the data dictionary
        location_data = {
            'device_id': device_id,
            'id_type': safe_str(row.get('id_type'), 10),
            'latitude': latitude,
            'longitude': longitude,
            'horizontal_accuracy': safe_float(row.get('horizontal_accuracy')),
            'location': location,
            'timestamp': timestamp,
            'ip_address': safe_ip_address(row.get('ip_address')),
            'device_os': safe_str(row.get('device_os'), 10),
            'os_version': safe_str(row.get('os_version'), 50),
            'user_agent': safe_str(row.get('user_agent')),
            'country': safe_str(row.get('country'), 2),
            'geohash': safe_str(row.get('geohash'), 20),
            'source_id': safe_str(row.get('source_id'), 255),
            'publisher_id': safe_str(row.get('publisher_id'), 255),
            'app_id': safe_str(row.get('app_id'), 255),
            'location_context': safe_str(row.get('location_context'), 1),
            'consent': safe_str(row.get('consent'), 1),
            'quad_id': safe_str(row.get('quad_id'), 255),
        }
        
        return location_data
    
    def prepare_location_data_from_list(self, row):
        """Prepare location data from CSV row list (no headers)"""
        # Expected column order based on the sample data:
        # device_id, id_type, latitude, longitude, horizontal_accuracy, timestamp, 
        # ip_address, device_os, user_agent, country, location_context, 
        # source_id, geohash, consent, publisher_id, app_id, quad_id
        
        if len(row) < 17:
            return None
        
        # Required fields validation
        device_id = safe_str(row[0])
        if not device_id:
            return None
        
        # Parse timestamp
        timestamp = safe_int(row[5])
        if timestamp == 0:
            return None
        
        # Parse coordinates
        latitude = safe_float(row[2])
        longitude = safe_float(row[3])
        
        # Skip records with invalid coordinates
        if latitude == 0.0 and longitude == 0.0:
            return None
        
        # Create Point object for spatial data
        location = Point(longitude, latitude, srid=4326)
        
        # Prepare the data dictionary
        location_data = {
            'device_id': device_id,
            'id_type': safe_str(row[1], 10),
            'latitude': latitude,
            'longitude': longitude,
            'horizontal_accuracy': safe_float(row[4]),
            'location': location,
            'timestamp': timestamp,
            'ip_address': safe_ip_address(row[6]),
            'device_os': safe_str(row[7], 10),
            'os_version': None,  # Not in the sample data
            'user_agent': safe_str(row[8]),
            'country': safe_str(row[9], 2),
            'geohash': safe_str(row[12], 20),
            'source_id': safe_str(row[11], 255),
            'publisher_id': safe_str(row[14], 255),
            'app_id': safe_str(row[15], 255),
            'location_context': safe_str(row[10], 1),
            'consent': safe_str(row[13], 1),
            'quad_id': safe_str(row[16], 255),
        }
        
        return location_data
    
    def parse_veraset_row(self, row):
        """Parse veraset CSV row format with headers: ad_id,utc_timestamp,horizontal_accuracy,id_type,ip_address,latitude,longitude,iso_country_code,poi_ids,date"""
        # Required fields validation
        device_id = safe_str(row.get('ad_id'))
        if not device_id:
            return None
        
        # Parse timestamp from ISO format: 2025-09-01 00:54:03.000
        timestamp_str = safe_str(row.get('utc_timestamp'))
        if not timestamp_str:
            return None
        
        try:
            # Parse the timestamp string to datetime, then convert to Unix timestamp
            dt = datetime.strptime(timestamp_str, '%Y-%m-%d %H:%M:%S.%f')
            timestamp = int(dt.timestamp())
        except ValueError:
            try:
                # Try without microseconds
                dt = datetime.strptime(timestamp_str, '%Y-%m-%d %H:%M:%S')
                timestamp = int(dt.timestamp())
            except ValueError:
                # If timestamp parsing fails, skip this record
                return None
        
        # Validate timestamp is reasonable (not 0 or negative)
        if timestamp <= 0:
            return None
        
        # Parse coordinates
        latitude = safe_float(row.get('latitude'))
        longitude = safe_float(row.get('longitude'))
        
        # Skip records with invalid coordinates
        if latitude == 0.0 and longitude == 0.0:
            return None
        
        # Create Point object for spatial data
        location = Point(longitude, latitude, srid=4326)
        
        # Parse accuracy
        accuracy = safe_float(row.get('horizontal_accuracy'))
        
        # Parse country and clean city data
        country = safe_str(row.get('iso_country_code'), 2)
        poi_ids = safe_str(row.get('poi_ids'))
        # Clean poi_ids data - remove brackets and quotes if present
        if poi_ids and poi_ids.startswith("['") and poi_ids.endswith("']"):
            poi_ids = poi_ids[2:-2]  # Remove [' and ']
        elif poi_ids and poi_ids.startswith("[") and poi_ids.endswith("]"):
            poi_ids = poi_ids[1:-1]  # Remove [ and ]
        
        # Prepare the data dictionary
        location_data = {
            'device_id': device_id,
            'id_type': safe_str(row.get('id_type'), 10),
            'latitude': latitude,
            'longitude': longitude,
            'horizontal_accuracy': accuracy,
            'location': location,
            'timestamp': timestamp,
            'ip_address': safe_ip_address(row.get('ip_address')),
            'device_os': None,  # Not available in veraset format
            'os_version': None,  # Not available in veraset format
            'user_agent': None,  # Not available in veraset format
            'country': country,
            'geohash': None,  # Not available in veraset format
            'source_id': None,  # Not available in veraset format
            'publisher_id': None,  # Not available in veraset format
            'app_id': None,  # Not available in veraset format
            'location_context': None,  # Not available in veraset format
            'consent': None,  # Not available in veraset format
            'quad_id': None,  # Not available in veraset format
        }
        
        return location_data
    
    def process_batch(self, batch):
        """Process a batch of location records"""
        created_count = 0
        
        with transaction.atomic():
            for location_data in batch:
                try:
                    # Remove None values to avoid setting them explicitly
                    clean_data = {k: v for k, v in location_data.items() if v is not None}
                    
                    # Create the PhoneLocation record
                    PhoneLocation.objects.create(**clean_data)
                    created_count += 1
                except Exception as e:
                    # Re-raise with more context about the data
                    raise Exception(f"Failed to create PhoneLocation record: {str(e)}. Data: {location_data}")
        
        return created_count
