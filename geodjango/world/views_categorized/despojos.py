"""
Endpoints for the proyectos/mapas/despojos-viviendas project.

Despojo is a single `delito` value in the FGJ open-data set ("DESPOJO"), so the
map is a filter over the Felony table rather than a model of its own. These
views serve a deliberately compact payload: the full risks GeoJSON carries eight
properties per feature for ~34k features, most of them constant for despojo.
"""

import json
import unicodedata

from django.core.cache import cache
from django.db.models import Count, F
from django.db.models.expressions import RawSQL
from django.db.models.functions import ExtractMonth
from django.http import HttpResponse, JsonResponse
from django.utils import timezone
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_GET, require_POST

from world.models.felony import Felony
from world.models.despojo_report import DespojoCaseReport
from world.models.despojo_news import DespojoNewsItem, DespojoNewsSetting

# The FGJ registry starts in January 2016. Rows with an earlier `anio_hecho`
# are old events reported late — a handful of cases per year, not a trend.
REGISTRY_START_YEAR = 2016

# How many years the front-end player scrubs through.
DECADE_LENGTH = 10

BOROUGHS = {
    'ÁLVARO OBREGÓN', 'AZCAPOTZALCO', 'BENITO JUÁREZ', 'COYOACÁN',
    'CUAJIMALPA DE MORELOS', 'CUAUHTÉMOC', 'GUSTAVO A. MADERO', 'IZTACALCO',
    'IZTAPALAPA', 'LA MAGDALENA CONTRERAS', 'MIGUEL HIDALGO', 'MILPA ALTA',
    'TLÁHUAC', 'TLALPAN', 'VENUSTIANO CARRANZA', 'XOCHIMILCO',
}


