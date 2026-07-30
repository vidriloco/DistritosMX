import csv
from django.core.management import BaseCommand
from django.contrib.gis.geos import Point

from world.models import DenueRecord


def safe_int(value, default=0):
    """Convert value to integer, return default if conversion fails."""
    try:
        return int(value)
    except (ValueError, TypeError):
        return default


def safe_float(value, default=0.0):
    """Convert value to float, return default if conversion fails."""
    try:
        return float(value)
    except (ValueError, TypeError):
        return default


class Command(BaseCommand):
    help = "Import DENUE registers from denue/<city>.csv"

    def handle(self, *args, **options):
        DenueRecord.objects.all().delete()
        print("Ingesting DENUE data into registers")

        cities = ['cdmx', 'edomex1', 'edomex2']
        
        for city in cities:
            self.import_denue_for(city)

    def import_denue_for(self, city):
        print(f"Processing data for {city}")
        with open(f'./data/denue/{city}.csv', 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            index = 0
            for row in reader:
                # Convert latitud and longitud to Point geometry
                try:
                    lat = safe_float(row['latitud'])
                    lon = safe_float(row['longitud'])
                    if lat == 0.0 and lon == 0.0:
                        print(f"Skipping record {row.get('id', 'unknown')} - invalid coordinates")
                        continue
                    geometry = Point(lon, lat)  # Note: Point takes (x, y) which is (longitude, latitude)
                except KeyError:
                    print(f"Skipping record {row.get('id', 'unknown')} - missing coordinate columns")
                    continue

                DenueRecord.objects.create(
                    id=safe_int(row['id']),
                    clee=row['clee'],
                    nom_estab=row['nom_estab'],
                    raz_social=row.get('raz_social', ''),
                    codigo_act=row['codigo_act'],
                    nombre_act=row['nombre_act'],
                    per_ocu=row['per_ocu'],
                    numero_ext=row.get('numero_ext', ''),
                    letra_ext=row.get('letra_ext', ''),
                    edificio=row.get('edificio', ''),
                    edificio_e=row.get('edificio_e', ''),
                    numero_int=row.get('numero_int', ''),
                    letra_int=row.get('letra_int', ''),
                    tipo_asent=row.get('tipo_asent', ''),
                    nomb_asent=row.get('nomb_asent', ''),
                    tipoCenCom=row.get('tipoCenCom', ''),
                    nom_CenCom=row.get('nom_CenCom', ''),
                    num_local=row.get('num_local', ''),
                    cod_postal=row.get('cod_postal', ''),
                    cve_ent=row['cve_ent'],
                    entidad=row['entidad'],
                    cve_mun=row['cve_mun'],
                    municipio=row['municipio'],
                    cve_loc=row['cve_loc'],
                    localidad=row['localidad'],
                    ageb=row['ageb'],
                    manzana=row['manzana'],
                    tipoUniEco=row.get('tipoUniEco', ''),
                    geometry=geometry,
                    year=2025
                )
                print("Procesing record with index: ", index)
                index += 1
            