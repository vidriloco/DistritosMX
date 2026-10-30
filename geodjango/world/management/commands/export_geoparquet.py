"""
Export the site's datasets as GeoParquet, for other apps to reuse.

    python manage.py export_geoparquet
    python manage.py export_geoparquet --layers agebs denue --output /tmp/gp

Each layer is read from where the site actually serves it: the AGEB and
colonia indicators and the transport network from the files under data/,
DENUE and the FGJ cases from the database. Large point layers are split into
Hive-style partitions (`denue/cve_ent=09/part-0.parquet`), so a reader can
load one state or one year. A `catalog.json` at the root lists every layer
with its source, attribution, columns and extent.

A layer is written into a temporary folder and swapped in only when it is
complete, so a reader never sees half an export.
"""

import json
import os
import re
import shutil
from datetime import datetime, timezone

import pyarrow as pa
import shapely
from django.conf import settings
from django.contrib.gis.db.models.functions import AsWKB
from django.core.management.base import BaseCommand, CommandError
from django.db.models.functions import ExtractYear

from world.geoparquet import write_geoparquet
from world.models import DenueRecord, Felony

DATA_DIR = os.path.join(settings.BASE_DIR, 'data')

INEGI_LICENSE = 'Términos de Libre Uso de la Información del INEGI'
FGJ_SOURCE = 'Carpetas de investigación, Fiscalía General de Justicia de la Ciudad de México (Datos Abiertos CDMX)'
# Not confirmed against the portal's current terms; check before publishing.
FGJ_LICENSE = 'Verificar en datos.cdmx.gob.mx'


def _snake(name):
    """CVEGEO -> cvegeo, tipoCenCom -> tipo_cen_com."""
    return re.sub(r'(?<=[a-z0-9])([A-Z])', r'_\1', name).lower()


# ---- sources -------------------------------------------------------------

def _from_geojson(paths, drop=(), geometry_types=None):
    """
    Features of one or more GeoJSON files as (geometries, columns).

    List- and object-valued properties are dropped: they are the app's own
    embedded caches (`airbnb_listings_list`), not attributes. `geometry_types`
    keeps only features of those types, for files that mix stations and lines.
    """
    geometries, rows = [], []
    for path in paths:
        with open(path) as fh:
            data = json.load(fh)
        for feature in data.get('features', []):
            geometry = feature.get('geometry')
            if not geometry or (geometry_types and geometry['type'] not in geometry_types):
                continue
            geometries.append(shapely.geometry.shape(geometry))
            rows.append({
                _snake(k): v for k, v in (feature.get('properties') or {}).items()
                if not isinstance(v, (list, dict)) and _snake(k) not in drop
            })
    names = list(dict.fromkeys(k for row in rows for k in row))
    return geometries, {name: [row.get(name) for row in rows] for name in names}


def _from_queryset(queryset, fields, geometry_field):
    """Rows of a queryset as (geometries, columns); `fields` maps model field to column name."""
    rows = queryset.annotate(_wkb=AsWKB(geometry_field)).values_list('_wkb', *fields.keys())
    geometries, values = [], {name: [] for name in fields.values()}
    names = list(fields.values())
    for row in rows.iterator(chunk_size=20_000):
        geometries.append(shapely.from_wkb(bytes(row[0])) if row[0] is not None else None)
        for name, value in zip(names, row[1:]):
            values[name].append(value)
    return geometries, values


DENUE_FIELDS = {
    'id': 'id', 'clee': 'clee', 'nom_estab': 'nom_estab', 'raz_social': 'raz_social',
    'codigo_act': 'codigo_act', 'nombre_act': 'nombre_act', 'per_ocu': 'per_ocu',
    'numero_ext': 'numero_ext', 'letra_ext': 'letra_ext', 'edificio': 'edificio',
    'edificio_e': 'edificio_e', 'numero_int': 'numero_int', 'letra_int': 'letra_int',
    'tipo_asent': 'tipo_asent', 'nomb_asent': 'nomb_asent', 'tipoCenCom': 'tipo_cen_com',
    'nom_CenCom': 'nom_cen_com', 'num_local': 'num_local', 'cod_postal': 'cod_postal',
    'entidad': 'entidad', 'cve_mun': 'cve_mun', 'municipio': 'municipio', 'cve_loc': 'cve_loc',
    'localidad': 'localidad', 'ageb': 'ageb', 'manzana': 'manzana',
    'tipoUniEco': 'tipo_uni_eco', 'year': 'denue_year',
}

