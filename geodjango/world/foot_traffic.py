"""
Foot traffic: how many phones pass through a place, by hour of the day.

Two halves, joined by one small GeoParquet file:

* `build()` reads raw Veraset pings (caid, utc_timestamp, latitude,
  longitude), which are personal data, and reduces them to counts per 150 m
  grid cell, local hour and kind of day (weekday or weekend). A device counts
  once per cell, hour and day. Any cell-hour seen by fewer than
  MIN_CELL_DEVICES distinct devices is dropped there and then, so the file
  holds no trace of a lone phone and can sit in S3 as the master copy.

* `hourly_index()` answers the zone report: it sums the cells whose centre
  lies inside the radius, withholds any hour seen by fewer than
  MIN_HOUR_DEVICES devices, and scales the rest so the busiest hour of the
  week is 100. The panel is a sample of phones, so only the shape is shown.

Raw pings never reach the app's database or the page.
"""

import json
import math
import os
from datetime import datetime, timezone

import pyarrow.parquet as pq
import shapely

from world.geoparquet import write_geoparquet

CELL_METERS = 150
MIN_CELL_DEVICES = 5
MIN_HOUR_DEVICES = 10
LOCAL_TZ = 'America/Mexico_City'
METADATA_KEY = b'foot_traffic'

# Metres per degree near the city's latitude. One flat grid serves the whole
# metropolitan area; cells drift from 150 m by well under a metre across it.
_REFERENCE_LAT = 19.4
M_PER_DEG_LAT = 111_320.0
M_PER_DEG_LNG = 111_320.0 * math.cos(math.radians(_REFERENCE_LAT))


# Phones with no GPS fix are placed at a default point: the Zócalo and a few
# others, give or take a few metres of jitter, while still claiming ~11 m of
# accuracy. Real places spread over many coordinates; a fallback piles
# thousands of devices onto one. An ~11 m square holding more than this many
# distinct devices in a single day is taken for a fallback and left out. On
# Veraset's 2024-11-05 delivery for central CDMX that is 74 squares out of
# about a million (the median square holds 5), and it takes the Zócalo from
# 25,800 devices at noon to 1,500 while Roma and Polanco do not move.
FALLBACK_SQUARE_DEGREES = 1e-4
FALLBACK_SQUARE_DEVICES = 2000


def _timestamp_sql(column_type):
    """SQL turning Veraset's utc_timestamp, whatever its stored type, into a UTC timestamp."""
    t = column_type.upper()
    if t in ('BIGINT', 'INTEGER', 'HUGEINT', 'UBIGINT'):
        # Epoch seconds, or milliseconds when the number is that large.
        return 'CASE WHEN utc_timestamp > 100000000000 THEN to_timestamp(utc_timestamp / 1000) ELSE to_timestamp(utc_timestamp) END'
    if t.startswith('TIMESTAMP WITH TIME ZONE'):
        return 'utc_timestamp'
    return "timezone('UTC', CAST(utc_timestamp AS TIMESTAMP))"


def _source_sql(files):
    """A DuckDB table function over the inputs: CSV (all text) or Parquet."""
    if all(str(f).lower().endswith(('.csv', '.csv.gz')) for f in files):
        return f"read_csv({files!r}, header = true, all_varchar = true, union_by_name = true)"
    return f"read_parquet({files!r}, union_by_name = true)"


