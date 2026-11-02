"""
Download the Atlas de Riesgos layers the zone report's "Terreno y clima"
block reads, and write them as GeoParquet.

    python manage.py build_hazards
    python manage.py build_hazards --output /data/hazards

Public data, a few MB in all; rerun when the Atlas publishes new years of
sinkholes or waterlogging (and add their layer ids to world/hazards.py).
"""

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError

from world.hazards import build


class Command(BaseCommand):
    help = 'Download the Atlas de Riesgos CDMX hazard layers into GeoParquet files.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--output', default=settings.HAZARDS_DIR,
            help=f'Folder to write to (default: {settings.HAZARDS_DIR}).',
        )

    def handle(self, *args, **options):
        try:
            counts, skipped = build(options['output'])
        except Exception as e:  # network errors and the like
            raise CommandError(str(e)) from e
        for layer, count in counts.items():
            note = f' ({skipped[layer]} with unreadable geometry left out)' if layer in skipped else ''
            if not count:
                note = ' (the Atlas returned nothing; any earlier file was kept)'
            self.stdout.write(f'{layer}: {count:,} features{note}')
        self.stdout.write(self.style.SUCCESS(f"Written to {options['output']}"))
