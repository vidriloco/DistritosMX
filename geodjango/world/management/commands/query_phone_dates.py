import os
from datetime import datetime
from django.core.management.base import BaseCommand
from world.models import PhoneLocation


class Command(BaseCommand):
    help = 'Query earliest and latest dates from PhoneLocation table'

    def handle(self, *args, **options):
        try:
            # Get total count
            total_count = PhoneLocation.objects.count()
            self.stdout.write(f'Total PhoneLocation records: {total_count}')
            
            if total_count == 0:
                self.stdout.write('No records found in PhoneLocation table')
                return
            
            # Get earliest timestamp
            earliest = PhoneLocation.objects.order_by('timestamp').first()
            if earliest:
                earliest_date = datetime.fromtimestamp(earliest.timestamp)
                self.stdout.write(f'Earliest record: {earliest_date} (timestamp: {earliest.timestamp})')
            
            # Get latest timestamp
            latest = PhoneLocation.objects.order_by('-timestamp').first()
            if latest:
                latest_date = datetime.fromtimestamp(latest.timestamp)
                self.stdout.write(f'Latest record: {latest_date} (timestamp: {latest.timestamp})')
            
            # Calculate date range
            if earliest and latest:
                date_range = latest_date - earliest_date
                self.stdout.write(f'Date range: {date_range.days} days')
                
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'Error querying PhoneLocation table: {e}')
            )


