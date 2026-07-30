"""
Django Management Command: Update GeoJSON country codes from TripHome table

This command reads GeoJSON files from a directory, extracts the filename (without extension)
as the CAID, looks up the country_iso in the TripHome table, and replaces all occurrences
of "iso_country_code": "MX" with the correct country code from the database.

Usage:
    python manage.py veraset_update_geojson_country_codes --url /path/to/geojson/files
"""

import os
import json
import glob
from django.core.management.base import BaseCommand, CommandError
from world.models.trip_home import TripHome


class Command(BaseCommand):
    help = 'Update GeoJSON files with country codes from TripHome table'

    def add_arguments(self, parser):
        parser.add_argument(
            '--url',
            type=str,
            required=True,
            help='URL or path to directory containing GeoJSON files'
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show what would be changed without actually modifying files'
        )

    def handle(self, *args, **options):
        """Main function to process GeoJSON files and update country codes."""
        url = options['url']
        dry_run = options['dry_run']
        
        # Convert URL to absolute path if it's a local path
        if os.path.exists(url):
            geojson_dir = os.path.abspath(url)
        else:
            # If it's a URL, you might want to download files first
            # For now, we'll assume it's a local path
            geojson_dir = os.path.abspath(url)
        
        if not os.path.exists(geojson_dir):
            raise CommandError(f"Directory does not exist: {geojson_dir}")
        
        if not os.path.isdir(geojson_dir):
            raise CommandError(f"Path is not a directory: {geojson_dir}")
        
        self.stdout.write(f"Processing GeoJSON files in: {geojson_dir}")
        
        if dry_run:
            self.stdout.write(self.style.WARNING("DRY RUN MODE - No files will be modified"))
        
        # Find all GeoJSON files recursively
        geojson_pattern = os.path.join(geojson_dir, '**', '*.geojson')
        geojson_files = glob.glob(geojson_pattern, recursive=True)
        
        if not geojson_files:
            self.stdout.write(self.style.WARNING(f"No GeoJSON files found in {geojson_dir}"))
            return
        
        self.stdout.write(f"Found {len(geojson_files)} GeoJSON file(s)")
        
        # Process each file
        processed_count = 0
        updated_count = 0
        skipped_count = 0
        error_count = 0
        
        for geojson_file in geojson_files:
            try:
                # Get filename without extension (this is the CAID)
                filename = os.path.basename(geojson_file)
                caid = os.path.splitext(filename)[0]
                
                # Look up TripHome record
                try:
                    trip_home = TripHome.objects.get(caid=caid)
                    country_iso = trip_home.country_iso
                    
                    if not country_iso:
                        self.stdout.write(
                            self.style.WARNING(
                                f"  Skipping {filename}: No country_iso found in TripHome"
                            )
                        )
                        skipped_count += 1
                        continue
                    
                    # Read the GeoJSON file
                    with open(geojson_file, 'r', encoding='utf-8') as f:
                        content = f.read()
                    
                    # Check if file contains the string we want to replace
                    if '"iso_country_code": "MX"' not in content:
                        # File doesn't have MX, skip it
                        processed_count += 1
                        continue
                    
                    # Replace all occurrences
                    old_string = '"iso_country_code": "MX"'
                    new_string = f'"iso_country_code": "{country_iso}"'
                    
                    if dry_run:
                        # Count occurrences
                        occurrences = content.count(old_string)
                        self.stdout.write(
                            f"  Would update {filename}: "
                            f"{occurrences} occurrence(s) of 'MX' -> '{country_iso}'"
                        )
                    else:
                        # Perform the replacement
                        updated_content = content.replace(old_string, new_string)
                        
                        # Only write if content changed
                        if updated_content != content:
                            with open(geojson_file, 'w', encoding='utf-8') as f:
                                f.write(updated_content)
                            
                            occurrences = content.count(old_string)
                            self.stdout.write(
                                self.style.SUCCESS(
                                    f"  Updated {filename}: "
                                    f"{occurrences} occurrence(s) of 'MX' -> '{country_iso}'"
                                )
                            )
                            updated_count += 1
                        else:
                            processed_count += 1
                            continue
                    
                    processed_count += 1
                    
                except TripHome.DoesNotExist:
                    self.stdout.write(
                        self.style.WARNING(
                            f"  Skipping {filename}: CAID '{caid}' not found in TripHome table"
                        )
                    )
                    skipped_count += 1
                    continue
                    
            except Exception as e:
                self.stdout.write(
                    self.style.ERROR(f"  Error processing {geojson_file}: {e}")
                )
                error_count += 1
                continue
        
        # Summary
        self.stdout.write("\n" + "="*60)
        self.stdout.write(self.style.SUCCESS("Processing Summary:"))
        self.stdout.write(f"  Total files found: {len(geojson_files)}")
        self.stdout.write(f"  Files processed: {processed_count}")
        if not dry_run:
            self.stdout.write(f"  Files updated: {updated_count}")
        self.stdout.write(f"  Files skipped: {skipped_count}")
        self.stdout.write(f"  Errors: {error_count}")
        
        if dry_run:
            self.stdout.write(self.style.WARNING("\nThis was a DRY RUN - No files were modified"))

