#!/usr/bin/env python3
"""
Script to query earliest and latest dates from PhoneLocation table
"""
import os
import sys
import django
from datetime import datetime

# Add the geodjango directory to Python path
sys.path.append('/Users/spalatinje/Documents/Proyectos/distritos-mx/geodjango')

# Set up Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'geodjango.settings')
django.setup()

from world.models import PhoneLocation

def get_date_range():
    """Get earliest and latest timestamps from PhoneLocation table"""
    try:
        # Get total count
        total_count = PhoneLocation.objects.count()
        print(f"Total PhoneLocation records: {total_count}")
        
        if total_count == 0:
            print("No records found in PhoneLocation table")
            return
        
        # Get earliest timestamp
        earliest = PhoneLocation.objects.order_by('timestamp').first()
        if earliest:
            earliest_date = datetime.fromtimestamp(earliest.timestamp)
            print(f"Earliest record: {earliest_date} (timestamp: {earliest.timestamp})")
        
        # Get latest timestamp
        latest = PhoneLocation.objects.order_by('-timestamp').first()
        if latest:
            latest_date = datetime.fromtimestamp(latest.timestamp)
            print(f"Latest record: {latest_date} (timestamp: {latest.timestamp})")
        
        # Calculate date range
        if earliest and latest:
            date_range = latest_date - earliest_date
            print(f"Date range: {date_range.days} days")
            
    except Exception as e:
        print(f"Error querying PhoneLocation table: {e}")

if __name__ == "__main__":
    get_date_range()


