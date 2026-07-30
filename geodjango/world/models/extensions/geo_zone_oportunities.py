from django.contrib.gis.db import models
from ..denue_record import DenueRecord

class GeoZoneOportunitiesExtension:
    """Extension class for GeoZone model to handle opportunities-related updates"""

    def update_oportunities(self):
        education_computed = self.get_geometries_of(self.education_computed())
        self.education = len(education_computed)
        self.education_list = education_computed

        health_computed = self.get_geometries_of(self.health_computed())
        self.health = len(health_computed)
        self.health_list = health_computed

        leisure_computed = self.get_geometries_of(self.leisure_computed())
        self.leisure = len(leisure_computed)
        self.leisure_list = leisure_computed

        provision_computed = self.get_geometries_of(self.provision_computed())
        self.provision = len(provision_computed)
        self.provision_list = provision_computed

        companies_computed = self.get_geometries_of(self.companies_computed())
        self.companies = len(companies_computed)
        self.companies_list = companies_computed

        self.jobs = sum(record.average_jobs() for record in self.jobs_computed())
        self.jobs_list = self.get_geometries_of(self.jobs_computed(), 'jobs')

        self.save()

    def education_computed(self):
        return DenueRecord.objects.filter(geometry__within=self.geometry).filter(codigo_act__startswith="61")
    
    def health_computed(self):
        return DenueRecord.objects.filter(geometry__within=self.geometry).filter(codigo_act__startswith="62")
    
    def leisure_computed(self):
        return DenueRecord.objects.filter(geometry__within=self.geometry).filter(codigo_act__startswith="71")

    def provision_computed(self):
        return DenueRecord.objects.filter(geometry__within=self.geometry).filter(codigo_act__startswith="46")

    def companies_computed(self):
        return DenueRecord.objects.filter(geometry__within=self.geometry)
    
    def jobs_computed(self):
        return DenueRecord.objects.filter(geometry__within=self.geometry) 
    
    def get_geometries_of(self, records, aggregate = None):
        if aggregate == 'jobs':
            return [f"{record.geometry.x}, {record.geometry.y}, {record.average_jobs()}" for record in records]
        elif aggregate == 'felonies' or aggregate == 'airbnb':
            return [f"{record.location.x}, {record.location.y}" for record in records]
        return [f"{record.geometry.x}, {record.geometry.y}" for record in records]
