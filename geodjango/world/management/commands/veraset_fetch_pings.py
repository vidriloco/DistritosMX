"""

Ideal example: 
    python manage.py veraset_fetch_trips --control-dir ../data/output/control --api-key 5e5d168e-78b2-45c5-961f-72c6a80562e2 --latitude 19.412740 --longitude -99.170485 --distance 3000 --from-date 2024-11-01 --to-date 2024-11-06
Django management command to fetch trips from Veraset API by creating a job request.

This command makes a POST request to the Veraset API to create a job for fetching trip data
within a specified geographic radius and date range. It extracts the job_id from the response
and saves it to a control file for later processing.

Usage:
    python manage.py veraset_fetch_trips [options]

Required Arguments:
    --control-dir DIR: Directory where the job_id control file will be created

Optional Arguments:
    --api-key KEY: API key for Veraset API (default: 5e5d168e-78b2-45c5-961f-72c6a80562e2)
    --latitude FLOAT: Latitude coordinate for the center point (default: 19.432602)
    --longitude FLOAT: Longitude coordinate for the center point (default: -99.133205)
    --distance INT: Distance in meters for the geographic radius (default: 1000)
    --from-date DATE: Start date in YYYY-MM-DD format (default: 2024-11-01)
    --to-date DATE: End date in YYYY-MM-DD format (default: 2024-11-02)

Examples:
    # Basic usage with default parameters
    python manage.py veraset_fetch_trips --control-dir /path/to/control

    # Custom geographic location and date range
    python manage.py veraset_fetch_trips --control-dir /path/to/control \\
        --latitude 19.432602 --longitude -99.133205 --distance 2000 \\
        --from-date 2024-11-01 --to-date 2024-11-02

    # Use custom API key
    python manage.py veraset_fetch_trips --control-dir /path/to/control \\
        --api-key your-api-key-here

API Details:
    - Endpoint: https://platform.prd.veraset.tech/v1/movement/job/pings
    - Method: POST
    - Payload: JSON with date_range, geo_radius, and schema_type
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
    help = 'Fetch trips from Veraset API by creating a job request'

    def add_arguments(self, parser):
        parser.add_argument(
            '--control-dir',
            type=str,
            required=True,
            help='Directory where the job_id control file will be created'
        )
        parser.add_argument(
            '--api-key',
            type=str,
            default='5e5d168e-78b2-45c5-961f-72c6a80562e2',
            help='API key for Veraset API (default: 5e5d168e-78b2-45c5-961f-72c6a80562e2)'
        )
        parser.add_argument(
            '--latitude',
            type=float,
            default=19.432602,
            help='Latitude coordinate for the center point (default: 19.432602)'
        )
        parser.add_argument(
            '--longitude',
            type=float,
            default=-99.133205,
            help='Longitude coordinate for the center point (default: -99.133205)'
        )
        parser.add_argument(
            '--distance',
            type=int,
            default=1000,
            help='Distance in meters for the geographic radius (default: 1000)'
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

    def handle(self, *args, **options):
        control_dir = options['control_dir']
        api_key = options['api_key']
        latitude = options['latitude']
        longitude = options['longitude']
        distance = options['distance']
        from_date = options['from_date']
        to_date = options['to_date']

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

        # Prepare the API request payload
        url = 'https://platform.prd.veraset.tech/v1/movement/job/pings'
        headers = {
            'Content-Type': 'application/json',
            'X-API-Key': api_key
        }
        payload = {
            'date_range': {
                'from_date': from_date,
                'to_date': to_date
            },
            'geo_radius': [
                {
                    'latitude': latitude,
                    'longitude': longitude,
                    'distance_in_meters': distance
                }
            ],
            'schema_type': 'TRIPS'
        }

        self.stdout.write(f'Making request to Veraset API...')
        self.stdout.write(f'  URL: {url}')
        self.stdout.write(f'  Date range: {from_date} to {to_date}')
        self.stdout.write(f'  Location: ({latitude}, {longitude})')
        self.stdout.write(f'  Distance: {distance} meters')

        try:
            # Make the API request
            response = requests.post(
                url,
                headers=headers,
                json=payload,
                timeout=30
            )
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
                    f.write(f'latitude={latitude}\n')
                    f.write(f'longitude={longitude}\n')
                    f.write(f'distance={distance}\n')
                
                self.stdout.write(
                    self.style.SUCCESS(
                        f'\nSuccessfully created control file: {control_file_path}'
                    )
                )
                self.stdout.write(f'Job ID: {job_id}')
                
            except IOError as e:
                raise CommandError(f'Failed to write control file {control_file_path}: {str(e)}')

        except requests.exceptions.RequestException as e:
            raise CommandError(f'API request failed: {str(e)}')
        except json.JSONDecodeError as e:
            raise CommandError(f'Failed to parse API response as JSON: {str(e)}')
        except Exception as e:
            raise CommandError(f'Unexpected error: {str(e)}')

