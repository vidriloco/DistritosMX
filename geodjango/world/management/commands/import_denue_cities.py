"""
Import DENUE establishments from INEGI's bulk CSV export.

DENUE is the national business registry. It backs the /negocios wizard — the
category autocomplete in step 2 is built from the distinct `codigo_act` values
in this table, so an empty table means an autocomplete that silently matches
nothing.

The files are the per-state CSV downloads from INEGI, unzipped into
`data/denue/<city>.csv`. Both deploy scripts fetch them with `--seed-denue`;
see `download_denue` there for the URLs.

    python3 manage.py import_denue_cities
    python3 manage.py import_denue_cities --cities cdmx
    python3 manage.py import_denue_cities --data-dir data/denue --year 2026
"""

import csv
import os
import sys

from django.contrib.gis.geos import Point
from django.core.management import BaseCommand, CommandError

from world.models import DenueRecord

# INEGI splits Mexico state across two files; the city names here are the file
# stems the deploy scripts write, not INEGI's own numbering.
DEFAULT_CITIES = ['cdmx', 'edomex1', 'edomex2']
DEFAULT_DATA_DIR = 'data/denue'
DEFAULT_YEAR = 2025

# 462k rows for CDMX alone. One INSERT per row takes hours; batched, minutes.
DEFAULT_BATCH_SIZE = 5000

# The columns the model needs. Anything else in the export is ignored.
TEXT_FIELDS = [
    'clee', 'nom_estab', 'raz_social', 'codigo_act', 'nombre_act', 'per_ocu',
    'numero_ext', 'letra_ext', 'edificio', 'edificio_e', 'numero_int',
    'letra_int', 'tipo_asent', 'nomb_asent', 'tipoCenCom', 'nom_CenCom',
    'num_local', 'cod_postal', 'cve_ent', 'entidad', 'cve_mun', 'municipio',
    'cve_loc', 'localidad', 'ageb', 'manzana', 'tipoUniEco',
]


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


def detect_encoding(path):
    """
    Whether the file is UTF-8, falling back to latin-1.

    INEGI ships DENUE as ISO-8859-1. This is sniffed rather than assumed
    because latin-1 decodes *any* byte sequence without complaining: hardcoding
    it would turn a UTF-8 export into silent mojibake — `Panificación` stored as
    `PanificaciÃ³n` — and the category list is user-facing.
    """
    with open(path, 'rb') as handle:
        sample = handle.read(1 << 20)
    try:
        sample.decode('utf-8')
        return 'utf-8'
    except UnicodeDecodeError:
        return 'latin-1'


class Command(BaseCommand):
    help = "Import DENUE establishments from INEGI CSV exports in data/denue/."

    def add_arguments(self, parser):
        parser.add_argument(
            '--data-dir', default=DEFAULT_DATA_DIR,
            help=f'Where the CSVs live (default: {DEFAULT_DATA_DIR}).',
        )
        parser.add_argument(
            '--cities', nargs='+', default=DEFAULT_CITIES,
            help=f'File stems to import (default: {" ".join(DEFAULT_CITIES)}).',
        )
        parser.add_argument(
            '--year', type=int, default=DEFAULT_YEAR,
            help=f'Vintage to stamp on every row (default: {DEFAULT_YEAR}).',
        )
        parser.add_argument(
            '--batch-size', type=int, default=DEFAULT_BATCH_SIZE,
            help=f'Rows per INSERT (default: {DEFAULT_BATCH_SIZE}).',
        )
        parser.add_argument(
            '--keep', action='store_true',
            help='Add to the existing table instead of replacing it.',
        )
        parser.add_argument(
            '--encoding', default=None,
            help='Force an encoding instead of detecting UTF-8 vs latin-1.',
        )

    def handle(self, *args, **options):
        data_dir = options['data_dir']
        year = options['year']
        batch_size = max(1, options['batch_size'])

        found, missing = [], []
        for city in options['cities']:
            path = os.path.join(data_dir, f'{city}.csv')
            (found if os.path.exists(path) else missing).append((city, path))

        if missing:
            for city, path in missing:
                self.stderr.write(self.style.WARNING(f'No existe {path}, se omite {city}.'))

        if not found:
            raise CommandError(
                f'No hay ningún CSV de DENUE en {data_dir}/. '
                'Descárgalos con ./deploy-local.sh --seed-denue (o --seed-denue '
                'en deploy-production.sh), que los baja de INEGI y los descomprime aquí.'
            )

        if not options['keep']:
            deleted = DenueRecord.objects.count()
            self.stdout.write(f'Vaciando la tabla ({deleted} registro(s) previos)...')
            DenueRecord.objects.all().delete()

        total = 0
        for city, path in found:
            total += self.import_denue_for(
                city, path, year, batch_size, options['encoding']
            )

        categories = DenueRecord.objects.values('codigo_act').distinct().count()
        self.stdout.write(self.style.SUCCESS(
            f'\n{total} establecimiento(s) importados, '
            f'{categories} categoría(s) distintas disponibles para el buscador.'
        ))

    def import_denue_for(self, city, path, year, batch_size, forced_encoding):
        encoding = forced_encoding or detect_encoding(path)
        size_mb = os.path.getsize(path) / (1024 * 1024)
        self.stdout.write(f'--> {city}: {path} ({size_mb:.0f} MB, {encoding})')

        batch = []
        imported = skipped = 0

        # newline='' is what csv wants; without it, a quoted field containing a
        # line break splits into two broken rows.
        with open(path, encoding=encoding, newline='') as handle:
            for row in csv.DictReader(handle):
                lat = safe_float(row.get('latitud'))
                lon = safe_float(row.get('longitud'))
                # INEGI leaves (0, 0) on records it could not place. Keeping them
                # would drop the whole registry into the Gulf of Guinea.
                if lat == 0.0 and lon == 0.0:
                    skipped += 1
                    continue

                record_id = safe_int(row.get('id'), default=None)
                if record_id is None:
                    skipped += 1
                    continue

                values = {field: (row.get(field) or '') for field in TEXT_FIELDS}
                batch.append(DenueRecord(
                    id=record_id,
                    geometry=Point(lon, lat),
                    year=year,
                    **values,
                ))

                if len(batch) >= batch_size:
                    imported += self._flush(batch)
                    self._progress(imported)

        imported += self._flush(batch)
        self.stdout.write(
            f'    {imported} importados'
            + (f', {skipped} omitidos sin coordenadas o sin id' if skipped else '')
        )
        return imported

    def _flush(self, batch):
        if not batch:
            return 0
        # ignore_conflicts, because a record can appear in two of INEGI's files
        # where a metropolitan area straddles the state line.
        DenueRecord.objects.bulk_create(batch, ignore_conflicts=True)
        count = len(batch)
        batch.clear()
        return count

    def _progress(self, imported):
        # Rewritten in place: a line per batch is fine on a terminal and awful
        # in a deploy log, so it only redraws when someone is watching.
        if sys.stdout.isatty():
            self.stdout.write(f'    {imported} importados...', ending='\r')
            sys.stdout.flush()
