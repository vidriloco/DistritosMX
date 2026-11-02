import json
from datetime import date, datetime, time, timedelta

from django.contrib.gis.geos import Point
from django.test import TestCase
from django.utils import timezone

from world.models import Felony
from world.views_categorized.api import business_robbery_by_time

# A point in the Centro of CDMX; the offsets below are about 110 m and 2 km.
CENTRO = Point(-99.1332, 19.4326, srid=4326)
NEAR = Point(-99.1332, 19.4336, srid=4326)
FAR = Point(-99.1332, 19.4506, srid=4326)


def felony(at, when, crime_type='ROBO A NEGOCIO CON VIOLENCIA', on=date(2023, 5, 10)):
    return Felony.objects.create(
        start_year=on.year, start_month='Mayo', start_date=on, start_time=when,
        crime_year=on.year, crime_month='Mayo', crime_date=on, crime_time=when,
        crime_date_time=timezone.make_aware(datetime.combine(on, when)),
        crime_type=crime_type, crime_category='DELITO DE BAJO IMPACTO',
        prosecutor_office='', agency='', investigation_unit='',
        neighborhood='CENTRO', neighborhood_catalog='CENTRO',
        borough='CUAUHTEMOC', borough_catalog='CUAUHTEMOC', municipality='CUAUHTEMOC',
        location=at,
    )


class BusinessRobberyByTimeTests(TestCase):
    def test_splits_robberies_in_the_radius_by_time_of_day(self):
        felony(NEAR, time(7, 30))    # morning
        felony(NEAR, time(11, 59))   # morning
        felony(NEAR, time(12, 0))    # afternoon
        felony(NEAR, time(19, 0))    # night
        felony(NEAR, time(3, 15))    # night, after midnight

        result = business_robbery_by_time(CENTRO, 350)

        self.assertEqual(
            (result['morning'], result['afternoon'], result['night'], result['total']),
            (2, 1, 2, 5),
        )
        self.assertEqual((result['from_year'], result['to_year']), (2023, 2023))

    def test_leaves_out_what_does_not_belong(self):
        felony(FAR, time(10, 0))                                       # outside the radius
        felony(NEAR, time(10, 0), crime_type='ROBO A CASA HABITACION CON VIOLENCIA')
        felony(NEAR, time(10, 0), on=date(2018, 3, 1))                 # before 2019
        felony(NEAR, time(0, 0))                                       # no recorded hour

        result = business_robbery_by_time(CENTRO, 350)

        self.assertEqual(result['total'], 0)
        self.assertIsNone(result['from_year'])


class GeoParquetExportTests(TestCase):
    def setUp(self):
        import tempfile
        self.output = tempfile.mkdtemp()

    def tearDown(self):
        import shutil
        shutil.rmtree(self.output, ignore_errors=True)

    def test_writer_declares_geoparquet_with_a_bbox_covering(self):
        import json
        import pyarrow.parquet as pq
        import shapely
        from world.geoparquet import write_geoparquet

        points = [shapely.Point(-99.13, 19.43), shapely.Point(-99.20, 19.40), None]
        summary = write_geoparquet(f'{self.output}/p.parquet', points, {'name': ['a', 'b', 'c']})

        table = pq.read_table(f'{self.output}/p.parquet')
        geo = json.loads(table.schema.metadata[b'geo'])
        self.assertEqual(geo['version'], '1.1.0')
        self.assertEqual(geo['columns']['geometry']['geometry_types'], ['Point'])
        self.assertEqual(geo['columns']['geometry']['covering']['bbox']['xmin'], ['bbox', 'xmin'])
        self.assertNotIn('crs', geo['columns']['geometry'])  # absent = OGC:CRS84
        self.assertEqual(summary['rows'], 2)  # the row without a geometry is dropped
        self.assertEqual(sorted(table.column('name').to_pylist()), ['a', 'b'])
        for row in table.to_pylist():
            point = shapely.from_wkb(row['geometry'])
            self.assertEqual((row['bbox']['xmin'], row['bbox']['ymin']), (point.x, point.y))

    def test_felonies_are_partitioned_by_year_and_keep_their_time(self):
        import json
        import pyarrow.parquet as pq
        from django.core.management import call_command

        felony(NEAR, time(21, 15), on=date(2022, 1, 5))
        felony(NEAR, time(8, 0), on=date(2023, 6, 1))
        felony(FAR, time(13, 30), on=date(2023, 7, 2))

        call_command('export_geoparquet', '--layers', 'felonies', '--output', self.output, stdout=open('/dev/null', 'w'))

        y2023 = pq.read_table(f'{self.output}/felonies/year=2023/part-0.parquet')
        self.assertEqual(y2023.num_rows, 2)
        self.assertEqual(sorted(t.isoformat() for t in y2023.column('crime_time').to_pylist()), ['08:00:00', '13:30:00'])
        # The partition folder carries the year; the file itself does not.
        # (read_table would add it back from the path, so read the file's schema.)
        file_columns = pq.ParquetFile(f'{self.output}/felonies/year=2023/part-0.parquet').schema_arrow.names
        self.assertNotIn('year', file_columns)

        catalog = json.load(open(f'{self.output}/catalog.json'))
        entry = catalog['layers']['felonies']
        self.assertEqual(entry['rows'], 3)
        self.assertEqual(entry['partitioned_by'], 'year')
        self.assertEqual(entry['files'], ['felonies/year=2022/part-0.parquet', 'felonies/year=2023/part-0.parquet'])