# The alcaldía choropleth joins carpetas to polygons on INEGI's code for
# entidad 09, never on the name: the FGJ export writes them unaccented and
# upper-cased ("ALVARO OBREGON"), the polygons carry the catalogue spelling.
# Codes run 002-017 — see the despojos_build_boroughs command, which dissolves
# the AGEB layer into the file the map loads.
BOROUGH_NAMES = {
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

# INEGI, Censo de Población y Vivienda 2020. Needed for the "por 100 mil
# habitantes" reading: in absolute counts the map mostly draws population.
BOROUGH_POPULATION = {
    '002': 432205,
    '003': 614447,
    '004': 217686,
    '005': 1173351,
    '006': 404695,
    '007': 1835486,
    '008': 247622,
    '009': 152685,
    '010': 759137,
    '011': 392313,
    '012': 699928,
    '013': 442178,
    '014': 434153,
    '015': 545884,
    '016': 414470,
    '017': 443704,
}


def _normalize_borough(value):
    """
    Fold a borough name to a comparable key.

    Handles the two spellings in play — 'ÁLVARO OBREGÓN' (catalogue) and
    'ALVARO OBREGON' (FGJ export) — plus the abbreviation dot in
    'Gustavo A. Madero', without needing a table of aliases.
    """
    if not value:
        return ''
    stripped = unicodedata.normalize('NFKD', str(value))
    stripped = ''.join(c for c in stripped if not unicodedata.combining(c))
    stripped = stripped.replace('.', ' ').upper()
    return ' '.join(stripped.split())


BOROUGH_CODE_BY_NAME = {
    _normalize_borough(name): code for code, name in BOROUGH_NAMES.items()
}


POINTS_CACHE_KEY = 'despojos:points:v1'
POINTS_CACHE_TTL = 60 * 60 * 12  # 12 hours


def _despojo_queryset():
    """Every despojo carpeta that has a usable location."""
    return (
        Felony.objects
        .filter(crime_type__in=Felony.DESPOJO_TYPES)
        .exclude(location__isnull=True)
    )


def _decade(years):
    """The DECADE_LENGTH most recent years present in the data, ascending."""
    if not years:
        return []
    return sorted(years)[-DECADE_LENGTH:]


def _months_by_year(qs, decade):
    """
    How many distinct months each year of the decade actually has data for.

    A year with fewer than twelve is a partial cut, which every reading has to
    treat differently: it must not set the top of a colour scale, and it must
    not be labelled as a drop.
    """
    months = {}
    if not decade:
        return months
    rows = (
        qs.filter(crime_year__gte=decade[0])
          .annotate(m=ExtractMonth('crime_date'))
          .values('crime_year', 'm')
          .distinct()
    )
    for row in rows:
        if row['crime_year'] and row['m']:
            months.setdefault(int(row['crime_year']), set()).add(row['m'])
    return months


@require_GET
def get_despojo_points(request):
    """
    Compact GeoJSON of despojo locations.

    Optional `?year=YYYY` narrows to a single year; otherwise the whole decade
    is returned. `type` and `category` are omitted deliberately — they are
    constant across every despojo row, so repeating them 34,000 times is pure
    payload.
    """
    year_param = request.GET.get('year')
    if year_param:
        try:
            year_param = int(year_param)
        except (TypeError, ValueError):
            return JsonResponse({'error': 'year must be a four-digit number'}, status=400)

    cache_key = f'{POINTS_CACHE_KEY}:{year_param or "decade"}'
    cached = cache.get(cache_key)
    if cached is not None and not request.GET.get('refresh'):
        return HttpResponse(cached, content_type='application/json')

    qs = _despojo_queryset()
    if year_param:
        qs = qs.filter(crime_year=year_param)
    else:
        all_years = _decade([
            int(y) for y in qs.values_list('crime_year', flat=True).distinct() if y
        ])
        if all_years:
            qs = qs.filter(crime_year__gte=all_years[0])

    # ST_X/ST_Y in SQL rather than `.values('location')`: the latter builds a
    # GEOSGeometry per row, and 33k of those dominate the request (~20s).
    # `location` is a geography column, hence the cast.
    qs = qs.annotate(
        lon=RawSQL('ST_X(location::geometry)', []),
        lat=RawSQL('ST_Y(location::geometry)', []),
    )

    features = []
    rows = qs.values('id', 'crime_year', 'crime_date', 'crime_time', 'lon', 'lat')
    for row in rows.iterator(chunk_size=5000):
        lon, lat = row['lon'], row['lat']
        # The FGJ export carries (0, 0) for cases it could not geocode. Plotting
        # them would drop ~280 markers into the Gulf of Guinea.
        if lon is None or lat is None or (lon == 0 and lat == 0):
            continue
        features.append({
            'type': 'Feature',
            'properties': {
                'id': row['id'],
                'year': int(row['crime_year']) if row['crime_year'] else None,
                'date': row['crime_date'].isoformat() if row['crime_date'] else None,
                'time': row['crime_time'].strftime('%H:%M') if row['crime_time'] else None,
            },
            'geometry': {
                'type': 'Point',
                'coordinates': [round(lon, 5), round(lat, 5)],
            },
        })

    # The serialised body is cached, not the dict: re-running json.dumps over
    # 33k nested features on every hit costs seconds even when the data is warm.
    body = json.dumps({
        'type': 'FeatureCollection',
        'name': 'despojo-viviendas',
        'features': features,
    })
    cache.set(cache_key, body, POINTS_CACHE_TTL)
    return HttpResponse(body, content_type='application/json')


# Both endpoints scan every despojo row, so they are cached: the underlying data
# only changes when risks_felonies_load is re-run, a manual, occasional job.
SUMMARY_CACHE_KEY = 'despojos:summary:v1'
SUMMARY_CACHE_TTL = 60 * 60 * 12  # 12 hours


@require_GET
def get_despojo_summary(request):
    """
    Counts per year plus the metadata the front-end needs to stay honest:
    which years are incomplete, and where the registry actually begins.
    """
    cached = cache.get(SUMMARY_CACHE_KEY)
    if cached is not None and not request.GET.get('refresh'):
        return JsonResponse(cached)

    qs = _despojo_queryset()

    by_year = {}
    for row in qs.values('crime_year').annotate(n=Count('id')):
        if row['crime_year']:
            by_year[int(row['crime_year'])] = row['n']

    decade = _decade(list(by_year.keys()))

    # Months observed per year, so a partial year is detected from the data
    # instead of being hardcoded to whichever year is current. Scoped to the
    # decade — the long pre-2016 tail of late-reported cases is never shown.
    months_by_year = _months_by_year(qs, decade)

    partial = {}
    for year in decade:
        observed = sorted(months_by_year.get(year, ()))
        n_months = len(observed)
        if 0 < n_months < 12:
            partial[year] = {
                'months': n_months,
                # Which months, not just how many: "solo tiene enero" is a
                # sharper thing to say than "1 de 12", and the panel should not
                # have to guess that a single month means January.
                'monthList': observed,
                # Naive annualisation, labelled as such in the UI.
                'projected': round(by_year[year] / n_months * 12),
            }

    payload = {
        'total': sum(by_year.values()),
        'byYear': by_year,
        'decade': decade,
        'partial': partial,
        'registryStart': REGISTRY_START_YEAR,
    }
    cache.set(SUMMARY_CACHE_KEY, payload, SUMMARY_CACHE_TTL)
    return JsonResponse(payload)


BOROUGHS_CACHE_KEY = 'despojos:boroughs:v1'
BOROUGHS_CACHE_TTL = 60 * 60 * 12  # 12 hours

# Five classes, so the ramp stays readable; quintiles rather than equal steps
# because the distribution is long-tailed and equal steps would drop fourteen
# alcaldías into the same colour.
CHOROPLETH_CLASSES = 5


def _quantile_breaks(values, classes=CHOROPLETH_CLASSES):
    """
    The inner class boundaries for `values`, as `classes - 1` numbers.

    Computed once over the whole decade and then reused for every year: breaks
    recalculated per year would give each year its own darkest alcaldía and the
    animation would show no change at all.
    """
    ordered = sorted(values)
    if not ordered:
        return []
    breaks = []
    for i in range(1, classes):
        position = (i / classes) * (len(ordered) - 1)
        low = int(position)
        high = min(low + 1, len(ordered) - 1)
        weight = position - low
        breaks.append(ordered[low] + (ordered[high] - ordered[low]) * weight)
    return breaks


@require_GET
def get_despojo_boroughs(request):
    """
    Carpetas per alcaldía per year, for the choropleth view of the same map.

    Sixteen boroughs across a decade is 160 numbers, so the whole matrix is sent
    at once and the player switches years client-side without a round trip.
    """
    cached = cache.get(BOROUGHS_CACHE_KEY)
    if cached is not None and not request.GET.get('refresh'):
        return JsonResponse(cached)

    qs = _despojo_queryset()

    years = [int(y) for y in qs.values_list('crime_year', flat=True).distinct() if y]
    decade = _decade(years)
    if not decade:
        return JsonResponse({'decade': [], 'boroughs': [], 'byYear': {}})

    by_year = {year: {} for year in decade}
    # Rows the FGJ could not attribute: 'nan', 'CDMX (indeterminada)', empty.
    # Reported rather than silently dropped — the choropleth is only honest if
    # the reader can see how much of the year never made it onto a polygon.
    unassigned = {year: 0 for year in decade}

    rows = (
        qs.filter(crime_year__gte=decade[0])
          .values('crime_year', 'borough')
          .annotate(n=Count('id'))
    )
    for row in rows:
        year = int(row['crime_year']) if row['crime_year'] else None
        if year not in by_year:
            continue
        code = BOROUGH_CODE_BY_NAME.get(_normalize_borough(row['borough']))
        if code is None:
            unassigned[year] += row['n']
        else:
            by_year[year][code] = by_year[year].get(code, 0) + row['n']

    months_by_year = _months_by_year(qs, decade)
    full_years = [y for y in decade if len(months_by_year.get(y, ())) >= 12]

    # A partial year would drag every break downwards, so the scale is built
    # from complete years only and the current cut is coloured against it.
    absolute_values, rate_values = [], []
    for year in full_years:
        for code in BOROUGH_NAMES:
            count = by_year[year].get(code, 0)
            absolute_values.append(count)
            rate_values.append(count / BOROUGH_POPULATION[code] * 100000)

    payload = {
        'decade': decade,
        'boroughs': [
            {
                'code': code,
                'name': BOROUGH_NAMES[code],
                'population': BOROUGH_POPULATION[code],
            }
            for code in sorted(BOROUGH_NAMES)
        ],
        'byYear': by_year,
        'unassigned': unassigned,
        'breaks': {
            'absolute': _quantile_breaks(absolute_values),
            'rate': [round(v, 2) for v in _quantile_breaks(rate_values)],
        },
        'classes': CHOROPLETH_CLASSES,
    }
    cache.set(BOROUGHS_CACHE_KEY, payload, BOROUGHS_CACHE_TTL)
    return JsonResponse(payload)


NEWS_CACHE_KEY = 'despojos:news:v1'
# Short, unlike the rest of this module: the underlying table changes whenever
# somebody approves an item in the admin, and waiting half a day to see that on
# the map would make the review screen feel broken.
NEWS_CACHE_TTL = 60 * 10

def invalidate_news_cache():
    """
    Drop every cached page of the news rail.

    Called from the panel: a ten-minute stale window is fine for a reader and
    confusing for the person who just pressed "publicar", or who just changed
    how many notes the rail shows. Cheap to be thorough — the key space is one
    entry per allowed `limit`.
    """
    cache.delete_many([
        f'{NEWS_CACHE_KEY}:{n}'
        for n in range(DespojoNewsSetting.RAIL_LIMIT_MIN,
                       DespojoNewsSetting.RAIL_LIMIT_MAX + 1)
    ])


@require_GET
def get_despojo_news(request):
    """
    Approved press coverage for the rail on the despojos map.

    Only items somebody has approved are served: `despojo_news_fetch` files
    everything it finds as pending, and the queue is a working document, not a
    publication. Shape matches the static fallback the front-end ships with, so
    the rail renders the same either way.

    How many notes come back is set in the panel. An explicit `limit` still
    wins, within the same bounds, so the endpoint stays usable on its own.
    """
    default_limit = DespojoNewsSetting.load().rail_limit
    try:
        limit = int(request.GET.get('limit', default_limit))
    except (TypeError, ValueError):
        limit = default_limit
    limit = max(DespojoNewsSetting.RAIL_LIMIT_MIN,
                min(limit, DespojoNewsSetting.RAIL_LIMIT_MAX))

    cache_key = f'{NEWS_CACHE_KEY}:{limit}'
    cached = cache.get(cache_key)
    if cached is not None and not request.GET.get('refresh'):
        return JsonResponse(cached)

    rows = (
        DespojoNewsItem.objects
        .filter(review_status=DespojoNewsItem.ReviewStatus.APPROVED)
        .order_by(F('published_at').desc(nulls_last=True), '-fetched_at')[:limit]
    )

    items = [
        {
            'source': row.source,
            'headline': row.headline,
            # Local date, not UTC: a note published at 20:00 in Mexico City is
            # dated the next day if the timestamp is read as it is stored.
            'date': timezone.localtime(row.published_at).date().isoformat()
                    if row.published_at else None,
            'url': row.url,
        }
        for row in rows
    ]

    payload = {
        'updated': items[0]['date'] if items else None,
        'items': items,
    }
    cache.set(cache_key, payload, NEWS_CACHE_TTL)
    return JsonResponse(payload)


@csrf_exempt
@require_POST
def submit_despojo_report(request):
    """
    Intake for the "Reporta tu caso" form.

    Stores the report for follow-up by email. Nothing submitted here is served
    back out publicly or drawn on the map.
    """
    try:
        data = json.loads(request.body)
    except (ValueError, TypeError):
        return JsonResponse({'error': 'Cuerpo de la petición inválido.'}, status=400)

    name = (data.get('name') or '').strip()
    email = (data.get('email') or '').strip()

    if not name:
        return JsonResponse({'error': 'Necesitamos un nombre para dirigirnos a ti.'}, status=400)
    if not email or '@' not in email:
        return JsonResponse({'error': 'Necesitamos un correo válido para contactarte.'}, status=400)
    if not data.get('consent'):
        return JsonResponse(
            {'error': 'Necesitamos tu autorización para poder contactarte.'}, status=400
        )

    year = data.get('year')
    try:
        year = int(year) if year not in (None, '') else None
    except (TypeError, ValueError):
        year = None
    if year is not None and not (1900 <= year <= 2100):
        year = None

    denuncia = (data.get('denunciaStatus') or '').strip()
    if denuncia not in DespojoCaseReport.DenunciaStatus.values:
        denuncia = ''

    borough = (data.get('borough') or '').strip()
    if borough not in BOROUGHS:
        borough = ''

    report = DespojoCaseReport.objects.create(
        name=name[:120],
        email=email[:254],
        borough=borough[:80],
        neighborhood=(data.get('neighborhood') or '').strip()[:120],
        year_of_events=year,
        denuncia_status=denuncia,
        account=(data.get('account') or '').strip()[:4000],
        consent_contact=True,
    )

    return JsonResponse({'ok': True, 'id': report.id}, status=201)