FELONY_FIELDS = {
    'id': 'id', 'crime_type': 'crime_type', 'crime_category': 'crime_category',
    'crime_date': 'crime_date', 'crime_time': 'crime_time', 'start_date': 'start_date',
    'borough': 'borough', 'neighborhood': 'neighborhood', 'municipality': 'municipality',
}
FELONY_SCHEMA = {
    'id': pa.int64(), 'crime_date': pa.date32(), 'start_date': pa.date32(), 'crime_time': pa.time32('s'),
}


# ---- layers --------------------------------------------------------------

def _agebs():
    yield None, _from_geojson([os.path.join(DATA_DIR, 'agebs', 'enriched-v3.json')]), {}


def _colonias():
    yield None, _from_geojson([os.path.join(DATA_DIR, 'agebs', 'hoods.json')]), {}


def _ageb_boundaries():
    paths = [os.path.join(DATA_DIR, 'agebs', f'{state}.geojson') for state in ('cdmx', 'edomex', 'yucatan')]
    # `path` is the folder the shapefile was converted from on someone's disk.
    yield None, _from_geojson([p for p in paths if os.path.exists(p)], drop=('path',)), {}


def _transport_files():
    folder = os.path.join(DATA_DIR, 'transports')
    return sorted(os.path.join(folder, f) for f in os.listdir(folder) if f.endswith('.geojson'))


def _transport_lines():
    yield None, _from_geojson(_transport_files(), geometry_types=('LineString', 'MultiLineString')), {}


def _transport_stations():
    yield None, _from_geojson(_transport_files(), geometry_types=('Point', 'MultiPoint')), {}


def _denue():
    states = DenueRecord.objects.order_by('cve_ent').values_list('cve_ent', flat=True).distinct()
    for state in states:
        rows = DenueRecord.objects.filter(cve_ent=state)
        yield f'cve_ent={state}', _from_queryset(rows, DENUE_FIELDS, 'geometry'), {'id': pa.int64()}


def _felonies():
    years = (Felony.objects.annotate(y=ExtractYear('crime_date')).order_by('y')
             .values_list('y', flat=True).distinct())
    for year in years:
        rows = Felony.objects.filter(crime_date__year=year)
        yield f'year={year}', _from_queryset(rows, FELONY_FIELDS, 'location'), FELONY_SCHEMA


LAYERS = {
    'agebs': {
        'read': _agebs,
        'title': 'Indicadores por AGEB',
        'description': 'Población, empleo, equipamiento, inseguridad, rentas temporales y transporte por AGEB urbana. Lo que pinta el Explorador.',
        'source': 'Censo de Población y Vivienda 2020 y DENUE (INEGI); carpetas de investigación FGJ CDMX; Inside Airbnb; Ciudad MX',
        'license': f'{INEGI_LICENSE}; Inside Airbnb CC BY 4.0; FGJ: {FGJ_LICENSE}',
        'key': 'cvegeo',
    },
    'colonias': {
        'read': _colonias,
        'title': 'Indicadores por colonia',
        'description': 'Los mismos indicadores que los AGEB, agregados por colonia.',
        'source': 'Censo 2020 y DENUE (INEGI); FGJ CDMX; Inside Airbnb; Ciudad MX',
        'license': f'{INEGI_LICENSE}; Inside Airbnb CC BY 4.0; FGJ: {FGJ_LICENSE}',
        'key': 'neighbourhood_code',
    },
    'ageb_boundaries': {
        'read': _ageb_boundaries,
        'title': 'Límites de AGEB (CDMX, Estado de México, Yucatán)',
        'description': 'Polígonos de AGEB del Marco Geoestadístico, sin indicadores.',
        'source': 'Marco Geoestadístico, INEGI',
        'license': INEGI_LICENSE,
        'key': 'cvegeo',
    },
    'transport_lines': {
        'read': _transport_lines,
        'title': 'Líneas de transporte',
        'description': 'Trazos de las líneas de Metro y Metrobús.',
        'source': 'Ciudad MX · redes de transporte',
        'license': 'Ciudad MX',
        'key': 'id',
    },
    'transport_stations': {
        'read': _transport_stations,
        'title': 'Estaciones de transporte',
        'description': 'Estaciones de Metro y Metrobús.',
        'source': 'Ciudad MX · redes de transporte',
        'license': 'Ciudad MX',
        'key': 'id',
    },
    'denue': {
        'read': _denue,
        'title': 'Unidades económicas (DENUE)',
        'description': 'Negocios del Directorio Estadístico Nacional de Unidades Económicas, partido por entidad (cve_ent).',
        'source': 'DENUE, INEGI',
        'license': INEGI_LICENSE,
        'key': 'clee',
    },
    'felonies': {
        'read': _felonies,
        'title': 'Carpetas de investigación FGJ CDMX',
        'description': (
            'Delitos denunciados ante la FGJ CDMX con fecha, hora y ubicación aproximada, partidos por año del hecho. '
            'Una hora de 00:00:00 casi siempre significa que no se registró la hora.'
        ),
        'source': FGJ_SOURCE,
        'license': FGJ_LICENSE,
        'key': 'id',
    },
}


