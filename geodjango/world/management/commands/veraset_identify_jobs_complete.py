"""

Ideal example: 
    python manage.py veraset_identify_jobs_complete --control-dir ../data/output/control --data-dir ../data/output/trips --api-key 5e5d168e-78b2-45c5-961f-72c6a80562e2
    
Django management command to check job completion status and sync data from S3.

This command checks the status of Veraset API jobs by reading job IDs from control files,
verifying their completion status, and syncing the resulting data from S3 if successful.

Usage:
    python manage.py veraset_identify_jobs_complete [options]

Required Arguments:
    --control-dir DIR: Directory containing job_id control files (.txt files)
    --data-dir DIR: Directory where S3 data will be synced

Optional Arguments:
    --api-key KEY: API key for Veraset API (default: 5e5d168e-78b2-45c5-961f-72c6a80562e2)

Examples:
    # Basic usage
    python manage.py veraset_identify_jobs_complete \\
        --control-dir ../data/output/control \\
        --data-dir ../data/output

    # Use custom API key
    python manage.py veraset_identify_jobs_complete \\
        --control-dir ../data/output/control \\
        --data-dir ../data/output \\
        --api-key your-api-key-here

API Details:
    - Endpoint: https://platform.prd.veraset.tech/v1/job/{job_id}
    - Method: GET
    - Headers: X-API-Key
    - Response: JSON with status and s3_location.folder_path

Notes:
    - The command reads all .txt files from the control directory
    - Each filename (without .txt extension) is used as the job_id
    - If any job status is not "SUCCESS", the command terminates
    - Successful jobs trigger an AWS S3 sync to the specified data directory
"""

import os
import json
import glob
import subprocess
import requests
from django.core.management.base import BaseCommand, CommandError


