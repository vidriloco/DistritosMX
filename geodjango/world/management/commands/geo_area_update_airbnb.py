import geojson
from django.core.management import BaseCommand
from django.contrib.gis.geos import Point

from world.models import GeoZone, Neighbourhood

class Command(BaseCommand):
    help = "Update geozones' Airbnb listings"

    def add_arguments(self, parser):
        parser.add_argument(
            '--level',
            type=str,
            choices=['ageb', 'neighbourhood', 'municipality'],
            default='ageb',
            help='Geographic level to update: ageb, neighbourhood, or municipality'
        )

    def handle(self, *args, **options):
        level = options['level']
        
        if level == 'ageb':
            self.update_agebs()
        elif level == 'neighbourhood':
            self.update_neighbourhoods()
        elif level == 'municipality':
            self.update_municipalities()
        else:
            self.stdout.write(
                self.style.ERROR(f'Unknown geographic level: {level}')
            )

    def update_agebs(self):
        """Update AGEB (Área Geoestadística Básica) Airbnb listings"""
        geozones = GeoZone.objects.all()
        total = geozones.count()
        self.stdout.write(f"Updating Airbnb listings for {total} AGEBs...")
        
        for i, geozone in enumerate(geozones, 1):
            self.stdout.write(f"Updating Airbnb listings for AGEB {i}/{total}: {geozone.CVE_AGEB}")
            geozone.update_airbnb()
        
        self.stdout.write(self.style.SUCCESS(f"Successfully updated {total} AGEBs"))

    def update_neighbourhoods(self):
        """Update neighbourhood Airbnb listings"""
        neighbourhoods = Neighbourhood.objects.all()
        total = neighbourhoods.count()
        self.stdout.write(f"Updating Airbnb listings for {total} neighbourhoods...")
        
        for i, neighbourhood in enumerate(neighbourhoods, 1):
            self.stdout.write(f"Updating Airbnb listings for neighbourhood {i}/{total}: {neighbourhood.neighbourhood_name}")
            neighbourhood.update_airbnb()
        
        self.stdout.write(self.style.SUCCESS(f"Successfully updated {total} neighbourhoods"))

    def update_municipalities(self):
        """Update municipality Airbnb listings - placeholder for future implementation"""
        print("Municipality update not yet implemented")
        self.stdout.write(
            self.style.WARNING('Municipality update functionality is not yet implemented')
        )