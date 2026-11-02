"""
Índice de habitabilidad Ciudad MX: a 0-10 score per AGEB and per colonia of
CDMX, on six axes, written to AreaScore by `manage.py build_area_scores`.

Each axis is a handful of measured indicators. Each indicator becomes the
area's percentile among the areas of the same type (AGEBs against AGEBs,
colonias against colonias), turned so that higher is better; the axis is the
mean of those percentiles times ten. So a 7 in Seguridad reads "safer than
about 70% of the AGEBs of the city", not an absolute standard.

    Vivienda       Censo 2020: homes with one room, dirt floors, drainage, internet
    Agua           Censo 2020: piped water inside the home, water only in the yard
    Seguridad      FGJ: crimes per hectare within 250 m, all and violent, last 12 months on file
    Transporte     distance to mass transit, stops within 800 m, Ecobici within 500 m
    Oportunidades  DENUE: jobs within 2 km; schools, health and groceries nearby
    Riesgo         Atlas de Riesgos: seismic, flood and slope levels, subsidence,
                   fractures, waterlogging and sinkholes nearby (10 = safest)

Census figures are for the AGEB; a colonia gets the AGEBs it overlaps, shared
by area. Areas with fewer than MIN_POPULATION residents get scores but no rank:
parks and industrial zones would otherwise lead or trail every list.

Everything is measured in metres on a flat projection centred on the city
(world.foot_traffic's M_PER_DEG_*), which is exact enough at these distances.
"""

import csv
import os
from datetime import timedelta

import numpy as np
import shapely
from django.conf import settings
from django.db import connection
from django.utils import timezone
from scipy.stats import rankdata

from world.foot_traffic import M_PER_DEG_LAT, M_PER_DEG_LNG

MIN_POPULATION = 100
CDMX = '09'

CENSUS_URL = ('https://www.inegi.org.mx/contenidos/programas/ccpv/2020/datosabiertos/'
              'ageb_manzana/ageb_mza_urbana_09_cpv2020_csv.zip')
# The Censo columns read, all counts so that colonias can add them up.
CENSUS_COLUMNS = ('POBTOT', 'VIVPAR_HAB', 'VPH_1CUART', 'VPH_PISOTI', 'VPH_DRENAJ', 'VPH_INTER',
                  'VPH_AGUADV', 'VPH_AGUAFV')

# DENUE gives staff as a band; the middle of each band.
STAFF_BANDS = {
    '0 a 5 personas': 3, '6 a 10 personas': 8, '11 a 30 personas': 20, '31 a 50 personas': 40,
    '51 a 100 personas': 75, '101 a 250 personas': 175, '251 y más personas': 400,
}

# FGJ categories counted as violent, on top of anything "CON VIOLENCIA".
VIOLENT = ('HOMICIDIO DOLOSO', 'VIOLACIÓN', 'SECUESTRO', 'LESIONES DOLOSAS POR DISPARO DE ARMA DE FUEGO')

# What the FGJ files that turned out not to be a crime.
NOT_A_CRIME = 'HECHO NO DELICTIVO'

AGEB_LEVEL = {'muy bajo': 1, 'bajo': 2, 'medio': 3, 'alto': 4, 'muy alto': 5}

