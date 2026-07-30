from django.contrib.gis.db import models
from world.models.felony import Felony

class GeoZoneCrimeExtension:
    """Extension class for GeoZone model to handle crime-related updates"""

    def update_thefts(self, year):
        thefts_computed = self.get_geometries_of(self.thefts_computed(year), 'felonies')

        crime_mapping = {
            2024: ('thefts_2024', 'thefts_2024_list'),
            2023: ('thefts_2023', 'thefts_2023_list'),
            2022: ('thefts_2022', 'thefts_2022_list'),
            2021: ('thefts_2021', 'thefts_2021_list'),
            2020: ('thefts_2020', 'thefts_2020_list'),
            2019: ('thefts_2019', 'thefts_2019_list'),
            2018: ('thefts_2018', 'thefts_2018_list'),
            2017: ('thefts_2017', 'thefts_2017_list'),
        }

        if year in crime_mapping:
            count_field, list_field = crime_mapping[year]
            setattr(self, count_field, len(thefts_computed))
            setattr(self, list_field, thefts_computed)
            self.save()

    def update_sexual_assault(self, year):
        sexual_assault_computed = self.get_geometries_of(self.sexual_assault_computed(year), 'felonies')

        crime_mapping = {
            2024: ('sexual_assault_2024', 'sexual_assault_2024_list'),
            2023: ('sexual_assault_2023', 'sexual_assault_2023_list'),
            2022: ('sexual_assault_2022', 'sexual_assault_2022_list'),
            2021: ('sexual_assault_2021', 'sexual_assault_2021_list'),
            2020: ('sexual_assault_2020', 'sexual_assault_2020_list'),
            2019: ('sexual_assault_2019', 'sexual_assault_2019_list'),
            2018: ('sexual_assault_2018', 'sexual_assault_2018_list'),
            2017: ('sexual_assault_2017', 'sexual_assault_2017_list'),
        }

        if year in crime_mapping:
            count_field, list_field = crime_mapping[year]
            setattr(self, count_field, len(sexual_assault_computed))
            setattr(self, list_field, sexual_assault_computed)
            self.save()

    def update_house_thefts(self, year):
        house_thefts_computed = self.get_geometries_of(self.house_thefts_computed(year), 'felonies')

        crime_mapping = {
            2024: ('house_thefts_2024', 'house_thefts_2024_list'),
            2023: ('house_thefts_2023', 'house_thefts_2023_list'),
            2022: ('house_thefts_2022', 'house_thefts_2022_list'),
            2021: ('house_thefts_2021', 'house_thefts_2021_list'),
            2020: ('house_thefts_2020', 'house_thefts_2020_list'),
            2019: ('house_thefts_2019', 'house_thefts_2019_list'),
            2018: ('house_thefts_2018', 'house_thefts_2018_list'),
            2017: ('house_thefts_2017', 'house_thefts_2017_list'),
        }

        if year in crime_mapping:
            count_field, list_field = crime_mapping[year]
            setattr(self, count_field, len(house_thefts_computed))
            setattr(self, list_field, house_thefts_computed)
            self.save() 
    
    def update_business_thefts(self, year):
        business_thefts_computed = self.get_geometries_of(self.business_thefts_computed(year), 'felonies')

        crime_mapping = {
            2024: ('business_thefts_2024', 'business_thefts_2024_list'),
            2023: ('business_thefts_2023', 'business_thefts_2023_list'),
            2022: ('business_thefts_2022', 'business_thefts_2022_list'),
            2021: ('business_thefts_2021', 'business_thefts_2021_list'),
            2020: ('business_thefts_2020', 'business_thefts_2020_list'),
            2019: ('business_thefts_2019', 'business_thefts_2019_list'),
            2018: ('business_thefts_2018', 'business_thefts_2018_list'),
            2017: ('business_thefts_2017', 'business_thefts_2017_list'),
        }

        if year in crime_mapping:
            count_field, list_field = crime_mapping[year]
            setattr(self, count_field, len(business_thefts_computed))
            setattr(self, list_field, business_thefts_computed)
            self.save()

    def thefts_computed(self, year):
        return Felony.objects.filter(location__within=self.geometry).filter(crime_date__year=year, crime_type__in=Felony.PUBLIC_TRANSPORT_THEFT_TYPES)

    def sexual_assault_computed(self, year):
        return Felony.objects.filter(location__within=self.geometry).filter(crime_date__year=year, crime_type__in=Felony.SEXUAL_ABUSE_TYPES)

    def house_thefts_computed(self, year):
        return Felony.objects.filter(location__within=self.geometry).filter(crime_date__year=year, crime_type__in=Felony.HOUSE_ROBBERY_TYPES)

    def business_thefts_computed(self, year):
        return Felony.objects.filter(location__within=self.geometry).filter(crime_date__year=year, crime_type__in=Felony.BUSINESS_ROBBERY_TYPES)