import geojson
from django.core.management import BaseCommand
from django.contrib.gis.geos import Point

from world.models import GeoZone, Neighbourhood

class Command(BaseCommand):
    help = "Update geozones' mobility"

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

    def update_agebs(self):
        """Update mobility for AGEB (GeoZone) level"""
        geozones = GeoZone.objects.all()
        total = geozones.count()
        self.stdout.write(f"Updating mobility for {total} AGEBs...")
        
        for i, geozone in enumerate(geozones, 1):
            self.stdout.write(f"Updating mobility for AGEB {i}/{total}: {geozone.CVE_AGEB}")
            geozone.update_mobility()
        
        self.stdout.write(self.style.SUCCESS(f"Successfully updated {total} AGEBs"))

    def update_neighbourhoods(self):
        """Update mobility for neighbourhood level"""
        neighbourhoods = Neighbourhood.objects.all()
        total = neighbourhoods.count()
        self.stdout.write(f"Updating mobility for {total} neighbourhoods...")
        
        for i, neighbourhood in enumerate(neighbourhoods, 1):
            self.stdout.write(f"Updating mobility for neighbourhood {i}/{total}: {neighbourhood.neighbourhood_name}")
            neighbourhood.update_mobility()
        
        self.stdout.write(self.style.SUCCESS(f"Successfully updated {total} neighbourhoods"))

    def update_municipalities(self):
        """Update mobility for municipality level (grouped neighbourhoods)"""
        # Get unique municipalities from neighbourhoods
        municipalities = Neighbourhood.objects.values('municipality_code', 'municipality_name').distinct()
        total = municipalities.count()
        self.stdout.write(f"Updating mobility for {total} municipalities...")
        
        for i, municipality in enumerate(municipalities, 1):
            municipality_code = municipality['municipality_code']
            municipality_name = municipality['municipality_name']
            
            self.stdout.write(f"Updating mobility for municipality {i}/{total}: {municipality_name}")
            
            # Get all neighbourhoods for this municipality
            neighbourhoods = Neighbourhood.objects.filter(municipality_code=municipality_code)
            
            for neighbourhood in neighbourhoods:
                neighbourhood.update_mobility()
        
        self.stdout.write(self.style.SUCCESS(f"Successfully updated {total} municipalities"))