class FootTrafficTests(TestCase):
    """
    The build from Veraset-shaped Parquet and the report's lookup on its
    output. Mexico City is UTC-6 all year since 2022, so 13 h local is 19 h UTC.
    """

    def setUp(self):
        import tempfile
        self.folder = tempfile.mkdtemp()
        self.output = f'{self.folder}/foot_traffic.parquet'
        self.pings = []

    def tearDown(self):
        import shutil
        shutil.rmtree(self.folder, ignore_errors=True)

    def ping(self, device, local, at=NEAR):
        utc = datetime(*local) + timedelta(hours=6)
        self.pings.append((f'caid-{device}', utc.strftime('%Y-%m-%d %H:%M:%S'), at.y, at.x))

    def build(self, timestamps=None):
        import pyarrow as pa
        import pyarrow.parquet as pq
        from world.foot_traffic import build

        caid, ts, lat, lng = zip(*self.pings)
        pq.write_table(pa.table({
            'caid': list(caid), 'utc_timestamp': timestamps or list(ts),
            'latitude': list(lat), 'longitude': list(lng),
        }), f'{self.folder}/pings.parquet')
        return build([f'{self.folder}/pings.parquet'], self.output)

    def index(self, at=CENTRO):
        from django.test import override_settings
        from world.views_categorized.api import foot_traffic_by_hour
        with override_settings(FOOT_TRAFFIC_FILE=self.output):
            return foot_traffic_by_hour(at.x, at.y, 350)

    def test_relative_hours_with_small_hours_withheld(self):
        for d in range(60):                       # Wednesday 13 h: the peak
            self.ping(d, (2025, 3, 5, 13, 20))
        for d in range(12):                       # Wednesday 9 h: 12 devices
            self.ping(d, (2025, 3, 5, 9, 5))
        for d in range(5):                        # Wednesday 22 h: in the file, too few to show
            self.ping(d, (2025, 3, 5, 22, 0))
        for d in range(30):                       # Saturday 20 h
            self.ping(100 + d, (2025, 3, 8, 20, 0))
        for d in range(40):                       # 2 km away: outside the radius
            self.ping(200 + d, (2025, 3, 5, 13, 0), at=FAR)
        self.ping(0, (2025, 3, 5, 13, 50))        # same device, same hour, same day: once
        summary = self.build()

        result = self.index()

        self.assertEqual(summary['days'], {'weekday': 1, 'weekend': 1})
        self.assertTrue(result['enough'])
        self.assertEqual(result['weekday'][13], 100)
        self.assertEqual(result['weekday'][9], 20)
        self.assertIsNone(result['weekday'][22])
        self.assertEqual(result['weekend'][20], 50)
        self.assertEqual((result['from_date'], result['to_date']), ('2025-03-05', '2025-03-08'))

    def test_the_file_holds_no_cell_hour_of_fewer_than_five_devices(self):
        import pyarrow.parquet as pq

        for d in range(6):
            self.ping(d, (2025, 3, 5, 13, 0))
        for d in range(4):                        # four phones at 7 h: never written
            self.ping(d, (2025, 3, 5, 7, 0))
        self.build()

        table = pq.read_table(self.output)
        self.assertEqual(table.column('hour').to_pylist(), [13])
        self.assertNotIn('caid', table.column_names)

    def test_a_thin_area_says_so_and_no_file_shows_nothing(self):
        for d in range(8):                        # kept in the file, under the report's 10
            self.ping(d, (2025, 3, 5, 13, 0))
        self.build()

        self.assertEqual(self.index(), {'enough': False, 'weekday': [], 'weekend': [],
                                        'from_date': '2025-03-05', 'to_date': '2025-03-05'})
        self.output = f'{self.folder}/missing.parquet'
        self.assertIsNone(self.index()['from_date'])

    def test_a_partial_day_only_counts_for_the_hours_it_covers(self):
        # Two Wednesdays; the second delivery only starts in the afternoon.
        for day in (5, 12):
            for d in range(20):
                self.ping(d, (2025, 3, day, 13, 0))
        for d in range(20):                       # 9 h exists on the first day only
            self.ping(d, (2025, 3, 5, 9, 0))
        summary = self.build()

        self.assertEqual(summary['hour_days']['weekday'][9], 1)
        self.assertEqual(summary['hour_days']['weekday'][13], 2)
        # 20 devices on the one morning there was vs 20 a day at 13 h: equal.
        self.assertEqual(self.index()['weekday'][9], 100)
        self.assertEqual(self.index()['weekday'][13], 100)

    def test_location_fallbacks_are_left_out(self):
        from unittest import mock

        nearby = Point(NEAR.x, NEAR.y + 0.0004, srid=4326)  # ~45 m off the fallback point
        for d in range(12):                       # a real crowd at 13 h
            self.ping(d, (2025, 3, 5, 13, 0), at=nearby)
        for d in range(30):                       # 30 phones on one exact point at 22 h
            self.ping(100 + d, (2025, 3, 5, 22, 0))
        with mock.patch('world.foot_traffic.FALLBACK_SQUARE_DEVICES', 20):
            summary = self.build()

        self.assertEqual(summary['fallback_square_days'], 1)
        self.assertIsNone(self.index()['weekday'][22])
        self.assertEqual(self.index()['weekday'][13], 100)

    def test_veraset_csv_deliveries_are_read(self):
        import csv
        from world.foot_traffic import build

        for d in range(12):
            self.ping(d, (2025, 3, 5, 13, 0))
        with open(f'{self.folder}/date=2025-03-05.csv', 'w', newline='') as fh:
            writer = csv.writer(fh)
            writer.writerow(['caid', 'utc_timestamp', 'horizontal_accuracy', 'latitude', 'longitude'])
            for caid, ts, lat, lng in self.pings:
                writer.writerow([caid, ts, '11.0', lat, lng])
        build([f'{self.folder}/date=*.csv'], self.output)

        self.assertEqual(self.index()['weekday'][13], 100)

    def test_epoch_millisecond_timestamps_are_read_too(self):
        for d in range(12):
            self.ping(d, (2025, 3, 5, 13, 0))
        millis = [int(timezone.make_aware(datetime.strptime(t, '%Y-%m-%d %H:%M:%S'), timezone.utc).timestamp() * 1000)
                  for _, t, _, _ in self.pings]
        self.build(timestamps=millis)

        self.assertEqual(self.index()['weekday'][13], 100)


