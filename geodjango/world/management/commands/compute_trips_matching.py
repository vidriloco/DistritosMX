from django.core.management.base import BaseCommand
from django.db import transaction
from django.db.models import Count
from django.db.models.functions import TruncDate
from django.contrib.gis.geos import Point
from world.models import BasicTrip, PolygonOfInterest, TripsMatching
from datetime import datetime
import gc


class Command(BaseCommand):
    help = 'Compute trip matching by grouping BasicTrip records and matching them to polygons'

    def add_arguments(self, parser):
        parser.add_argument(
            '--start-date',
            type=str,
            help='Start date for processing trips (YYYY-MM-DD). If not provided, processes all dates.'
        )
        parser.add_argument(
            '--end-date',
            type=str,
            help='End date for processing trips (YYYY-MM-DD). If not provided, processes all dates.'
        )
        parser.add_argument(
            '--batch-size',
            type=int,
            default=1000,
            help='Number of trip groups to process in each batch (default: 1000)'
        )
        parser.add_argument(
            '--clear',
            action='store_true',
            help='Clear all existing TripsMatching records before processing'
        )

    def handle(self, *args, **options):
        start_date_str = options.get('start_date')
        end_date_str = options.get('end_date')
        batch_size = options.get('batch_size', 1000)
        clear_existing = options.get('clear', False)

        # Parse dates if provided
        start_date = None
        end_date = None
        if start_date_str:
            start_date = datetime.strptime(start_date_str, '%Y-%m-%d').date()
        if end_date_str:
            end_date = datetime.strptime(end_date_str, '%Y-%m-%d').date()

        # Clear existing records if requested
        if clear_existing:
            self.stdout.write(self.style.WARNING('Clearing all existing TripsMatching records...'))
            count = TripsMatching.objects.count()
            TripsMatching.objects.all().delete()
            self.stdout.write(self.style.SUCCESS(f'Deleted {count} existing records'))

        # Step 0: Load all polygons into memory (this should be manageable)
        self.stdout.write(self.style.SUCCESS('Loading all polygons into memory...'))
        polygons = list(PolygonOfInterest.objects.all())
        self.stdout.write(self.style.SUCCESS(f'Loaded {len(polygons)} polygons'))

        # Step 1: Get distinct (date, caid) combinations using database aggregation
        # This avoids loading all trips into memory
        self.stdout.write(self.style.SUCCESS('Finding distinct trip groups (date, caid)...'))
        
        # Build base query
        base_query = BasicTrip.objects.all()
        if start_date:
            base_query = base_query.filter(utc_timestamp__date__gte=start_date)
        if end_date:
            base_query = base_query.filter(utc_timestamp__date__lte=end_date)

        # Get distinct date and caid combinations with counts
        # Use database aggregation to get groups efficiently
        groups_data = (
            base_query
            .annotate(trip_date=TruncDate('utc_timestamp'))
            .values('trip_date', 'caid')
            .annotate(trip_count=Count('id'))
            .filter(trip_count__gte=2)  # Only groups with at least 2 trips
            .order_by('trip_date', 'caid')
        )
        
        total_groups = groups_data.count()
        self.stdout.write(self.style.SUCCESS(f'Found {total_groups} trip groups to process'))

        # Process groups in batches
        total_processed = 0
        total_created = 0
        batch = []

        # Process groups in chunks to avoid memory issues
        groups_iterator = groups_data.iterator(chunk_size=1000)
        
        for group_info in groups_iterator:
            trip_date = group_info['trip_date']
            caid = group_info['caid']
            trip_count = group_info['trip_count']
            
            # Step 2: Get first, middle, and last records efficiently
            # Only fetch the 3 trips we need instead of loading all trips
            group_query = base_query.filter(
                caid=caid,
                utc_timestamp__date=trip_date
            ).only('id', 'latitude', 'longitude', 'utc_timestamp')
            
            # Get first trip
            first_trip = group_query.order_by('utc_timestamp').first()
            if not first_trip:
                continue
            
            # Get last trip
            last_trip = group_query.order_by('-utc_timestamp').first()
            if not last_trip:
                continue
            
            # Get middle trip (approximately)
            middle_offset = trip_count // 2
            middle_trip = group_query.order_by('utc_timestamp')[middle_offset:middle_offset+1].first()
            if not middle_trip:
                # Fallback to last trip if middle can't be found
                middle_trip = last_trip

            # Step 3: Check if records fall within polygons
            first_polygons = self._find_polygons_containing_point(
                first_trip.latitude, first_trip.longitude, polygons
            )
            
            middle_polygons = self._find_polygons_containing_point(
                middle_trip.latitude, middle_trip.longitude, polygons
            )
            
            last_polygons = self._find_polygons_containing_point(
                last_trip.latitude, last_trip.longitude, polygons
            )

            # Step 4: If first AND (middle OR last) are in polygons, create record
            if first_polygons and (middle_polygons or last_polygons):
                # Use first polygon for origin
                origin_polygon = first_polygons[0]
                
                # Use middle if available, otherwise last
                destination_polygon = None
                if middle_polygons:
                    destination_polygon = middle_polygons[0]
                elif last_polygons:
                    destination_polygon = last_polygons[0]

                if destination_polygon:
                    # Only create record if origin and destination polygons are different
                    origin_cvegeo = origin_polygon.cvegeo or 'NA'
                    destination_cvegeo = destination_polygon.cvegeo or 'NA'
                    
                    if origin_cvegeo != destination_cvegeo:
                        # Generate trip_id
                        trip_id = f"{caid}_{trip_date.isoformat()}_{first_trip.id}_{last_trip.id}"

                        # Determine time of day from first trip's timestamp
                        time_of_day = TripsMatching.get_time_of_day(first_trip.utc_timestamp)
                        
                        # Create TripsMatching record
                        matching_record = TripsMatching(
                            trip_id=trip_id,
                            origin_polygon=origin_cvegeo,
                            origin_polygon_name=origin_polygon.nom_asen or '',
                            destination_polygon=destination_cvegeo,
                            destination_polygon_name=destination_polygon.nom_asen or '',
                            date=trip_date,
                            time_of_day=time_of_day
                        )
                        batch.append(matching_record)
                        total_created += 1

            total_processed += 1
            
            # Periodically force garbage collection to free memory
            if total_processed % 1000 == 0:
                gc.collect()

            # Process batch when it reaches batch_size
            if len(batch) >= batch_size:
                self._save_batch(batch)
                self.stdout.write(
                    self.style.SUCCESS(
                        f'Processed {total_processed}/{total_groups} groups, created {total_created} matching records'
                    )
                )
                batch = []

        # Save remaining batch
        if batch:
            self._save_batch(batch)

        self.stdout.write(
            self.style.SUCCESS(
                f'\nCompleted! Processed {total_processed} trip groups, '
                f'created {total_created} TripsMatching records'
            )
        )

    def _find_polygons_containing_point(self, latitude, longitude, polygons):
        """
        Find all polygons that contain the given point.
        Returns a list of PolygonOfInterest objects.
        """
        if not latitude or not longitude:
            return []

        point = Point(longitude, latitude, srid=4326)
        matching_polygons = []

        for polygon in polygons:
            if polygon.geometry and polygon.geometry.contains(point):
                matching_polygons.append(polygon)

        return matching_polygons

    @transaction.atomic
    def _save_batch(self, batch):
        """Save a batch of TripsMatching records"""
        if batch:
            TripsMatching.objects.bulk_create(batch, ignore_conflicts=True)
            batch.clear()

