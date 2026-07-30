"""
Django Management Command: Filter GeoJSON files by polygon intersection

This command analyzes all GeoJSON files in a directory and removes files that don't contain
any features that intersect with a specified polygon.

Usage:
    python manage.py veraset_filter_geojson_by_polygon --directory DIRECTORY_PATH

Options:
    --directory: Path to the directory containing GeoJSON files (required)
"""

import os
import json
from shapely.geometry import shape, Polygon
from shapely.errors import GEOSException
from django.core.management.base import BaseCommand, CommandError


class Command(BaseCommand):
    help = 'Filter GeoJSON files by removing those without features intersecting a polygon'

    # Define the polygon coordinates
    POLYGON_COORDS = [
        [
            -99.21393885676493,
            19.636078354647324
        ],
        [
            -99.26790376119739,
            19.58293527561537
        ],
        [
            -99.30812923745681,
            19.430728033812613
        ],
        [
            -99.31039737378005,
            19.398377686618616
        ],
        [
            -99.33439920659367,
            19.353305650502563
        ],
        [
            -99.30311056716614,
            19.329689674226486
        ],
        [
            -99.26241660126483,
            19.361158588816878
        ],
        [
            -99.20194982260102,
            19.374733503977353
        ],
        [
            -99.23586483454972,
            19.32462043055594
        ],
        [
            -99.22085611655953,
            19.27085642874968
        ],
        [
            -99.15345311549264,
            19.27527205613015
        ],
        [
            -99.10824697403712,
            19.237092671075544
        ],
        [
            -99.05548612612442,
            19.235293482252118
        ],
        [
            -99.03594180970951,
            19.263028556276012
        ],
        [
            -99.08458212021982,
            19.341661437470975
        ],
        [
            -99.09619000376178,
            19.36951615498434
        ],
        [
            -99.07088626883889,
            19.396525254826344
        ],
        [
            -99.02037043626576,
            19.414850661995345
        ],
        [
            -99.01652821247394,
            19.476305130897444
        ],
        [
            -99.00120534378296,
            19.60093520571992
        ],
        [
            -99.06349137412167,
            19.652402361989843
        ],
        [
            -99.21393885676493,
            19.636078354647324
        ]
    ]

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        # Create the polygon shape once
        self.filter_polygon = Polygon(self.POLYGON_COORDS)

    def add_arguments(self, parser):
        parser.add_argument(
            '--directory',
            required=True,
            help='Path to the directory containing GeoJSON files (required)'
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show which files would be deleted without actually deleting them'
        )

    def check_feature_intersects(self, feature_geom):
        """
        Check if a feature geometry intersects with the filter polygon.
        
        Args:
            feature_geom: A shapely geometry object
            
        Returns:
            bool: True if the feature intersects with the polygon
        """
        try:
            return feature_geom.intersects(self.filter_polygon)
        except (GEOSException, AttributeError, TypeError):
            # If geometry is invalid or can't be checked, return False
            return False

    def has_intersecting_features(self, geojson_path):
        """
        Check if a GeoJSON file contains any features that intersect with the polygon.
        
        Args:
            geojson_path: Path to the GeoJSON file
            
        Returns:
            bool: True if at least one feature intersects, False otherwise
        """
        try:
            with open(geojson_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
            
            # Handle different GeoJSON structures
            features = []
            if data.get('type') == 'FeatureCollection':
                features = data.get('features', [])
            elif data.get('type') == 'Feature':
                features = [data]
            elif 'geometry' in data:
                # Single geometry
                features = [{'geometry': data.get('geometry')}]
            
            # Check each feature
            for feature in features:
                geometry = feature.get('geometry')
                if not geometry:
                    continue
                
                try:
                    # Convert GeoJSON geometry to shapely geometry
                    feature_shape = shape(geometry)
                    
                    # Check if it intersects with the polygon
                    if self.check_feature_intersects(feature_shape):
                        return True
                except (GEOSException, ValueError, KeyError, TypeError) as e:
                    # Skip invalid geometries
                    continue
            
            return False
            
        except (json.JSONDecodeError, IOError, OSError) as e:
            self.stdout.write(self.style.WARNING(
                f"Error reading {geojson_path}: {e}"
            ))
            return False

    def handle(self, *args, **options):
        """Main function to filter GeoJSON files."""
        directory = os.path.abspath(options['directory'])
        dry_run = options.get('dry_run', False)
        
        if not os.path.exists(directory):
            raise CommandError(f"Directory not found: {directory}")
        
        if not os.path.isdir(directory):
            raise CommandError(f"Path is not a directory: {directory}")
        
        self.stdout.write(f"Analyzing GeoJSON files in: {directory}")
        if dry_run:
            self.stdout.write(self.style.WARNING("DRY RUN MODE - No files will be deleted"))
        
        # Find all GeoJSON files
        geojson_files = []
        for root, dirs, files in os.walk(directory):
            for file in files:
                if file.lower().endswith('.geojson'):
                    geojson_files.append(os.path.join(root, file))
        
        if not geojson_files:
            self.stdout.write(self.style.WARNING("No GeoJSON files found in directory"))
            return
        
        self.stdout.write(f"Found {len(geojson_files)} GeoJSON file(s)")
        
        # Process each file
        files_to_delete = []
        files_to_keep = []
        errors = []
        
        for geojson_path in geojson_files:
            try:
                has_intersection = self.has_intersecting_features(geojson_path)
                
                if has_intersection:
                    files_to_keep.append(geojson_path)
                else:
                    files_to_delete.append(geojson_path)
                    
            except Exception as e:
                errors.append((geojson_path, str(e)))
                self.stdout.write(self.style.ERROR(
                    f"Error processing {geojson_path}: {e}"
                ))
        
        # Report results
        self.stdout.write("\n" + "="*60)
        self.stdout.write(self.style.SUCCESS(f"Files to keep: {len(files_to_keep)}"))
        self.stdout.write(self.style.WARNING(f"Files to delete: {len(files_to_delete)}"))
        if errors:
            self.stdout.write(self.style.ERROR(f"Errors: {len(errors)}"))
        self.stdout.write("="*60 + "\n")
        
        # Delete files (or show what would be deleted in dry-run mode)
        if files_to_delete:
            if dry_run:
                self.stdout.write(self.style.WARNING("Files that would be deleted:"))
                for file_path in files_to_delete:
                    self.stdout.write(f"  - {file_path}")
            else:
                deleted_count = 0
                for file_path in files_to_delete:
                    try:
                        os.remove(file_path)
                        deleted_count += 1
                        self.stdout.write(f"Deleted: {file_path}")
                    except OSError as e:
                        self.stdout.write(self.style.ERROR(
                            f"Failed to delete {file_path}: {e}"
                        ))
                
                self.stdout.write(
                    self.style.SUCCESS(
                        f"\n✓ Filtering completed!\n"
                        f"  Kept: {len(files_to_keep)} files\n"
                        f"  Deleted: {deleted_count} files"
                    )
                )
        else:
            self.stdout.write(self.style.SUCCESS("No files to delete - all files contain intersecting features"))

