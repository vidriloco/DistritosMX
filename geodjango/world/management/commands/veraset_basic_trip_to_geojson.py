"""
Django Management Command: Convert BasicTrip records to GeoJSON (grouped by caid)

This command reads BasicTrip records from the database and converts them to multiple GeoJSON files,
one for each unique caid value. Each GeoJSON file contains all coordinates for that caid as Point features.

Usage:
    python manage.py veraset_basic_trip_to_geojson --output-dir OUTPUT_DIR [--caid CAID] [--start-date START_DATE] [--end-date END_DATE]

Options:
    --output-dir: Directory to save output GeoJSON files (required)
    --caid: Filter by specific caid (optional)
    --start-date: Filter trips from this date (YYYY-MM-DD format, optional)
    --end-date: Filter trips until this date (YYYY-MM-DD format, optional)
"""

import os
import json
from datetime import datetime
from geojson import Point, Feature, FeatureCollection
from django.core.management.base import BaseCommand, CommandError
from django.db.models import Q
from world.models.trip import BasicTrip


class Command(BaseCommand):
    help = 'Convert BasicTrip records to GeoJSON format, grouped by caid'

    def add_arguments(self, parser):
        parser.add_argument(
            '--output-dir',
            type=str,
            required=True,
            help='Directory to save output GeoJSON files (required)'
        )
        parser.add_argument(
            '--caid',
            type=str,
            default=None,
            help='Filter by specific caid (optional)'
        )
        parser.add_argument(
            '--start-date',
            type=str,
            default=None,
            help='Filter trips from this date (YYYY-MM-DD format, optional)'
        )
        parser.add_argument(
            '--end-date',
            type=str,
            default=None,
            help='Filter trips until this date (YYYY-MM-DD format, optional)'
        )

    def parse_date(self, date_str):
        """Parse date string in YYYY-MM-DD format"""
        try:
            return datetime.strptime(date_str, '%Y-%m-%d').date()
        except ValueError:
            raise CommandError(f"Invalid date format: {date_str}. Use YYYY-MM-DD format.")

    def create_geojson_for_caid(self, trips, caid_value, output_path: str) -> bool:
        """
        Create a GeoJSON file for a specific caid group.
        
        Args:
            trips: QuerySet or list of BasicTrip objects for one caid
            caid_value: The caid value for this group
            output_path: Path to the output GeoJSON file
            
        Returns:
            bool: True if successful, False otherwise
        """
        try:
            features = []
            
            for trip in trips:
                try:
                    # Skip trips with missing coordinates
                    if trip.latitude is None or trip.longitude is None:
                        continue
                    
                    # Validate coordinate ranges
                    if not (-90 <= trip.latitude <= 90) or not (-180 <= trip.longitude <= 180):
                        continue
                    
                    # Create Point geometry
                    point = Point((trip.longitude, trip.latitude))
                    
                    # Create properties from trip fields
                    properties = {
                        'caid': trip.caid,
                        'utc_timestamp': trip.utc_timestamp.isoformat() if trip.utc_timestamp else None,
                        'horizontal_accuracy': float(trip.horizontal_accuracy) if trip.horizontal_accuracy is not None else None,
                        'id_type': trip.id_type,
                        'ip_address': str(trip.ip_address) if trip.ip_address else None,
                        'iso_country_code': trip.iso_country_code,
                        'poi_ids': trip.poi_ids,
                        'created_at': trip.created_at.isoformat() if trip.created_at else None,
                        'updated_at': trip.updated_at.isoformat() if trip.updated_at else None,
                    }
                    
                    # Remove None values to keep JSON clean
                    properties = {k: v for k, v in properties.items() if v is not None}
                    
                    # Create feature
                    feature = Feature(geometry=point, properties=properties)
                    features.append(feature)
                    
                except Exception as e:
                    # Skip individual trip errors and continue processing
                    continue
            
            if not features:
                return False
            
            # Create FeatureCollection
            feature_collection = FeatureCollection(features)
            
            # Write GeoJSON file
            with open(output_path, 'w') as f:
                json.dump(feature_collection, f, indent=2)
            
            return True
            
        except Exception as e:
            self.stdout.write(self.style.ERROR(
                f"Error creating GeoJSON for caid {caid_value}: {e}"
            ))
            import traceback
            self.stdout.write(self.style.ERROR(traceback.format_exc()))
            return False

    def convert_basic_trips_to_geojson(self, output_dir: str, caid_filter=None, start_date=None, end_date=None) -> bool:
        """
        Convert BasicTrip records to multiple GeoJSON files, one per caid.
        
        Args:
            output_dir: Directory to save output GeoJSON files
            caid_filter: Optional caid to filter by
            start_date: Optional start date filter
            end_date: Optional end date filter
            
        Returns:
            bool: True if successful, False otherwise
        """
        try:
            self.stdout.write("Querying BasicTrip records from database...")
            
            # Build query
            queryset = BasicTrip.objects.all()
            
            # Apply filters
            if caid_filter:
                queryset = queryset.filter(caid=caid_filter)
                self.stdout.write(f"Filtering by caid: {caid_filter}")
            
            if start_date:
                queryset = queryset.filter(utc_timestamp__gte=start_date)
                self.stdout.write(f"Filtering from date: {start_date}")
            
            if end_date:
                # Add one day to include the entire end date
                from datetime import timedelta
                end_datetime = datetime.combine(end_date, datetime.max.time())
                queryset = queryset.filter(utc_timestamp__lte=end_datetime)
                self.stdout.write(f"Filtering until date: {end_date}")
            
            # Filter out records with missing coordinates
            queryset = queryset.exclude(
                Q(latitude__isnull=True) | Q(longitude__isnull=True)
            )
            
            total_records = queryset.count()
            self.stdout.write(f"Found {total_records} BasicTrip records to convert")
            
            if total_records == 0:
                self.stdout.write(self.style.WARNING("No records found matching the criteria"))
                return False
            
            # Get unique caids
            unique_caids = queryset.values_list('caid', flat=True).distinct()
            total_caids = len(unique_caids)
            
            self.stdout.write(f"Found {total_caids} unique caid values")
            
            # Create output directory if it doesn't exist
            os.makedirs(output_dir, exist_ok=True)
            
            # Process each caid
            success_count = 0
            failed_count = 0
            
            for idx, caid_value in enumerate(unique_caids, 1):
                # Get trips for this caid
                caid_trips = queryset.filter(caid=caid_value).order_by('utc_timestamp')
                trip_count = caid_trips.count()
                
                # Sanitize caid_value for filename
                safe_caid = str(caid_value).replace('/', '_').replace('\\', '_')
                output_filename = f"{safe_caid}.geojson"
                output_path = os.path.join(output_dir, output_filename)
                
                # Create GeoJSON for this caid
                success = self.create_geojson_for_caid(caid_trips, caid_value, output_path)
                
                if success:
                    success_count += 1
                    if idx % 100 == 0 or idx == total_caids:
                        self.stdout.write(
                            f"  Processed {idx}/{total_caids} caids "
                            f"({trip_count} features for caid={caid_value})"
                        )
                else:
                    failed_count += 1
                    self.stdout.write(self.style.WARNING(
                        f"  Failed to create GeoJSON for caid={caid_value}"
                    ))
            
            self.stdout.write(
                self.style.SUCCESS(
                    f"\nConversion completed!\n"
                    f"  Successfully created: {success_count} GeoJSON files\n"
                    f"  Failed: {failed_count} files\n"
                    f"  Output directory: {output_dir}"
                )
            )
            return success_count > 0
            
        except Exception as e:
            self.stdout.write(self.style.ERROR(f"Error converting BasicTrip to GeoJSON: {e}"))
            import traceback
            self.stdout.write(self.style.ERROR(traceback.format_exc()))
            return False

    def handle(self, *args, **options):
        """Main function to orchestrate the conversion process."""
        # Get output directory
        output_dir = os.path.abspath(options['output_dir'])
        
        self.stdout.write(f"Output directory: {output_dir}")
        
        # Parse optional date filters
        start_date = None
        if options['start_date']:
            start_date = self.parse_date(options['start_date'])
        
        end_date = None
        if options['end_date']:
            end_date = self.parse_date(options['end_date'])
        
        # Get optional caid filter
        caid_filter = options.get('caid')
        
        # Convert BasicTrip records to GeoJSON files
        success = self.convert_basic_trips_to_geojson(
            output_dir,
            caid_filter=caid_filter,
            start_date=start_date,
            end_date=end_date
        )
        
        if success:
            self.stdout.write(self.style.SUCCESS("✓ Conversion process completed!"))
        else:
            self.stdout.write(self.style.ERROR("✗ Conversion process failed"))

