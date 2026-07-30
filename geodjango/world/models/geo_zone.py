from django.contrib.gis.db import models
from django.contrib.gis.geos import Polygon, Point, GEOSGeometry
from .denue_record import DenueRecord
from .felony import Felony
from django.contrib.postgres.fields import ArrayField
from turfpy.measurement import area
from turfpy.transformation import circle
from geojson import Feature, Point
import json
from .extensions import GeoZoneCrimeExtension, GeoZoneMobilityExtension, GeoZoneOportunitiesExtension, GeoZoneAirbnbExtension

class GeoZone(models.Model, GeoZoneCrimeExtension, GeoZoneMobilityExtension, GeoZoneOportunitiesExtension, GeoZoneAirbnbExtension):
    
    CVEGEO = models.CharField(blank=True)
    CVE_ENT = models.CharField(blank=True)
    CVE_MUN = models.CharField(blank=True)
    CVE_LOC = models.CharField(null=True, blank=True)
    CVE_AGEB = models.CharField(blank=True)

    geometry = models.PolygonField(srid=4326)
    CVE_AGEB = models.CharField(blank=True)
    cars_rate = models.IntegerField(null=True, blank=True)
    bikes_rate = models.IntegerField(null=True, blank=True)
    motorcycles_rate = models.IntegerField(null=True, blank=True)

    # Additional fields
    population = models.IntegerField(blank=True, default=0)
    population_men = models.IntegerField(null=True, default=0)
    population_women = models.IntegerField(null=True, default=0)
    population_men_older_than_60 = models.IntegerField(null=True, default=0)
    population_women_older_than_60 = models.IntegerField(null=True, default=0)
    population_ratio_men_women = models.FloatField(null=True, default=0)
    population_with_disability = models.IntegerField(null=True, default=0)
    population_with_no_healthcare = models.IntegerField(null=True, default=0)
    population_with_healthcare = models.IntegerField(null=True, default=0)

    population_education_level = models.FloatField(null=True, default=0)
    population_education_level_men = models.FloatField(null=True, default=0)
    population_education_level_women = models.FloatField(null=True, default=0)

    housing = models.IntegerField(null=True, blank=True)

    housing_no_automotor = models.IntegerField(null=True, default=0)
    housing_with_automotor = models.IntegerField(null=True, default=0)
    housing_with_motorcycle = models.IntegerField(null=True, default=0)
    housing_with_bicycle = models.IntegerField(null=True, default=0)
    housing_with_internet = models.IntegerField(null=True, default=0)
    housing_without_internet = models.IntegerField(null=True, default=0)
    housing_with_pay_tv = models.IntegerField(null=True, default=0)
    housing_without_pay_tv = models.IntegerField(null=True, default=0)

    education = models.IntegerField(null=True, blank=True)
    education_list = ArrayField(models.CharField(), blank=True, default=list)

    health = models.IntegerField(null=True, blank=True)
    health_list = ArrayField(models.CharField(), blank=True, default=list)

    leisure = models.IntegerField(null=True, blank=True)
    leisure_list = ArrayField(models.CharField(), blank=True, default=list)

    provision = models.IntegerField(null=True, blank=True)
    provision_list = ArrayField(models.CharField(), blank=True, default=list)

    companies = models.IntegerField(null=True, blank=True)
    companies_list = ArrayField(models.CharField(), blank=True, default=list)

    jobs = models.IntegerField(null=True, blank=True)
    jobs_list = ArrayField(models.CharField(), blank=True, default=list)

    thefts_2024 = models.IntegerField(null=True, blank=True)
    thefts_2024_list = ArrayField(models.CharField(), blank=True, default=list)
    thefts_2023 = models.IntegerField(null=True, blank=True)
    thefts_2023_list = ArrayField(models.CharField(), blank=True, default=list)
    thefts_2022 = models.IntegerField(null=True, blank=True)
    thefts_2022_list = ArrayField(models.CharField(), blank=True, default=list)
    thefts_2021 = models.IntegerField(null=True, blank=True)
    thefts_2021_list = ArrayField(models.CharField(), blank=True, default=list)
    thefts_2020 = models.IntegerField(null=True, blank=True)
    thefts_2020_list = ArrayField(models.CharField(), blank=True, default=list)
    thefts_2019 = models.IntegerField(null=True, blank=True)
    thefts_2019_list = ArrayField(models.CharField(), blank=True, default=list)
    thefts_2018 = models.IntegerField(null=True, blank=True)
    thefts_2018_list = ArrayField(models.CharField(), blank=True, default=list)
    thefts_2017 = models.IntegerField(null=True, blank=True)
    thefts_2017_list = ArrayField(models.CharField(), blank=True, default=list)

    sexual_assault_2024 = models.IntegerField(null=True, blank=True)
    sexual_assault_2024_list = ArrayField(models.CharField(), blank=True, default=list)
    sexual_assault_2023 = models.IntegerField(null=True, blank=True)
    sexual_assault_2023_list = ArrayField(models.CharField(), blank=True, default=list)
    sexual_assault_2022 = models.IntegerField(null=True, blank=True)
    sexual_assault_2022_list = ArrayField(models.CharField(), blank=True, default=list)
    sexual_assault_2021 = models.IntegerField(null=True, blank=True)
    sexual_assault_2021_list = ArrayField(models.CharField(), blank=True, default=list)
    sexual_assault_2020 = models.IntegerField(null=True, blank=True)
    sexual_assault_2020_list = ArrayField(models.CharField(), blank=True, default=list)
    sexual_assault_2019 = models.IntegerField(null=True, blank=True)
    sexual_assault_2019_list = ArrayField(models.CharField(), blank=True, default=list)
    sexual_assault_2018 = models.IntegerField(null=True, blank=True)
    sexual_assault_2018_list = ArrayField(models.CharField(), blank=True, default=list)
    sexual_assault_2017 = models.IntegerField(null=True, blank=True)
    sexual_assault_2017_list = ArrayField(models.CharField(), blank=True, default=list)

    house_thefts_2024 = models.IntegerField(null=True, blank=True)
    house_thefts_2024_list = ArrayField(models.CharField(), blank=True, default=list)
    house_thefts_2023 = models.IntegerField(null=True, blank=True)
    house_thefts_2023_list = ArrayField(models.CharField(), blank=True, default=list)
    house_thefts_2022 = models.IntegerField(null=True, blank=True)
    house_thefts_2022_list = ArrayField(models.CharField(), blank=True, default=list)
    house_thefts_2021 = models.IntegerField(null=True, blank=True)
    house_thefts_2021_list = ArrayField(models.CharField(), blank=True, default=list)
    house_thefts_2020 = models.IntegerField(null=True, blank=True)
    house_thefts_2020_list = ArrayField(models.CharField(), blank=True, default=list)
    house_thefts_2019 = models.IntegerField(null=True, blank=True)
    house_thefts_2019_list = ArrayField(models.CharField(), blank=True, default=list)
    house_thefts_2018 = models.IntegerField(null=True, blank=True)
    house_thefts_2018_list = ArrayField(models.CharField(), blank=True, default=list)
    house_thefts_2017 = models.IntegerField(null=True, blank=True)
    house_thefts_2017_list = ArrayField(models.CharField(), blank=True, default=list)

    business_thefts_2024 = models.IntegerField(null=True, blank=True)
    business_thefts_2024_list = ArrayField(models.CharField(), blank=True, default=list)
    business_thefts_2023 = models.IntegerField(null=True, blank=True)
    business_thefts_2023_list = ArrayField(models.CharField(), blank=True, default=list)
    business_thefts_2022 = models.IntegerField(null=True, blank=True)
    business_thefts_2022_list = ArrayField(models.CharField(), blank=True, default=list)
    business_thefts_2021 = models.IntegerField(null=True, blank=True)
    business_thefts_2021_list = ArrayField(models.CharField(), blank=True, default=list)
    business_thefts_2020 = models.IntegerField(null=True, blank=True)
    business_thefts_2020_list = ArrayField(models.CharField(), blank=True, default=list)
    business_thefts_2019 = models.IntegerField(null=True, blank=True)
    business_thefts_2019_list = ArrayField(models.CharField(), blank=True, default=list)
    business_thefts_2018 = models.IntegerField(null=True, blank=True)
    business_thefts_2018_list = ArrayField(models.CharField(), blank=True, default=list)
    business_thefts_2017 = models.IntegerField(null=True, blank=True)
    business_thefts_2017_list = ArrayField(models.CharField(), blank=True, default=list)

    metro_stations = models.IntegerField(null=True, blank=True)
    metro_stations_list = ArrayField(models.CharField(), blank=True, default=list)
    metrobus_stations = models.IntegerField(null=True, blank=True)
    metrobus_stations_list = ArrayField(models.CharField(), blank=True, default=list)
    rtp_stations = models.IntegerField(null=True, blank=True)
    rtp_stations_list = ArrayField(models.CharField(), blank=True, default=list)
    concesionados_stations = models.IntegerField(null=True, blank=True)
    concesionados_stations_list = ArrayField(models.CharField(), blank=True, default=list)
    tren_interurbano_stations = models.IntegerField(null=True, blank=True)
    tren_interurbano_stations_list = ArrayField(models.CharField(), blank=True, default=list)
    tren_suburbano_stations = models.IntegerField(null=True, blank=True)
    tren_suburbano_stations_list = ArrayField(models.CharField(), blank=True, default=list)
    mexibus_stations = models.IntegerField(null=True, blank=True)
    mexibus_stations_list = ArrayField(models.CharField(), blank=True, default=list)
    mexicable_stations = models.IntegerField(null=True, blank=True)
    mexicable_stations_list = ArrayField(models.CharField(), blank=True, default=list)
    tren_ligero_stations = models.IntegerField(null=True, blank=True)
    tren_ligero_stations_list = ArrayField(models.CharField(), blank=True, default=list)
    ecobici_stations = models.IntegerField(null=True, blank=True)
    ecobici_stations_list = ArrayField(models.CharField(), blank=True, default=list)
    cablebus_stations = models.IntegerField(null=True, blank=True)
    cablebus_stations_list = ArrayField(models.CharField(), blank=True, default=list)

    airbnb_listings = models.IntegerField(null=True, blank=True)
    airbnb_listings_list = ArrayField(models.CharField(), blank=True, default=list)
    airbnb_listings_price = models.IntegerField(null=True, blank=True)
    airbnb_listings_price_average = models.IntegerField(null=True, blank=True)
    airbnb_listings_full_house = models.IntegerField(null=True, blank=True)
    airbnb_listings_full_house_list = ArrayField(models.CharField(), blank=True, default=list)
    airbnb_listings_full_house_price = models.IntegerField(null=True, blank=True)
    airbnb_listings_full_house_price_average = models.IntegerField(null=True, blank=True)
    airbnb_listings_private_room = models.IntegerField(null=True, blank=True)
    airbnb_listings_private_room_list = ArrayField(models.CharField(), blank=True, default=list)
    airbnb_listings_private_room_price = models.IntegerField(null=True, blank=True)
    airbnb_listings_private_room_price_average = models.IntegerField(null=True, blank=True)
    airbnb_listings_shared_room = models.IntegerField(null=True, blank=True)
    airbnb_listings_shared_room_list = ArrayField(models.CharField(), blank=True, default=list)
    airbnb_listings_shared_room_price = models.IntegerField(null=True, blank=True)
    airbnb_listings_shared_room_price_average = models.IntegerField(null=True, blank=True)
    airbnb_listings_entire_hotel = models.IntegerField(null=True, blank=True)
    airbnb_listings_entire_hotel_list = ArrayField(models.CharField(), blank=True, default=list)
    airbnb_listings_entire_hotel_price = models.IntegerField(null=True, blank=True)
    airbnb_listings_entire_hotel_price_average = models.IntegerField(null=True, blank=True)

    @staticmethod
    def get_color_set_for(field):
        if field == 'population' or field == 'cars_rate' or field == 'motorcycles_rate':
            return ['', '#90be6d', '#f9c74f', '#f9844a', '#f94144', '#9b2226']
        elif field == 'health':
            return ['', '#ffedea', '#ffcec5', '#ffad9f', '#ff8a75', '#ff5533']
        elif field == 'education':
            return ['', '#e0f7fa', '#b2ebf2', '#80deea', '#4dd0e1', '#26c6da']
        elif field == 'leisure':
            return ['', '#f3e5f5', '#e1bee7', '#ce93d8', '#ba68c8', '#ab47bc']
        elif field == 'provision':
            return ['', '#f7b267', '#f79d65', '#f4845f', '#f27059', '#f25c54']
        elif field == 'companies':
            return ['', '#e3eafc', '#c5d3fa', '#a6bcf7', '#879ef5', '#6887f2']
        elif field == 'bikes_rate':
            return ['', '#f9fbe7', '#f0f4c3', '#e6ee9c', '#dce775', '#d4e157']
        else:
            return ['', '#f1f8e9', '#dcedc8', '#c5e1a5', '#aed581', '#9ccc65']

    @staticmethod
    def get_range_collection():
        fields = ['population', 'housing', 'health', 'education', 'leisure', 'provision', 'companies', 'jobs', 'cars_rate', 'bikes_rate', 'motorcycles_rate']
        
        range_collection = {}
        for field in fields:
            range_collection[field] = GeoZone.get_ranges_for(field)
        return range_collection
    
    @staticmethod
    def get_ranges_for(field):
        geozones = GeoZone.objects.exclude(**{f"{field}__isnull": True}).order_by(field)

        min_value = getattr(geozones.first(), field)
        max_value = getattr(geozones.reverse().first(), field)
        print(min_value, max_value, geozones.count())
        if min_value is None or max_value is None:
            return []

        step = (max_value ** (1/3) - min_value ** (1/3)) / 5
        items = [int((min_value ** (1/3) + i * step) ** 3) for i in range(6)]

        colors = GeoZone.get_color_set_for(field)
        ranges = []

        for i in range(6):
            if i == 0:
                continue
            bottom_value = int(items[i - 1])
            top_value = int(items[i])

            if i == 5:
                top_value += 1
            ranges.append({
                'number_down': bottom_value,
                'number_up': top_value,
                'color': colors[i]
            })
        
        return ranges

    @staticmethod
    def find_all_with_radius(coordinates, radius):
        x, y = map(float, coordinates.split(','))
        point = GEOSGeometry(f'POINT({x} {y})', srid=4326)
        geozones = GeoZone.objects.filter(geometry__distance_lte=(point, radius))

        geozones_list = [{
            'geometry': zone.geometry.geojson, 
            'population': zone.population,
            'education': zone.education,
            'educationList': zone.education_list,
            'health': zone.health,
            'healthList': zone.health_list,
            'companies': zone.companies,
            'companiesList': zone.companies_list,
            'jobs': zone.jobs,
            'jobsList': zone.jobs_list,
            'leisure': zone.leisure,
            'leisureList': zone.leisure_list,
            'provision': zone.provision,
            'provisionList': zone.provision_list,
            'cars': zone.cars_rate,
            'bikes': zone.bikes_rate,
            'motorcycles': zone.motorcycles_rate,
            'housing': zone.housing
        } for zone in geozones]
        
        return geozones_list

    @staticmethod
    def all_population_with_radius(station, radius):
        circle_geom = circle(Point((station.coordinates.x, station.coordinates.y)), radius=radius, units='m')
        polygon = Polygon(circle_geom['geometry']['coordinates'][0])

        geozones = GeoZone.objects.filter(geometry__intersects=polygon)

        total_population = 0

        for zone in geozones:
            intersection = zone.geometry.intersection(GEOSGeometry(json.dumps(circle_geom['geometry'])))
            intersection_geojson = json.loads(intersection.geojson)
            intersection_area = area(Feature(geometry=intersection_geojson))
            zone_area = area(Feature(geometry=json.loads(zone.geometry.geojson)))
            proportional_population = (intersection_area / zone_area) * zone.population
            total_population += proportional_population

        return int(total_population)
    
    @staticmethod
    def all_housing_with_radius(station, radius):
        circle_geom = circle(Point((station.coordinates.x, station.coordinates.y)), radius=radius, units='m')
        polygon = Polygon(circle_geom['geometry']['coordinates'][0])

        geozones = GeoZone.objects.filter(geometry__intersects=polygon)

        total_housing = 0

        for zone in geozones:
            if zone.housing is None:
                continue
            intersection = zone.geometry.intersection(GEOSGeometry(json.dumps(circle_geom['geometry'])))
            intersection_geojson = json.loads(intersection.geojson)
            intersection_area = area(Feature(geometry=intersection_geojson))
            zone_area = area(Feature(geometry=json.loads(zone.geometry.geojson)))
            proportional_housing = (intersection_area / zone_area) * zone.housing
            total_housing += proportional_housing

        return int(total_housing)
    
    @staticmethod
    def all_cars_with_radius(station, radius):
        circle_geom = circle(Point((station.coordinates.x, station.coordinates.y)), radius=radius, units='m')
        polygon = Polygon(circle_geom['geometry']['coordinates'][0])

        geozones = GeoZone.objects.filter(geometry__intersects=polygon)

        total = 0

        for zone in geozones:
            if zone.cars_rate is None:
                continue
            intersection = zone.geometry.intersection(GEOSGeometry(json.dumps(circle_geom['geometry'])))
            intersection_geojson = json.loads(intersection.geojson)
            intersection_area = area(Feature(geometry=intersection_geojson))
            zone_area = area(Feature(geometry=json.loads(zone.geometry.geojson)))
            proportional_cars = (intersection_area / zone_area) * zone.cars_rate
            total += proportional_cars

        return int(total)
    
    @staticmethod
    def all_bikes_with_radius(station, radius):
        circle_geom = circle(Point((station.coordinates.x, station.coordinates.y)), radius=radius, units='m')
        polygon = Polygon(circle_geom['geometry']['coordinates'][0])

        geozones = GeoZone.objects.filter(geometry__intersects=polygon)

        total = 0

        for zone in geozones:
            if zone.bikes_rate is None:
                continue
            intersection = zone.geometry.intersection(GEOSGeometry(json.dumps(circle_geom['geometry'])))
            intersection_geojson = json.loads(intersection.geojson)
            intersection_area = area(Feature(geometry=intersection_geojson))
            zone_area = area(Feature(geometry=json.loads(zone.geometry.geojson)))
            proportional_bikes = (intersection_area / zone_area) * zone.bikes_rate
            total += proportional_bikes

        return int(total)
    
    @staticmethod
    def all_motorcycles_with_radius(station, radius):
        circle_geom = circle(Point((station.coordinates.x, station.coordinates.y)), radius=radius, units='m')
        polygon = Polygon(circle_geom['geometry']['coordinates'][0])

        geozones = GeoZone.objects.filter(geometry__intersects=polygon)

        total = 0

        for zone in geozones:
            if zone.motorcycles_rate is None:
                continue
            intersection = zone.geometry.intersection(GEOSGeometry(json.dumps(circle_geom['geometry'])))
            intersection_geojson = json.loads(intersection.geojson)
            intersection_area = area(Feature(geometry=intersection_geojson))
            zone_area = area(Feature(geometry=json.loads(zone.geometry.geojson)))
            proportional_motorcycles = (intersection_area / zone_area) * zone.motorcycles_rate
            total += proportional_motorcycles

        return int(total)