class Command(BaseCommand):
    help = 'Export the AGEB, colonia, transport, DENUE and FGJ data as GeoParquet files plus a catalog.json.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--output',
            default=os.path.join(DATA_DIR, 'geoparquet'),
            help='Folder to write into (default: data/geoparquet).',
        )
        parser.add_argument(
            '--layers', nargs='+', choices=sorted(LAYERS), default=sorted(LAYERS),
            help='Only these layers. The catalog keeps the entries of the others.',
        )

    def handle(self, *args, **options):
        output = options['output']
        os.makedirs(output, exist_ok=True)
        catalog_path = os.path.join(output, 'catalog.json')
        catalog = {'layers': {}}
        if os.path.exists(catalog_path):
            with open(catalog_path) as fh:
                catalog = json.load(fh)

        for name in options['layers']:
            spec = LAYERS[name]
            try:
                entry = self._export_layer(output, name, spec)
            except (OSError, ValueError) as e:
                raise CommandError(f'{name}: {e}') from e
            if entry is None:
                self.stdout.write(self.style.WARNING(f'{name}: no rows, skipped'))
                catalog['layers'].pop(name, None)
                continue
            catalog['layers'][name] = entry
            self.stdout.write(self.style.SUCCESS(
                f"{name}: {entry['rows']:,} rows in {len(entry['files'])} file(s)"
            ))

        catalog.update({
            'title': 'Ciudad MX · datos geoespaciales',
            'format': 'GeoParquet 1.1, geometrías WKB en OGC:CRS84 (lon/lat), columna bbox de cobertura',
            'generated_at': datetime.now(timezone.utc).isoformat(timespec='seconds'),
        })
        with open(catalog_path, 'w') as fh:
            json.dump(catalog, fh, ensure_ascii=False, indent=2)

    def _export_layer(self, output, name, spec):
        """Write one layer into a temporary path, then swap it in. None when it has no rows."""
        tmp = os.path.join(output, f'.{name}.tmp')
        shutil.rmtree(tmp, ignore_errors=True)
        os.makedirs(tmp)

        files, rows, extent, geometry_types, columns = [], 0, None, set(), {}
        try:
            for partition, (geometries, values), schema in spec['read']():
                if not any(g is not None for g in geometries):
                    continue
                if partition:
                    os.makedirs(os.path.join(tmp, partition), exist_ok=True)
                    rel = os.path.join(name, partition, 'part-0.parquet')
                    target = os.path.join(tmp, partition, 'part-0.parquet')
                else:
                    rel = f'{name}.parquet'
                    target = os.path.join(tmp, rel)
                summary = write_geoparquet(target, geometries, values, schema)

                files.append(rel)
                rows += summary['rows']
                geometry_types.update(summary['geometry_types'])
                for column in summary['columns']:
                    columns.setdefault(column['name'], column['type'])
                b = summary['bbox']
                extent = b if extent is None else [min(extent[0], b[0]), min(extent[1], b[1]), max(extent[2], b[2]), max(extent[3], b[3])]

            if not files:
                return None

            # Swap in: a single file for a flat layer, a folder for a partitioned one.
            partitioned = os.sep in files[0]
            final = os.path.join(output, name if partitioned else f'{name}.parquet')
            source = tmp if partitioned else os.path.join(tmp, f'{name}.parquet')
            for old in (os.path.join(output, name), os.path.join(output, f'{name}.parquet')):
                if os.path.isdir(old):
                    shutil.rmtree(old)
                elif os.path.exists(old):
                    os.remove(old)
            os.replace(source, final)
        finally:
            shutil.rmtree(tmp, ignore_errors=True)

        return {
            'title': spec['title'],
            'description': spec['description'],
            'source': spec['source'],
            'license': spec['license'],
            'key': spec['key'],
            'files': files,
            'partitioned_by': files[0].split(os.sep)[1].split('=')[0] if os.sep in files[0] else None,
            'rows': rows,
            'bbox': extent,
            'geometry_types': sorted(geometry_types),
            'columns': [{'name': k, 'type': v} for k, v in columns.items()],
            'updated_at': datetime.now(timezone.utc).isoformat(timespec='seconds'),
        }