def build(inputs, output, work_dir=None):
    """
    Aggregate the CSV or Parquet files matching `inputs` (paths or globs)
    into `output`. Returns the summary written into the file's metadata.

    A full Veraset delivery is far larger than memory, so DuckDB works in an
    on-disk database and spills to disk; `work_dir` says where (default: next
    to `output`). Its contents are deleted at the end.
    """
    import shutil
    import tempfile

    import duckdb

    files = [str(p) for p in inputs]
    work = tempfile.mkdtemp(prefix='.foot-traffic-', dir=work_dir or os.path.dirname(os.path.abspath(output)))
    try:
        con = duckdb.connect(os.path.join(work, 'build.duckdb'))
        con.execute(f"SET temp_directory = '{os.path.join(work, 'spill')}'")
        con.execute('SET preserve_insertion_order = false')

        source = _source_sql(files)
        types = {row[0]: row[1] for row in con.execute(f'DESCRIBE SELECT * FROM {source}').fetchall()}
        missing = {'caid', 'utc_timestamp', 'latitude', 'longitude'} - set(types)
        if missing:
            raise ValueError(f'input lacks columns: {", ".join(sorted(missing))}')

        # One pass over the raw files into a compact table: a 64-bit hash of
        # the device instead of its ID, local day and hour, the grid cell and
        # the ~11 m square used to spot fallbacks.
        con.execute(f"""
            CREATE TABLE pings AS
            SELECT hash(caid) AS device,
                   CAST(local AS DATE) AS day,
                   hour(local) AS hour,
                   isodow(local) >= 6 AS weekend,
                   CAST(floor(lng * {M_PER_DEG_LNG} / {CELL_METERS}) AS INTEGER) AS cell_x,
                   CAST(floor(lat * {M_PER_DEG_LAT} / {CELL_METERS}) AS INTEGER) AS cell_y,
                   CAST(round(lat / {FALLBACK_SQUARE_DEGREES}) AS INTEGER) AS sq_y,
                   CAST(round(lng / {FALLBACK_SQUARE_DEGREES}) AS INTEGER) AS sq_x
            FROM (
                SELECT caid, CAST(latitude AS DOUBLE) AS lat, CAST(longitude AS DOUBLE) AS lng,
                       timezone('{LOCAL_TZ}', {_timestamp_sql(types['utc_timestamp'])}) AS local
                FROM {source}
                WHERE caid IS NOT NULL AND latitude IS NOT NULL AND longitude IS NOT NULL
                  AND utc_timestamp IS NOT NULL
            )
            WHERE local IS NOT NULL
        """)

        days = {weekend: (n, first, last) for weekend, n, first, last in con.execute(
            'SELECT weekend, count(DISTINCT day), min(day), max(day) FROM pings GROUP BY weekend'
        ).fetchall()}
        if not days:
            raise ValueError('no pings in the input')
        # Deliveries start and end on UTC midnights, so the first and last
        # local days are partial: each hour is averaged over the days that
        # actually cover it, not over every day of its kind.
        hour_days = {False: [0] * 24, True: [0] * 24}
        for weekend, hour, n in con.execute(
            'SELECT weekend, hour, count(DISTINCT day) FROM pings GROUP BY ALL'
        ).fetchall():
            hour_days[weekend][hour] = n

        con.execute(f"""
            CREATE TABLE fallbacks AS
            SELECT day, sq_x, sq_y FROM pings GROUP BY ALL
            HAVING count(DISTINCT device) > {FALLBACK_SQUARE_DEVICES}
        """)
        fallback_squares = con.execute('SELECT count(*) FROM fallbacks').fetchone()[0]

        rows = con.execute(f"""
            SELECT cell_x, cell_y, weekend, hour,
                   count(DISTINCT (device, day)) AS device_days,
                   count(DISTINCT device) AS devices
            FROM pings
            ANTI JOIN fallbacks USING (day, sq_x, sq_y)
            GROUP BY ALL
            HAVING count(DISTINCT device) >= {MIN_CELL_DEVICES}
        """).fetchall()
        con.close()
    finally:
        shutil.rmtree(work, ignore_errors=True)

    if not rows:
        raise ValueError(f'no cell-hour reaches {MIN_CELL_DEVICES} devices')

    centres = [
        shapely.Point((x + 0.5) * CELL_METERS / M_PER_DEG_LNG, (y + 0.5) * CELL_METERS / M_PER_DEG_LAT)
        for x, y, *_ in rows
    ]
    summary = {
        'cell_meters': CELL_METERS,
        'min_cell_devices': MIN_CELL_DEVICES,
        'fallback_rule': f'~11 m squares with more than {FALLBACK_SQUARE_DEVICES} devices in a day',
        'fallback_square_days': fallback_squares,
        'days': {'weekday': days.get(False, (0,))[0], 'weekend': days.get(True, (0,))[0]},
        'hour_days': {'weekday': hour_days[False], 'weekend': hour_days[True]},
        'from_date': min(d[1] for d in days.values()).isoformat(),
        'to_date': max(d[2] for d in days.values()).isoformat(),
        'built_at': datetime.now(timezone.utc).isoformat(timespec='seconds'),
    }
    os.makedirs(os.path.dirname(os.path.abspath(output)), exist_ok=True)
    write_geoparquet(
        output, centres,
        {
            'cell_x': [r[0] for r in rows], 'cell_y': [r[1] for r in rows],
            'weekend': [r[2] for r in rows], 'hour': [r[3] for r in rows],
            'device_days': [r[4] for r in rows], 'devices': [r[5] for r in rows],
        },
        metadata={METADATA_KEY: json.dumps(summary).encode()},
    )
    return dict(summary, cell_hours=len(rows))


