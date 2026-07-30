
from django.http import JsonResponse
from world.models import *
from django.core.cache import cache
import json

def last_minute_vehicles(request):
    recent_locations = VehicleLocation.objects.distinct('vehicle_id')
    return JsonResponse({'recent_locations': [{ 
        'vehicle_id': location.vehicle_id, 
        'coordinates': location.coordinates(), 
        'timestamp': location.timestamp(),
        'humanized_timestamp': location.humanized_timestamp(),
        'arriving_in_minutes': location.time_minutes_left,
        'vehicle_destination': location.vehicle_destination } for location in recent_locations]})

def vehicles_trails(request):
    vehicle_trail = VehicleLocation.all_vehicles()
    return JsonResponse(vehicle_trail, safe=False)

def vehicles_trails_by_date_and_vehicle(request, date_start, date_end, vehicle_id):
    vehicle_trail = VehicleLocation.all_vehicle_trails_between(vehicle_id, date_start, date_end)
    return JsonResponse(vehicle_trail, safe=False)

def vehicles_debug(request, date_start, date_end, vehicle_id):
    trails = VehicleLocation.get_vehicle_trail(vehicle_id, date_start, date_end)
    if not trails:
        return JsonResponse({'error': 'No vehicle trail found for the given parameters'}, status=404)
    
    return JsonResponse({
        'trail': Line.find_line_for_trails(trails).geom.coords,
        'collection': [
            {
                'date': trail.to_mexico_time(),
                'coordinates': trail.coordinates(),
                'is_intrapolated': trail.is_intrapolated
            } for trail in trails
        ]
    }, safe=False)

def vehicles_trails_opt(request, date_start, date_end):
    filename = f"vehicle_trail_{date_start}_to_{date_end}.json"
    print(f"Looking for file {filename}")
    with open(filename, 'r') as file:
        data = json.load(file)
        return JsonResponse(data, safe=False)