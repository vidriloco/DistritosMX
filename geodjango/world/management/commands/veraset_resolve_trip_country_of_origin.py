"""

Ideal example: 
    
    python manage.py veraset_resolve_trip_country_of_origin --dry-run --batch-size 25 --api-key 5e5d168e-78b2-45c5-961f-72c6a80562e2


Django management command to resolve trip country of origin by querying Veraset API.

This command identifies CAIDs (Customer/Device IDs) from the Trip table that are not
yet registered in the TripHome table, then queries the Veraset API to determine their
country of origin. It creates or updates TripHome records with the country information
and marks trips as visitors if they are not from Mexico.

Usage:
    python manage.py veraset_resolve_trip_country_of_origin [options]

Optional Arguments:
    --batch-size N: Number of CAIDs to process in each API request (default: 50)
    --dry-run: Run in dry-run mode without making actual API calls
    --api-key KEY: API key for Veraset API (default: provided key)

Examples:
    # Basic usage - process all CAIDs not in TripHome table
    python manage.py veraset_resolve_trip_country_of_origin

    # Use custom batch size for better performance
    python manage.py veraset_resolve_trip_country_of_origin --batch-size 100

    # Dry run to see what would be processed without making API calls
    python manage.py veraset_resolve_trip_country_of_origin --dry-run

    # Use a custom API key
    python manage.py veraset_resolve_trip_country_of_origin --api-key your-api-key-here

    # Combine options: dry run with custom batch size
    python manage.py veraset_resolve_trip_country_of_origin --dry-run --batch-size 25 --api-key 5e5d168e-78b2-45c5-961f-72c6a80562e2

How it works:
    1. Finds all unique CAIDs from Trip table
    2. Filters out CAIDs that already exist in TripHome table
    3. Processes remaining CAIDs in batches via Veraset API
    4. For each CAID, creates/updates TripHome record with:
       - country_iso: ISO country code from API
       - has_been_processed: Processing status flag
    5. CAIDs not returned by API are still recorded with null values for later processing

API Details:
    - Endpoint: https://platform.prd.veraset.tech/v1/home/home_for_devices
    - Method: POST
    - Payload: JSON with 'device_ids' array and 'dry_run' flag
    - Response: JSON with 'data' array containing 'ad_id' and 'iso_country_code'

Notes:
    - Only processes CAIDs that don't already exist in TripHome table
    - Processes records in batches within database transactions
    - Progress is reported for each batch
    - Missing CAIDs (not returned by API) are still recorded with null values
    - Final statistics show total processed, created, updated, and error counts
    - API timeout is set to 30 seconds per request
"""

import requests
import json
from django.core.management.base import BaseCommand
from django.db import transaction
from django.db.models import Q
from world.models import Trip, TripHome


