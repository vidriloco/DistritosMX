import os
from django.core.management.base import BaseCommand
from django.db.models import Count
from world.models import PhoneLocation


class Command(BaseCommand):
    help = 'Get grouped count of PhoneLocation records by device_id'

    def add_arguments(self, parser):
        parser.add_argument(
            '--limit',
            type=int,
            default=20,
            help='Number of top device_ids to show (default: 20)'
        )
        parser.add_argument(
            '--min-count',
            type=int,
            default=1,
            help='Minimum count threshold to include device_id (default: 1)'
        )

    def handle(self, *args, **options):
        limit = options['limit']
        min_count = options['min_count']
        
        try:
            # Get total count
            total_count = PhoneLocation.objects.count()
            self.stdout.write(f'Total PhoneLocation records: {total_count}')
            
            if total_count == 0:
                self.stdout.write('No records found in PhoneLocation table')
                return
            
            # Get unique device_id count
            unique_devices = PhoneLocation.objects.values('device_id').distinct().count()
            self.stdout.write(f'Unique device_ids: {unique_devices}')
            
            # Get grouped counts by device_id
            device_counts = PhoneLocation.objects.values('device_id').annotate(
                count=Count('device_id')
            ).filter(count__gte=min_count).order_by('-count')[:limit]
            
            self.stdout.write(f'\nTop {limit} device_ids with counts >= {min_count}:')
            self.stdout.write('-' * 50)
            
            for device in device_counts:
                device_id = device['device_id']
                count = device['count']
                self.stdout.write(f'{device_id}: {count} records')
            
            # Get some statistics
            if device_counts:
                max_count = device_counts[0]['count']
                min_count_shown = device_counts[-1]['count']
                self.stdout.write(f'\nStatistics:')
                self.stdout.write(f'Highest count: {max_count}')
                self.stdout.write(f'Lowest count shown: {min_count_shown}')
                
                # Calculate average records per device
                avg_records = total_count / unique_devices
                self.stdout.write(f'Average records per device: {avg_records:.2f}')
                
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'Error querying PhoneLocation table: {e}')
            )


