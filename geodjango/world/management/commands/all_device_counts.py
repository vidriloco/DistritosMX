import os
from django.core.management.base import BaseCommand
from django.db.models import Count
from world.models import PhoneLocation


class Command(BaseCommand):
    help = 'Get all device_id counts from PhoneLocation table'

    def handle(self, *args, **options):
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
            
            # Get all grouped counts by device_id
            device_counts = PhoneLocation.objects.values('device_id').annotate(
                count=Count('device_id')
            ).order_by('-count')
            
            self.stdout.write(f'\nAll device_ids with their counts:')
            self.stdout.write('=' * 60)
            
            for device in device_counts:
                device_id = device['device_id']
                count = device['count']
                self.stdout.write(f'{device_id}: {count} records')
            
            # Get some statistics
            if device_counts:
                max_count = device_counts[0]['count']
                min_count = device_counts[len(device_counts)-1]['count']
                avg_records = total_count / unique_devices
                
                self.stdout.write(f'\nStatistics:')
                self.stdout.write(f'Highest count: {max_count}')
                self.stdout.write(f'Lowest count: {min_count}')
                self.stdout.write(f'Average records per device: {avg_records:.2f}')
                
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'Error querying PhoneLocation table: {e}')
            )


