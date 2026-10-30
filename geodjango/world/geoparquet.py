"""
GeoParquet 1.1 writer for the datasets this site publishes.

Built on pyarrow and shapely, which the project already depends on, rather
than GeoPandas. What every file gets:

* Geometry as WKB in lon/lat (OGC:CRS84). The `geo` metadata leaves `crs`
  out, which the spec defines as exactly that, so readers need no PROJ
  lookup. Sources in other CRSs are transformed before they reach here.
* A `bbox` struct column declared as the geometry's covering: readers such
  as DuckDB and GDAL skip row groups whose boxes miss the area they ask for,
  which is what makes reading a slice of a remote file cheap.
* Rows sorted along a Hilbert curve of their centres, so a row group holds
  nearby features and those boxes stay tight.
* zstd compression.
"""

import json

import pyarrow as pa
import pyarrow.parquet as pq
import shapely

GEOPARQUET_VERSION = '1.1.0'
ROW_GROUP_SIZE = 20_000
_HILBERT_ORDER = 16


def _hilbert_index(x, y, order=_HILBERT_ORDER):
    """Position of the cell (x, y) on a Hilbert curve of side 2**order."""
    d = 0
    s = 1 << (order - 1)
    while s > 0:
        rx = 1 if x & s else 0
        ry = 1 if y & s else 0
        d += s * s * ((3 * rx) ^ ry)
        if ry == 0:
            if rx == 1:
                x = s - 1 - x
                y = s - 1 - y
            x, y = y, x
        s >>= 1
    return d


def _hilbert_order(bounds, extent):
    """Row order that walks the features' centres along a Hilbert curve."""
    minx, miny, maxx, maxy = extent
    span_x = (maxx - minx) or 1.0
    span_y = (maxy - miny) or 1.0
    top = (1 << _HILBERT_ORDER) - 1
    keys = []
    for i, (bx0, by0, bx1, by1) in enumerate(bounds):
        cx = int(((bx0 + bx1) / 2 - minx) / span_x * top)
        cy = int(((by0 + by1) / 2 - miny) / span_y * top)
        keys.append((_hilbert_index(cx, cy), i))
    keys.sort()
    return [i for _, i in keys]


def _column(values):
    """An Arrow array for one attribute, falling back to text on mixed types."""
    try:
        return pa.array(values)
    except (pa.ArrowInvalid, pa.ArrowTypeError):
        return pa.array([None if v is None else str(v) for v in values], type=pa.string())


def write_geoparquet(path, geometries, columns, schema=None, metadata=None):
    """
    Write one GeoParquet file.

    `geometries` is a sequence of shapely geometries in lon/lat; `columns`
    maps column name to a list of values, one per geometry, in the same
    order. `schema` may fix the Arrow type of some columns (a dict of name to
    type); the rest are inferred. `metadata` adds file-level key/value pairs
    (bytes to bytes) next to `geo`. Rows without a geometry are dropped.
    Returns a summary for the catalog: row count, extent and geometry types.
    """
    keep = [i for i, g in enumerate(geometries) if g is not None and not g.is_empty]
    geometries = [geometries[i] for i in keep]
    columns = {name: [values[i] for i in keep] for name, values in columns.items()}

    if not geometries:
        raise ValueError(f'{path}: no geometries to write')

    bounds = shapely.bounds(geometries).tolist()
    extent = [
        min(b[0] for b in bounds), min(b[1] for b in bounds),
        max(b[2] for b in bounds), max(b[3] for b in bounds),
    ]
    order = _hilbert_order(bounds, extent)
    geometries = [geometries[i] for i in order]
    bounds = [bounds[i] for i in order]

    fields, arrays = [], []
    schema = schema or {}
    for name, values in columns.items():
        values = [values[i] for i in order]
        array = pa.array(values, type=schema[name]) if name in schema else _column(values)
        fields.append(pa.field(name, array.type))
        arrays.append(array)

    bbox_type = pa.struct([(k, pa.float64()) for k in ('xmin', 'ymin', 'xmax', 'ymax')])
    bbox = pa.array([dict(zip(('xmin', 'ymin', 'xmax', 'ymax'), b)) for b in bounds], type=bbox_type)
    wkb = pa.array(shapely.to_wkb(geometries, output_dimension=2).tolist(), type=pa.binary())
    fields += [pa.field('bbox', bbox_type), pa.field('geometry', pa.binary())]
    arrays += [bbox, wkb]

    geometry_types = sorted({g.geom_type for g in geometries})
    geo = {
        'version': GEOPARQUET_VERSION,
        'primary_column': 'geometry',
        'columns': {
            'geometry': {
                'encoding': 'WKB',
                'geometry_types': geometry_types,
                'bbox': extent,
                'covering': {
                    'bbox': {k: ['bbox', k] for k in ('xmin', 'ymin', 'xmax', 'ymax')},
                },
            },
        },
    }
    file_metadata = {**(metadata or {}), b'geo': json.dumps(geo).encode()}
    table = pa.Table.from_arrays(arrays, schema=pa.schema(fields, metadata=file_metadata))
    pq.write_table(table, path, compression='zstd', row_group_size=ROW_GROUP_SIZE)

    return {
        'rows': table.num_rows,
        'bbox': extent,
        'geometry_types': geometry_types,
        'columns': [{'name': f.name, 'type': str(f.type)} for f in fields if f.name not in ('bbox', 'geometry')],
    }