# key -> (axis, label, unit, higher_is_better)
INDICATORS = {
    'un_cuarto': ('vivienda', 'Viviendas de un solo cuarto', '%', False),
    'piso_tierra': ('vivienda', 'Viviendas con piso de tierra', '%', False),
    'drenaje': ('vivienda', 'Viviendas con drenaje', '%', True),
    'internet': ('vivienda', 'Viviendas con internet', '%', True),
    'agua_dentro': ('agua', 'Viviendas con agua entubada dentro', '%', True),
    'agua_fuera': ('agua', 'Viviendas con agua sólo en el patio o terreno', '%', False),
    'delitos': ('seguridad', 'Delitos por hectárea (250 m, 12 meses)', '/ha', False),
    'delitos_violentos': ('seguridad', 'Delitos violentos por hectárea (250 m, 12 meses)', '/ha', False),
    'dist_masivo': ('transporte', 'Distancia al transporte masivo más cercano', 'm', False),
    'paradas_800': ('transporte', 'Paradas y estaciones a 800 m', '', True),
    'ecobici_500': ('transporte', 'Cicloestaciones Ecobici a 500 m', '', True),
    'empleos_2km': ('oportunidades', 'Empleos a 2 km', '', True),
    'escuelas_1km': ('oportunidades', 'Escuelas a 1 km', '', True),
    'salud_1km': ('oportunidades', 'Consultorios y hospitales a 1 km', '', True),
    'abasto_500': ('oportunidades', 'Tiendas de abarrotes y alimentos a 500 m', '', True),
    'sismo': ('riesgo', 'Peligro sísmico (1–5)', '', False),
    'inundacion': ('riesgo', 'Peligro de inundación (1–5)', '', False),
    'laderas': ('riesgo', 'Susceptibilidad de laderas (1–5)', '', False),
    'hundimiento': ('riesgo', 'Hundimiento regional', 'cm/año', False),
    'fracturas_250': ('riesgo', 'Fracturas a 250 m', '', False),
    'encharcamientos_500': ('riesgo', 'Encharcamientos reportados a 500 m (2016–2025)', '', False),
    'socavones_500': ('riesgo', 'Socavones a 500 m (2017–2025)', '', False),
}


# ---------------------------------------------------------------- geometry

def _metres(geometry):
    """lon/lat shapely geometry -> metres on the city's flat projection."""
    return shapely.transform(geometry, lambda xy: xy * (M_PER_DEG_LNG, M_PER_DEG_LAT))


def _points(rows):
    """[(lng, lat, ...)] -> array of shapely points in metres."""
    if not rows:
        return np.array([], dtype=object)
    xy = np.array([(r[0], r[1]) for r in rows], dtype=float)
    return shapely.points(xy * (M_PER_DEG_LNG, M_PER_DEG_LAT))


def _count_within(areas, tree, distance, weights=None):
    """For each area, how many of the tree's geometries (or their weights) lie within `distance` m."""
    pairs = tree.query(areas, predicate='dwithin', distance=distance)
    counts = np.zeros(len(areas))
    np.add.at(counts, pairs[0], 1 if weights is None else weights[pairs[1]])
    return counts


def _nearest_distance(areas, tree):
    if not len(tree.geometries):
        return np.full(len(areas), np.nan)
    _pairs, distances = tree.query_nearest(areas, return_distance=True, all_matches=False)
    return distances


# ---------------------------------------------------------------- inputs

def census_file(log=print):
    """The Censo 2020 AGEB file for CDMX, downloaded from INEGI the first time."""
    path = getattr(settings, 'CENSUS_AGEB_FILE', None) or os.path.join(settings.BASE_DIR, 'data', 'censo', 'ageb_09.csv')
    if os.path.exists(path):
        return path
    import io
    import zipfile

    import requests

    log(f'Descargando el Censo 2020 por AGEB del INEGI a {path}...')
    response = requests.get(CENSUS_URL, timeout=600)
    response.raise_for_status()
    with zipfile.ZipFile(io.BytesIO(response.content)) as archive:
        name = next(n for n in archive.namelist() if n.endswith('.csv') and 'conjunto_de_datos_ageb' in n)
        os.makedirs(os.path.dirname(path), exist_ok=True)
        with archive.open(name) as source, open(path + '.partial', 'wb') as target:
            target.write(source.read())
    os.replace(path + '.partial', path)
    return path


def read_census(path):
    """{CVEGEO: {column: count or None}} for the urban AGEBs, plus {CVE_MUN: municipality name}."""
    agebs, municipalities = {}, {}
    with open(path, newline='', encoding='utf-8-sig') as f:
        for row in csv.DictReader(f):
            if row['MUN'] != '000' and row['LOC'] == '0000':
                municipalities[row['MUN']] = row['NOM_MUN']
            # One "Total AGEB urbana" row per AGEB, then one per block.
            if row['MZA'] != '000' or row['AGEB'] == '0000' or row['LOC'] == '0000':
                continue
            values = {}
            for column in CENSUS_COLUMNS:
                try:
                    values[column] = float(row[column])
                except ValueError:   # "*" (withheld for privacy) or "N/D"
                    values[column] = None
            agebs[row['ENTIDAD'] + row['MUN'] + row['LOC'] + row['AGEB']] = values
    return agebs, municipalities


