from django.db import models
from django.contrib.gis.db import models as gis_models
from django.contrib.gis.geos import Point
import csv
import re
from collections import Counter
from datetime import datetime, time
from datetime import timezone, timedelta


# The FGJ export is not internally consistent. Rows appended since late October
# 2024 carry `fecha_*` as a full timestamp ("2025-01-02 22:34:03") and `hora_*`
# with a fourth segment ("22:34:03:00"); everything older uses plain
# "YYYY-MM-DD" and "HH:MM:SS". Both shapes have to parse, or the ~53k newest
# rows in the accumulated file — the whole of 2025 among them — are dropped.
_TIME_RE = re.compile(r'^(\d{1,2}):(\d{2}):(\d{2})(?::\d{2})?$')


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


def parse_fgj_date(value):
    """
    Date out of an FGJ `fecha_*` column, in either of its two shapes.

    Returns None when there is no usable date; the caller decides whether the
    row is worth keeping without one (it isn't — the date fields are NOT NULL).
    """
    value = (value or '').strip()
    if not value:
        return None
    try:
        return datetime.strptime(value[:10], '%Y-%m-%d').date()
    except ValueError:
        return None


def parse_fgj_time(value, timestamp=None):
    """
    Time out of an FGJ `hora_*` column, with the matching `fecha_*` as fallback.

    The `hora_*` column is tried first on purpose. In the ~3,800 rows where the
    two disagree, the timestamp's time reads 00:00:00 — a date-only value
    widened to a timestamp — while `hora_*` carries the real clock reading.

    Returns None when neither source yields a valid time.
    """
    candidates = [(value or '').strip()]
    timestamp = (timestamp or '').strip()
    if ' ' in timestamp:
        candidates.append(timestamp.split(' ', 1)[1])

    for candidate in candidates:
        match = _TIME_RE.match(candidate)
        if not match:
            continue
        hour, minute, second = (int(part) for part in match.groups())
        if hour < 24 and minute < 60 and second < 60:
            return time(hour, minute, second)
    return None

