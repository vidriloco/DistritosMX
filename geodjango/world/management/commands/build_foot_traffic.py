"""
Build the foot-traffic file the zone report reads.

    aws s3 sync s3://veraset-prd-platform-us-west-2/output/TallerDeApps/<job_id>/ trips/<job_id>/
    python manage.py build_foot_traffic 'trips/*/**/*.parquet'
    python manage.py build_foot_traffic '/data/veraset/trips/date=*.csv' --work-dir /big/disk
    aws s3 cp data/foot_traffic/foot_traffic.parquet s3://<private bucket>/foot_traffic/

Reads raw Veraset pings, CSV or Parquet, and writes counts per 150 m cell and
local hour. Location fallbacks (thousands of phones piled on one default
point) and every cell-hour under world.foot_traffic.MIN_CELL_DEVICES devices
are dropped. The pings themselves are not copied anywhere; delete the synced folder when
the build is done. See world/foot_traffic.py for the method.
"""

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError

from world.foot_traffic import build


class Command(BaseCommand):
    help = 'Aggregate Veraset ping files (CSV or Parquet) into the foot-traffic GeoParquet file.'

    def add_arguments(self, parser):
        parser.add_argument('inputs', nargs='+', help='CSV or Parquet files, or globs (quote globs).')
        parser.add_argument(
            '--work-dir',
            help='Where DuckDB may spill while counting (default: next to --output). Needs room for a few GB.',
        )
        parser.add_argument(
            '--output', default=settings.FOOT_TRAFFIC_FILE,
            help=f'Where to write (default: {settings.FOOT_TRAFFIC_FILE}).',
        )

    def handle(self, *args, **options):
        try:
            summary = build(options['inputs'], options['output'], work_dir=options['work_dir'])
        except Exception as e:  # DuckDB raises its own error types for bad paths
            raise CommandError(str(e)) from e
        self.stdout.write(self.style.SUCCESS(
            f"{options['output']}: {summary['cell_hours']:,} cell-hours, "
            f"{summary['days']['weekday']} weekdays and {summary['days']['weekend']} weekend days, "
            f"{summary['from_date']} to {summary['to_date']}; "
            f"{summary['fallback_square_days']} fallback square-days left out"
        ))
