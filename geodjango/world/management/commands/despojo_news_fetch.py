"""
Harvest press coverage of despojo from RSS into the review queue.

Sources and search terms live in the admin (*Fuentes de noticias* and *Palabras
clave*), not in this file, and every run is recorded under *Ejecuciones del
buscador*. Nothing it stores is shown on the map until somebody approves it.

There is no scheduler behind this command — run it here or press "Buscar notas
ahora" in the admin.

    python3 manage.py despojo_news_fetch                # last 7 days
    python3 manage.py despojo_news_fetch --days 30      # backfill a month
    python3 manage.py despojo_news_fetch --dry-run      # show, store nothing
    python3 manage.py despojo_news_fetch --feed gnews-despojadores
"""

from django.core.management.base import BaseCommand

from world.models.despojo_news import DespojoNewsItem, DespojoNewsRun
from world.utils.despojo_news import harvest


class Command(BaseCommand):
    help = 'Busca notas recientes sobre despojo en las fuentes RSS configuradas.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--days', type=int, default=7,
            help='How far back to accept items, in days (default: 7).',
        )
        parser.add_argument(
            '--feed', action='append', dest='feeds', default=None,
            help='Only read the feed with this slug. Repeatable.',
        )
        parser.add_argument(
            '--dry-run', action='store_true',
            help='Report what would be stored without writing anything.',
        )
        parser.add_argument(
            '--approve', action='store_true',
            help='Store new items as approved instead of pending. Skips review.',
        )

    def handle(self, *args, **options):
        run = harvest(
            days=options['days'],
            feed_slugs=options['feeds'],
            dry_run=options['dry_run'],
            approve=options['approve'],
            trigger=DespojoNewsRun.Trigger.COMMAND,
            actor='manage.py',
            writer=self.stdout.write,
        )

        if options['dry_run']:
            self.stdout.write(self.style.WARNING(
                '\nSimulación: no se guardó nada y no se registró la ejecución.'
            ))
            return

        if run.feeds_failed:
            self.stderr.write(self.style.WARNING(
                f'{run.feeds_failed} fuente(s) no se pudieron leer. '
                f'Detalle en /admin/world/despojonewsrun/{run.pk}/change/'
            ))

        self.stdout.write(self.style.SUCCESS(
            f'\nEjecución #{run.pk} registrada: {run.created} nota(s) nueva(s).'
        ))

        pending = DespojoNewsItem.objects.filter(
            review_status=DespojoNewsItem.ReviewStatus.PENDING
        ).count()
        if pending and not options['approve']:
            self.stdout.write(
                f'{pending} nota(s) esperan revisión en '
                '/admin/world/despojonewsitem/?review_status__exact=pending'
            )