def _query(sql, params=()):
    with connection.cursor() as cursor:
        cursor.execute(sql, params)
        return cursor.fetchall()


def _stations():
    """(lng, lat, kind) of every station and stop, kind 'masivo', 'superficie' or 'ecobici'."""
    from world.models.official_transports import (
        CablebusStation, ConcesionadosStation, EcobiciStation, InterurbanoStation, MetrobusStation,
        MetroStation, MexibusStation, MexicableStation, RTPStation, SuburbanoStation, TrenLigeroStation,
        TrolebusStation)

    kinds = {
        'masivo': (MetroStation, MetrobusStation, TrenLigeroStation, SuburbanoStation, InterurbanoStation,
                   CablebusStation, MexibusStation, MexicableStation),
        'superficie': (RTPStation, TrolebusStation, ConcesionadosStation),
        'ecobici': (EcobiciStation,),
    }
    rows = []
    for kind, models in kinds.items():
        for model in models:
            field = 'geometry' if model is MetroStation else 'location'
            table = model._meta.db_table
            rows += [(x, y, kind) for x, y in _query(
                f'SELECT ST_X("{field}"::geometry), ST_Y("{field}"::geometry) FROM "{table}" '
                f'WHERE "{field}" IS NOT NULL')]
    return rows


def _felonies(log):
    """(lng, lat, violent) of the crimes in the last 12 months the FGJ file covers."""
    from world.models.felony import Felony

    table = Felony._meta.db_table
    last = _query(f'SELECT max(crime_date) FROM "{table}"')[0][0]
    if not last:
        log('  Sin carpetas de la FGJ cargadas: Seguridad queda vacía.')
        return [], None
    since = last - timedelta(days=365)
    violent = ' OR '.join(['crime_category ILIKE %s'] + ['crime_category = %s'] * len(VIOLENT))
    rows = _query(
        f'SELECT ST_X(location::geometry), ST_Y(location::geometry), ({violent}) '
        f'FROM "{table}" WHERE crime_date > %s AND location IS NOT NULL AND crime_category <> %s',
        ['%CON VIOLENCIA%', *VIOLENT, since, NOT_A_CRIME])
    return rows, (since, last)


def _businesses():
    """(lng, lat, staff, scian code) of the DENUE records of CDMX."""
    from world.models import DenueRecord

    rows = _query(f'SELECT ST_X(geometry), ST_Y(geometry), per_ocu, codigo_act FROM "{DenueRecord._meta.db_table}" '
                  'WHERE cve_ent = %s', [CDMX])
    return [(x, y, STAFF_BANDS.get((per_ocu or '').strip(), 3), code or '') for x, y, per_ocu, code in rows]


def _hazard_layers():
    """Each hazard layer as (shapely geometries in metres, its rows), or None when not built."""
    import pyarrow.parquet as pq

    folder = getattr(settings, 'HAZARDS_DIR', None)
    layers = {}
    for name in ('ageb_hazards', 'subsidence', 'fractures', 'waterlogging', 'sinkholes'):
        path = os.path.join(folder or '', f'{name}.parquet')
        if not folder or not os.path.exists(path):
            continue
        table = pq.read_table(path).to_pydict()
        geometries = _metres(shapely.from_wkb(np.array(table.pop('geometry'), dtype=object)))
        table.pop('bbox', None)
        rows = [dict(zip(table, values)) for values in zip(*table.values())] if table else [{}] * len(geometries)
        layers[name] = (geometries, rows)
    return layers


# ---------------------------------------------------------------- areas

