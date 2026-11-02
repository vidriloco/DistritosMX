"""
Compute the Índice de habitabilidad Ciudad MX for every AGEB and colonia of
CDMX into AreaScore (world/area_scores.py explains each axis).

    python manage.py build_area_scores
    python manage.py build_area_scores --type ageb

Reads what the other seed commands load (AGEBs and colonias, stations, DENUE,
FGJ carpetas), the Atlas files from build_hazards, and the Censo 2020 AGEB
table, which it downloads from INEGI the first time. Rerun after any of those
change; the admin's "Recalcular" button runs the same thing.
"""

from django.core.management.base import BaseCommand

from world.area_scores import build_with_run
from world.models import AreaScoreRun


class Command(BaseCommand):
    help = 'Compute the livability index of every AGEB and colonia of CDMX.'

    def add_arguments(self, parser):
        parser.add_argument('--type', choices=['ageb', 'colonia', 'all'], default='all')

    def handle(self, *args, **options):
        area_types = ('ageb', 'colonia') if options['type'] == 'all' else (options['type'],)
        run = AreaScoreRun.objects.create(trigger=AreaScoreRun.Trigger.COMMAND, area_types=','.join(area_types))
        build_with_run(area_types, run, log_also=self.stdout.write)
        if run.status != AreaScoreRun.Status.OK:
            raise SystemExit(1)
        self.stdout.write(self.style.SUCCESS(f'Listo en {run.duration_seconds:.0f} s.'))
