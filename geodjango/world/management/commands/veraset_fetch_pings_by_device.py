"""

Ideal example: 
    python manage.py veraset_fetch_pings_by_device --control-dir ../data/output/control --api-key 5e5d168e-78b2-45c5-961f-72c6a80562e2 --from-date 2024-11-01 --to-date 2024-11-02 --schema-type BASIC --device-ids 1cb883480306fc917ca10a0f07ad95b14dc531f0c3ea33b4c33606a9ec39f62d

Django management command to fetch pings from Veraset API by device IDs.

This command makes a POST request to the Veraset API to create a job for fetching ping data
for specific device IDs within a date range. It extracts the job_id from the response
and saves it to a control file for later processing.

Usage:
    python manage.py veraset_fetch_pings_by_device [options]

Required Arguments:
    --control-dir DIR: Directory where the job_id control file will be created
    --device-ids ID [ID ...]: One or more device IDs to fetch pings for

Optional Arguments:
    --api-key KEY: API key for Veraset API (default: 5e5d168e-78b2-45c5-961f-72c6a80562e2)
    --from-date DATE: Start date in YYYY-MM-DD format (default: 2024-11-01)
    --to-date DATE: End date in YYYY-MM-DD format (default: 2024-11-02)
    --schema-type TYPE: Schema type for the request (default: BASIC)

Examples:
    # Basic usage with default parameters
    python manage.py veraset_fetch_pings_by_device --control-dir /path/to/control \\
        --device-ids 1cb883480306fc917ca10a0f07ad95b14dc531f0c3ea33b4c33606a9ec39f62d

    # Multiple device IDs with custom date range
    python manage.py veraset_fetch_pings_by_device --control-dir /path/to/control \\
--device-ids 1cb883480306fc917ca10a0f07ad95b14dc531f0c3ea33b4c33606a9ec39f62d \\
        6042603c6cb40782a2e903b3558c62d16c60256d6a0fc4e85ae003b7b51e63e3 \\
        --from-date 2024-11-01 --to-date 2024-11-02

    # Use custom API key and schema type
    python manage.py veraset_fetch_pings_by_device --control-dir /path/to/control \\
        --api-key your-api-key-here --schema-type BASIC \\
        --device-ids 1cb883480306fc917ca10a0f07ad95b14dc531f0c3ea33b4c33606a9ec39f62d

API Details:
    - Endpoint: https://platform.prd.veraset.tech/v1/movement/job/pings_by_device
    - Method: POST
    - Payload: JSON with date_range, device_ids, and schema_type
    - Response: JSON with job_id in data.job_id field

Notes:
    - The command creates a control file named {job_id}.txt in the specified control directory
    - The control file can be used to track job status or for later processing
    - API timeout is set to 30 seconds
"""

import os
import json
import requests
from django.core.management.base import BaseCommand, CommandError


