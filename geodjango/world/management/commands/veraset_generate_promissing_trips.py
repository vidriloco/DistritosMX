"""
Django management command to store promising trip statistics grouped by CAID in the TripOutstanding table.

This command aggregates trip data by CAID and stores the results in the TripOutstanding model:
- caid: Customer/device identifier
- record_count: Number of trip records for this CAID
- start_date: UTC timestamp of the first trip
- end_date: UTC timestamp of the last trip + its traverse_time
- total_traverse_time: Sum of all traverse_time values
- total_displacement: Sum of all displacement values
- total_pings: Sum of all pings values

Usage:
    python manage.py veraset_generate_promissing_trips [options]

Optional Arguments:
    --batch-size N: Number of CAIDs to process in each batch (default: 1000)
    --start-time DATETIME: Filter trips from this start time (format: YYYY-MM-DD HH:MM:SS or YYYY-MM-DD)
    --end-time DATETIME: Filter trips until this end time (format: YYYY-MM-DD HH:MM:SS or YYYY-MM-DD)

Note: The TripOutstanding table is always cleared before processing new data.

Examples:
    # Basic usage - store all trip statistics
    python manage.py veraset_generate_promissing_trips

    # Filter by time range
    python manage.py veraset_generate_promissing_trips --start-time "2024-11-01 00:00:00" --end-time "2024-11-01 23:59:59"

    # Filter by date (entire day)
    python manage.py veraset_generate_promissing_trips --start-time 2024-11-01 --end-time 2024-11-01

    # Use custom batch size for better performance
    python manage.py veraset_generate_promissing_trips --batch-size 5000

Notes:
    - Processes all CAIDs in the Trip table (or filtered by time range if --start-time/--end-time are provided)
    - Aggregates data using database queries for efficiency
    - Excludes records where total_pings, total_displacement, or total_traverse_time is 0
    - Only includes CAIDs with total displacement between 2km (2000m) and 30km (30000m)
    - When filtering by a single date, only includes trips that both start AND end on that date
    - Progress is reported during processing
    - Final statistics show total CAIDs processed
    - Time filter uses utc_timestamp field
    - TripOutstanding table is always cleared before processing to ensure fresh data
"""

from datetime import timedelta, datetime
from django.core.management.base import BaseCommand
from django.db.models import (
    Count, Min, Max, Sum
)
from django.utils import timezone
from world.models import Trip, TripOutstanding


