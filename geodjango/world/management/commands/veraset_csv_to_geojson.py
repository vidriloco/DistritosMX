"""
Django Management Command: Convert Veraset CSV to GeoJSON (grouped by ca_id)

This command reads a CSV file containing location data and converts it to multiple GeoJSON files,
one for each unique ca_id value. Each GeoJSON file contains all coordinates for that ca_id.

Usage:
    python manage.py veraset_csv_to_geojson --input-csv INPUT_CSV

Options:
    --input-csv: Path to the input CSV file (required)
"""

import os
import json
import pandas as pd
from geojson import Point, Feature, FeatureCollection
from django.core.management.base import BaseCommand, CommandError


class Command(BaseCommand):
    help = 'Convert Veraset CSV file to GeoJSON format, grouped by ca_id'

    def add_arguments(self, parser):
        parser.add_argument(
            '--input-csv',
            required=True,
            help='Path to the input CSV file (required)'
        )
        parser.add_argument(
            '--output-dir',
            type=str,
            default=None,
            help='Directory to save output GeoJSON files (default: same as input CSV)'
        )

    def create_geojson_for_group(self, group_df, ca_id_value, output_path: str) -> bool:
        """
        Create a GeoJSON file for a specific ca_id group.
        
        Args:
            group_df: DataFrame containing rows for one ca_id
            ca_id_value: The ca_id value for this group
            output_path: Path to the output GeoJSON file
            
        Returns:
            bool: True if successful, False otherwise
        """
        try:
            features = []
            
            # Get column indices once (more efficient than recalculating in loop)
            lat_idx = group_df.columns.get_loc('latitude')
            lon_idx = group_df.columns.get_loc('longitude')
            
            # Get column names and indices for properties (excluding lat/lon)
            property_columns = [col for col in group_df.columns if col not in ['latitude', 'longitude']]
            property_indices = {col: group_df.columns.get_loc(col) for col in property_columns}
            
            # Use itertuples() instead of iterrows() for better performance and stability
            # itertuples() is much faster and doesn't cause segmentation faults with large DataFrames
            for row in group_df.itertuples(index=False):
                try:
                    # Access by index position in the tuple
                    latitude = row[lat_idx]
                    longitude = row[lon_idx]
                    
                    # Skip rows with missing latitude or longitude (NaN or empty string)
                    if pd.isna(latitude) or pd.isna(longitude):
                        continue
                    if isinstance(latitude, str) and latitude.strip() == '':
                        continue
                    if isinstance(longitude, str) and longitude.strip() == '':
                        continue
                    
                    # Validate coordinate ranges
                    try:
                        lat_float = float(latitude)
                        lon_float = float(longitude)
                        
                        # Validate coordinate ranges (latitude: -90 to 90, longitude: -180 to 180)
                        if not (-90 <= lat_float <= 90) or not (-180 <= lon_float <= 180):
                            continue
                    except (ValueError, TypeError):
                        continue
                    
                    # Create Point geometry
                    point = Point((lon_float, lat_float))
                    
                    # Create properties from all columns except lat/lon
                    properties = {}
                    for col in property_columns:
                        col_idx = property_indices[col]
                        value = row[col_idx]
                        
                        # Check if value is NaN or empty string
                        if pd.isna(value) or (isinstance(value, str) and value.strip() == ''):
                            properties[col] = None
                        else:
                            # Try to convert to appropriate type
                            if col in ['horizontal_accuracy']:
                                try:
                                    properties[col] = float(value)
                                except (ValueError, TypeError):
                                    # If conversion fails, try as string
                                    str_value = str(value).strip()
                                    properties[col] = str_value if str_value else None
                            else:
                                # Convert to string, but handle special cases
                                try:
                                    # Try to keep as number if it's numeric
                                    if isinstance(value, (int, float)):
                                        properties[col] = value
                                    else:
                                        str_value = str(value).strip()
                                        properties[col] = str_value if str_value else None
                                except (ValueError, TypeError):
                                    str_value = str(value).strip() if value is not None else ''
                                    properties[col] = str_value if str_value else None
                    
                    # Create feature
                    feature = Feature(geometry=point, properties=properties)
                    features.append(feature)
                    
                except Exception as e:
                    # Skip individual row errors and continue processing
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
                f"Error creating GeoJSON for ca_id {ca_id_value}: {e}"
            ))
            import traceback
            self.stdout.write(self.style.ERROR(traceback.format_exc()))
            return False

    def convert_csv_to_geojson_grouped(self, csv_path: str, output_dir: str) -> bool:
        """
        Convert CSV file to multiple GeoJSON files, one per ca_id.
        
        Args:
            csv_path: Path to the input CSV file
            output_dir: Directory to save output GeoJSON files
            
        Returns:
            bool: True if successful, False otherwise
        """
        try:
            self.stdout.write(f"Reading CSV file: {csv_path}")
            
            # Read CSV file
            df = pd.read_csv(csv_path)
            
            # Check for ca_id or caid column
            ca_id_column = None
            if 'ca_id' in df.columns:
                ca_id_column = 'ca_id'
            elif 'caid' in df.columns:
                ca_id_column = 'caid'
            else:
                raise CommandError(
                    "CSV file must contain either 'ca_id' or 'caid' column"
                )
            
            # Validate required columns
            required_columns = ['latitude', 'longitude']
            missing_columns = [col for col in required_columns if col not in df.columns]
            if missing_columns:
                raise CommandError(f"Missing required columns: {', '.join(missing_columns)}")
            
            self.stdout.write(f"Found {len(df)} rows to convert")
            self.stdout.write(f"Grouping by column: {ca_id_column}")
            
            # Remove rows with missing coordinates
            df = df.dropna(subset=['latitude', 'longitude'])
            self.stdout.write(f"After removing rows with missing coordinates: {len(df)} rows")
            
            # Group by ca_id
            grouped = df.groupby(ca_id_column)
            unique_ca_ids = grouped.groups.keys()
            total_groups = len(unique_ca_ids)
            
            self.stdout.write(f"Found {total_groups} unique {ca_id_column} values")
            
            # Create output directory if it doesn't exist
            os.makedirs(output_dir, exist_ok=True)
            
            # Process each group
            success_count = 0
            failed_count = 0
            
            for idx, (ca_id_value, group_df) in enumerate(grouped, 1):
                # Sanitize ca_id_value for filename
                safe_ca_id = str(ca_id_value).replace('/', '_').replace('\\', '_')
                output_filename = f"{safe_ca_id}.geojson"
                output_path = os.path.join(output_dir, output_filename)
                
                # Create GeoJSON for this group
                success = self.create_geojson_for_group(group_df, ca_id_value, output_path)
                
                if success:
                    success_count += 1
                    if idx % 100 == 0 or idx == total_groups:
                        self.stdout.write(
                            f"  Processed {idx}/{total_groups} groups "
                            f"({len(group_df)} features for {ca_id_column}={ca_id_value})"
                        )
                else:
                    failed_count += 1
                    self.stdout.write(self.style.WARNING(
                        f"  Failed to create GeoJSON for {ca_id_column}={ca_id_value}"
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
            self.stdout.write(self.style.ERROR(f"Error converting CSV to GeoJSON: {e}"))
            import traceback
            self.stdout.write(self.style.ERROR(traceback.format_exc()))
            return False

    def handle(self, *args, **options):
        """Main function to orchestrate the conversion process."""
        # Convert to absolute path
        input_csv = os.path.abspath(options['input_csv'])
        
        if not os.path.exists(input_csv):
            raise CommandError(f"Input CSV file not found: {input_csv}")
        
        if not os.path.isfile(input_csv):
            raise CommandError(f"Input path is not a file: {input_csv}")
        
        self.stdout.write(f"Input CSV file: {input_csv}")
        
        # Determine output directory
        if options['output_dir']:
            output_dir = os.path.abspath(options['output_dir'])
        else:
            # Use same directory as input CSV
            input_dir = os.path.dirname(input_csv)
            input_basename = os.path.basename(input_csv)
            input_name, _ = os.path.splitext(input_basename)
            output_dir = os.path.join(input_dir, f"{input_name}_geojson")
        
        self.stdout.write(f"Output directory: {output_dir}")
        
        # Convert CSV to GeoJSON files
        success = self.convert_csv_to_geojson_grouped(input_csv, output_dir)
        
        if success:
            self.stdout.write(self.style.SUCCESS("✓ Conversion process completed!"))
        else:
            self.stdout.write(self.style.ERROR("✗ Conversion process failed"))