def _areas(area_type, census, municipalities):
    """[(code, name, municipality, lon/lat polygon, census counts or None)] of one area type."""
    from world.models import GeoZone, Neighbourhood

    if area_type == 'ageb':
        out = []
        for zone in GeoZone.objects.filter(CVE_ENT=CDMX).only('CVEGEO', 'CVE_MUN', 'CVE_AGEB', 'geometry'):
            out.append((zone.CVEGEO, f'AGEB {zone.CVE_AGEB}', municipalities.get(zone.CVE_MUN, ''),
                        zone.geometry, census.get(zone.CVEGEO)))
        return out

    # Colonias add up the census counts of the AGEBs they overlap, each AGEB
    # shared by the fraction of its area that falls in the colonia.
    agebs = [(zone.CVEGEO, _metres(shapely.from_wkb(bytes(zone.geometry.wkb))))
             for zone in GeoZone.objects.filter(CVE_ENT=CDMX).only('CVEGEO', 'geometry') if zone.CVEGEO in census]
    tree = shapely.STRtree([g for _c, g in agebs])
    out = []
    for colonia in Neighbourhood.objects.filter(municipality_code__startswith=CDMX).only(
            'neighbourhood_code', 'neighbourhood_name', 'municipality_name', 'geometry'):
        shape = _metres(shapely.from_wkb(bytes(colonia.geometry.wkb)))
        # Each home count keeps its own denominator: the homes of the AGEBs
        # where that count is known. INEGI withholds cells independently, and
        # adding a numerator whose total was withheld gives shares over 100%.
        totals = dict.fromkeys(CENSUS_COLUMNS, 0.0)
        homes = dict.fromkeys(CENSUS_COLUMNS, 0.0)
        found = False
        for index in tree.query(shape, predicate='intersects'):
            code, ageb = agebs[index]
            share = shapely.area(shapely.intersection(shape, ageb)) / (shapely.area(ageb) or 1)
            if share < 0.01:
                continue
            found = True
            counts = census[code]
            for column in CENSUS_COLUMNS:
                if counts[column] is None:
                    continue
                if column.startswith('VPH_'):
                    if counts['VIVPAR_HAB'] is None:
                        continue
                    homes[column] += counts['VIVPAR_HAB'] * share
                totals[column] += counts[column] * share
        if found:
            totals['_homes'] = homes
        out.append((colonia.neighbourhood_code, colonia.neighbourhood_name, colonia.municipality_name,
                    colonia.geometry, totals if found else None))
    return out


def _share(counts, column):
    """Percent of inhabited homes with `column`, None when the census withholds it."""
    if not counts or counts.get(column) is None:
        return None
    homes = counts['_homes'][column] if '_homes' in counts else counts.get('VIVPAR_HAB')
    if not homes:
        return None
    return round(min(100.0, 100 * counts[column] / homes), 1)