class Command(BaseCommand):
    help = 'Store promising trip statistics grouped by CAID in the TripOutstanding table'

    def add_arguments(self, parser):
        parser.add_argument(
            '--batch-size',
            type=int,
            default=1000,
            help='Number of CAIDs to process in each batch (default: 1000)'
        )
        parser.add_argument(
            '--start-time',
            type=str,
            default=None,
            help='Filter trips from this start time (format: YYYY-MM-DD HH:MM:SS or YYYY-MM-DD)'
        )
        parser.add_argument(
            '--end-time',
            type=str,
            default=None,
            help='Filter trips until this end time (format: YYYY-MM-DD HH:MM:SS or YYYY-MM-DD)'
        )

    def parse_datetime(self, datetime_str):
        """Parse datetime string in various formats"""
        if not datetime_str:
            return None
        
        formats = [
            '%Y-%m-%d %H:%M:%S',
            '%Y-%m-%d %H:%M:%S.%f',
            '%Y-%m-%d',
        ]
        
        for fmt in formats:
            try:
                dt = datetime.strptime(datetime_str, fmt)
                # If only date was provided, set time to start/end of day
                if fmt == '%Y-%m-%d':
                    # This will be handled by the caller
                    pass
                return dt
            except ValueError:
                continue
        
        return None

    def handle(self, *args, **options):
        batch_size = options['batch_size']
        start_time_str = options['start_time']
        end_time_str = options['end_time']
        
        self.stdout.write('Starting to store promising trips in TripOutstanding table...')
        
        # Always clear existing records before processing
        deleted_count = TripOutstanding.objects.all().delete()[0]
        self.stdout.write(
            self.style.WARNING(f'Cleared {deleted_count} existing records from TripOutstanding table')
        )
        
        # Parse and apply time filter if provided
        date_start = None
        date_end = None
        if start_time_str or end_time_str:
            if start_time_str:
                start_dt = self.parse_datetime(start_time_str)
                if not start_dt:
                    self.stdout.write(
                        self.style.ERROR(
                            f'Invalid start-time format: {start_time_str}. '
                            f'Expected format: YYYY-MM-DD HH:MM:SS or YYYY-MM-DD'
                        )
                    )
                    return
                # If only date provided, set to start of day
                if len(start_time_str) == 10:  # YYYY-MM-DD format
                    date_start = timezone.make_aware(
                        datetime.combine(start_dt.date(), datetime.min.time())
                    )
                else:
                    date_start = timezone.make_aware(start_dt)
            
            if end_time_str:
                end_dt = self.parse_datetime(end_time_str)
                if not end_dt:
                    self.stdout.write(
                        self.style.ERROR(
                            f'Invalid end-time format: {end_time_str}. '
                            f'Expected format: YYYY-MM-DD HH:MM:SS or YYYY-MM-DD'
                        )
                    )
                    return
                # If only date provided, set to end of day
                if len(end_time_str) == 10:  # YYYY-MM-DD format
                    date_end = timezone.make_aware(
                        datetime.combine(end_dt.date(), datetime.max.time())
                    )
                else:
                    date_end = timezone.make_aware(end_dt)
            
            if date_start and date_end and date_start > date_end:
                self.stdout.write(
                    self.style.ERROR(
                        f'Start time ({date_start}) must be before end time ({date_end})'
                    )
                )
                return
            
            filter_msg = f'from {date_start}' if date_start else ''
            if date_end:
                filter_msg += f' to {date_end}' if filter_msg else f'until {date_end}'
            self.stdout.write(f'Filtering trips {filter_msg}')
        
        # Build base queryset with optional time filter
        # If filtering by a single date, only include trips that start AND end on that date
        base_queryset = Trip.objects.all()
        is_single_date = (
            date_start and date_end and 
            date_start.date() == date_end.date() and
            date_start.time() == datetime.min.time() and
            date_end.time() == datetime.max.time()
        )
        
        if date_start:
            base_queryset = base_queryset.filter(utc_timestamp__gte=date_start)
        if date_end:
            base_queryset = base_queryset.filter(utc_timestamp__lte=date_end)
        
        # For single date filtering, also filter by end_time to ensure trips end on that date
        if is_single_date:
            # Filter trips where end_time (utc_timestamp + traverse_time) is within the date
            # We'll do this in process_batch to check each trip individually
            pass
        
        # Get all unique CAIDs (filtered by time if provided)
        all_caids = base_queryset.values_list('caid', flat=True).distinct()
        total_caids = all_caids.count()
        
        if total_caids == 0:
            filter_msg = f' (filtered by time range)' if (date_start or date_end) else ''
            self.stdout.write(
                self.style.WARNING(f'No trips found in the database{filter_msg}.')
            )
            return
        
        filter_msg = f' (filtered by time range)' if (date_start or date_end) else ''
        self.stdout.write(f'Found {total_caids} unique CAIDs to process{filter_msg}')
        
        # Process CAIDs in batches and store in database
        processed = 0
        created_count = 0
        excluded_count = 0
        excluded_date_filter_count = 0
        excluded_zero_values_count = 0
        excluded_displacement_count = 0
        
        for i in range(0, total_caids, batch_size):
            batch_caids = list(all_caids[i:i + batch_size])
            batch_num = (i // batch_size) + 1
            total_batches = (total_caids + batch_size - 1) // batch_size
            
            self.stdout.write(
                f'Processing batch {batch_num}/{total_batches} ({len(batch_caids)} CAIDs)...'
            )
            
            try:
                batch_stats = self.process_batch(
                    batch_caids, 
                    date_start, 
                    date_end,
                    is_single_date=is_single_date
                )
                processed += len(batch_caids)
                created_count += batch_stats['created']
                excluded_count += batch_stats['excluded']
                excluded_date_filter_count += batch_stats.get('excluded_date_filter', 0)
                excluded_zero_values_count += batch_stats.get('excluded_zero_values', 0)
                excluded_displacement_count += batch_stats.get('excluded_displacement', 0)
                
            except Exception as e:
                self.stdout.write(
                    self.style.ERROR(f'Error processing batch {batch_num}: {str(e)}')
                )
                import traceback
                self.stdout.write(traceback.format_exc())
                continue
        
        # Final statistics
        self.stdout.write(
            self.style.SUCCESS(
                f'\nProcessing completed!\n'
                f'Total CAIDs processed: {processed}\n'
                f'Records created: {created_count}\n'
                f'Records excluded (total): {excluded_count}\n'
                f'  - Excluded (date filter): {excluded_date_filter_count}\n'
                f'  - Excluded (zero values): {excluded_zero_values_count}\n'
                f'  - Excluded (displacement out of range): {excluded_displacement_count}\n'
                f'Total records in TripOutstanding: {TripOutstanding.objects.count()}'
            )
        )
    
    def process_batch(self, caids, date_start=None, date_end=None, is_single_date=False):
        """
        Process a batch of CAIDs and store results in TripOutstanding table.
        Returns a dictionary with statistics: {'created': int, 'excluded': int}
        """
        created = 0
        excluded = 0
        excluded_date_filter = 0
        excluded_zero_values = 0
        excluded_displacement = 0
        
        # Build queryset with optional time filter
        queryset = Trip.objects.filter(caid__in=caids)
        if date_start:
            queryset = queryset.filter(utc_timestamp__gte=date_start)
        if date_end:
            queryset = queryset.filter(utc_timestamp__lte=date_end)
        
        # For single date filtering, we need to filter trips that both start and end on that date
        if is_single_date and date_start:
            # We'll filter this after aggregation by checking each trip's end time
            pass
        
        # Query aggregated data for this batch of CAIDs
        aggregated = queryset.values('caid').annotate(
            record_count=Count('id'),
            start_date=Min('utc_timestamp'),
            last_timestamp=Max('utc_timestamp'),
            total_traverse_time=Sum('traverse_time'),
            total_displacement=Sum('displacement'),
            total_pings=Sum('pings')
        )
        
        # Process each aggregated CAID
        for agg in aggregated:
            caid = agg['caid']
            
            # For single date filtering, verify all trips start and end on that date
            if is_single_date and date_start:
                # Get all trips for this CAID to check if they all start and end on the date
                trips = queryset.filter(caid=caid)
                target_date = date_start.date()
                
                # Check if all trips start and end on the target date
                valid_trips = []
                for trip in trips:
                    trip_start = trip.utc_timestamp.date()
                    # Calculate trip end: use end_time if available, otherwise utc_timestamp + traverse_time
                    if trip.end_time:
                        trip_end = trip.end_time.date()
                    elif trip.traverse_time:
                        trip_end = (trip.utc_timestamp + timedelta(seconds=trip.traverse_time)).date()
                    else:
                        trip_end = trip_start
                    
                    # Only include trips that start AND end on the target date
                    if trip_start == target_date and trip_end == target_date:
                        valid_trips.append(trip)
                
                # If no valid trips (all start and end on the date), skip this CAID
                if not valid_trips:
                    excluded += 1
                    excluded_date_filter += 1
                    continue
                
                # Recalculate aggregates only for valid trips
                valid_trip_ids = [t.id for t in valid_trips]
                valid_queryset = Trip.objects.filter(id__in=valid_trip_ids)
                agg = valid_queryset.values('caid').annotate(
                    record_count=Count('id'),
                    start_date=Min('utc_timestamp'),
                    last_timestamp=Max('utc_timestamp'),
                    total_traverse_time=Sum('traverse_time'),
                    total_displacement=Sum('displacement'),
                    total_pings=Sum('pings')
                ).first()
                
                if not agg:
                    excluded += 1
                    excluded_date_filter += 1
                    continue
            
            # Get the last trip's traverse_time
            # Note: agg['last_timestamp'] is already within the date range from the aggregation
            last_trip = Trip.objects.filter(
                caid=caid,
                utc_timestamp=agg['last_timestamp']
            ).order_by('-traverse_time').first()
            
            # Calculate end_date: last_timestamp + traverse_time of that trip
            end_date = None
            if agg['last_timestamp'] and last_trip:
                # Prefer end_time if available, otherwise calculate from traverse_time
                if last_trip.end_time:
                    end_date = last_trip.end_time
                elif last_trip.traverse_time:
                    end_date = agg['last_timestamp'] + timedelta(seconds=last_trip.traverse_time)
                else:
                    end_date = agg['last_timestamp']
            elif agg['last_timestamp']:
                # Fallback: if no traverse_time, just use the last timestamp
                end_date = agg['last_timestamp']
            
            # Get values
            total_traverse_time = agg['total_traverse_time'] or 0
            total_displacement = agg['total_displacement'] or 0
            total_pings = agg['total_pings'] or 0
            
            # Filter out records with zero values
            if total_pings == 0 or total_displacement == 0 or total_traverse_time == 0:
                excluded += 1
                excluded_zero_values += 1
                continue
            
            # Filter by displacement range: 2km (2000m) to 30km (30000m)
            if total_displacement < 2000 or total_displacement > 30000:
                excluded += 1
                excluded_displacement += 1
                continue
            
            # Create new record (table is always cleared at start, so all records are new)
            trip_outstanding = TripOutstanding.objects.create(
                caid=caid,
                record_count=agg['record_count'] or 0,
                start_date=agg['start_date'],
                end_date=end_date,
                total_traverse_time=total_traverse_time,
                total_displacement=total_displacement,
                total_pings=total_pings,
            )
            
            # Track statistics
            created += 1
        
        return {
            'created': created,
            'excluded': excluded,
            'excluded_date_filter': excluded_date_filter,
            'excluded_zero_values': excluded_zero_values,
            'excluded_displacement': excluded_displacement
        }