def _summary(path):
    metadata = pq.read_schema(path).metadata or {}
    return json.loads(metadata[METADATA_KEY]) if METADATA_KEY in metadata else None


def hourly_index(lng, lat, radius, path):
    """
    Relative foot traffic within `radius` metres of (lng, lat), by hour,
    weekdays and weekends apart, read from the file `build()` wrote.

    `from_date` is None when there is no file, so the page shows nothing;
    with a file but no hour above the threshold, `enough` is False and the
    page says there is too little data here.
    """
    empty = {'enough': False, 'weekday': [], 'weekend': [], 'from_date': None, 'to_date': None}
    if not path or not os.path.exists(path):
        return empty
    summary = _summary(path)
    if not summary:
        return empty
    import duckdb

    dlat = radius / M_PER_DEG_LAT
    dlng = radius / M_PER_DEG_LNG
    # The bbox struct is what lets DuckDB skip row groups far from the point;
    # the second test keeps only the cells whose centre is inside the circle.
    rows = duckdb.connect().execute("""
        SELECT weekend, hour, sum(device_days), sum(devices)
        FROM read_parquet(?)
        WHERE bbox.xmin BETWEEN ? AND ? AND bbox.ymin BETWEEN ? AND ?
          AND pow((bbox.xmin - ?) * ?, 2) + pow((bbox.ymin - ?) * ?, 2) <= pow(?, 2)
        GROUP BY 1, 2
    """, [path, lng - dlng, lng + dlng, lat - dlat, lat + dlat,
          lng, M_PER_DEG_LNG, lat, M_PER_DEG_LAT, radius]).fetchall()

    if 'hour_days' in summary:
        days = {False: summary['hour_days']['weekday'], True: summary['hour_days']['weekend']}
    else:  # files built before per-hour day counts
        days = {k: [summary['days'][name]] * 24 for k, name in ((False, 'weekday'), (True, 'weekend'))}
    series = {False: [None] * 24, True: [None] * 24}
    for weekend, hour, device_days, devices in rows:
        if devices >= MIN_HOUR_DEVICES and days[weekend][hour]:
            series[weekend][hour] = device_days / days[weekend][hour]
    peak = max((v for s in series.values() for v in s if v is not None), default=0)
    period = {'from_date': summary['from_date'], 'to_date': summary['to_date']}
    if not peak:
        return dict(empty, **period)

    def scale(values):
        return [None if v is None else round(v / peak * 100) for v in values]

    return {'enough': True, 'weekday': scale(series[False]), 'weekend': scale(series[True]), **period}
