from django.contrib.gis.db import models
from django.contrib.gis.geos import GEOSGeometry
from django.contrib.postgres.fields import ArrayField
from django.db.models import JSONField
from .extensions import GeoZoneCrimeExtension, GeoZoneMobilityExtension, GeoZoneOportunitiesExtension, GeoZoneAirbnbExtension

class Neighbourhood(models.Model, GeoZoneCrimeExtension, GeoZoneMobilityExtension, GeoZoneOportunitiesExtension, GeoZoneAirbnbExtension):
    """
    Model representing neighbourhoods with municipality and neighbourhood information.
    This model stores geographic boundaries and administrative information for neighbourhoods.
    """
    
    # Municipality information
    municipality_code = models.CharField(max_length=10, help_text="Municipality code")
    municipality_name = models.CharField(max_length=200, help_text="Municipality name")
    
    # Neighbourhood information
    neighbourhood_code = models.CharField(max_length=20, help_text="Neighbourhood code")
    neighbourhood_name = models.CharField(max_length=200, help_text="Neighbourhood name")
    
    # Geometry field for the polygon
    geometry = models.PolygonField(srid=4326, help_text="Geographic boundary of the neighbourhood")
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

        # Additional fields
    population = models.IntegerField(blank=True, default=0)
    housing = models.IntegerField(null=True, blank=True)

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

    # Tourist visitors info - JSON structure with year-month keys
    # Structure: {"2024-11": {"total": int, "daily_avg": float, "daily_morning_avg": float, 
    #                        "daily_afternoon_avg": float, "daily_afternoon_eve": float, 
    #                        "days": [{"01": {"d": int, "m": int, "a": int, "e": int}}, ...]}, ...}
    tourist_visitors_info = JSONField(
        null=True,
        blank=True,
        help_text="Tourist visitor statistics organized by year-month. Each month contains total, averages, and daily breakdown."
    )
    
    class Meta:
        verbose_name = "Neighbourhood"
        verbose_name_plural = "Neighbourhoods"
        indexes = [
            models.Index(fields=['municipality_code']),
            models.Index(fields=['municipality_name']),
            models.Index(fields=['neighbourhood_code']),
            models.Index(fields=['neighbourhood_name']),
        ]
    
    def __str__(self):
        return f"{self.neighbourhood_name} - {self.municipality_name}"
    
    def get_geojson(self):
        """Return the geometry as GeoJSON"""
        if self.geometry:
            return self.geometry.geojson
        return None 