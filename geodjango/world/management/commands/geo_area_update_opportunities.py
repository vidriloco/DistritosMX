import geojson
from django.core.management import BaseCommand
from django.contrib.gis.geos import Point

from world.models import GeoZone, Neighbourhood

class Command(BaseCommand):
    help = "Update geozones using denues"

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
        """Update AGEB (Área Geoestadística Básica) opportunities"""
        geozones = GeoZone.objects.all()
        for geozone in geozones:
            print(f"Updating properties for AGEB {geozone.CVE_AGEB}")
            geozone.update_oportunities()

    def update_neighbourhoods(self):
        """Update neighbourhood opportunities"""
        neighbourhoods = Neighbourhood.objects.all()
        for neighbourhood in neighbourhoods:
            print(f"Updating properties for neighbourhood {neighbourhood.neighbourhood_name}")
            neighbourhood.update_oportunities()

    def update_municipalities(self):
        """Update municipality opportunities - placeholder for future implementation"""
        print("Municipality update not yet implemented")
        self.stdout.write(
            self.style.WARNING('Municipality update functionality is not yet implemented')
        )