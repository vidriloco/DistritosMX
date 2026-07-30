import json
import os
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from world.models import PolygonOfInterest
from django.contrib.gis.geos import GEOSGeometry


class Command(BaseCommand):
    help = 'Ingest GeoJSON data into the PolygonOfInterest model'

    def add_arguments(self, parser):
        parser.add_argument(
            'geojson_file',
            type=str,
            help='Path to the GeoJSON file to ingest'
        )
        parser.add_argument(
            '--clear',
            action='store_true',
            help='Clear all existing PolygonOfInterest records before importing'
        )
        parser.add_argument(
            '--update',
            action='store_true',
            help='Update existing records based on CVEGEO instead of creating duplicates'
        )
        parser.add_argument(
            '--batch-size',
            type=int,
            default=100,
            help='Number of records to process in each batch (default: 100)'
        )

    def handle(self, *args, **options):
        geojson_file = options['geojson_file']
        clear_existing = options['clear']
        update_existing = options['update']
        batch_size = options['batch_size']

        # Validate file exists
        if not os.path.exists(geojson_file):
            raise CommandError(f'GeoJSON file not found: {geojson_file}')

        try:
            # Clear existing data if requested
            if clear_existing:
                self.stdout.write(self.style.WARNING('Clearing all existing PolygonOfInterest records...'))
                count = PolygonOfInterest.objects.count()
                PolygonOfInterest.objects.all().delete()
                self.stdout.write(self.style.SUCCESS(f'Deleted {count} existing records'))

            # Load GeoJSON file
            self.stdout.write(self.style.SUCCESS(f'Loading GeoJSON file: {geojson_file}'))
            with open(geojson_file, 'r', encoding='utf-8') as f:
                geojson_data = json.load(f)

            # Validate GeoJSON structure
            if 'type' not in geojson_data:
                raise CommandError('Invalid GeoJSON: missing "type" field')
            
            if geojson_data['type'] != 'FeatureCollection':
                raise CommandError(f'Expected FeatureCollection, got {geojson_data["type"]}')

            features = geojson_data.get('features', [])
            if not features:
                raise CommandError('No features found in GeoJSON file')

            self.stdout.write(self.style.SUCCESS(f'Found {len(features)} features to process'))

            # Process features
            created_count = 0
            updated_count = 0
            skipped_count = 0
            error_count = 0

            batch = []
            
            for index, feature in enumerate(features, 1):
                try:
                    # Validate feature structure
                    if 'type' not in feature or feature['type'] != 'Feature':
                        self.stdout.write(
                            self.style.WARNING(f'Skipping invalid feature at index {index}: not a Feature type')
                        )
                        skipped_count += 1
                        continue

                    if 'properties' not in feature or 'geometry' not in feature:
                        self.stdout.write(
                            self.style.WARNING(f'Skipping feature at index {index}: missing properties or geometry')
                        )
                        skipped_count += 1
                        continue

                    # Create polygon instance (this will generate CVEGEO if missing)
                    polygon = PolygonOfInterest.from_geojson_feature(feature)
                    
                    # Get CVEGEO for update logic (after generation)
                    cvegeo = polygon.cvegeo
                    
                    # Check if update mode and record exists
                    if update_existing and cvegeo:
                        try:
                            existing = PolygonOfInterest.objects.get(cvegeo=cvegeo)
                            # Update existing record
                            polygon.id = existing.id
                            polygon.created_at = existing.created_at  # Preserve original creation date
                            batch.append(('update', polygon))
                            updated_count += 1
                        except PolygonOfInterest.DoesNotExist:
                            # Create new record
                            batch.append(('create', polygon))
                            created_count += 1
                    else:
                        # Always create new record
                        batch.append(('create', polygon))
                        created_count += 1

                    # Process batch when it reaches batch_size
                    if len(batch) >= batch_size:
                        self._save_batch(batch, update_existing)
                        batch = []
                        self.stdout.write(f'Processed {index}/{len(features)} features...')

                except Exception as e:
                    error_count += 1
                    self.stdout.write(
                        self.style.ERROR(f'Error processing feature at index {index}: {str(e)}')
                    )
                    continue

            # Save remaining batch
            if batch:
                self._save_batch(batch, update_existing)

            # Summary
            self.stdout.write(self.style.SUCCESS('\n' + '='*60))
            self.stdout.write(self.style.SUCCESS('Ingestion Summary:'))
            self.stdout.write(self.style.SUCCESS(f'  Total features: {len(features)}'))
            self.stdout.write(self.style.SUCCESS(f'  Created: {created_count}'))
            if update_existing:
                self.stdout.write(self.style.SUCCESS(f'  Updated: {updated_count}'))
            self.stdout.write(self.style.WARNING(f'  Skipped: {skipped_count}'))
            self.stdout.write(self.style.ERROR(f'  Errors: {error_count}'))
            self.stdout.write(self.style.SUCCESS('='*60))

        except json.JSONDecodeError as e:
            raise CommandError(f'Invalid JSON in file: {str(e)}')
        except Exception as e:
            raise CommandError(f'Error processing GeoJSON file: {str(e)}')

    def _save_batch(self, batch, update_existing):
        """Save a batch of polygons using bulk operations"""
        try:
            if update_existing:
                # Separate update and create batches
                update_batch = [p for op, p in batch if op == 'update']
                create_batch = [p for op, p in batch if op == 'create']
                
                if update_batch:
                    try:
                        PolygonOfInterest.objects.bulk_update(
                            update_batch,
                            fields=[
                                'cve_ent', 'cve_mun', 'cve_loc', 'cve_asen',
                                'cp', 'fecha_act', 'institucion', 'nom_asen',
                                'tipo', 'shape_leng', 'shape_area', 'turistico',
                                'geometry', 'updated_at'
                            ]
                        )
                    except AttributeError:
                        # bulk_update not available (Django < 2.2), use individual saves
                        for polygon in update_batch:
                            polygon.save()
                
                if create_batch:
                    PolygonOfInterest.objects.bulk_create(create_batch)
            else:
                # Use bulk_create for new records
                polygons = [p for op, p in batch]
                PolygonOfInterest.objects.bulk_create(polygons)
        except Exception as e:
            # Fallback to individual saves if bulk operation fails
            self.stdout.write(
                self.style.WARNING(f'Bulk operation failed, falling back to individual saves: {str(e)}')
            )
            for op, polygon in batch:
                try:
                    polygon.save()
                except Exception as e:
                    self.stdout.write(
                        self.style.ERROR(f'Failed to save polygon {getattr(polygon, "cvegeo", "unknown")}: {str(e)}')
                    )