class PhoneEndpointAccessTests(TestCase):
    """Raw phone pings are personal data: only staff may pull them."""

    URLS = ['/api/phones/day/2025-03-05', '/api/phones/day/2025-03-05.csv',
            '/api/phones/range/2025-03-01/2025-03-05.geojson',
            '/api/phones/range/zip/0/2025-03-01/2025-03-05.zip']

    def test_anonymous_requests_get_no_data(self):
        for url in self.URLS:
            response = self.client.get(url)
            self.assertEqual(response.status_code, 302, url)
            self.assertIn('/admin/login/', response['Location'], url)

    def test_staff_can_still_pull_them(self):
        from django.contrib.auth.models import User
        staff = User.objects.create_user('staff', password='x', is_staff=True)
        self.client.force_login(staff)
        response = self.client.get(self.URLS[0])
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()['type'], 'FeatureCollection')

    def test_logged_in_non_staff_are_turned_away(self):
        from django.contrib.auth.models import User
        self.client.force_login(User.objects.create_user('visitor', password='x'))
        self.assertEqual(self.client.get(self.URLS[0]).status_code, 302)


class HazardsTests(TestCase):
    """
    The Terreno y clima build from Atlas-shaped GeoJSON and the report's
    lookup on its output. The geotechnical zones come in UTM 14N, as the
    Atlas serves most layers, to cover the move to lon/lat.
    """

    def setUp(self):
        import tempfile
        self.folder = tempfile.mkdtemp()
        self.layers = {}

    def tearDown(self):
        import shutil
        shutil.rmtree(self.folder, ignore_errors=True)

    @staticmethod
    def square(at, half, srid=4326):
        """A square GeoJSON polygon around `at`, `half` degrees across, in `srid`."""
        from django.contrib.gis.geos import Polygon
        x, y = at.x, at.y
        polygon = Polygon(((x - half, y - half), (x + half, y - half), (x + half, y + half),
                           (x - half, y + half), (x - half, y - half)), srid=4326)
        if srid != 4326:
            polygon.transform(srid)
        return json.loads(polygon.geojson)

    def serve(self, layer_id, features, srid=None):
        collection = {'type': 'FeatureCollection', 'features': [
            {'type': 'Feature', 'geometry': geometry, 'properties': properties} for geometry, properties in features]}
        if srid:
            collection['crs'] = {'type': 'name', 'properties': {'name': f'EPSG:{srid}'}}
        self.layers[layer_id] = collection

    def point(self, at):
        return {'type': 'Point', 'coordinates': [at.x, at.y]}

    def build(self):
        from world.hazards import build
        empty = {'type': 'FeatureCollection', 'features': []}
        return build(self.folder, fetch=lambda service, kind, layer_id: self.layers.get(
            (service.rsplit('/', 1)[-1], layer_id), empty))

    def report(self, at=CENTRO):
        from django.test import override_settings
        from world.views_categorized.api import terrain_and_climate
        with override_settings(HAZARDS_DIR=self.folder):
            return terrain_and_climate(at.x, at.y, 350)

    def test_reads_the_ground_and_the_census_zone_under_the_point(self):
        levels = {'sismo': 'Muy Alto', 'inundacion': 'Alto', 'precipitac': 'Medio', 'granizo': 'Bajo',
                  'tom_elec': 'Bajo', 'tem_max': 'Alto', 'sus_ladera': 'Muy Bajo'}
        self.serve(('Servicio_Indicadores_AGEB', 0), [(self.square(CENTRO, 0.002), {'cvegeo': '0901500010010', **levels})])
        self.serve(('Geologicos', 27), [(self.square(CENTRO, 0.05, srid=6369),
                                          {'INTENSIDAD': 'Zona III', 'NOMBRE': 'Zona de lago'})], srid=6369)
        self.serve(('Geologicos', 6), [(self.square(CENTRO, 0.05), {'magni_num': '11-20'})])
        self.serve(('Geologicos', 5), [(self.point(NEAR), {}), (self.point(FAR), {})])
        self.serve(('Geologicos', 7), [(self.point(NEAR), {})])
        self.serve(('Geologicos', 9), [(self.point(CENTRO), {})])
        self.serve(('Geologicos', 2), [({'type': 'LineString', 'coordinates': [[NEAR.x - 0.01, NEAR.y], [NEAR.x + 0.01, NEAR.y]]}, {})])
        counts, skipped = self.build()

        result = self.report()

        self.assertEqual((counts['mines'], counts['sinkholes'], skipped), (2, 2, {}))
        self.assertEqual(result['levels'], levels)
        self.assertEqual(result['geotechnical_zone'], {'zone': 'III', 'name': 'Zona de lago'})
        self.assertEqual(result['subsidence_cm_year'], '11-20')
        self.assertIsNone(result['crack_zone'])
        self.assertEqual(result['mines']['count'], 1)                 # the far one is 2 km out
        self.assertAlmostEqual(result['mines']['nearest_m'], 111, delta=3)
        self.assertEqual(result['sinkholes'], {'count': 2, 'nearest_m': 0, 'from_year': 2017, 'to_year': 2025})
        self.assertEqual(result['fractures']['count'], 1)
        self.assertAlmostEqual(result['fractures']['nearest_m'], 111, delta=3)
        # Nothing reported is still reported over the years the layer covers.
        self.assertEqual(result['waterlogging'], {'count': 0, 'nearest_m': None, 'from_year': 2016, 'to_year': 2025})

    def test_outside_the_city_or_without_files_there_is_no_block(self):
        self.serve(('Servicio_Indicadores_AGEB', 0), [(self.square(CENTRO, 0.002), {'cvegeo': '0901500010010'})])
        self.build()

        self.assertIsNone(self.report(at=FAR))
        self.assertIsNotNone(self.report())
        self.folder = f'{self.folder}/missing'
        self.assertIsNone(self.report())