def measure(areas, inputs):
    """{key: array of values, NaN where unknown} for every indicator, over `areas`."""
    shapes = np.array([_metres(shapely.from_wkb(bytes(a[3].wkb))) for a in areas], dtype=object)
    points = shapely.point_on_surface(shapes)
    n = len(areas)
    values = {}

    census = [a[4] for a in areas]
    for key, column in (('un_cuarto', 'VPH_1CUART'), ('piso_tierra', 'VPH_PISOTI'), ('drenaje', 'VPH_DRENAJ'),
                        ('internet', 'VPH_INTER'), ('agua_dentro', 'VPH_AGUADV'), ('agua_fuera', 'VPH_AGUAFV')):
        values[key] = np.array([np.nan if (v := _share(c, column)) is None else v for c in census])

    felonies = inputs['felonies']
    if felonies:
        hectares = shapely.area(shapely.buffer(shapes, 250)) / 10_000
        tree = shapely.STRtree(_points(felonies))
        violent = np.array([1.0 if r[2] else 0.0 for r in felonies])
        values['delitos'] = _count_within(shapes, tree, 250) / hectares
        values['delitos_violentos'] = _count_within(shapes, tree, 250, violent) / hectares

    stations = inputs['stations']
    if stations:
        by_kind = {kind: _points([s for s in stations if s[2] == kind]) for kind in ('masivo', 'superficie', 'ecobici')}
        values['dist_masivo'] = _nearest_distance(shapes, shapely.STRtree(by_kind['masivo']))
        values['paradas_800'] = _count_within(
            shapes, shapely.STRtree(np.concatenate([by_kind['masivo'], by_kind['superficie']])), 800)
        values['ecobici_500'] = _count_within(shapes, shapely.STRtree(by_kind['ecobici']), 500)

    businesses = inputs['businesses']
    if businesses:
        tree = shapely.STRtree(_points(businesses))
        staff = np.array([b[2] for b in businesses], dtype=float)
        values['empleos_2km'] = _count_within(points, tree, 2000, staff)
        for key, prefixes, distance in (('escuelas_1km', ('611',), 1000), ('salud_1km', ('621', '622'), 1000),
                                        ('abasto_500', ('461',), 500)):
            mask = np.array([1.0 if b[3].startswith(prefixes) else 0.0 for b in businesses])
            values[key] = _count_within(shapes, tree, distance, mask)

    hazards = inputs['hazards']
    if 'ageb_hazards' in hazards:
        geometries, rows = hazards['ageb_hazards']
        tree = shapely.STRtree(geometries)
        found = tree.query(points, predicate='within')
        under = dict(zip(found[0], found[1]))
        for key, column in (('sismo', 'sismo'), ('inundacion', 'inundacion'), ('laderas', 'sus_ladera')):
            values[key] = np.array([
                AGEB_LEVEL.get(str(rows[under[i]].get(column) or '').strip().lower(), np.nan) if i in under else np.nan
                for i in range(n)])
    if 'subsidence' in hazards:
        geometries, rows = hazards['subsidence']
        found = shapely.STRtree(geometries).query(points, predicate='within')
        under = dict(zip(found[0], found[1]))
        values['hundimiento'] = np.array([_range_middle(rows[under[i]].get('magni_num')) if i in under else 0.0
                                          for i in range(n)])
    for key, layer, distance in (('fracturas_250', 'fractures', 250), ('encharcamientos_500', 'waterlogging', 500),
                                 ('socavones_500', 'sinkholes', 500)):
        if layer in hazards:
            values[key] = _count_within(shapes, shapely.STRtree(hazards[layer][0]), distance)

    return values


def _range_middle(text):
    """'2-10' -> 6.0, the Atlas's subsidence bands in cm per year."""
    try:
        low, high = str(text).replace('–', '-').split('-')
        return (float(low) + float(high)) / 2
    except (ValueError, AttributeError):
        return np.nan


def percentiles(array, higher_is_better):
    """0-1 percentile of each value among the known ones, 1 = best; NaN stays NaN."""
    out = np.full(len(array), np.nan)
    known = ~np.isnan(array)
    if known.sum() < 2:
        return out
    ranks = rankdata(array[known] if higher_is_better else -array[known], method='average')
    out[known] = (ranks - 1) / (known.sum() - 1)
    return out


# ---------------------------------------------------------------- build

