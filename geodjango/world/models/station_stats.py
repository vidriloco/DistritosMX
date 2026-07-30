from django.contrib.gis.db import models
from threading import Thread
from .denue_record import DenueRecord
from .geo_zone import GeoZone

class StationStats(models.Model):
    station = models.OneToOneField('Station', on_delete=models.CASCADE, unique=True, related_name='stats')
    population_300 = models.IntegerField(null=True, blank=True)
    population_500 = models.IntegerField(null=True, blank=True)
    population_1000 = models.IntegerField(null=True, blank=True)
    population_2000 = models.IntegerField(null=True, blank=True)
    housing_300 = models.IntegerField(null=True, blank=True)
    housing_500 = models.IntegerField(null=True, blank=True)
    housing_1000 = models.IntegerField(null=True, blank=True)
    housing_2000 = models.IntegerField(null=True, blank=True)
    cars_300 = models.IntegerField(null=True, blank=True)
    cars_500 = models.IntegerField(null=True, blank=True)
    cars_1000 = models.IntegerField(null=True, blank=True)
    cars_2000 = models.IntegerField(null=True, blank=True)
    bikes_300 = models.IntegerField(null=True, blank=True)
    bikes_500 = models.IntegerField(null=True, blank=True)
    bikes_1000 = models.IntegerField(null=True, blank=True)
    bikes_2000 = models.IntegerField(null=True, blank=True)
    motorcycles_300 = models.IntegerField(null=True, blank=True)
    motorcycles_500 = models.IntegerField(null=True, blank=True)
    motorcycles_1000 = models.IntegerField(null=True, blank=True)
    motorcycles_2000 = models.IntegerField(null=True, blank=True)
    health_300 = models.IntegerField(null=True, blank=True)
    health_500 = models.IntegerField(null=True, blank=True)
    health_1000 = models.IntegerField(null=True, blank=True)
    health_2000 = models.IntegerField(null=True, blank=True)
    education_300 = models.IntegerField(null=True, blank=True)
    education_500 = models.IntegerField(null=True, blank=True)
    education_1000 = models.IntegerField(null=True, blank=True)
    education_2000 = models.IntegerField(null=True, blank=True)
    leisure_300 = models.IntegerField(null=True, blank=True)
    leisure_500 = models.IntegerField(null=True, blank=True)
    leisure_1000 = models.IntegerField(null=True, blank=True)
    leisure_2000 = models.IntegerField(null=True, blank=True)
    jobs_300 = models.IntegerField(null=True, blank=True)
    jobs_500 = models.IntegerField(null=True, blank=True)
    jobs_1000 = models.IntegerField(null=True, blank=True)
    jobs_2000 = models.IntegerField(null=True, blank=True)
    companies_300 = models.IntegerField(null=True, blank=True)
    companies_500 = models.IntegerField(null=True, blank=True)
    companies_1000 = models.IntegerField(null=True, blank=True)
    companies_2000 = models.IntegerField(null=True, blank=True)

    def __str__(self):
        return self.station.name
    
    def get_stats_for(self, indicator, radius):
        if indicator == 'population':
            return self.get_population(radius)
        elif indicator == 'health':
            return self.get_health(radius)
        elif indicator == 'education':
            return self.get_education(radius)
        elif indicator == 'leisure':
            return self.get_leisure(radius)
        elif indicator == 'companies':
            return self.get_companies(radius)
        elif indicator == 'jobs':
            return self.get_jobs(radius)
        elif indicator == 'cars':
            return self.get_cars(radius)
        elif indicator == 'bikes':
            return self.get_bikes(radius)
        elif indicator == 'motorcycles':
            return self.get_motorcycles(radius)

    def get_population(self, radius):
        if radius == 300:
            return self.get_or_compute_population_300()
        elif radius == 500:
            return self.get_or_compute_population_500()
        elif radius == 1000:
            return self.get_or_compute_population_1000()
        elif radius == 2000:
            return self.get_or_compute_population_2000()
        return 0
    
    def get_or_compute_population_300(self):
        if self.population_300 is None:
            self.population_300 = GeoZone.all_population_with_radius(self.station, 300)
            self.save()
        return self.population_300
    
    def get_or_compute_population_500(self):
        if self.population_500 is None:
            self.population_500 = GeoZone.all_population_with_radius(self.station, 500)
            self.save()
        return self.population_500
    
    def get_or_compute_population_1000(self):
        if self.population_1000 is None:
            self.population_1000 = GeoZone.all_population_with_radius(self.station, 1000)
            self.save()
        return self.population_1000
        
    def get_or_compute_population_2000(self):
        if self.population_2000 is None:
            self.population_2000 = GeoZone.all_population_with_radius(self.station, 2000)
            self.save()
        return self.population_2000
    
    def get_housing(self, radius):
        if radius == 300:
            return self.get_or_compute_housing_300()
        elif radius == 500:
            return self.get_or_compute_housing_500()
        elif radius == 1000:
            return self.get_or_compute_housing_1000()
        elif radius == 2000:
            return self.get_or_compute_housing_2000()
        return 0
    
    def get_or_compute_housing_300(self):
        if self.housing_300 is None:
            self.housing_300 = GeoZone.all_housing_with_radius(self.station, 300)
            self.save()
        return self.housing_300
    
    def get_or_compute_housing_500(self):
        if self.housing_500 is None:
            self.housing_500 = GeoZone.all_housing_with_radius(self.station, 500)
            self.save()
        return self.housing_500
    
    def get_or_compute_housing_1000(self):
        if self.housing_1000 is None:
            self.housing_1000 = GeoZone.all_housing_with_radius(self.station, 1000)
            self.save()
        return self.housing_1000
        
    def get_or_compute_housing_2000(self):
        if self.housing_2000 is None:
            self.housing_2000 = GeoZone.all_housing_with_radius(self.station, 2000)
            self.save()
        return self.housing_2000

    def get_health(self, radius):
        if radius == 300:
            return self.get_or_compute_health_300()
        elif radius == 500:
            return self.get_or_compute_health_500()
        elif radius == 1000:
            return self.get_or_compute_health_1000()
        elif radius == 2000:
            return self.get_or_compute_health_2000()
    
    def get_or_compute_health_300(self):
        if self.health_300 is None:
            self.health_300 = DenueRecord.all_specific_indicator_within_radius('health', self.station, 300).count()
            
            self.save()
        return self.health_300
    
    def get_or_compute_health_500(self):
        if self.health_500 is None:
            self.health_500 = DenueRecord.all_specific_indicator_within_radius('health', self.station, 500).count()
            self.save()
        return self.health_500
    
    def get_or_compute_health_1000(self):
        if self.health_1000 is None:
            self.health_1000 = DenueRecord.all_specific_indicator_within_radius('health', self.station, 1000).count()
            self.save()
        return self.health_1000
        
    def get_or_compute_health_2000(self):
        if self.health_2000 is None:
            self.health_2000 = DenueRecord.all_specific_indicator_within_radius('health', self.station, 2000).count()
            self.save()
        return self.health_2000

    def get_education(self, radius):
        if radius == 300:
            return self.get_or_compute_education_300()
        elif radius == 500:
            return self.get_or_compute_education_500()
        elif radius == 1000:
            return self.get_or_compute_education_1000()
        elif radius == 2000:
            return self.get_or_compute_education_2000()
        return 0
    
    def get_or_compute_education_300(self):
        if self.education_300 is None:
            self.education_300 = DenueRecord.all_specific_indicator_within_radius('education', self.station, 300).count()
            self.save()
        return self.education_300
    
    def get_or_compute_education_500(self):
        if self.education_500 is None:
            self.education_500 = DenueRecord.all_specific_indicator_within_radius('education', self.station, 500).count()
            self.save()
        return self.education_500
    
    def get_or_compute_education_1000(self):
        if self.education_1000 is None:
            self.education_1000 = DenueRecord.all_specific_indicator_within_radius('education', self.station, 1000).count()
            self.save()
        return self.education_1000
        
    def get_or_compute_education_2000(self):
        if self.education_2000 is None:
            self.education_2000 = DenueRecord.all_specific_indicator_within_radius('education', self.station, 2000).count()
            self.save()
        return self.education_2000

    def get_leisure(self, radius):
        if radius == 300:
            return self.get_or_compute_leisure_300()
        elif radius == 500:
            return self.get_or_compute_leisure_500()
        elif radius == 1000:
            return self.get_or_compute_leisure_1000()
        elif radius == 2000:
            return self.get_or_compute_leisure_2000()
        return 0
    
    def get_or_compute_leisure_300(self):
        if self.leisure_300 is None:
            self.leisure_300 = DenueRecord.all_specific_indicator_within_radius('leisure', self.station, 300).count()
            self.save()
        return self.leisure_300
    
    def get_or_compute_leisure_500(self):
        if self.leisure_500 is None:
            self.leisure_500 = DenueRecord.all_specific_indicator_within_radius('leisure', self.station, 500).count()
            self.save()
        return self.leisure_500
    
    def get_or_compute_leisure_1000(self):
        if self.leisure_1000 is None:
            self.leisure_1000 = DenueRecord.all_specific_indicator_within_radius('leisure', self.station, 1000).count()
            self.save()
        return self.leisure_1000
        
    def get_or_compute_leisure_2000(self):
        if self.leisure_2000 is None:
            self.leisure_2000 = DenueRecord.all_specific_indicator_within_radius('leisure', self.station, 2000).count()
            self.save()
        return self.leisure_2000

    def get_companies(self, radius):
        if radius == 300:
            return self.get_or_compute_companies_300()
        elif radius == 500:
            return self.get_or_compute_companies_500()
        elif radius == 1000:
            return self.get_or_compute_companies_1000()
        elif radius == 2000:
            return self.get_or_compute_companies_2000()
        return 0
    
    def get_or_compute_companies_300(self):
        if self.companies_300 is None:
            self.companies_300 = DenueRecord.all_specific_indicator_within_radius('companies', self.station, 300).count()
            self.save()
        return self.companies_300
    
    def get_or_compute_companies_500(self):
        if self.companies_500 is None:
            self.companies_500 = DenueRecord.all_specific_indicator_within_radius('companies', self.station, 500).count()
            self.save()
        return self.companies_500
    
    def get_or_compute_companies_1000(self):
        if self.companies_1000 is None:
            self.companies_1000 = DenueRecord.all_specific_indicator_within_radius('companies', self.station, 1000).count()
            self.save()
        return self.companies_1000
        
    def get_or_compute_companies_2000(self):
        if self.companies_2000 is None:
            self.companies_2000 = DenueRecord.all_specific_indicator_within_radius('companies', self.station, 2000).count()
            self.save()
        return self.companies_2000
    
    def get_jobs(self, radius):
        if radius == 300:
            return self.get_or_compute_jobs_300()
        elif radius == 500:
            return self.get_or_compute_jobs_500()
        elif radius == 1000:
            return self.get_or_compute_jobs_1000()
        elif radius == 2000:
            return self.get_or_compute_jobs_2000()
        return 0
    
    def get_or_compute_jobs_300(self):
        if self.jobs_300 is None:
            self.jobs_300 = int(DenueRecord.all_jobs_within_radius(self.station, 300))
            self.save()
        return self.jobs_300
    
    def get_or_compute_jobs_500(self):
        if self.jobs_500 is None:
            self.jobs_500 = int(DenueRecord.all_jobs_within_radius(self.station, 500))
            self.save()
        return self.jobs_500
    
    def get_or_compute_jobs_1000(self):
        if self.jobs_1000 is None:
            self.jobs_1000 = int(DenueRecord.all_jobs_within_radius(self.station, 1000))
            self.save()
        return self.jobs_1000
        
    def get_or_compute_jobs_2000(self):
        if self.jobs_2000 is None:
            self.jobs_2000 = int(DenueRecord.all_jobs_within_radius(self.station, 2000))
            self.save()
        return self.jobs_2000

    def get_cars(self, radius):
        if radius == 300:
            return self.get_or_compute_cars_300()
        elif radius == 500:
            return self.get_or_compute_cars_500()
        elif radius == 1000:
            return self.get_or_compute_cars_1000()
        elif radius == 2000:
            return self.get_or_compute_cars_2000()
        return 0
    
    def get_or_compute_cars_300(self):
        if self.cars_300 is None:
            self.cars_300 = GeoZone.all_cars_with_radius(self.station, 300)
            self.save()
        return self.cars_300
    
    def get_or_compute_cars_500(self):
        if self.cars_500 is None:
            self.cars_500 = GeoZone.all_cars_with_radius(self.station, 500)
            self.save()
        return self.cars_500
    
    def get_or_compute_cars_1000(self):
        if self.cars_1000 is None:
            self.cars_1000 = GeoZone.all_cars_with_radius(self.station, 1000)
            self.save()
        return self.cars_1000
        
    def get_or_compute_cars_2000(self):
        if self.cars_2000 is None:
            self.cars_2000 = GeoZone.all_cars_with_radius(self.station, 2000)
            self.save()
        return self.cars_2000
    
    def get_bikes(self, radius):
        if radius == 300:
            return self.get_or_compute_bikes_300()
        elif radius == 500:
            return self.get_or_compute_bikes_500()
        elif radius == 1000:
            return self.get_or_compute_bikes_1000()
        elif radius == 2000:
            return self.get_or_compute_bikes_2000()
        return 0
    
    def get_or_compute_bikes_300(self):
        if self.bikes_300 is None:
            self.bikes_300 = GeoZone.all_bikes_with_radius(self.station, 300)
            self.save()
        return self.bikes_300
    
    def get_or_compute_bikes_500(self):
        if self.bikes_500 is None:
            self.bikes_500 = GeoZone.all_bikes_with_radius(self.station, 500)
            self.save()
        return self.bikes_500
    
    def get_or_compute_bikes_1000(self):
        if self.bikes_1000 is None:
            self.bikes_1000 = GeoZone.all_bikes_with_radius(self.station, 1000)
            self.save()
        return self.bikes_1000
        
    def get_or_compute_bikes_2000(self):
        if self.bikes_2000 is None:
            self.bikes_2000 = GeoZone.all_bikes_with_radius(self.station, 2000)
            self.save()
        return self.bikes_2000
    
    def get_motorcycles(self, radius):
        if radius == 300:
            return self.get_or_compute_motorcycles_300()
        elif radius == 500:
            return self.get_or_compute_motorcycles_500()
        elif radius == 1000:
            return self.get_or_compute_motorcycles_1000()
        elif radius == 2000:
            return self.get_or_compute_motorcycles_2000()
        return 0
    
    def get_or_compute_motorcycles_300(self):
        if self.motorcycles_300 is None:
            self.motorcycles_300 = GeoZone.all_motorcycles_with_radius(self.station, 300)
            self.save()
        return self.motorcycles_300
    
    def get_or_compute_motorcycles_500(self):
        if self.motorcycles_500 is None:
            self.motorcycles_500 = GeoZone.all_motorcycles_with_radius(self.station, 500)
            self.save()
        return self.motorcycles_500
    
    def get_or_compute_motorcycles_1000(self):
        if self.motorcycles_1000 is None:
            self.motorcycles_1000 = GeoZone.all_motorcycles_with_radius(self.station, 1000)
            self.save()
        return self.motorcycles_1000
        
    def get_or_compute_motorcycles_2000(self):
        if self.motorcycles_2000 is None:
            self.motorcycles_2000 = GeoZone.all_motorcycles_with_radius(self.station, 2000)
            self.save()
        return self.motorcycles_2000
