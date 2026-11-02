"""
Terreno y clima: natural hazards around a point, from the Atlas de Riesgos
de la Ciudad de México (SGIRPC).

Two halves, joined by a folder of small GeoParquet files:

* `build()` downloads the Atlas layers the zone report reads from the
  Atlas's public ArcGIS services, moves them to lon/lat and writes one file
  per layer (world.geoparquet, so each has a bbox column to filter on).

* `zone_report()` answers the report: the hazard levels of the census zone
  (AGEB) the point falls in, the geotechnical zone, regional subsidence and
  crack zones under the point, and how many mines, sinkholes, fractures,
  faults and waterlogging reports lie within the radius.

The services answer at most a few thousand features per request, so each
layer is read in pages of object ids. (The Atlas's download page stops at
5,000, which left out the fracture lines of the east of the city.)
"""

import json
import os
from datetime import datetime, timezone

import pyarrow.parquet as pq
import shapely

from world.foot_traffic import M_PER_DEG_LAT, M_PER_DEG_LNG
from world.geoparquet import write_geoparquet

ATLAS_REST = 'https://serviciosatlas.sgirpc.cdmx.gob.mx/arcgis/rest/services'
PAGE = 1000   # object ids per request
METADATA_KEY = b'hazards'

GEOLOGICAL = ('AtlasCapasPublicas/Geologicos', 'FeatureServer')
WEATHER = ('AtlasCapasPublicas/Hidrometeorologicos2', 'MapServer')
AGEB = ('AtlasOnline/Servicio_Indicadores_AGEB', 'MapServer')

# The AGEB indicator columns the report shows, each a level from "Muy Bajo"
# to "Muy Alto".
AGEB_LEVELS = ('sismo', 'inundacion', 'precipitac', 'granizo', 'tom_elec', 'tem_max', 'sus_ladera')

# Layer name -> (service, type, {Atlas layer id: year or None}, attributes kept).
LAYERS = {
    'ageb_hazards': (*AGEB, {0: None}, ('cvegeo',) + AGEB_LEVELS),
    'geotechnical_zones': (*GEOLOGICAL, {27: None}, ('intensidad', 'nombre')),
    'subsidence': (*GEOLOGICAL, {6: None}, ('magni_num',)),
    'crack_zones': (*GEOLOGICAL, {3: None}, ('nombre',)),
    'fractures': (*GEOLOGICAL, {2: None}, ()),
    'faults': (*GEOLOGICAL, {29: None}, ('nombre',)),
    'mines': (*GEOLOGICAL, {5: None}, ()),
    'sinkholes': (*GEOLOGICAL, {7: 2017, 8: 2018, 9: 2019, 10: 2020, 30: 2021, 31: 2022, 32: 2023,
                                33: 2024, 34: 2025}, ()),
    # 54 and 55 (2024, 2025) are served but not yet listed in the Atlas's
    # download page.
    'waterlogging': (*WEATHER, {4: 2016, 5: 2017, 6: 2018, 7: 2019, 8: 2020, 50: 2021, 51: 2022, 52: 2023,
                                54: 2024, 55: 2025}, ()),
}


def _to_lonlat(geometry, srid):
    """A GeoJSON geometry in `srid` as a shapely geometry in lon/lat."""
    from django.contrib.gis.geos import GEOSGeometry

    # GEOS reads any GeoJSON as EPSG:4326; the Atlas states its own CRS.
    geos = GEOSGeometry(json.dumps(geometry))
    geos.srid = srid
    if srid != 4326:
        geos.transform(4326)
    return shapely.from_wkb(bytes(geos.wkb))


def _srid(collection):
    name = ((collection.get('crs') or {}).get('properties') or {}).get('name', 'EPSG:4326')
    return int(name.rsplit(':', 1)[-1]) if name.rsplit(':', 1)[-1].isdigit() else 4326