class Command(BaseCommand):
    help = 'Resolve trip country of origin by querying Veraset API for CAIDs not in TripHome table'

    def add_arguments(self, parser):
        parser.add_argument(
            '--batch-size',
            type=int,
            default=50,
            help='Number of CAIDs to process in each API request (default: 50)'
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Run in dry-run mode (does not make actual API calls)'
        )
        parser.add_argument(
            '--api-key',
            type=str,
            default='5e5d168e-78b2-45c5-961f-72c6a80562e2',
            help='API key for Veraset API (default: provided key)'
        )

    def handle(self, *args, **options):
        batch_size = options['batch_size']
        dry_run = options['dry_run']
        api_key = options['api_key']
        
        # Get all unique CAIDs from Trip that are not in TripHome
        existing_caids = set(TripHome.objects.values_list('caid', flat=True))
        all_trip_caids = Trip.objects.values_list('caid', flat=True).distinct()
        
        # Filter out CAIDs that already exist in TripHome
        caids_to_process = [caid for caid in all_trip_caids if caid not in existing_caids]
        
        total_caids = len(caids_to_process)
        
        if total_caids == 0:
            self.stdout.write(
                self.style.SUCCESS('All CAIDs are already registered in TripHome table.')
            )
            return
        
        self.stdout.write(
            f'Found {total_caids} unique CAIDs to process (not in TripHome table)'
        )
        
        if dry_run:
            self.stdout.write(
                self.style.WARNING('DRY RUN MODE: No API calls will be made')
            )
        
        # Process in batches
        processed = 0
        created = 0
        updated = 0
        errors = 0
        
        for i in range(0, total_caids, batch_size):
            batch = caids_to_process[i:i + batch_size]
            batch_num = (i // batch_size) + 1
            total_batches = (total_caids + batch_size - 1) // batch_size
            
            self.stdout.write(
                f'Processing batch {batch_num}/{total_batches} ({len(batch)} CAIDs)...'
            )
            
            try:
                if dry_run:
                    self.stdout.write(
                        self.style.WARNING(
                            f'[DRY RUN] Would send: {json.dumps(batch[:3], indent=2)}... (showing first 3)'
                        )
                    )
                    # Simulate processing for dry run
                    for caid in batch:
                        # In dry run, just count what would be processed
                        processed += 1
                else:
                    result = self.process_batch(batch, api_key)
                    processed += result['processed']
                    created += result['created']
                    updated += result['updated']
                    errors += result['errors']
                    
            except Exception as e:
                errors += len(batch)
                self.stdout.write(
                    self.style.ERROR(f'Error processing batch {batch_num}: {str(e)}')
                )
                continue
        
        # Final statistics
        self.stdout.write(
            self.style.SUCCESS(
                f'\nProcessing completed!\n'
                f'Total CAIDs processed: {processed}\n'
                f'Created: {created}\n'
                f'Updated: {updated}\n'
                f'Errors: {errors}'
            )
        )
    
    def process_batch(self, caids, api_key):
        """Process a batch of CAIDs through the Veraset API"""
        url = 'https://platform.prd.veraset.tech/v1/home/home_for_devices'
        headers = {
            'X-API-Key': api_key,
            'Content-Type': 'application/json'
        }
        
        payload = {
            'dry_run': False,
            'device_ids': caids
        }
        
        created_count = 0
        updated_count = 0
        error_count = 0
        
        try:
            response = requests.post(url, headers=headers, json=payload, timeout=30)
            response.raise_for_status()
            
            response_data = response.json()
            
            # Check for API errors
            if response_data.get('error_code', 0) != 0:
                error_message = response_data.get('error_message', 'Unknown error')
                self.stdout.write(
                    self.style.ERROR(f'API Error: {error_message}')
                )
                error_count = len(caids)
                return {
                    'processed': len(caids),
                    'created': 0,
                    'updated': 0,
                    'errors': error_count
                }
            
            # Process the data array
            data_items = response_data.get('data', [])
            
            if not data_items:
                self.stdout.write(
                    self.style.WARNING('No data returned from API for this batch')
                )
                error_count = len(caids)
                return {
                    'processed': len(caids),
                    'created': 0,
                    'updated': 0,
                    'errors': error_count
                }
            
            # Process each item in the response
            with transaction.atomic():
                for item in data_items:
                    ad_id = item.get('ad_id')
                    iso_country_code = item.get('iso_country_code')
                    
                    if not ad_id:
                        error_count += 1
                        continue
                    
                    # Mark as processed since we got a response from the API
                    has_been_processed = True
                    
                    # Create or update TripHome record
                    trip_home, created = TripHome.objects.update_or_create(
                        caid=ad_id,
                        defaults={
                            'has_been_processed': has_been_processed,
                            'country_iso': iso_country_code,
                        }
                    )
                    
                    if created:
                        created_count += 1
                    else:
                        updated_count += 1
            
            # Count any CAIDs that were sent but not returned in response
            returned_caids = {item.get('ad_id') for item in data_items if item.get('ad_id')}
            missing_caids = set(caids) - returned_caids
            
            if missing_caids:
                self.stdout.write(
                    self.style.WARNING(
                        f'{len(missing_caids)} CAID(s) not found in API response: '
                        f'{list(missing_caids)[:5]}...'
                    )
                )
                # Create records for missing CAIDs with null country (they might be processed later)
                with transaction.atomic():
                    for caid in missing_caids:
                        TripHome.objects.get_or_create(
                            caid=caid,
                            defaults={
                                'has_been_processed': False,
                                'country_iso': None,
                            }
                        )
            
            self.stdout.write(
                f'  ✓ Processed {len(data_items)} records (created: {created_count}, updated: {updated_count})'
            )
            
        except requests.exceptions.RequestException as e:
            self.stdout.write(
                self.style.ERROR(f'Request error: {str(e)}')
            )
            error_count = len(caids)
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'Unexpected error: {str(e)}')
            )
            error_count = len(caids)
        
        return {
            'processed': len(caids),
            'created': created_count,
            'updated': updated_count,
            'errors': error_count
        }

