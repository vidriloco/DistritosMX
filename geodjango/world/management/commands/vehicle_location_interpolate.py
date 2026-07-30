from django.core.management.base import BaseCommand
import shapely.ops
from world.models import VehicleLocation, Line, PathCoordinate
import json
from django.contrib.gis.geos import GEOSGeometry
from turfpy.measurement import distance, midpoint, nearest_point
from geojson import Point, Feature, FeatureCollection
from datetime import datetime, timedelta
import pytz

import shapely

class Vertex:
    def __init__(self, coordinates, timestamp, speed):
        self.coordinates = coordinates
        self.timestamp = timestamp
        self.speed = speed

class Command(BaseCommand):
    help = 'Interpolate missing coordinates in line geometries'

    def add_arguments(self, parser):
        parser.add_argument('date_start', type=str, help='date start')
        parser.add_argument('date_end', type=str, help='date end')
        parser.add_argument('vehicle_id', type=int, help='vehicle identifier')

    def handle(self, *args, **kwargs):
        date_start = kwargs['date_start']
        date_end = kwargs['date_end']
        vehicle_id = kwargs['vehicle_id']

        print(f"Starting interpolation for vehicle: {vehicle_id}")

        interpolate = True

        VehicleLocation.get_vehicle_trail(vehicle_id, date_start, date_end).update(has_been_processed=False, is_outside_line=False)
        VehicleLocation.get_vehicle_trail(vehicle_id, date_start, date_end).filter(is_intrapolated=True).delete()

        stored_items = []

        while interpolate:
            vehicle_trail = VehicleLocation.get_vehicle_trail(vehicle_id, date_start, date_end).filter(
                has_been_processed=False,
                is_intrapolated=False,
                is_outside_line=False)
        
            interpolate = self.process_the_trail(vehicle_trail, stored_items)
    
    def get_closest_point(self, line, start_point, end_point):
        mid_point = midpoint(Feature(geometry=start_point), Feature(geometry=end_point))
        mid_point_coords = mid_point['geometry']['coordinates']
        mid_point_feature = Feature(geometry=Point(mid_point_coords))

        features = []
        for list_of_coords in line.geom.coords:
            for coord in list_of_coords:
                feat = Feature(geometry=Point([coord[0], coord[1]]))
                features.append(feat)
        
        feature_collection = FeatureCollection(features)
        point_on_line = nearest_point(mid_point_feature, feature_collection)
        if point_on_line:
            return point_on_line['geometry']
        else:
            return None
        
        
    def interpolate_time(self, previous_vehicle, vehicle):
        time_difference = (previous_vehicle.created_at - vehicle.created_at).total_seconds() / 60 / 2
        new_time = vehicle.created_at + timedelta(minutes=time_difference)
        return new_time

    def extract_line_segment(self, line, start_point, end_point):
        # Ensure that the input line is a LineString
        if not isinstance(line, shapely.LineString):
            raise ValueError("The first argument must be a LineString.")
        
        # Ensure that start_point and end_point are Points
        if not isinstance(start_point, shapely.Point) or not isinstance(end_point, shapely.Point):
            raise ValueError("Start and end points must be Point geometries.")
        
        # Project the points onto the LineString to get their positions along the line
        start_proj = line.project(start_point)
        end_proj = line.project(end_point)
        
        # Ensure start_proj is less than or equal to end_proj
        if start_proj > end_proj:
            start_proj, end_proj = end_proj, start_proj  # Swap if necessary
        
        # Extract the substring of the LineString between these projected positions
        segment = shapely.ops.substring(line, start_proj, end_proj)
        print("======== Segment extracted")
        return segment

    def process_coordinates_on_segment(self, total_distance, vehicle_trail, segment_coordinates):
        print(f"Segment length: {len(segment_coordinates)}")
        if len(segment_coordinates) < 2:
            return False
        
        start_point = segment_coordinates.pop(0)
        next_point = segment_coordinates[0]
        starting_time = vehicle_trail[0].created_at
        final_time = vehicle_trail[1].created_at
        
        segment_distance = distance(Point(start_point), Point(next_point), units='m')
        total_distance += segment_distance

        time_difference = (final_time - starting_time).total_seconds() / 60
        time_at_point = starting_time + timedelta(minutes=(time_difference * (total_distance / segment_distance)))

        if time_at_point > final_time:
            return False
        
        new_vehicle_location = VehicleLocation(
            vehicle_id=vehicle_trail[0].vehicle_id,
            station_number=vehicle_trail[0].station_number,
            vehicle_line=vehicle_trail[0].vehicle_line,
            vehicle_destination=vehicle_trail[0].vehicle_destination,
            time_minutes_left=vehicle_trail[0].time_minutes_left,
            vehicle_location=GEOSGeometry(f'POINT({start_point[0]} {start_point[1]})'),
            created_at=time_at_point,
            is_intrapolated=True,
            interpolated_date=time_at_point.replace(second=0, microsecond=0),
            speed= segment_distance / (time_difference / 60)
        )
        try:
            new_vehicle_location.save()
        except Exception as e:
            print(f"Error saving new vehicle location: {e}")
        
        self.process_coordinates_on_segment(total_distance, vehicle_trail, segment_coordinates)

    def find_connecting_path(self, start_point, end_point):
        # Find all the vertices from start_point within a 30m radius
        coordinate_start = None
        coordinate_start_radius = 10
        while coordinate_start == None:
            result = PathCoordinate.objects.filter(
                coordinate__distance_lte=(start_point.vehicle_location, coordinate_start_radius),
                line__contains=start_point.line()
            )

            if result:
                coordinate_start = result[0]

            coordinate_start_radius += 2
        
        coordinate_end = None
        coordinate_end_radius = 10
        while coordinate_end == None:
            result = PathCoordinate.objects.filter(
                coordinate__distance_lte=(end_point.vehicle_location, coordinate_end_radius),
                line__contains=end_point.line()
            )

            if result:
                coordinate_end = result[0]
            coordinate_end_radius += 2
        
        # For each one of these vertices, calculate the distance between itself and the end_point
        print(f"Finding connecting path with a endpoint radius of {coordinate_end_radius} ({coordinate_end.coordinate}) and a startpoint radius of {coordinate_start_radius} ({coordinate_start.coordinate})")
        path = coordinate_start.find_path_to(coordinate_start, coordinate_end, start_point.line(), end_point.line())

        print(f"Found paths { len(path)}")
        return path
    
    def process_the_trail(self, vehicle_trail, stored_items):
        if vehicle_trail.count() < 2:
            return False
        
        print(f"Processing trail with {vehicle_trail.count()} elements")
        if vehicle_trail[0].line() == vehicle_trail[1].line():
            path = self.find_connecting_path(vehicle_trail[0], vehicle_trail[1])

            if not path:
                return False

            time_difference = (vehicle_trail[1].created_at - vehicle_trail[0].created_at).total_seconds() / 60
            segment_distance = distance(Point(path[0].coordinate), Point(path[-1].coordinate), units='m')

            for path_coord in path:
                path_distance = distance(Point(path[0].coordinate), Point(path_coord.coordinate), units='m')
                time_at_point = vehicle_trail[0].created_at + timedelta(minutes=(time_difference * (path_distance / segment_distance)))
                speed = path_distance / (time_difference / 60)

                interpolated_date = vehicle_trail[0].created_at.replace(second=0, microsecond=0)
                
                new_vehicle_location = VehicleLocation(
                    vehicle_id=vehicle_trail[0].vehicle_id,
                    station_number=vehicle_trail[0].station_number,
                    vehicle_line=vehicle_trail[0].vehicle_line,
                    vehicle_destination=vehicle_trail[0].vehicle_destination,
                    time_minutes_left=vehicle_trail[0].time_minutes_left,
                    vehicle_location=GEOSGeometry(f'POINT({path_coord.coordinate[0]} {path_coord.coordinate[1]})'),
                    created_at=time_at_point,
                    is_intrapolated=True,
                    interpolated_date=interpolated_date,
                    speed=speed
                )
                try:
                    new_vehicle_location.save()
                except Exception as e:
                    print(f"Error saving new vehicle location: {e}")
        
        vehicle = vehicle_trail.first()
        vehicle.has_been_processed = True
        vehicle.save()

        return True

    def process_trail(self, vehicle_trail, line):
        if vehicle_trail.count() < 2:
            return False

        if vehicle_trail[0].has_been_processed:
            return False
        
        if vehicle_trail[0].line() == vehicle_trail[1].line():
            line = Line.objects.get(identifier=vehicle_trail[0].line())

            for line_segment in line.geom.coords:

                segment_coordinates = self.extract_line_segment(
                    shapely.LineString(line_segment), 
                    shapely.Point(vehicle_trail[0].vehicle_location.coords), 
                    shapely.Point(vehicle_trail[1].vehicle_location.coords))

                for coordinates in segment_coordinates.coords:
                    new_vehicle_location = VehicleLocation(
                        vehicle_id=vehicle_trail[0].vehicle_id,
                        station_number=vehicle_trail[0].station_number,
                        vehicle_line=vehicle_trail[0].vehicle_line,
                        vehicle_destination=vehicle_trail[0].vehicle_destination,
                        time_minutes_left=vehicle_trail[0].time_minutes_left,
                        vehicle_location=GEOSGeometry(f'POINT({coordinates[0]} {coordinates[1]})'),
                        created_at=vehicle_trail[0].created_at,
                        is_intrapolated=True,
                        interpolated_date=vehicle_trail[0].created_at.replace(second=0, microsecond=0),
                        speed= 100,
                        debuggable=True)
                    try:
                        new_vehicle_location.save()
                    except Exception as e:
                        print(f"Error saving new vehicle location: {e}")

                if segment_coordinates is not None:
                    if vehicle_trail[0].created_at > vehicle_trail[1].created_at:
                        self.process_coordinates_on_segment(0, vehicle_trail, list(segment_coordinates.coords))
                    else:
                        self.process_coordinates_on_segment(0, vehicle_trail, list(reversed(segment_coordinates.coords)))
            
        vehicle_trail[0].has_been_processed = True
        vehicle_trail[0].save()

        return True

    def process_vehicle_trail(self, vehicle_trail, line, vehicle_id, distance_tolerance=30, time_tolerance=1):
        
        previous_vehicle_trail = None
        for vehicle in vehicle_trail:
            if previous_vehicle_trail is not None and previous_vehicle_trail.line() == vehicle.line() and previous_vehicle_trail.vehicle_direction == vehicle.vehicle_direction:
                point1 = Point((previous_vehicle_trail.vehicle_location.x, previous_vehicle_trail.vehicle_location.y))
                point2 = Point((vehicle.vehicle_location.x, vehicle.vehicle_location.y))
                
                computed_distance = distance(point1, point2, units='m')
                time_difference = (previous_vehicle_trail.created_at - vehicle.created_at).total_seconds() / 60
                if computed_distance > distance_tolerance and time_difference >= time_tolerance:
                    closest_point = self.get_closest_point(line, point1, point2)
                    new_time = self.interpolate_time(previous_vehicle_trail, vehicle)

                    print(f"P1: {point1.coordinates} ({previous_vehicle_trail.created_at}) / P2: {point2.coordinates} ({vehicle.created_at})")

                    if closest_point:
                        vehicle.has_been_processed = True
                        vehicle.save()

                        new_vehicle_location = VehicleLocation(
                            vehicle_id=vehicle_id,
                            station_number=vehicle.station_number,
                            vehicle_line=vehicle.vehicle_line,
                            vehicle_destination=vehicle.vehicle_destination,
                            time_minutes_left=vehicle.time_minutes_left,
                            vehicle_location=GEOSGeometry(json.dumps(closest_point)),
                            created_at= new_time,
                            is_intrapolated=True,
                            interpolated_date=new_time.replace(second=0, microsecond=0)
                        )
                        print(f"==> P3: {new_vehicle_location.created_at} { new_vehicle_location.vehicle_location }")

                        try:
                            new_vehicle_location.save()
                        except Exception as e:
                            print(f"Error saving new vehicle location: {e}")
                            return True
                        return True
                    else:
                        print("No closest point found")
            previous_vehicle_trail = vehicle
        return False
        

        
        

