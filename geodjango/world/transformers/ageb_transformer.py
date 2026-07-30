from typing import Dict, Any
from django.contrib.gis.geos import Polygon
from ..models import GeoZone
import json

class AgebTransformer:
    """Transformer for AGEB (Área Geoestadística Básica) data to GeoJSON format."""
    
    def __init__(
        self,
        id: int,
        cvegeo: str,
        cve_ent: str,
        cve_mun: str,
        cve_loc: str,
        cve_ageb: str,
        geometry: Polygon,
        population: int = 0,
        housing: int = None,
        education: int = None,
        health: int = None,
        leisure: int = None,
        provision: int = None,
        companies: int = None,
        jobs: int = None,
        cars_rate: int = None,
        bikes_rate: int = None,
        motorcycles_rate: int = None,
        education_list: list = None,
        health_list: list = None,
        leisure_list: list = None,
        provision_list: list = None,
        companies_list: list = None,
        jobs_list: list = None,
        # Airbnb related fields
        airbnb_listings: int = None,
        airbnb_listings_price: float = None,
        airbnb_listings_price_average: float = None,
        airbnb_listings_list: list = None,
        airbnb_listings_full_house: int = None,
        airbnb_listings_full_house_price: float = None,
        airbnb_listings_full_house_price_average: float = None,
        airbnb_listings_private_room: int = None,
        airbnb_listings_private_room_price: float = None,
        airbnb_listings_private_room_price_average: float = None,
        airbnb_listings_shared_room: int = None,
        airbnb_listings_shared_room_price: float = None,
        airbnb_listings_shared_room_price_average: float = None,
        airbnb_listings_entire_hotel: int = None,
        airbnb_listings_entire_hotel_price: float = None,
        airbnb_listings_entire_hotel_price_average: float = None,
        # Transportation stations
        ecobici_stations: int = None,
        cablebus_stations: int = None,
        metro_stations: int = None,
        metrobus_stations: int = None,
        rtp_stations: int = None,
        concesionados_stations: int = None,
        tren_interurbano_stations: int = None,
        tren_suburbano_stations: int = None,
        mexibus_stations: int = None,
        mexicable_stations: int = None,
        tren_ligero_stations: int = None,
        # Crime statistics by year
        thefts_2024: int = None,
        sexual_assault_2024: int = None,
        house_thefts_2024: int = None,
        business_thefts_2024: int = None,
        thefts_2023: int = None,
        sexual_assault_2023: int = None,
        house_thefts_2023: int = None,
        business_thefts_2023: int = None,
        thefts_2022: int = None,
        sexual_assault_2022: int = None,
        house_thefts_2022: int = None,
        business_thefts_2022: int = None,
        thefts_2021: int = None,
        sexual_assault_2021: int = None,
        house_thefts_2021: int = None,
        business_thefts_2021: int = None,
        thefts_2020: int = None,
        sexual_assault_2020: int = None,
        house_thefts_2020: int = None,
        business_thefts_2020: int = None,
        thefts_2019: int = None,
        sexual_assault_2019: int = None,
        house_thefts_2019: int = None,
        business_thefts_2019: int = None,
    ):
        self.id = id
        self.cvegeo = cvegeo
        self.cve_ent = cve_ent
        self.cve_mun = cve_mun
        self.cve_loc = cve_loc
        self.cve_ageb = cve_ageb
        self.geometry = geometry
        self.population = population
        self.housing = housing
        self.education = education
        self.health = health
        self.leisure = leisure
        self.provision = provision
        self.companies = companies
        self.jobs = jobs
        self.cars_rate = cars_rate
        self.bikes_rate = bikes_rate
        self.motorcycles_rate = motorcycles_rate
        self.education_list = education_list or []
        self.health_list = health_list or []
        self.leisure_list = leisure_list or []
        self.provision_list = provision_list or []
        self.companies_list = companies_list or []
        self.jobs_list = jobs_list or []
        # Airbnb related fields
        self.airbnb_listings = airbnb_listings
        self.airbnb_listings_price = airbnb_listings_price
        self.airbnb_listings_price_average = airbnb_listings_price_average
        self.airbnb_listings_list = airbnb_listings_list or []
        self.airbnb_listings_full_house = airbnb_listings_full_house
        self.airbnb_listings_full_house_price = airbnb_listings_full_house_price
        self.airbnb_listings_full_house_price_average = airbnb_listings_full_house_price_average
        self.airbnb_listings_private_room = airbnb_listings_private_room
        self.airbnb_listings_private_room_price = airbnb_listings_private_room_price
        self.airbnb_listings_private_room_price_average = airbnb_listings_private_room_price_average
        self.airbnb_listings_shared_room = airbnb_listings_shared_room
        self.airbnb_listings_shared_room_price = airbnb_listings_shared_room_price
        self.airbnb_listings_shared_room_price_average = airbnb_listings_shared_room_price_average
        self.airbnb_listings_entire_hotel = airbnb_listings_entire_hotel
        self.airbnb_listings_entire_hotel_price = airbnb_listings_entire_hotel_price
        self.airbnb_listings_entire_hotel_price_average = airbnb_listings_entire_hotel_price_average
        # Transportation stations
        self.ecobici_stations = ecobici_stations
        self.cablebus_stations = cablebus_stations
        self.metro_stations = metro_stations
        self.metrobus_stations = metrobus_stations
        self.rtp_stations = rtp_stations
        self.concesionados_stations = concesionados_stations
        self.tren_interurbano_stations = tren_interurbano_stations
        self.tren_suburbano_stations = tren_suburbano_stations
        self.mexibus_stations = mexibus_stations
        self.mexicable_stations = mexicable_stations
        self.tren_ligero_stations = tren_ligero_stations
        # Crime statistics by year
        self.thefts_2024 = thefts_2024
        self.sexual_assault_2024 = sexual_assault_2024
        self.house_thefts_2024 = house_thefts_2024
        self.business_thefts_2024 = business_thefts_2024
        self.thefts_2023 = thefts_2023
        self.sexual_assault_2023 = sexual_assault_2023
        self.house_thefts_2023 = house_thefts_2023
        self.business_thefts_2023 = business_thefts_2023
        self.thefts_2022 = thefts_2022
        self.sexual_assault_2022 = sexual_assault_2022
        self.house_thefts_2022 = house_thefts_2022
        self.business_thefts_2022 = business_thefts_2022
        self.thefts_2021 = thefts_2021
        self.sexual_assault_2021 = sexual_assault_2021
        self.house_thefts_2021 = house_thefts_2021
        self.business_thefts_2021 = business_thefts_2021
        self.thefts_2020 = thefts_2020
        self.sexual_assault_2020 = sexual_assault_2020
        self.house_thefts_2020 = house_thefts_2020
        self.business_thefts_2020 = business_thefts_2020
        self.thefts_2019 = thefts_2019
        self.sexual_assault_2019 = sexual_assault_2019
        self.house_thefts_2019 = house_thefts_2019
        self.business_thefts_2019 = business_thefts_2019
        
    @classmethod
    def from_model(cls, model: GeoZone) -> 'AgebTransformer':
        """Create an AgebTransformer instance from a GeoZone model."""
        return cls(
            id=model.id,
            cvegeo=model.CVEGEO,
            cve_ent=model.CVE_ENT,
            cve_mun=model.CVE_MUN,
            cve_loc=model.CVE_LOC,
            cve_ageb=model.CVE_AGEB,
            geometry=model.geometry,
            population=model.population,
            housing=model.housing,
            education=model.education,
            health=model.health,
            leisure=model.leisure,
            provision=model.provision,
            companies=model.companies,
            jobs=model.jobs,
            cars_rate=model.cars_rate,
            bikes_rate=model.bikes_rate,
            motorcycles_rate=model.motorcycles_rate,
            education_list=model.education_list,
            health_list=model.health_list,
            leisure_list=model.leisure_list,
            provision_list=model.provision_list,
            companies_list=model.companies_list,
            jobs_list=model.jobs_list,
            # Airbnb related fields
            airbnb_listings=model.airbnb_listings,
            airbnb_listings_price=model.airbnb_listings_price,
            airbnb_listings_price_average=model.airbnb_listings_price_average,
            airbnb_listings_list=model.airbnb_listings_list,
            airbnb_listings_full_house=model.airbnb_listings_full_house,
            airbnb_listings_full_house_price=model.airbnb_listings_full_house_price,
            airbnb_listings_full_house_price_average=model.airbnb_listings_full_house_price_average,
            airbnb_listings_private_room=model.airbnb_listings_private_room,
            airbnb_listings_private_room_price=model.airbnb_listings_private_room_price,
            airbnb_listings_private_room_price_average=model.airbnb_listings_private_room_price_average,
            airbnb_listings_shared_room=model.airbnb_listings_shared_room,
            airbnb_listings_shared_room_price=model.airbnb_listings_shared_room_price,
            airbnb_listings_shared_room_price_average=model.airbnb_listings_shared_room_price_average,
            airbnb_listings_entire_hotel=model.airbnb_listings_entire_hotel,
            airbnb_listings_entire_hotel_price=model.airbnb_listings_entire_hotel_price,
            airbnb_listings_entire_hotel_price_average=model.airbnb_listings_entire_hotel_price_average,
            # Transportation stations
            ecobici_stations=model.ecobici_stations,
            cablebus_stations=model.cablebus_stations,
            metro_stations=model.metro_stations,
            metrobus_stations=model.metrobus_stations,
            rtp_stations=model.rtp_stations,
            concesionados_stations=model.concesionados_stations,
            tren_interurbano_stations=model.tren_interurbano_stations,
            tren_suburbano_stations=model.tren_suburbano_stations,
            mexibus_stations=model.mexibus_stations,
            mexicable_stations=model.mexicable_stations,
            tren_ligero_stations=model.tren_ligero_stations,
            # Crime statistics by year
            thefts_2024=model.thefts_2024,
            sexual_assault_2024=model.sexual_assault_2024,
            house_thefts_2024=model.house_thefts_2024,
            business_thefts_2024=model.business_thefts_2024,
            thefts_2023=model.thefts_2023,
            sexual_assault_2023=model.sexual_assault_2023,
            house_thefts_2023=model.house_thefts_2023,
            business_thefts_2023=model.business_thefts_2023,
            thefts_2022=model.thefts_2022,
            sexual_assault_2022=model.sexual_assault_2022,
            house_thefts_2022=model.house_thefts_2022,
            business_thefts_2022=model.business_thefts_2022,
            thefts_2021=model.thefts_2021,
            sexual_assault_2021=model.sexual_assault_2021,
            house_thefts_2021=model.house_thefts_2021,
            business_thefts_2021=model.business_thefts_2021,
            thefts_2020=model.thefts_2020,
            sexual_assault_2020=model.sexual_assault_2020,
            house_thefts_2020=model.house_thefts_2020,
            business_thefts_2020=model.business_thefts_2020,
            thefts_2019=model.thefts_2019,
            sexual_assault_2019=model.sexual_assault_2019,
            house_thefts_2019=model.house_thefts_2019,
            business_thefts_2019=model.business_thefts_2019,
        )
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to GeoJSON Feature format."""
        # Convert geometry to GeoJSON format using Django's built-in geojson method
        geometry_data = None
        if self.geometry:
            geometry_data = json.loads(self.geometry.geojson)
        
        return {
            'type': 'Feature',
            'geometry': geometry_data,
            'properties': {
                'id': self.id,
                'cvegeo': self.cvegeo,
                'cve_ent': self.cve_ent,
                'cve_mun': self.cve_mun,
                'cve_loc': self.cve_loc,
                'cve_ageb': self.cve_ageb,
                'population': self.population,
                'housing': self.housing,
                'education': self.education,
                'health': self.health,
                'leisure': self.leisure,
                'provision': self.provision,
                'companies': self.companies,
                'jobs': self.jobs,
                'cars_rate': self.cars_rate,
                'bikes_rate': self.bikes_rate,
                'motorcycles_rate': self.motorcycles_rate,
                'airbnb_listings': self.airbnb_listings,
                'airbnb_listings_price': self.airbnb_listings_price,
                'airbnb_listings_price_average': self.airbnb_listings_price_average,
                'airbnb_listings_list': self.airbnb_listings_list,
                'airbnb_listings_full_house': self.airbnb_listings_full_house,
                'airbnb_listings_full_house_price': self.airbnb_listings_full_house_price,
                'airbnb_listings_full_house_price_average': self.airbnb_listings_full_house_price_average,
                'airbnb_listings_private_room': self.airbnb_listings_private_room,
                'airbnb_listings_private_room_price': self.airbnb_listings_private_room_price,
                'airbnb_listings_private_room_price_average': self.airbnb_listings_private_room_price_average,
                'airbnb_listings_shared_room': self.airbnb_listings_shared_room,
                'airbnb_listings_shared_room_price': self.airbnb_listings_shared_room_price,
                'airbnb_listings_shared_room_price_average': self.airbnb_listings_shared_room_price_average,
                'airbnb_listings_entire_hotel': self.airbnb_listings_entire_hotel,
                'airbnb_listings_entire_hotel_price': self.airbnb_listings_entire_hotel_price,
                'airbnb_listings_entire_hotel_price_average': self.airbnb_listings_entire_hotel_price_average,
                'ecobici_stations': self.ecobici_stations,
                'cablebus_stations': self.cablebus_stations,
                'metro_stations': self.metro_stations,
                'metrobus_stations': self.metrobus_stations,
                'rtp_stations': self.rtp_stations,
                'concesionados_stations': self.concesionados_stations,
                'tren_interurbano_stations': self.tren_interurbano_stations,
                'tren_suburbano_stations': self.tren_suburbano_stations,
                'mexibus_stations': self.mexibus_stations,
                'mexicable_stations': self.mexicable_stations,
                'tren_ligero_stations': self.tren_ligero_stations,
                'thefts_2024': self.thefts_2024,
                'sexual_assault_2024': self.sexual_assault_2024,
                'house_thefts_2024': self.house_thefts_2024,
                'business_thefts_2024': self.business_thefts_2024,
                'thefts_2023': self.thefts_2023,
                'sexual_assault_2023': self.sexual_assault_2023,
                'house_thefts_2023': self.house_thefts_2023,
                'business_thefts_2023': self.business_thefts_2023,
                'thefts_2022': self.thefts_2022,
                'sexual_assault_2022': self.sexual_assault_2022,
                'house_thefts_2022': self.house_thefts_2022,
                'business_thefts_2022': self.business_thefts_2022,
                'thefts_2021': self.thefts_2021,
                'sexual_assault_2021': self.sexual_assault_2021,
                'house_thefts_2021': self.house_thefts_2021,
                'business_thefts_2021': self.business_thefts_2021,
                'thefts_2020': self.thefts_2020,
                'sexual_assault_2020': self.sexual_assault_2020,
                'house_thefts_2020': self.house_thefts_2020,
                'business_thefts_2020': self.business_thefts_2020,
                'thefts_2019': self.thefts_2019,
                'sexual_assault_2019': self.sexual_assault_2019,
                'house_thefts_2019': self.house_thefts_2019,
                'business_thefts_2019': self.business_thefts_2019,
            }
        } 