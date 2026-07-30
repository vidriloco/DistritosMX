import geojson
from django.core.management import BaseCommand
from django.contrib.gis.geos import Point

from world.models import GeoZone, Neighbourhood

class Command(BaseCommand):
    help = "Update geozones using felonies"

    def add_arguments(self, parser):
        parser.add_argument(
            '--level',
            type=str,
            choices=['ageb', 'neighbourhood', 'municipality'],
            default='ageb',
            help='Geographic level to update: ageb, neighbourhood, or municipality'
        )
        parser.add_argument(
            '--year',
            type=int,
            default=2019,
            help='Year to update felonies for (default: 2019)'
        )

    def handle(self, *args, **options):
        level = options['level']
        year = options['year']
        
        if level == 'ageb':
            self.update_agebs(year)
        elif level == 'neighbourhood':
            self.update_neighbourhoods(year)
        elif level == 'municipality':
            self.update_municipalities(year)
        else:
            self.stdout.write(
                self.style.ERROR(f'Unknown geographic level: {level}')
            )

    def update_agebs(self, year):
        """Update AGEB (Área Geoestadística Básica) felonies"""
        geozones = GeoZone.objects.all()
        for geozone in geozones:
            print(f"Updating felonies for AGEB {geozone.CVE_AGEB} - {year}")
            geozone.update_thefts(year)
            geozone.update_sexual_assault(year)
            geozone.update_house_thefts(year)
            geozone.update_business_thefts(year)

    def update_neighbourhoods(self, year):
        """Update neighbourhood felonies"""
        neighbourhoods = Neighbourhood.objects.all()
        for neighbourhood in neighbourhoods:
            print(f"Updating felonies for neighbourhood {neighbourhood.neighbourhood_name} - {year}")
            neighbourhood.update_thefts(year)
            neighbourhood.update_sexual_assault(year)
            neighbourhood.update_house_thefts(year)
            neighbourhood.update_business_thefts(year)

    def update_municipalities(self, year):
        """Update municipality felonies - placeholder for future implementation"""
        print(f"Municipality update for year {year} not yet implemented")
        self.stdout.write(
            self.style.WARNING('Municipality update functionality is not yet implemented')
        )