class Felony(models.Model):
    # Date and time fields for when the case was opened
    start_year = models.IntegerField()
    start_month = models.CharField(max_length=20)
    start_date = models.DateField()
    start_time = models.TimeField()

    # Date and time fields for when the crime occurred
    crime_year = models.FloatField()
    crime_month = models.CharField(max_length=20)
    crime_date = models.DateField()
    crime_time = models.TimeField()
    crime_date_time = models.DateTimeField()

    # Crime details
    crime_type = models.CharField(max_length=255)
    crime_category = models.CharField(max_length=255)
    jurisdiction = models.CharField(max_length=255, blank=True, null=True)
    prosecutor_office = models.CharField(max_length=255)
    agency = models.CharField(max_length=50)
    investigation_unit = models.CharField(max_length=50)

    # Location details
    neighborhood = models.CharField(max_length=255)
    neighborhood_catalog = models.CharField(max_length=255)
    borough = models.CharField(max_length=255)
    borough_catalog = models.CharField(max_length=255)
    municipality = models.CharField(max_length=255)
    
    # Geographic coordinates
    location = gis_models.PointField(geography=True, srid=4326)

    # Static lists of crime types
    PUBLIC_TRANSPORT_THEFT_TYPES = [
        "ROBO A PASAJERO A BORDO DE METRO CON VIOLENCIA", 
        "ROBO A PASAJERO A BORDO DE METRO SIN VIOLENCIA", 
        "ROBO A PASAJERO A BORDO DE METROBUS CON VIOLENCIA", 
        "ROBO A PASAJERO A BORDO DE METROBUS SIN VIOLENCIA", 
        "ROBO A PASAJERO A BORDO DE PESERO COLECTIVO CON VIOLENCIA", 
        "ROBO A PASAJERO A BORDO DE PESERO COLECTIVO SIN VIOLENCIA", 
        "ROBO A PASAJERO A BORDO DE PESERO Y VEHICULO CON VIOLENCIA", 
        "ROBO A PASAJERO A BORDO DE TRANSPORTE PÚBLICO CON VIOLENCIA", 
        "ROBO A PASAJERO A BORDO DE TRANSPORTE PÚBLICO SIN VIOLENCIA", 
        "ROBO A PASAJERO EN AUTOBUS FORANEO SIN VIOLENCIA", 
        "ROBO A PASAJERO EN AUTOBÚS FORÁNEO CON VIOLENCIA", 
        "ROBO A PASAJERO EN ECOBUS CON VIOLENCIA", 
        "ROBO A PASAJERO EN ECOBUS SIN VIOLENCIA",
        "ROBO A PASAJERO EN RTP CON VIOLENCIA",
        "ROBO A PASAJERO EN RTP SIN VIOLENCIA",
        "ROBO A PASAJERO EN TREN LIGERO CON VIOLENCIA",
        "ROBO A PASAJERO EN TREN LIGERO SIN VIOLENCIA",
        "ROBO A PASAJERO EN TREN SUBURBANO CON VIOLENCIA",
        "ROBO A PASAJERO EN TREN SUBURBANO SIN VIOLENCIA",
        "ROBO A PASAJERO EN TROLEBUS CON VIOLENCIA",
        "ROBO A PASAJERO EN TROLEBUS SIN VIOLENCIA",
        "ROBO A PASAJERO A BORDO DE TAXI SIN VIOLENCIA",
        "ROBO A PASAJERO A BORDO DE TAXI CON VIOLENCIA",
        "ROBO A PASAJERO / CONDUCTOR DE TAXI CON VIOLENCIA",
        "ROBO A PASAJERO / CONDUCTOR DE TAXI SIN VIOLENCIA",
        "ROBO A TRANSEUNTE A BORDO DE TAXI PUBLICO Y PRIVADO SIN VIOLENCIA",
        "ROBO A TRANSEUNTE A BORDO DE TAXI PÚBLICO Y PRIVADO CON VIOLENCIA",
        "ROBO A TRANSEUNTE CONDUCTOR DE TAXI PUBLICO Y PRIVADO CON VIOLENCIA",
        "ROBO A PASAJERO / CONDUCTOR DE TAXI CON VIOLENCIA",
        "ROBO A PASAJERO / CONDUCTOR DE VEHICULO CON VIOLENCIA",
        "ROBO A PASAJERO A BORDO DE CABLEBUS CON VIOLENCIA",
        "ROBO A PASAJERO A BORDO DE CABLEBUS SIN VIOLENCIA",
        "ROBO A TRANSEUNTE EN TERMINAL DE PASAJEROS CON VIOLENCIA"
    ]

    SEXUAL_ABUSE_TYPES = [
        "ABUSO SEXUAL",
        "VIOLACION",
        "TENTATIVA DE VIOLACION",
        "VIOLACION EQUIPARADA",
        "VIOLACION EQUIPARADA POR CONOCIDO",
        "VIOLACION TUMULTUARIA",
        "VIOLACION TUMULTUARIA EQUIPARADA",
        "VIOLACION TUMULTUARIA EQUIPARADA POR CONOCIDO",
        "PRIVACION DE LA LIBERTAD PERSONAL (REALIZAR ACTO SEXUAL)",
        "ACOSO SEXUAL",
        "ACOSO SEXUAL AGRAVADO EN CONTRA DE MENORES"
    ]

    HOUSE_ROBBERY_TYPES = [
        "ROBO A CASA HABITACION CON VIOLENCIA",
        "ROBO A CASA HABITACION SIN VIOLENCIA",
        "ROBO A CASA HABITACION Y VEHICULO CON VIOLENCIA",
        "ROBO A CASA HABITACION Y VEHICULO SIN VIOLENCIA"
    ]

    BUSINESS_ROBBERY_TYPES = [
        "ROBO A NEGOCIO (NOMINA) Y VEHICULO CON VIOLENCIA",
        "ROBO A NEGOCIO CON VIOLENCIA",
        "ROBO A NEGOCIO CON VIOLENCIA POR FARDEROS (TIENDAS DE AUTOSERVICIO)",
        "ROBO A NEGOCIO CON VIOLENCIA POR FARDEROS (TIENDAS DE CONVENIENCIA)",
        "ROBO A NEGOCIO SIN VIOLENCIA",
        "ROBO A NEGOCIO SIN VIOLENCIA POR FARDEROS",
        "ROBO A NEGOCIO SIN VIOLENCIA POR FARDEROS (TIENDAS DE AUTOSERVICIO)",
        "ROBO A NEGOCIO SIN VIOLENCIA POR FARDEROS (TIENDAS DE CONVENIENCIA)",
        "ROBO A NEGOCIO Y VEHICULO CON VIOLENCIA",
        "ROBO A NEGOCIO Y VEHICULO SIN VIOLENCIA",
        "ROBO A OFICINA PÚBLICA CON VIOLENCIA",
        "ROBO A OFICINA PÚBLICA SIN VIOLENCIA",
        "ROBO A SUCURSAL BANCARIA (ASALTO BANCARIO) CON VIOLENCIA",
        "ROBO A SUCURSAL BANCARIA (ASALTO BANCARIO) SIN VIOLENCIA",
        "ROBO A SUCURSAL BANCARIA (ASALTO BANCARIO) Y VEHICULO CON VIOLENCIA",
        "ROBO A SUCURSAL BANCARIA (ASALTO BANCARIO) Y VEHICULO SIN VIOLENCIA",
        "ROBO A SUCURSAL BANCARIA (SUPERMERCADO) CON VIOLENCIA",
        "ROBO A SUCURSAL BANCARIA (SUPERMERCADO) SIN VIOLENCIA",
        "ROBO A SUCURSAL BANCARIA DENTRO DE TIENDAS DE AUTOSERVICIO CON VIOLENCIA",
        "ROBO A SUCURSAL BANCARIA DENTRO DE TIENDAS DE AUTOSERVICIO S/V",
        "ROBO A SUCURSAL BANCARIA CON VIOLENCIA",
        "ROBO A TRANSEUNTE EN PARQUES Y MERCADOS CON VIOLENCIA",
        "ROBO A TRANSEUNTE EN RESTAURANT CON VIOLENCIA"
    ]

    DESPOJO_TYPES = [
        "DESPOJO"
    ]

    class Meta:
        verbose_name = 'Felony'
        verbose_name_plural = 'Felonies'
        indexes = [
            models.Index(fields=['crime_date']),
            models.Index(fields=['crime_type']),
            models.Index(fields=['borough']),
            # Covers the per-type/per-year rollups (the despojos summary). With
            # crime_type alone Postgres bitmap-scans ~27k heap blocks to read
            # two columns it could get from the index; this makes it index-only.
            models.Index(
                fields=['crime_type', 'crime_year', 'crime_date'],
                name='felony_type_year_date_idx',
            ),
        ]

    def __str__(self):
        return f"{self.crime_type} - {self.crime_date} - {self.borough}"

    @classmethod
    def load_from_csv(cls, file_path, batch_size=5000, dry_run=False, progress=None):
        """
        Load felony data from a CSV file into the database.

        Records are inserted in batches via bulk_create, since the FGJ
        accumulated dataset (2016-present) has several million rows and
        row-by-row .save() would take hours.

        Args:
            file_path (str): Path to the CSV file containing felony data
            batch_size (int): Number of records to insert per bulk_create call
            dry_run (bool): Parse and count without writing anything
            progress (callable): Called with (rows_read, records_ready) per batch

        Returns:
            (int, Counter): records loaded, and a tally of every row the loader
            could not take verbatim — keyed by reason, so a format change in the
            export shows up as a number instead of scrolling past in a log.
        """
        records_loaded = 0
        rows_read = 0
        stats = Counter()
        batch = []

        def flush():
            nonlocal batch, records_loaded
            if not batch:
                return
            if not dry_run:
                cls.objects.bulk_create(batch)
            records_loaded += len(batch)
            batch = []

        with open(file_path, 'r', encoding='utf-8') as csvfile:
            reader = csv.DictReader(csvfile)
            for row in reader:
                rows_read += 1
                try:
                    start_date = parse_fgj_date(row['fecha_inicio'])
                    crime_date = parse_fgj_date(row['fecha_hecho'])

                    # Both date columns are NOT NULL, so a row without them is
                    # unusable rather than merely incomplete.
                    if start_date is None:
                        stats['descartada: fecha_inicio ilegible'] += 1
                        continue
                    if crime_date is None:
                        stats['descartada: fecha_hecho ilegible'] += 1
                        continue

                    start_time = parse_fgj_time(row['hora_inicio'], row['fecha_inicio'])
                    crime_time = parse_fgj_time(row['hora_hecho'], row['fecha_hecho'])

                    # ~350 rows carry a valid date and no readable clock time.
                    # Defaulting to midnight keeps a real carpeta that dropping
                    # the row would lose; counted so the hour-of-day skew it
                    # introduces stays visible.
                    if start_time is None:
                        start_time = time(0, 0)
                        stats['hora_inicio ilegible, se asumió 00:00'] += 1
                    if crime_time is None:
                        crime_time = time(0, 0)
                        stats['hora_hecho ilegible, se asumió 00:00'] += 1

                    # Local wall-clock time, tagged GMT-6 without conversion.
                    crime_date_time = datetime.combine(
                        crime_date, crime_time, tzinfo=timezone(timedelta(hours=-6))
                    )

                    # anio_hecho is redundant with fecha_hecho; prefer the date
                    # so a blank year column cannot land a row in year 0.
                    crime_year = safe_float(row['anio_hecho'], default=0.0) or float(crime_date.year)
                    start_year = safe_int(row['anio_inicio'], default=0) or start_date.year

                    # Rows the FGJ could not geocode arrive with blank or zero
                    # coordinates and become (0, 0); the views filter them out.
                    location = Point(safe_float(row['longitud']), safe_float(row['latitud']), srid=4326)
                    if location.x == 0 and location.y == 0:
                        stats['sin coordenadas, quedó en (0, 0)'] += 1

                    batch.append(cls(
                        start_year=start_year,
                        start_month=row['mes_inicio'],
                        start_date=start_date,
                        start_time=start_time,
                        crime_year=crime_year,
                        crime_month=row['mes_hecho'],
                        crime_date=crime_date,
                        crime_time=crime_time,
                        crime_date_time=crime_date_time,
                        crime_type=row['delito'],
                        crime_category=row['categoria_delito'],
                        jurisdiction=row['competencia'] or None,
                        prosecutor_office=row['fiscalia'],
                        agency=row['agencia'],
                        investigation_unit=row['unidad_investigacion'],
                        neighborhood=row['colonia_hecho'],
                        neighborhood_catalog=row['colonia_catalogo'],
                        borough=row['alcaldia_hecho'],
                        borough_catalog=row['alcaldia_catalogo'],
                        municipality=row['municipio_hecho'],
                        location=location
                    ))

                    if len(batch) >= batch_size:
                        flush()
                        if progress:
                            progress(rows_read, records_loaded)
                except Exception as e:
                    stats[f'descartada: {type(e).__name__}: {e}'] += 1
                    continue

            flush()

        stats['filas leídas'] = rows_read
        return records_loaded, stats
