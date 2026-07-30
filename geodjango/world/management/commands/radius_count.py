import os
from django.core.management.base import BaseCommand
from django.contrib.gis.geos import Point
from django.contrib.gis.measure import Distance
from world.models import PhoneLocation


class Command(BaseCommand):
    help = 'Get count of PhoneLocation records within a radius from given coordinates'

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

    def handle(self, *args, **options):
        latitude = options['latitude']
        longitude = options['longitude']
        radius = options['radius']
        show_sample = options['show_sample']
        sample_size = options['sample_size']
        
        try:
            # Create the center point
            center_point = Point(longitude, latitude, srid=4326)
            
            # Get total count in database
            total_count = PhoneLocation.objects.count()
            self.stdout.write(f'Total PhoneLocation records in database: {total_count}')
            
            if total_count == 0:
                self.stdout.write('No records found in PhoneLocation table')
                return
            
            # Get count within radius
            records_in_radius = PhoneLocation.objects.filter(
                location__distance_lte=(center_point, Distance(m=radius))
            )
            
            count_in_radius = records_in_radius.count()
            
            self.stdout.write(f'\nCenter coordinates: {latitude}, {longitude}')
            self.stdout.write(f'Radius: {radius} meters')
            self.stdout.write(f'Records within radius: {count_in_radius}')
            self.stdout.write(f'Percentage of total: {(count_in_radius/total_count)*100:.2f}%')
            
            if show_sample and count_in_radius > 0:
                self.stdout.write(f'\nSample of {min(sample_size, count_in_radius)} records within radius:')
                self.stdout.write('-' * 80)
                
                sample_records = records_in_radius[:sample_size]
                for record in sample_records:
                    self.stdout.write(
                        f'Device: {record.device_id[:20]}... | '
                        f'Lat: {record.latitude:.6f} | '
                        f'Lng: {record.longitude:.6f} | '
                        f'Timestamp: {record.timestamp}'
                    )
            
            # Get some statistics about the records in radius
            if count_in_radius > 0:
                # Get unique devices in radius
                unique_devices_in_radius = records_in_radius.values('device_id').distinct().count()
                self.stdout.write(f'\nUnique devices within radius: {unique_devices_in_radius}')
                
                # Get date range of records in radius
                earliest_in_radius = records_in_radius.order_by('timestamp').first()
                latest_in_radius = records_in_radius.order_by('-timestamp').first()
                
                if earliest_in_radius and latest_in_radius:
                    from datetime import datetime
                    earliest_date = datetime.fromtimestamp(earliest_in_radius.timestamp)
                    latest_date = datetime.fromtimestamp(latest_in_radius.timestamp)
                    self.stdout.write(f'Date range in radius: {earliest_date} to {latest_date}')
                
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'Error querying PhoneLocation table: {e}')
            )
