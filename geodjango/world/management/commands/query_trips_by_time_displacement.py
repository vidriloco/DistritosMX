"""
Django management command to query trips by start_time and displacement.

This command queries trips from the Trip model where:
- start_time date lies between from-date and to-date
- displacement > 2

Returns the first X trips and outputs only the caid column values.

Usage:
    python manage.py query_trips_by_time_displacement --from-date DATE --to-date DATE --limit X

Required Arguments:
    --from-date DATE: Start date for start_time filter (format: YYYY-MM-DD)
    --to-date DATE: End date for start_time filter (format: YYYY-MM-DD)
    --limit X: Number of trips to return (positive integer)

Examples:
    # Get first 10 trips with start_time between 2024-11-01 and 2024-11-02 and displacement > 2
    python manage.py query_trips_by_time_displacement --from-date 2024-11-01 --to-date 2024-11-02 --limit 10
"""

from datetime import datetime, timedelta
from django.core.management.base import BaseCommand, CommandError
from world.models import Trip


class Command(BaseCommand):
    help = 'Query trips by start_time date range and displacement, return caid values'

    def add_arguments(self, parser):
        parser.add_argument(
            '--from-date',
            type=str,
            required=True,
            help='Start date for start_time filter (format: YYYY-MM-DD)'
        )
        parser.add_argument(
            '--to-date',
            type=str,
            required=True,
            help='End date for start_time filter (format: YYYY-MM-DD)'
        )
        parser.add_argument(
            '--limit',
            type=int,
            required=True,
            help='Number of trips to return (positive integer)'
        )

    def handle(self, *args, **options):
        from_date_str = options['from_date']
        to_date_str = options['to_date']
        limit = options['limit']
        
        # Validate limit
        if limit <= 0:
            raise CommandError('Limit must be a positive integer')
        
        # Parse dates
        try:
            from_date_obj = datetime.strptime(from_date_str, '%Y-%m-%d')
        except ValueError as e:
            raise CommandError(f'Invalid from-date format. Use YYYY-MM-DD format. Error: {e}')
        
        try:
            to_date_obj = datetime.strptime(to_date_str, '%Y-%m-%d')
        except ValueError as e:
            raise CommandError(f'Invalid to-date format. Use YYYY-MM-DD format. Error: {e}')
        
        # Validate date range
        if from_date_obj > to_date_obj:
            raise CommandError('from-date must be less than or equal to to-date')
        
        # Build date range for filtering
        # from-date: start of day (00:00:00)
        # to-date: end of day (use next day with __lt to include entire last day)
        start_datetime = from_date_obj
        # to-date should include the entire day, so use next day with __lt
        end_datetime = to_date_obj + timedelta(days=1)
        
        # Build query - filter by start_time date range and displacement
        queryset = Trip.objects.filter(
            start_time__isnull=False,
            start_time__gte=start_datetime,
            start_time__lt=end_datetime,
            displacement__gt=2
        )
        
        # Get unique CAIDs and limit results
        # Use distinct on caid to ensure uniqueness, then limit
        unique_caids = queryset.values_list('caid', flat=True).distinct().order_by('caid')[:limit]
        caids = list(unique_caids)
        
        # Output caid values, one per line (to stdout)
        for caid in caids:
            self.stdout.write(caid)
        
        if not caids:
            query_desc = f'start_time between {from_date_str} and {to_date_str}'
            # Write warning to stderr so it doesn't mix with CAID output
            self.stderr.write(self.style.WARNING(f'No trips found matching {query_desc} and displacement > 2'))

