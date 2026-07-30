from django.core.management.base import BaseCommand
from world.models import VehicleLocation
import datetime
from django.core import management

class Command(BaseCommand):
    help = 'Execute the prone and the interpolation operations'

    def handle(self, *args, **kwargs):
        date_start = "2025-01-20T20:58:00"
        date_end = "2025-01-20T23:30:30"
        radius = 50

        print("Executing vehicle preparation")
        vehicles = VehicleLocation.objects.values_list('vehicle_id', flat=True).distinct()
        
        
        #management.call_command('vehicle_location_prune', date_start, date_end, 1020, radius)
        management.call_command('vehicle_location_interpolate', date_start, date_end, 1020)
        