class Command(BaseCommand):
    help = 'Check job completion status and sync data from S3'

    def add_arguments(self, parser):
        parser.add_argument(
            '--control-dir',
            type=str,
            required=True,
            help='Directory containing job_id control files (.txt files)'
        )
        parser.add_argument(
            '--data-dir',
            type=str,
            required=True,
            help='Directory where S3 data will be synced'
        )
        parser.add_argument(
            '--api-key',
            type=str,
            default='5e5d168e-78b2-45c5-961f-72c6a80562e2',
            help='API key for Veraset API (default: 5e5d168e-78b2-45c5-961f-72c6a80562e2)'
        )

    def handle(self, *args, **options):
        control_dir = options['control_dir']
        data_dir = options['data_dir']
        api_key = options['api_key']

        # Validate control directory
        if not os.path.exists(control_dir):
            raise CommandError(f'Control directory does not exist: {control_dir}')
        
        if not os.path.isdir(control_dir):
            raise CommandError(f'Control directory path is not a directory: {control_dir}')

        # Validate data directory (create if it doesn't exist)
        if not os.path.exists(data_dir):
            try:
                os.makedirs(data_dir, exist_ok=True)
                self.stdout.write(f'Created data directory: {data_dir}')
            except OSError as e:
                raise CommandError(f'Failed to create data directory {data_dir}: {str(e)}')

        # Find all .txt files in control directory
        pattern = os.path.join(control_dir, '*.txt')
        control_files = glob.glob(pattern)

        if not control_files:
            raise CommandError(f'No .txt files found in control directory: {control_dir}')

        self.stdout.write(f'Found {len(control_files)} control files to process')

        # Process each control file
        for control_file in sorted(control_files):
            # Extract job_id from filename (remove .txt extension)
            job_id = os.path.splitext(os.path.basename(control_file))[0]
            
            self.stdout.write(f'\nProcessing job_id: {job_id}')

            # Call Veraset API to check job status
            url = f'https://platform.prd.veraset.tech/v1/job/{job_id}'
            headers = {
                'X-API-Key': api_key
            }

            try:
                self.stdout.write(f'  Checking job status at: {url}')
                response = requests.get(url, headers=headers, timeout=30)
                response.raise_for_status()

                # Parse the response
                response_data = response.json()
                
                self.stdout.write(f'  API Response:')
                self.stdout.write(json.dumps(response_data, indent=4))

                # Check for errors in response
                if response_data.get('error_code') or response_data.get('error_message'):
                    error_code = response_data.get('error_code', 'UNKNOWN')
                    error_message = response_data.get('error_message', 'Unknown error')
                    raise CommandError(
                        f'API returned error for job_id {job_id}: [{error_code}] {error_message}'
                    )

                # Extract status from response
                status = None
                if 'data' in response_data and 'status' in response_data['data']:
                    status = response_data['data']['status']
                else:
                    raise CommandError(
                        f'Status not found in API response for job_id {job_id}. '
                        f'Response: {json.dumps(response_data)}'
                    )

                # Check if status is SUCCESS
                if status != 'SUCCESS':
                    raise CommandError(
                        f'Job {job_id} status is "{status}", not "SUCCESS". Terminating.'
                    )

                self.stdout.write(self.style.SUCCESS(f'  ✓ Job {job_id} status: SUCCESS'))

                # Extract folder_path from s3_location
                folder_path = None
                if ('data' in response_data and 
                    's3_location' in response_data['data'] and 
                    'folder_path' in response_data['data']['s3_location']):
                    folder_path = response_data['data']['s3_location']['folder_path']
                else:
                    raise CommandError(
                        f'folder_path not found in API response for job_id {job_id}. '
                        f'Response: {json.dumps(response_data)}'
                    )

                # Sync data from S3
                s3_bucket = 'veraset-prd-platform-us-west-2'
                s3_path = f's3://{s3_bucket}/{folder_path}'
                
                # Build the sync command
                sync_command = [
                    'aws', 's3', 'sync',
                    s3_path,
                    data_dir
                ]
                command_string = ' '.join(sync_command)
                
                # Print the command at the beginning for easy copy-paste
                self.stdout.write(f'  Syncing data from S3: {s3_path} -> {data_dir}')
                self.stdout.write(self.style.WARNING(f'  S3 sync command for job_id {job_id}:'))
                self.stdout.write(self.style.WARNING(f'    {command_string}'))
                
                try:
                    # Run aws s3 sync command
                    result = subprocess.run(
                        sync_command,
                        check=True,
                        capture_output=True,
                        text=True
                    )
                    
                    if result.stdout:
                        self.stdout.write(f'  Sync output: {result.stdout}')
                    
                    self.stdout.write(
                        self.style.SUCCESS(f'  ✓ Successfully synced data for job_id {job_id}')
                    )
                    
                except subprocess.CalledProcessError as e:
                    # Print the command in a copy-pasteable format
                    command_string = ' '.join(sync_command)
                    self.stdout.write(self.style.ERROR('\n' + '='*80))
                    self.stdout.write(self.style.ERROR('AWS S3 sync failed!'))
                    self.stdout.write(self.style.ERROR('Copy and paste this command to run it manually:'))
                    self.stdout.write(self.style.WARNING(command_string))
                    self.stdout.write(self.style.ERROR('='*80 + '\n'))
                    raise CommandError(
                        f'AWS S3 sync failed for job_id {job_id}: {str(e)}\n'
                        f'Error output: {e.stderr}'
                    )
                except FileNotFoundError:
                    # Print the command so user can run it manually
                    self.stdout.write(self.style.ERROR('\n' + '='*80))
                    self.stdout.write(self.style.ERROR('AWS CLI not found!'))
                    self.stdout.write(self.style.ERROR(f'Copy and paste this command to run it manually for job_id {job_id}:'))
                    self.stdout.write(self.style.WARNING(command_string))
                    self.stdout.write(self.style.ERROR('='*80 + '\n'))
                    raise CommandError(
                        'AWS CLI not found. Please install AWS CLI to sync data from S3.'
                    )

            except requests.exceptions.RequestException as e:
                raise CommandError(f'API request failed for job_id {job_id}: {str(e)}')
            except json.JSONDecodeError as e:
                raise CommandError(
                    f'Failed to parse API response as JSON for job_id {job_id}: {str(e)}'
                )
            except CommandError:
                # Re-raise CommandError as-is
                raise
            except Exception as e:
                raise CommandError(f'Unexpected error processing job_id {job_id}: {str(e)}')

        self.stdout.write(
            self.style.SUCCESS(f'\n✓ Successfully processed all {len(control_files)} jobs')
        )

