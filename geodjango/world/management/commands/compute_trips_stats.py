from django.core.management.base import BaseCommand
from django.db.models import Count, Q
from world.models import TripsMatching
import csv
import os
from datetime import datetime
from collections import defaultdict


class Command(BaseCommand):
    help = 'Generate CSV statistics table for trips matching data with aggregated counts'

    def add_arguments(self, parser):
        parser.add_argument(
            '--output-file',
            type=str,
            default=None,
            help='Path to the output CSV file. If not provided, a default filename will be generated.'
        )
        parser.add_argument(
            '--start-date',
            type=str,
            help='Start date for filtering trips (YYYY-MM-DD). If not provided, processes all dates.'
        )
        parser.add_argument(
            '--end-date',
            type=str,
            help='End date for filtering trips (YYYY-MM-DD). If not provided, processes all dates.'
        )

    def handle(self, *args, **options):
        output_file = options.get('output_file')
        start_date_str = options.get('start_date')
        end_date_str = options.get('end_date')

        # Parse dates if provided
        start_date = None
        end_date = None
        if start_date_str:
            start_date = datetime.strptime(start_date_str, '%Y-%m-%d').date()
        if end_date_str:
            end_date = datetime.strptime(end_date_str, '%Y-%m-%d').date()

        # Generate default output filename if not provided
        if not output_file:
            timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
            output_file = f'trips_stats_{timestamp}.csv'

        # Get the directory of the output file
        output_dir = os.path.dirname(output_file)
        if output_dir and not os.path.exists(output_dir):
            os.makedirs(output_dir, exist_ok=True)

        # Build base query
        queryset = TripsMatching.objects.all()
        if start_date:
            queryset = queryset.filter(date__gte=start_date)
        if end_date:
            queryset = queryset.filter(date__lte=end_date)

        # Generate statistics
        self._generate_stats(queryset, output_file)

    def _generate_stats(self, queryset, output_file):
        """Generate comprehensive statistics grouped by origin and destination polygons"""
        self.stdout.write('Generating trip statistics...')

        # First, get all unique dates to create dynamic columns
        unique_dates = sorted(
            queryset.values_list('date', flat=True).distinct()
        )
        
        if not unique_dates:
            self.stdout.write(self.style.WARNING('No records to export'))
            return

        self.stdout.write(f'Found {len(unique_dates)} unique dates')

        # Aggregate by origin and destination polygons with time of day counts
        stats = (
            queryset
            .values(
                'origin_polygon',
                'destination_polygon',
                'origin_polygon_name',
                'destination_polygon_name'
            )
            .annotate(
                total=Count('id'),
                mañana_total=Count('id', filter=Q(time_of_day='mañana')),
                tarde_total=Count('id', filter=Q(time_of_day='tarde')),
                noche_total=Count('id', filter=Q(time_of_day='noche')),
                madrugada_total=Count('id', filter=Q(time_of_day='madrugada'))
            )
            .order_by('origin_polygon', 'destination_polygon')
        )

        total_combinations = stats.count()
        self.stdout.write(f'Found {total_combinations} unique origin-destination combinations')

        if total_combinations == 0:
            self.stdout.write(self.style.WARNING('No records to export'))
            return

        # Get date-specific counts for each origin-destination combination
        # We'll fetch all records grouped by origin/destination/date to build the pivot
        self.stdout.write('Calculating date-specific counts...')
        
        # Fetch detailed data for date pivoting
        date_stats = (
            queryset
            .values(
                'origin_polygon',
                'destination_polygon',
                'date'
            )
            .annotate(count=Count('id'))
            .order_by('origin_polygon', 'destination_polygon', 'date')
        )

        # Build a dictionary for quick lookup: (origin, destination) -> {date: count}
        date_counts = defaultdict(dict)
        for stat in date_stats:
            key = (
                stat['origin_polygon'] or '',
                stat['destination_polygon'] or ''
            )
            date_str = stat['date'].isoformat() if stat['date'] else ''
            date_counts[key][date_str] = stat['count']

        # Build fieldnames for CSV
        fieldnames = [
            'polygon_origin',
            'polygon_destination',
            'polygon_origin_name',
            'polygon_destination_name',
            'total',
            'mañana_total',
            'tarde_total',
            'noche_total',
            'madrugada_total'
        ]
        
        # Add date columns (sorted)
        date_columns = [date.isoformat() for date in unique_dates]
        fieldnames.extend(date_columns)

        # Write CSV file
        records_written = 0
        with open(output_file, 'w', newline='', encoding='utf-8') as csvfile:
            writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
            writer.writeheader()

            for stat in stats:
                origin = stat['origin_polygon'] or ''
                destination = stat['destination_polygon'] or ''
                key = (origin, destination)

                # Build row data
                row = {
                    'polygon_origin': origin,
                    'polygon_destination': destination,
                    'polygon_origin_name': stat['origin_polygon_name'] or '',
                    'polygon_destination_name': stat['destination_polygon_name'] or '',
                    'total': stat['total'],
                    'mañana_total': stat['mañana_total'],
                    'tarde_total': stat['tarde_total'],
                    'noche_total': stat['noche_total'],
                    'madrugada_total': stat['madrugada_total']
                }

                # Add date columns
                date_counts_for_key = date_counts.get(key, {})
                for date_str in date_columns:
                    row[date_str] = date_counts_for_key.get(date_str, 0)

                writer.writerow(row)
                records_written += 1

                # Progress update
                if records_written % 100 == 0:
                    self.stdout.write(f'Processed {records_written}/{total_combinations} combinations...')

        self.stdout.write(
            self.style.SUCCESS(
                f'\nSuccessfully exported {records_written} records to {output_file}'
            )
        )