def build(area_types=('ageb', 'colonia'), log=print):
    """Measure, score and store every area of the given types. Returns {type: rows written}."""
    from world.models import AreaScore
    from world.models.area_score import AXES

    log('Leyendo el Censo 2020...')
    census, municipalities = read_census(census_file(log))
    log(f'  {len(census):,} AGEB urbanos.')
    log('Leyendo estaciones, carpetas de la FGJ, DENUE y capas del Atlas...')
    felonies, window = _felonies(log)
    inputs = {'stations': _stations(), 'felonies': felonies, 'businesses': _businesses(),
              'hazards': _hazard_layers()}
    log(f"  {len(inputs['stations']):,} estaciones, {len(felonies):,} delitos"
        + (f' ({window[0]:%d %b %Y} – {window[1]:%d %b %Y})' if window else '')
        + f", {len(inputs['businesses']):,} negocios, capas del Atlas: {', '.join(inputs['hazards']) or 'ninguna'}.")
    for name, label in (('stations', 'estaciones'), ('businesses', 'negocios del DENUE')):
        if not inputs[name]:
            log(f'  Sin {label} cargados: sus indicadores quedan vacíos.')

    now = timezone.now()
    written = {}
    for area_type in area_types:
        log(f'Midiendo {area_type}...')
        areas = _areas(area_type, census, municipalities)
        if not areas:
            log(f'  No hay áreas de tipo {area_type} cargadas.')
            written[area_type] = 0
            continue
        values = measure(areas, inputs)
        scored = {key: percentiles(array, INDICATORS[key][3]) for key, array in values.items()}

        existing = {row.code: row for row in AreaScore.objects.filter(area_type=area_type)}
        to_create, to_update = [], []
        for i, (code, name, municipality, geometry, counts) in enumerate(areas):
            indicators = {axis: [] for axis, _label in AXES}
            for key, array in values.items():
                axis, label, unit, higher = INDICATORS[key]
                value = None if np.isnan(array[i]) else round(float(array[i]), 2)
                pct = None if np.isnan(scored[key][i]) else round(float(scored[key][i]) * 100)
                indicators[axis].append({'key': key, 'label': label, 'unit': unit, 'value': value,
                                         'percentile': pct, 'higher_is_better': higher})
            axes = {}
            for axis, _label in AXES:
                known = [item['percentile'] for item in indicators[axis] if item['percentile'] is not None]
                axes[axis] = round(sum(known) / len(known) / 10, 1) if known else None

            population = int(round(counts['POBTOT'])) if counts and counts.get('POBTOT') is not None else None
            row = existing.pop(code, None) or AreaScore(area_type=area_type, code=code)
            row.name, row.municipality, row.geometry, row.population = name, municipality, geometry, population
            row.indicators, row.computed_at = indicators, now
            row.rankable = (population or 0) >= MIN_POPULATION
            if not row.edited:
                for axis, value in axes.items():
                    setattr(row, axis, value)
            row.compute_score()
            (to_update if row.pk else to_create).append(row)

        fields = ['name', 'municipality', 'geometry', 'population', 'indicators', 'computed_at', 'rankable',
                  'score'] + [axis for axis, _label in AXES]
        AreaScore.objects.bulk_create(to_create, batch_size=500)
        AreaScore.objects.bulk_update(to_update, fields, batch_size=500)
        gone = AreaScore.objects.filter(area_type=area_type, code__in=list(existing))
        if existing:
            log(f'  {len(existing)} áreas que ya no existen, borradas.')
            gone.delete()
        AreaScore.rerank(area_type)
        kept = sum(1 for r in to_update if r.edited)
        log(f'  {len(areas):,} áreas calculadas'
            + (f'; {kept} editadas a mano conservaron sus ejes' if kept else '') + '.')
        written[area_type] = len(areas)
    return written


def build_with_run(area_types, run, log_also=None):
    """build() recording its log and outcome in an AreaScoreRun."""
    import traceback

    from world.models import AreaScoreRun

    def log(line):
        run.append(line)
        if log_also:
            log_also(line)

    try:
        build(area_types, log=log)
        run.status = AreaScoreRun.Status.OK
    except Exception:
        log('ERROR:')
        log(traceback.format_exc())
        run.status = AreaScoreRun.Status.FAILED
    run.finished_at = timezone.now()
    run.save(update_fields=['status', 'finished_at'])
    return run


def build_in_background(area_types, actor):
    """Start a run in a worker thread and return its row right away (the admin's button)."""
    import threading

    from django.db import close_old_connections

    from world.models import AreaScoreRun

    run = AreaScoreRun.objects.create(trigger=AreaScoreRun.Trigger.ADMIN, actor=actor,
                                      area_types=','.join(area_types))

    def work():
        try:
            build_with_run(area_types, run)
        finally:
            close_old_connections()

    threading.Thread(target=work, daemon=True, name=f'area-scores-{run.pk}').start()
    return run