class Command(BaseCommand):
    help = 'Fetch pings from Veraset API by device IDs'

    def add_arguments(self, parser):
        parser.add_argument(
            '--control-dir',
            type=str,
            required=True,
            help='Directory where the job_id control file will be created'
        )
        parser.add_argument(
            '--device-ids',
            nargs='+',
            required=True,
            help='One or more device IDs to fetch pings for'
        )
        parser.add_argument(
            '--api-key',
            type=str,
            default='5e5d168e-78b2-45c5-961f-72c6a80562e2',
            help='API key for Veraset API (default: 5e5d168e-78b2-45c5-961f-72c6a80562e2)'
        )
        parser.add_argument(
            '--from-date',
            type=str,
            default='2024-11-01',
            help='Start date in YYYY-MM-DD format (default: 2024-11-01)'
        )
        parser.add_argument(
            '--to-date',
            type=str,
            default='2024-11-02',
            help='End date in YYYY-MM-DD format (default: 2024-11-02)'
        )
        parser.add_argument(
            '--schema-type',
            type=str,
            default='TRIPS',
            help='Schema type for the request (default: TRIPS)'
        )

    def handle(self, *args, **options):
        control_dir = options['control_dir']
        api_key = options['api_key']
        device_ids = options['device_ids']
        from_date = options['from_date']
        to_date = options['to_date']
        schema_type = options['schema_type']
        
        # Handle case where device_ids might be a single comma-separated string
        if len(device_ids) == 1 and ',' in device_ids[0]:
            device_ids = [did.strip() for did in device_ids[0].split(',')]

        # Validate control directory exists or create it
        if not os.path.exists(control_dir):
            try:
                os.makedirs(control_dir, exist_ok=True)
                self.stdout.write(f'Created control directory: {control_dir}')
            except OSError as e:
                raise CommandError(f'Failed to create control directory {control_dir}: {str(e)}')
        
        if not os.path.isdir(control_dir):
            raise CommandError(f'Control directory path is not a directory: {control_dir}')

        # Validate date format
        try:
            from datetime import datetime
            datetime.strptime(from_date, '%Y-%m-%d')
            datetime.strptime(to_date, '%Y-%m-%d')
        except ValueError as e:
            raise CommandError(f'Invalid date format. Use YYYY-MM-DD format. Error: {str(e)}')

        # Validate device_ids is not empty
        if not device_ids:
            raise CommandError('At least one device ID is required')
        
        # Filter out empty strings and validate device IDs
        device_ids = [did.strip() for did in device_ids if did and did.strip()]
        if not device_ids:
            raise CommandError('No valid device IDs provided (all were empty)')
        
        # Validate device ID format (should be hex strings, typically 64 chars)
        for device_id in device_ids:
            if not device_id or len(device_id) < 10:  # Basic validation
                raise CommandError(f'Invalid device ID format: {device_id}')
        
        # Warn if too many device IDs (API might have limits)
        if len(device_ids) > 100:
            self.stdout.write(
                self.style.WARNING(
                    f'Warning: Sending {len(device_ids)} device IDs. API may have limits.'
                )
            )

        # Prepare the API request payload
        url = 'https://platform.prd.veraset.tech/v1/movement/job/pings_by_device'
        headers = {
            'Content-Type': 'application/json',
            'X-API-Key': api_key
        }
        payload = {
            'date_range': {
                'from_date': from_date,
                'to_date': to_date
            },
            'device_ids': device_ids,
            'schema_type': schema_type
        }

        self.stdout.write(f'Payload: {json.dumps(payload, indent=2)}')

        self.stdout.write(f'Making request to Veraset API...')
        self.stdout.write(f'  URL: {url}')
        self.stdout.write(f'  Date range: {from_date} to {to_date}')
        self.stdout.write(f'  Schema type: {schema_type}')
        self.stdout.write(f'  Device IDs: {len(device_ids)} device(s)')

        try:
            # Make the API request
            response = requests.post(
                url,
                headers=headers,
                json=payload,
                timeout=30
            )
            
            # Check for HTTP errors and provide detailed error information
            if not response.ok:
                error_msg = f'API request failed with status {response.status_code}'
                try:
                    error_data = response.json()
                    error_msg += f'\nResponse Body: {json.dumps(error_data, indent=2)}'
                except (json.JSONDecodeError, ValueError):
                    error_msg += f'\nResponse Body: {response.text[:500]}'  # First 500 chars
                raise CommandError(error_msg)
            
            response.raise_for_status()

            # Parse the response
            response_data = response.json()
            
            self.stdout.write(f'\nAPI Response:')
            self.stdout.write(json.dumps(response_data, indent=2))

            # Extract job_id from the response
            job_id = None
            if 'data' in response_data and 'job_id' in response_data['data']:
                job_id = response_data['data']['job_id']
            elif 'job_id' in response_data:
                job_id = response_data['job_id']
            else:
                raise CommandError(
                    f'Job ID not found in API response. Response: {json.dumps(response_data)}'
                )

            if not job_id:
                raise CommandError('Job ID is empty in API response')

            # Create control file with job_id
            control_file_path = os.path.join(control_dir, f'{job_id}.txt')
            
            try:
                with open(control_file_path, 'w') as f:
                    f.write(f'job_id={job_id}\n')
                    f.write(f'request_id={response_data.get("request_id", "")}\n')
                    f.write(f'status={response_data.get("data", {}).get("status", "")}\n')
                    f.write(f'estimated_credit={response_data.get("data", {}).get("estimated_credit", 0)}\n')
                    f.write(f'from_date={from_date}\n')
                    f.write(f'to_date={to_date}\n')
                    f.write(f'schema_type={schema_type}\n')
                    f.write(f'device_ids={",".join(device_ids)}\n')
                
                self.stdout.write(
                    self.style.SUCCESS(
                        f'\nSuccessfully created control file: {control_file_path}'
                    )
                )
                self.stdout.write(f'Job ID: {job_id}')
                
            except IOError as e:
                raise CommandError(f'Failed to write control file {control_file_path}: {str(e)}')

        except requests.exceptions.HTTPError as e:
            # Capture detailed error information from the response
            error_msg = f'API request failed: {str(e)}'
            if hasattr(e.response, 'status_code'):
                error_msg += f'\nStatus Code: {e.response.status_code}'
            if hasattr(e.response, 'text') and e.response.text:
                try:
                    error_data = e.response.json()
                    error_msg += f'\nResponse Body: {json.dumps(error_data, indent=2)}'
                except (json.JSONDecodeError, ValueError):
                    error_msg += f'\nResponse Body: {e.response.text[:500]}'  # First 500 chars
            raise CommandError(error_msg)
        except requests.exceptions.RequestException as e:
            raise CommandError(f'API request failed: {str(e)}')
        except json.JSONDecodeError as e:
            raise CommandError(f'Failed to parse API response as JSON: {str(e)}')
        except Exception as e:
            raise CommandError(f'Unexpected error: {str(e)}')

