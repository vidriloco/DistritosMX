"""
Django management command to query and filter TripHome records.

This command reads TripHome records from the database, applies filters based on
processing status and country, and returns a comma-separated string of CAIDs.

Usage:
    python manage.py veraset_process_trips_home [options]

Optional Arguments:
    --has-been-processed BOOL: Filter by processing status (True/False, optional)
    --country-iso CODE: Filter by ISO 2-letter country code (optional)

Examples:
    # Get all CAIDs
    python manage.py veraset_process_trips_home

    # Filter by processing status
    python manage.py veraset_process_trips_home --has-been-processed True

    # Filter by country
    python manage.py veraset_process_trips_home --country-iso US
"""

from django.core.management.base import BaseCommand
from world.models.trip_home import TripHome


class Command(BaseCommand):
    help = 'Query and filter TripHome records, returning comma-separated CAIDs'

    def add_arguments(self, parser):
        parser.add_argument(
            '--has-been-processed',
            type=str,
            choices=['True', 'False'],
            help='Filter by processing status (True/False, optional)'
        )
        parser.add_argument(
            '--country-iso',
            type=str,
            help='Filter by ISO 2-letter country code (optional)'
        )

    def handle(self, *args, **options):
        has_been_processed = options.get('has_been_processed')
        country_iso = options.get('country_iso')

        # Build queryset with filters
        queryset = TripHome.objects.all()
        
        if has_been_processed is not None:
            has_been_processed_bool = has_been_processed == 'True'
            queryset = queryset.filter(has_been_processed=has_been_processed_bool)
        
        if country_iso:
            queryset = queryset.filter(country_iso=country_iso)

        # Get CAIDs from the queryset
        caids = list(queryset.values_list('caid', flat=True))
        
        if not caids:
            return

        # Return comma-separated string of CAIDs
        caids_string = ','.join(caids)
        self.stdout.write(caids_string)