def _download(service, kind, layer_id):
    """Every feature of one Atlas layer, in lon/lat, as a GeoJSON FeatureCollection."""
    import requests

    url = f'{ATLAS_REST}/{service}/{kind}/{layer_id}/query'

    def query(**params):
        response = requests.post(url, data={'where': '1=1', **params}, timeout=600)
        response.raise_for_status()
        answer = response.json()
        if 'error' in answer:   # ArcGIS reports errors with a 200
            raise RuntimeError(f"{service}/{layer_id}: {answer['error']}")
        return answer

    ids = sorted(query(returnIdsOnly='true', f='json').get('objectIds') or [])
    features = []
    for start in range(0, len(ids), PAGE):
        page = ids[start:start + PAGE]
        features += query(objectIds=','.join(map(str, page)), outFields='*', outSR=4326, f='geojson')['features']
    if len(features) != len(ids):
        raise RuntimeError(f'{service}/{layer_id}: expected {len(ids)} features, got {len(features)}')
    return {'type': 'FeatureCollection', 'features': features}


def build(output_dir, fetch=_download):
    """
    Download every layer in LAYERS and write `<output_dir>/<layer>.parquet`.
    `fetch(service, type, layer_id)` returns a GeoJSON FeatureCollection; tests
    pass their own. Returns ({layer: features written}, {layer: features
    skipped because their geometry could not be read}).
    """
    os.makedirs(output_dir, exist_ok=True)
    built_at = datetime.now(timezone.utc).isoformat(timespec='seconds')
    counts, skipped = {}, {}
    for name, (service, kind, ids, keep) in LAYERS.items():
        geometries, columns = [], {key: [] for key in keep}
        years = []
        for layer_id, year in ids.items():
            collection = fetch(service, kind, layer_id)
            srid = _srid(collection)
            for feature in collection.get('features', []):
                if not feature.get('geometry'):
                    continue
                try:
                    geometries.append(_to_lonlat(feature['geometry'], srid))
                except Exception:   # the odd malformed record; counted, not fatal
                    skipped[name] = skipped.get(name, 0) + 1
                    continue
                properties = {k.lower(): v for k, v in (feature.get('properties') or {}).items()}
                for key in keep:
                    value = properties.get(key)
                    columns[key].append(value.strip() if isinstance(value, str) else value)
                years.append(year)
        if not geometries:
            # An empty answer is more likely a hiccup of the Atlas than an
            # empty layer: keep whatever file was there. The report treats a
            # missing file as nothing found.
            counts[name] = 0
            continue
        if any(year is not None for year in years):
            columns['year'] = years
        if not columns:
            columns['n'] = [1] * len(geometries)   # GeoParquet needs one attribute here
        metadata = {
            'source': 'Atlas de Riesgos de la Ciudad de México, SGIRPC',
            'download': ATLAS_REST,
            'service': service,
            'layers': list(ids),
            'built_at': built_at,
        }
        path = os.path.join(output_dir, f'{name}.parquet')
        partial = path + '.partial'
        write_geoparquet(partial, geometries, columns, metadata={METADATA_KEY: json.dumps(metadata).encode()})
        os.replace(partial, path)
        counts[name] = len(geometries)
    return counts, skipped


def _local(geometry, lng, lat):
    """`geometry` in metres east and north of (lng, lat), for distances."""
    return shapely.transform(geometry, lambda xy: (xy - (lng, lat)) * (M_PER_DEG_LNG, M_PER_DEG_LAT))


def _lonlat(local, lng, lat):
    """The inverse of _local."""
    return shapely.transform(local, lambda xy: xy / (M_PER_DEG_LNG, M_PER_DEG_LAT) + (lng, lat))


def _rows(con, folder, layer, lng, lat, dlng=0, dlat=0):
    """Features of `layer` whose bbox meets the box of (lng, lat) ± (dlng, dlat)."""
    path = os.path.join(folder, f'{layer}.parquet')
    if not os.path.exists(path):
        return []
    names = [n for n in pq.read_schema(path).names if n != 'bbox']
    result = con.execute(
        f"SELECT {', '.join(names)} FROM read_parquet(?) "
        "WHERE bbox.xmin <= ? AND bbox.xmax >= ? AND bbox.ymin <= ? AND bbox.ymax >= ?",
        [path, lng + dlng, lng - dlng, lat + dlat, lat - dlat],
    ).fetchall()
    return [dict(zip(names, row), geometry=shapely.from_wkb(row[names.index('geometry')])) for row in result]


