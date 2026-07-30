from django.db import models
from django.contrib.gis.db import models
import pytz
import datetime
from django.utils.dateparse import parse_datetime
from world.models import Line
import re

class VehicleLocation(models.Model):
    station_number = models.CharField(max_length=10)
    vehicle_id = models.CharField(max_length=10)
    time_minutes_left = models.IntegerField()
    vehicle_line = models.CharField(max_length=100)
    vehicle_destination = models.CharField(max_length=100)
    vehicle_location = models.PointField(srid=4326)
    json_response = models.TextField()
    created_at = models.DateTimeField(auto_now_add=False)
    is_intrapolated = models.BooleanField(default=False)
    has_been_processed = models.BooleanField(default=False)
    is_outside_line = models.BooleanField(default=False)

    interpolated_date = models.DateField(auto_now_add=False, null=True, blank=True)
    
    class Meta:
        unique_together = ('interpolated_date', 'is_intrapolated', 'vehicle_id', 'vehicle_location')

    def __str__(self):
        return f"{self.vehicle_id} - {self.station_number}"
    
    def coordinates(self):
        return [self.vehicle_location.x, self.vehicle_location.y]

    def to_mexico_time(self):
        mexico_city_tz = pytz.timezone('America/Mexico_City')
        return self.created_at.astimezone(mexico_city_tz)

    def humanized_timestamp(self):
        return self.timestamp().strftime('%Y-%m-%d %H:%M:%S')
    
    def line(self):
        match = re.search(r'L(\d+)', self.vehicle_line)
        if match:
            return int(match.group(1))
        return None
    
    def verify_valid_measurement(self):
        vehicle_geom = self.vehicle_location
        vehicle_buffer = vehicle_geom.buffer(10)
        
        is_valid = Line.objects.filter(geom__intersects=vehicle_buffer).exists()
        
        #self.is_a_valid_measurement = is_valid
        self.save()

        print("Intersected" if is_valid else "====")
    
    @staticmethod
    def get_vehicle_trail(vehicle_id, start_date=None, end_date=None):
        return VehicleLocation.objects.filter(
            vehicle_id=vehicle_id,
            created_at__range=(start_date, end_date)
        ).order_by('-created_at')

    @staticmethod
    def get_vehicle_points(vehicle_id, start_date=None, end_date=None):
        vehicle_path = []
        vehicle_timestamps = []
        vehicle_line = []
        vehicle_locations = VehicleLocation.get_vehicle_trail(vehicle_id, start_date, end_date)
        vehicle_destinations = []

        last_time_computed = None
        for location in vehicle_locations:
            if last_time_computed and (location.to_mexico_time().timestamp() - last_time_computed) > 500:
                continue
            last_time_computed = location.to_mexico_time().timestamp()
            vehicle_path.append(location.coordinates())
            vehicle_timestamps.append(location.to_mexico_time().timestamp())
            vehicle_line.append(location.station_number.split('_')[1])
            vehicle_destinations.append(location.vehicle_destination)

        return {
            'count': len(vehicle_locations),
            'vehicle_id': vehicle_id,
            'path': vehicle_path,
            'timestamps': vehicle_timestamps,
            'line': vehicle_line[0] if vehicle_line else None,
            'direction': vehicle_destinations,
        }
    
    @staticmethod
    def all_vehicle_trails_between(vehicle_id, date_start, date_end):
        start_of_today = parse_datetime(date_start)
        end_of_today = parse_datetime(date_end)
        
        vehicle_points = []
        vehicle_points.append(VehicleLocation.get_vehicle_points(vehicle_id, start_of_today, end_of_today))

        return {
            'start_date': start_of_today.strftime('%Y-%m-%d %H:%M:%S'),
            'end_date': end_of_today.strftime('%Y-%m-%d %H:%M:%S'),
            'collection': vehicle_points
        }
    
    @staticmethod
    def all_vehicles_trails_between(date_start, date_end):
        start_of_today = parse_datetime(date_start)
        end_of_today = parse_datetime(date_end)
        
        vehicle_points = []
        vehicle_ids = VehicleLocation.objects.values_list('vehicle_id', flat=True).distinct()

        for index, vehicle_id in enumerate(vehicle_ids):
            print(f"Procesing vehicle {index + 1}/{len(vehicle_ids)}")
            vehicle_points.append(VehicleLocation.get_vehicle_points(vehicle_id, start_of_today, end_of_today))

        return {
            'start_date': start_of_today.strftime('%Y-%m-%d %H:%M:%S'),
            'end_date': end_of_today.strftime('%Y-%m-%d %H:%M:%S'),
            'collection': vehicle_points
        }