class AreaScoreTests(TestCase):
    """The Índice de habitabilidad: percentiles, ranks, hand edits and the API."""

    # Three AGEBs a kilometre apart along a street; the census below makes the
    # first the best housed, and only the third is too small to rank.
    CENSUS = {
        '0901500010010': {'POBTOT': 3000, 'VIVPAR_HAB': 1000, 'VPH_1CUART': 10, 'VPH_PISOTI': 0, 'VPH_DRENAJ': 1000,
                          'VPH_INTER': 900, 'VPH_AGUADV': 1000, 'VPH_AGUAFV': 0},
        '0901500010025': {'POBTOT': 2000, 'VIVPAR_HAB': 600, 'VPH_1CUART': 120, 'VPH_PISOTI': 30, 'VPH_DRENAJ': 580,
                          'VPH_INTER': 300, 'VPH_AGUADV': 500, 'VPH_AGUAFV': 100},
        '090150001003A': {'POBTOT': 40, 'VIVPAR_HAB': 12, 'VPH_1CUART': '*', 'VPH_PISOTI': '*', 'VPH_DRENAJ': 12,
                          'VPH_INTER': 6, 'VPH_AGUADV': 12, 'VPH_AGUAFV': 0},
    }

    def setUp(self):
        import csv
        import tempfile

        from django.contrib.gis.geos import Polygon
        from world.area_scores import CENSUS_COLUMNS
        from world.models import GeoZone

        self.folder = tempfile.mkdtemp()
        self.census = f'{self.folder}/ageb_09.csv'
        with open(self.census, 'w', newline='', encoding='utf-8') as f:
            writer = csv.writer(f)
            writer.writerow(['ENTIDAD', 'NOM_ENT', 'MUN', 'NOM_MUN', 'LOC', 'NOM_LOC', 'AGEB', 'MZA', *CENSUS_COLUMNS])
            writer.writerow(['09', 'CDMX', '015', 'Cuauhtémoc', '0000', 'Total del municipio', '0000', '000',
                             *['0'] * len(CENSUS_COLUMNS)])
            for cvegeo, values in self.CENSUS.items():
                row = ['09', 'CDMX', '015', 'Cuauhtémoc', '0001', 'Total AGEB urbana', cvegeo[-4:]]
                writer.writerow(row + ['000'] + [values[c] for c in CENSUS_COLUMNS])
                writer.writerow(row + ['001'] + ['1'] * len(CENSUS_COLUMNS))   # a block, ignored
        for index, cvegeo in enumerate(self.CENSUS):
            x = CENTRO.x + index * 0.01
            GeoZone.objects.create(CVEGEO=cvegeo, CVE_ENT='09', CVE_MUN='015', CVE_LOC='0001', CVE_AGEB=cvegeo[-4:],
                                   geometry=Polygon(((x, 19.43), (x + 0.004, 19.43), (x + 0.004, 19.434),
                                                     (x, 19.434), (x, 19.43)), srid=4326))

    def build(self):
        from django.test import override_settings
        from world.area_scores import build
        with override_settings(CENSUS_AGEB_FILE=self.census, HAZARDS_DIR=f'{self.folder}/no-hazards'):
            return build(('ageb',), log=lambda line: None)

    def test_scores_rank_and_keep_hand_edits(self):
        from world.models import AreaScore

        self.assertEqual(self.build(), {'ageb': 3})
        best, worse, tiny = (AreaScore.objects.get(code=c) for c in self.CENSUS)
        self.assertGreater(best.vivienda, worse.vivienda)
        self.assertEqual((best.rank, worse.rank, best.rank_of), (1, 2, 2))
        self.assertFalse(tiny.rankable)
        self.assertIsNone(tiny.rank)
        self.assertEqual(best.municipality, 'Cuauhtémoc')
        # "*" is withheld by INEGI, not zero.
        withheld = {i['key']: i['value'] for i in tiny.indicators['vivienda']}
        self.assertIsNone(withheld['piso_tierra'])
        # Nothing loaded for these axes: empty, not zero.
        self.assertIsNone(best.seguridad)
        self.assertIsNone(best.riesgo)

        worse.vivienda, worse.agua, worse.edited = 10, 10, True
        worse.save()
        self.build()
        worse.refresh_from_db()
        best.refresh_from_db()
        self.assertEqual((worse.vivienda, worse.agua), (10, 10))
        self.assertEqual((worse.rank, best.rank), (1, 2))

    def test_api_finds_an_area_by_code_or_point(self):
        self.build()
        by_code = self.client.get('/api/area-score', {'type': 'ageb', 'code': '0901500010010'}).json()
        self.assertEqual(by_code['rank'], 1)
        self.assertEqual([axis['key'] for axis in by_code['axes']],
                         ['vivienda', 'transporte', 'seguridad', 'oportunidades', 'agua', 'riesgo'])
        by_point = self.client.get('/api/area-score', {'type': 'ageb', 'lng': CENTRO.x + 0.012, 'lat': 19.432}).json()
        self.assertEqual(by_point['code'], '0901500010025')
        self.assertEqual(self.client.get('/api/area-score', {'type': 'ageb', 'code': 'nope'}).status_code, 404)
        self.assertEqual(self.client.get('/api/area-score', {'type': 'municipio'}).status_code, 400)
        outline = self.client.get('/api/area-score', {'type': 'ageb', 'code': '0901500010010', 'geometry': '1'}).json()
        self.assertEqual(outline['geometry']['type'], 'Polygon')

    def test_ranking_lists_areas_by_place(self):
        self.build()
        ranking = self.client.get('/api/area-score/ranking', {'type': 'ageb', 'from': 0, 'to': 5}).json()
        self.assertEqual([row['rank'] for row in ranking['rows']], list(range(1, ranking['rank_of'] + 1)))
        self.assertEqual(ranking['rows'][0]['code'], '0901500010010')
        self.assertEqual(self.client.get('/api/area-score/ranking', {'type': 'ageb', 'from': 1, 'to': 100}).status_code, 400)
        self.assertEqual(self.client.get('/api/area-score/ranking', {'type': 'ageb'}).status_code, 400)

    def test_distribution_cuts_the_ranking_into_runs(self):
        self.build()
        strip = self.client.get('/api/area-score/distribution', {'type': 'ageb', 'buckets': 50}).json()
        self.assertEqual(strip['buckets'][0]['from'], 1)
        self.assertEqual(strip['buckets'][-1]['to'], strip['rank_of'])
        scores = [bucket['score'] for bucket in strip['buckets']]
        self.assertEqual(scores, sorted(scores, reverse=True))
        self.assertEqual(self.client.get('/api/area-score/distribution', {'buckets': 0}).status_code, 400)

    def test_admin_edit_marks_the_area_and_reranks(self):
        from django.contrib.auth.models import User
        from world.models import AreaScore

        self.build()
        worse = AreaScore.objects.get(code='0901500010025')
        self.client.force_login(User.objects.create_superuser('admin', 'a@example.com', 'x'))
        page = self.client.get(f'/admin/world/areascore/{worse.pk}/change/')
        self.assertContains(page, '<svg')
        data = {key: 10 for key in ('vivienda', 'transporte', 'oportunidades', 'agua')}
        data.update({'seguridad': '', 'riesgo': '', 'note': 'Revisado en campo', 'rankable': 'on',
                     'geometry': worse.geometry.geojson})
        response = self.client.post(f'/admin/world/areascore/{worse.pk}/change/', data)
        self.assertEqual(response.status_code, 302, getattr(response, 'context', None) and response.context['adminform'].form.errors)
        worse.refresh_from_db()
        self.assertTrue(worse.edited)
        self.assertEqual((worse.score, worse.rank), (10, 1))
        self.assertContains(self.client.get('/admin/world/areascore/'), 'Recalcular')
        self.assertEqual(self.client.get('/admin/world/areascore/mapa.geojson', {'type': 'ageb'}).json()['features'][0]['type'],
                         'Feature')
