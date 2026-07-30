"""
Build the alcaldía polygons the despojos map paints as a choropleth.

There is no alcaldía layer in the project — `Neighbourhood` is empty and the
colonias used elsewhere come from S3 — but the INEGI AGEB export for CDMX
(`data/agebs/cdmx.geojson`) carries `CVE_MUN` on every one of its ~2,400
polygons, so the 16 alcaldías are a dissolve away.

The output is committed as a static file rather than computed per request: the
boundaries change once a decade, and unioning 2,400 multipolygons takes long
enough that no cache TTL makes it a reasonable thing to do inside a view.

    python manage.py despojos_build_boroughs
"""

import json
import os

from django.conf import settings
from django.contrib.gis.geos import GEOSGeometry
from django.core.management.base import BaseCommand

# INEGI's catalogue for entidad 09 — the codes run 002-017, not 001-016, and
# they are not alphabetical by the names in use today. The names here are the
# accented, human ones; the FGJ export spells them differently, so the join
# between polygons and carpetas happens on this code, never on the name.
CDMX_BOROUGHS = {
    '002': 'Azcapotzalco',
    '003': 'Coyoacán',
    '004': 'Cuajimalpa de Morelos',
    '005': 'Gustavo A. Madero',
    '006': 'Iztacalco',
    '007': 'Iztapalapa',
    '008': 'La Magdalena Contreras',
    '009': 'Milpa Alta',
    '010': 'Álvaro Obregón',
    '011': 'Tláhuac',
    '012': 'Tlalpan',
    '013': 'Xochimilco',
    '014': 'Benito Juárez',
    '015': 'Cuauhtémoc',
    '016': 'Miguel Hidalgo',
    '017': 'Venustiano Carranza',
}

SOURCE = os.path.join(settings.BASE_DIR, 'data', 'agebs', 'cdmx.geojson')
TARGET = os.path.join(
    settings.BASE_DIR, 'world', 'static', 'data', 'cdmx-alcaldias.geojson'
)

# Degrees. At this latitude 0.0002° is roughly 20 m — invisible at the zooms the
# despojos map uses, and it cuts the payload by an order of magnitude.
TOLERANCE = 0.0002


def _round_coords(node, places=5):
    """
    Trim coordinates to ~1 m.

    GEOS emits 15 decimal places, which is most of the file: the same polygons
    at five decimals are a third of the size and pixel-identical at any zoom
    this map reaches.
    """
    if isinstance(node, list):
        return [_round_coords(item, places) for item in node]
    if isinstance(node, float):
        return round(node, places)
    return node


class Command(BaseCommand):
    help = 'Dissolve the CDMX AGEB layer into the 16 alcaldías used by the despojos map'

    def add_arguments(self, parser):
        parser.add_argument('--source', default=SOURCE)
        parser.add_argument('--target', default=TARGET)
        parser.add_argument('--tolerance', type=float, default=TOLERANCE)

    def handle(self, *args, **options):
        source, target = options['source'], options['target']
        tolerance = options['tolerance']

        self.stdout.write(f'Reading {source}')
        with open(source, 'r', encoding='utf-8') as handle:
            data = json.load(handle)

        buckets = {}
        for feature in data.get('features', []):
            props = feature.get('properties') or {}
            code = props.get('CVE_MUN')
            if code not in CDMX_BOROUGHS:
                continue
            geometry = GEOSGeometry(json.dumps(feature['geometry']), srid=4326)
            if not geometry.valid:
                # A handful of AGEBs self-intersect; buffer(0) is the standard
                # repair and leaves valid ones untouched.
                geometry = geometry.buffer(0)
            buckets.setdefault(code, []).append(geometry)

        missing = set(CDMX_BOROUGHS) - set(buckets)
        if missing:
            raise ValueError(f'No AGEBs found for {sorted(missing)} — wrong source file?')

        features = []
        for code in sorted(buckets):
            merged = buckets[code][0]
            for geometry in buckets[code][1:]:
                merged = merged.union(geometry)
            merged = merged.simplify(tolerance, preserve_topology=True)
            geometry = json.loads(merged.geojson)
            geometry['coordinates'] = _round_coords(geometry['coordinates'])
            features.append({
                'type': 'Feature',
                'id': int(code),
                'properties': {
                    'cve_mun': code,
                    'name': CDMX_BOROUGHS[code],
                },
                'geometry': geometry,
            })
            self.stdout.write(f'  {code} {CDMX_BOROUGHS[code]}: {len(buckets[code])} AGEBs')

        os.makedirs(os.path.dirname(target), exist_ok=True)
        with open(target, 'w', encoding='utf-8') as handle:
            json.dump(
                {'type': 'FeatureCollection', 'name': 'cdmx-alcaldias', 'features': features},
                handle,
                ensure_ascii=False,
            )

        size = os.path.getsize(target) / 1024
        self.stdout.write(self.style.SUCCESS(
            f'Wrote {len(features)} alcaldías to {target} ({size:.0f} KB)'
        ))
