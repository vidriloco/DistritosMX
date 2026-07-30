"""
Django management command to populate tourist visitor info for the last two years of data.

This command calculates and populates the tourist_visitors_info JSONField for each Neighbourhood.
The structure is: {"YYYY-MM": {"total": int, "daily_avg": float, "daily_morning_avg": float,
                                "daily_afternoon_avg": float, "daily_afternoon_eve": float,
                                "days": [{"01": {"d": int, "m": int, "a": int, "e": int}}, ...]}, ...}

The command automatically processes all months for the last two years available in the BasicTrip table.

Usage:
    python manage.py populate_tourist_visitors_in_geoareas [--batch-size N] [--force]

Optional Arguments:
    --batch-size N: Number of neighbourhoods to process before showing progress (default: 10)
    --force: Force recalculation even if data already exists
"""

from django.core.management.base import BaseCommand
from django.utils import timezone
from django.db.models.functions import ExtractYear
from datetime import datetime
from calendar import monthrange
from world.models import Neighbourhood, BasicTrip


class Command(BaseCommand):
    help = 'Populate tourist visitor fields in geoareas based on BasicTrip data'

    def has_tourist_visitor_data(self, neighbourhood, year_month_key):
        """
        Check if neighbourhood already has tourist visitor data populated for the given year-month.
        
        Returns True if the year-month key exists in tourist_visitors_info, False otherwise.
        """
        if neighbourhood.tourist_visitors_info is None:
            return False
        
        if not isinstance(neighbourhood.tourist_visitors_info, dict):
            return False
        
        return year_month_key in neighbourhood.tourist_visitors_info

    def add_arguments(self, parser):
        parser.add_argument(
            '--batch-size',
            type=int,
            default=10,
            help='Number of neighbourhoods to process before showing progress (default: 10)'
        )
        parser.add_argument(
            '--morning-start',
            type=int,
            default=6,
            help='Morning start hour (0-23, default: 6)'
        )
        parser.add_argument(
            '--morning-end',
            type=int,
            default=12,
            help='Morning end hour (0-23, default: 12)'
        )
        parser.add_argument(
            '--afternoon-start',
            type=int,
            default=12,
            help='Afternoon start hour (0-23, default: 12)'
        )
        parser.add_argument(
            '--afternoon-end',
            type=int,
            default=18,
            help='Afternoon end hour (0-23, default: 18)'
        )
        parser.add_argument(
            '--evening-start',
            type=int,
            default=18,
            help='Evening start hour (0-23, default: 18)'
        )
        parser.add_argument(
            '--evening-end',
            type=int,
            default=24,
            help='Evening end hour (0-23, default: 24, meaning 23:59:59)'
        )
        parser.add_argument(
            '--force',
            action='store_true',
            help='Force recalculation even if tourist visitor fields are already populated (default: False)'
        )

    def get_days_in_month(self, year, month):
        """Get the number of days in a given month and year."""
        return monthrange(year, month)[1]

    def process_year_month(self, year, month, neighbourhoods, batch_size, force, 
                          morning_start, morning_end, afternoon_start, afternoon_end,
                          evening_start, evening_end):
        """Process a single year-month combination for all neighbourhoods."""
        days_in_month = self.get_days_in_month(year, month)
        year_month_key = f"{year}-{month:02d}"
        
        month_names = ['', 'January', 'February', 'March', 'April', 'May', 'June',
                      'July', 'August', 'September', 'October', 'November', 'December']
        month_name = month_names[month]

        # Check if there's any BasicTrip data for this month
        total_trips_month = BasicTrip.objects.filter(
            utc_timestamp__year=year,
            utc_timestamp__month=month,
            location__isnull=False
        ).count()

        if total_trips_month == 0:
            self.stdout.write(
                self.style.WARNING(
                    f"No BasicTrip records found for {year}-{month:02d}, skipping..."
                )
            )
            return 0, 0, 0, 0  # updated, skipped, already_populated, processed_count

        self.stdout.write("")
        self.stdout.write(self.style.SUCCESS("=" * 60))
        self.stdout.write(self.style.SUCCESS(f"Processing {month_name} {year} ({year_month_key})"))
        self.stdout.write(self.style.SUCCESS(f"Found {total_trips_month:,} BasicTrip records"))
        self.stdout.write(self.style.SUCCESS("=" * 60))

        total_neighbourhoods = len(neighbourhoods)
        updated = 0
        skipped = 0
        already_populated = 0
        processed_count = 0

        for neighbourhood in neighbourhoods:
            processed_count += 1

            try:
                # Check if neighbourhood has valid geometry
                if not neighbourhood.geometry or not neighbourhood.geometry.valid:
                    skipped += 1
                    continue

                # Check if data already exists (unless force is enabled)
                if not force and self.has_tourist_visitor_data(neighbourhood, year_month_key):
                    already_populated += 1
                    continue

                # Filter BasicTrip points within the neighbourhood polygon for the specified month
                trips_timestamps = list(BasicTrip.objects.filter(
                    location__within=neighbourhood.geometry,
                    utc_timestamp__year=year,
                    utc_timestamp__month=month,
                    location__isnull=False
                ).values_list('utc_timestamp', flat=True))

                # Initialize daily statistics dictionary
                daily_stats = {f"{day:02d}": {"d": 0, "m": 0, "a": 0, "e": 0} for day in range(1, days_in_month + 1)}
                
                total_count = 0
                total_morning = 0
                total_afternoon = 0
                total_evening = 0

                # Process all trips in Python
                for timestamp in trips_timestamps:
                    day = timestamp.day
                    hour = timestamp.hour
                    day_str = f"{day:02d}"
                    
                    # Increment daily total
                    daily_stats[day_str]["d"] += 1
                    total_count += 1
                    
                    # Check time periods
                    if morning_start <= hour < morning_end:
                        daily_stats[day_str]["m"] += 1
                        total_morning += 1
                    elif afternoon_start <= hour < afternoon_end:
                        daily_stats[day_str]["a"] += 1
                        total_afternoon += 1
                    elif (evening_end >= 24 and hour >= evening_start) or (evening_start <= hour < evening_end):
                        daily_stats[day_str]["e"] += 1
                        total_evening += 1

                # Calculate averages
                avg_daily = total_count / days_in_month if days_in_month > 0 else 0
                avg_daily_morning = total_morning / days_in_month if days_in_month > 0 else 0
                avg_daily_afternoon = total_afternoon / days_in_month if days_in_month > 0 else 0
                avg_daily_evening = total_evening / days_in_month if days_in_month > 0 else 0

                # Initialize tourist_visitors_info if it doesn't exist
                if neighbourhood.tourist_visitors_info is None:
                    neighbourhood.tourist_visitors_info = {}
                
                # Update the specific year-month entry
                neighbourhood.tourist_visitors_info[year_month_key] = {
                    "total": total_count,
                    "daily_avg": round(avg_daily, 2),
                    "daily_morning_avg": round(avg_daily_morning, 2),
                    "daily_afternoon_avg": round(avg_daily_afternoon, 2),
                    "daily_afternoon_eve": round(avg_daily_evening, 2),
                    "days": daily_stats
                }
                
                neighbourhood.save(update_fields=['tourist_visitors_info'])
                updated += 1

                # Show progress every batch_size neighbourhoods
                if processed_count % batch_size == 0 or processed_count == total_neighbourhoods:
                    self.stdout.write(
                        f"  [{processed_count}/{total_neighbourhoods}] {neighbourhood.neighbourhood_name}: "
                        f"Total={total_count}, Morning={total_morning}, Afternoon={total_afternoon}, "
                        f"Evening={total_evening}, Avg Daily={avg_daily:.2f}"
                    )

            except Exception as e:
                self.stdout.write(
                    self.style.ERROR(
                        f"  [{processed_count}/{total_neighbourhoods}] Error processing {neighbourhood.neighbourhood_name}: {e}"
                    )
                )
                skipped += 1
                continue

        return updated, skipped, already_populated, processed_count

    def handle(self, *args, **options):
        batch_size = options.get('batch_size', 10)
        force = options.get('force', False)
        morning_start = options.get('morning_start', 6)
        morning_end = options.get('morning_end', 12)
        afternoon_start = options.get('afternoon_start', 12)
        afternoon_end = options.get('afternoon_end', 18)
        evening_start = options.get('evening_start', 18)
        evening_end = options.get('evening_end', 24)

        # Find the last two years with data in BasicTrip table
        # First, get all distinct years to see what's available
        all_years_queryset = BasicTrip.objects.filter(
            location__isnull=False
        ).annotate(
            year=ExtractYear('utc_timestamp')
        ).values_list('year', flat=True).distinct().order_by('-year')

        all_years_list = sorted(set(all_years_queryset), reverse=True)
        
        if not all_years_list:
            self.stdout.write(
                self.style.ERROR("No BasicTrip records found with location data.")
            )
            return

        # Get the last two years (most recent first from query, but we'll reverse to process chronologically)
        # Ensure we have at least 2 years if available, otherwise use what we have
        years_to_process = all_years_list[:2] if len(all_years_list) >= 2 else all_years_list
        # Reverse to process in chronological order (older year first, then newer year)
        years_to_process = sorted(years_to_process)

        if len(years_to_process) < 2:
            self.stdout.write(
                self.style.WARNING(
                    f"Only found {len(years_to_process)} year(s) with data. "
                    f"Will process: {', '.join(map(str, years_to_process))}"
                )
            )

        self.stdout.write("=" * 60)
        self.stdout.write(self.style.SUCCESS("Tourist Visitors Data Population"))
        self.stdout.write("=" * 60)
        self.stdout.write(f"Available years in database: {', '.join(map(str, all_years_list))}")
        
        # Show record counts for each year to verify data exists
        for year in all_years_list:
            count = BasicTrip.objects.filter(
                location__isnull=False,
                utc_timestamp__year=year
            ).count()
            self.stdout.write(f"  Year {year}: {count:,} records with location data")
        
        self.stdout.write(f"Processing last {len(years_to_process)} year(s): {', '.join(map(str, years_to_process))}")
        self.stdout.write(f"Morning hours: {morning_start:02d}:00 - {morning_end:02d}:00")
        self.stdout.write(f"Afternoon hours: {afternoon_start:02d}:00 - {afternoon_end:02d}:00")
        self.stdout.write(f"Evening hours: {evening_start:02d}:00 - {evening_end:02d}:00")
        if force:
            self.stdout.write(self.style.WARNING("Force mode enabled: Will recalculate all neighbourhoods"))
        else:
            self.stdout.write("Skipping neighbourhoods that already have data (use --force to override)")
        self.stdout.write("")

        # Get all neighbourhoods once
        total_neighbourhoods = Neighbourhood.objects.count()
        neighbourhoods = list(Neighbourhood.objects.all())
        
        self.stdout.write(f"Total neighbourhoods to process: {total_neighbourhoods}")
        self.stdout.write("")

        # Track totals across all year-month combinations
        total_updated = 0
        total_skipped = 0
        total_already_populated = 0
        total_processed = 0

        # Process all months for each year
        for year in years_to_process:
            self.stdout.write("")
            self.stdout.write(self.style.SUCCESS(f"Starting processing for year {year}"))
            self.stdout.write("")
            
            for month in range(1, 13):
                updated, skipped, already_populated, processed_count = self.process_year_month(
                    year, month, neighbourhoods, batch_size, force,
                    morning_start, morning_end, afternoon_start, afternoon_end,
                    evening_start, evening_end
                )
                total_updated += updated
                total_skipped += skipped
                total_already_populated += already_populated
                total_processed += processed_count
            
            self.stdout.write("")
            self.stdout.write(self.style.SUCCESS(f"Completed processing for year {year}"))

        # Final Summary
        self.stdout.write("")
        self.stdout.write(self.style.SUCCESS("=" * 60))
        self.stdout.write(self.style.SUCCESS("FINAL SUMMARY"))
        self.stdout.write(self.style.SUCCESS("=" * 60))
        self.stdout.write(self.style.SUCCESS(f"  Years processed: {', '.join(map(str, years_to_process))}"))
        self.stdout.write(self.style.SUCCESS(f"  Total neighbourhoods: {total_neighbourhoods}"))
        self.stdout.write(self.style.SUCCESS(f"  Total updated: {total_updated}"))
        if not force:
            self.stdout.write(self.style.SUCCESS(f"  Already populated (skipped): {total_already_populated}"))
        self.stdout.write(self.style.SUCCESS(f"  Skipped (errors/invalid): {total_skipped}"))
        self.stdout.write(self.style.SUCCESS("=" * 60))

