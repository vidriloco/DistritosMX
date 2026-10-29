from django.core.management import BaseCommand

from world.models import GeoZone, Neighbourhood


class Command(BaseCommand):
    """Estimate each colonia's population and housing from the census AGEBs.

    The census is published per AGEB, and colonias do not follow AGEB
    boundaries, so every colonia takes a share of each AGEB it overlaps,
    proportional to the overlapped fraction of that AGEB's area. Run it after
    `ageb_update_population`, and again whenever the colonias are reimported.
    """

    help = "Fill colonia population and housing by area-weighted overlay of the AGEBs"

    def handle(self, *args, **options):
        agebs = GeoZone.objects.exclude(population=0, housing=None).only('geometry', 'population', 'housing')
        if not agebs.exists():
            self.stdout.write(self.style.ERROR('No AGEB carries census data; run ageb_update_population first.'))
            return

        total = Neighbourhood.objects.count()
        for index, colonia in enumerate(Neighbourhood.objects.only('geometry', 'neighbourhood_name'), start=1):
            population, housing = self.overlay(colonia, agebs)
            Neighbourhood.objects.filter(pk=colonia.pk).update(population=population, housing=housing)
            self.stdout.write(f'{index}/{total} {colonia.neighbourhood_name}: {population} habitantes, {housing} viviendas')

    @staticmethod
    def overlay(colonia, agebs):
        population = 0.0
        housing = 0.0
        for ageb in agebs.filter(geometry__intersects=colonia.geometry):
            ageb_area = ageb.geometry.area
            if not ageb_area:
                continue
            share = ageb.geometry.intersection(colonia.geometry).area / ageb_area
            population += (ageb.population or 0) * share
            housing += (ageb.housing or 0) * share
        return int(round(population)), int(round(housing))