def _in_radius(con, folder, layer, lng, lat, radius):
    """(row, geometry in local metres) for the features of `layer` that reach the radius."""
    circle = shapely.Point(0, 0).buffer(radius, 32)
    found = []
    for row in _rows(con, folder, layer, lng, lat, radius / M_PER_DEG_LNG, radius / M_PER_DEG_LAT):
        local = _local(row['geometry'], lng, lat)
        if local.intersects(circle):
            found.append((row, local))
    return found


def _available(folder):
    return bool(folder) and os.path.exists(os.path.join(folder, 'ageb_hazards.parquet'))


def zone_report(lng, lat, radius, folder):
    """
    The hazards of the place within `radius` metres of (lng, lat), read from
    the files `build()` wrote to `folder`. None when they are not there or
    the point is outside Mexico City, so the page leaves the block out.
    """
    if not _available(folder):
        return None
    import duckdb

    con = duckdb.connect()
    point = shapely.Point(lng, lat)

    def under_point(layer):
        return [r for r in _rows(con, folder, layer, lng, lat) if r['geometry'].covers(point)]

    def within_radius(layer):
        """Count, nearest distance in metres and years of the features in the radius."""
        found = [round(local.distance(shapely.Point(0, 0))) for _, local in _in_radius(con, folder, layer, lng, lat, radius)]
        # The years the layer covers, not those of what was found: "none
        # in 2016-2025" is the claim the report makes.
        years = [y for y in LAYERS[layer][2].values() if y]
        return {
            'count': len(found),
            'nearest_m': min(found, default=None),
            'from_year': min(years, default=None),
            'to_year': max(years, default=None),
        }

    ageb = under_point('ageb_hazards')
    zone = under_point('geotechnical_zones')
    subsidence = under_point('subsidence')
    cracks = under_point('crack_zones')
    if not ageb and not zone:   # outside the Atlas, which only covers CDMX
        return None
    return {
        'levels': {key: ageb[0][key] for key in AGEB_LEVELS} if ageb else None,
        'geotechnical_zone': {
            'zone': zone[0]['intensidad'].replace('Zona ', ''), 'name': zone[0]['nombre'],
        } if zone else None,
        'subsidence_cm_year': subsidence[0]['magni_num'].lstrip('0') if subsidence else None,
        'crack_zone': cracks[0]['nombre'] if cracks else None,
        'fractures': within_radius('fractures'),
        'faults': within_radius('faults'),
        'mines': within_radius('mines'),
        'sinkholes': within_radius('sinkholes'),
        'waterlogging': within_radius('waterlogging'),
    }


# What the map draws, in this order (lines under points).
MAP_LAYERS = ('faults', 'fractures', 'waterlogging', 'sinkholes', 'mines')


def map_features(lng, lat, radius, folder):
    """
    The hazards within `radius` metres of (lng, lat) as a GeoJSON
    FeatureCollection for the map: points as they are, lines cut at the
    radius. Each feature says its `kind` (a MAP_LAYERS name), its `year`
    when the layer has one and, for faults, its `name`.
    """
    collection = {'type': 'FeatureCollection', 'features': []}
    if not _available(folder):
        return collection
    import duckdb

    con = duckdb.connect()
    circle = shapely.Point(0, 0).buffer(radius, 32)
    for layer in MAP_LAYERS:
        for row, local in _in_radius(con, folder, layer, lng, lat, radius):
            geometry = local if local.geom_type == 'Point' else local.intersection(circle)
            properties = {'kind': layer}
            if row.get('year'):
                properties['year'] = row['year']
            if row.get('nombre'):
                properties['name'] = row['nombre']
            collection['features'].append({
                'type': 'Feature',
                'geometry': json.loads(shapely.to_geojson(shapely.set_precision(_lonlat(geometry, lng, lat), 1e-6))),
                'properties': properties,
            })
    return collection
