import os
from django.core.management.base import BaseCommand
from django.contrib.gis.geos import Point
from django.contrib.gis.measure import Distance
from django.db.models import Count, Q
from world.models import PhoneLocation


class Command(BaseCommand):
    help = 'Get count of PhoneLocation records within a radius from given coordinates with country != MX'

    def add_arguments(self, parser):
        parser.add_argument(
            '--latitude',
            type=float,
            default=19.43502,
            help='Latitude coordinate (default: 19.43502)'
        )
        parser.add_argument(
            '--longitude',
            type=float,
            default=-99.13537,
            help='Longitude coordinate (default: -99.13537)'
        )
        parser.add_argument(
            '--radius',
            type=int,
            default=16500,
            help='Radius in meters (default: 16500)'
        )
        parser.add_argument(
            '--show-sample',
            action='store_true',
            help='Show sample records within the radius'
        )
        parser.add_argument(
            '--sample-size',
            type=int,
            default=10,
            help='Number of sample records to show (default: 10)'
        )
        parser.add_argument(
            '--show-countries',
            action='store_true',
            help='Show breakdown by country'
        )

    def handle(self, *args, **options):
        latitude = options['latitude']
        longitude = options['longitude']
        radius = options['radius']
        show_sample = options['show_sample']
        sample_size = options['sample_size']
        show_countries = options['show_countries']
        
        try:
            # Create the center point
            center_point = Point(longitude, latitude, srid=4326)
            
            # Get total count in database
            total_count = PhoneLocation.objects.count()
            self.stdout.write(f'Total PhoneLocation records in database: {total_count}')
            
            if total_count == 0:
                self.stdout.write('No records found in PhoneLocation table')
                return
            
            # Get count within radius (all countries)
            records_in_radius = PhoneLocation.objects.filter(
                location__distance_lte=(center_point, Distance(m=radius))
            )
            count_in_radius = records_in_radius.count()
            
            # Get count within radius with country != MX
            records_non_mx_in_radius = records_in_radius.exclude(country='MX')
            count_non_mx_in_radius = records_non_mx_in_radius.count()
            
            # Get count of MX records in radius for comparison
            records_mx_in_radius = records_in_radius.filter(country='MX')
            count_mx_in_radius = records_mx_in_radius.count()
            
            self.stdout.write(f'\nCenter coordinates: {latitude}, {longitude}')
            self.stdout.write(f'Radius: {radius} meters')
            self.stdout.write(f'Records within radius (all countries): {count_in_radius}')
            self.stdout.write(f'Records within radius (MX only): {count_mx_in_radius}')
            self.stdout.write(f'Records within radius (non-MX): {count_non_mx_in_radius}')
            
            if count_in_radius > 0:
                self.stdout.write(f'Percentage of non-MX in radius: {(count_non_mx_in_radius/count_in_radius)*100:.2f}%')
                self.stdout.write(f'Percentage of MX in radius: {(count_mx_in_radius/count_in_radius)*100:.2f}%')
            
            # Show breakdown by country if requested
            if show_countries and count_non_mx_in_radius > 0:
                self.stdout.write(f'\nCountry breakdown for non-MX records in radius:')
                self.stdout.write('-' * 50)
                
                country_counts = records_non_mx_in_radius.values('country').annotate(
                    count=Count('country')
                ).order_by('-count')
                
                for country_data in country_counts:
                    country = country_data['country'] or 'NULL'
                    count = country_data['count']
                    self.stdout.write(f'{country}: {count} records')
            
            # Show sample records if requested
            if show_sample and count_non_mx_in_radius > 0:
                self.stdout.write(f'\nSample of {min(sample_size, count_non_mx_in_radius)} non-MX records within radius:')
                self.stdout.write('-' * 80)
                
                sample_records = records_non_mx_in_radius[:sample_size]
                for record in sample_records:
                    self.stdout.write(
                        f'Device: {record.device_id[:20]}... | '
                        f'Country: {record.country or "NULL"} | '
                        f'Lat: {record.latitude:.6f} | '
                        f'Lng: {record.longitude:.6f} | '
                        f'Timestamp: {record.timestamp}'
                    )
            
            # Get some statistics about the non-MX records in radius
            if count_non_mx_in_radius > 0:
                # Get unique devices in radius (non-MX)
                unique_devices_non_mx = records_non_mx_in_radius.values('device_id').distinct().count()
                self.stdout.write(f'\nUnique non-MX devices within radius: {unique_devices_non_mx}')
                
                # Get date range of non-MX records in radius
                earliest_non_mx = records_non_mx_in_radius.order_by('timestamp').first()
                latest_non_mx = records_non_mx_in_radius.order_by('-timestamp').first()
                
                if earliest_non_mx and latest_non_mx:
                    from datetime import datetime
                    earliest_date = datetime.fromtimestamp(earliest_non_mx.timestamp)
                    latest_date = datetime.fromtimestamp(latest_non_mx.timestamp)
                    self.stdout.write(f'Date range of non-MX records in radius: {earliest_date} to {latest_date}')
                
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'Error querying PhoneLocation table: {e}')
            )


