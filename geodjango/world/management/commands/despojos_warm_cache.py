import time

from django.core.cache import cache
from django.core.management.base import BaseCommand
from django.test import RequestFactory

from world.views_categorized.despojos import (
    BOROUGHS_CACHE_KEY,
    POINTS_CACHE_KEY,
    SUMMARY_CACHE_KEY,
    get_despojo_boroughs,
    get_despojo_points,
    get_despojo_summary,
)


class Command(BaseCommand):
    help = (
        'Precomputes the despojos map payloads so the first visitor does not '
        'pay for the full-table scan. Run after risks_felonies_load.'
    )

    def handle(self, *args, **options):
        factory = RequestFactory()

        # Drop whatever is there so this recomputes against the current import.
        cache.delete(SUMMARY_CACHE_KEY)
        cache.delete(BOROUGHS_CACHE_KEY)
        cache.delete(f'{POINTS_CACHE_KEY}:decade')

        views = (
            ('summary', get_despojo_summary),
            ('points', get_despojo_points),
            ('by-borough', get_despojo_boroughs),
        )
        for label, view in views:
            started = time.monotonic()
            response = view(factory.get(f'/api/despojos/{label}'))
            elapsed = time.monotonic() - started

            if response.status_code != 200:
                self.stdout.write(self.style.ERROR(
                    f'{label}: HTTP {response.status_code}'
                ))
                continue

            self.stdout.write(self.style.SUCCESS(
                f'{label}: warmed in {elapsed:.1f}s ({len(response.content):,} bytes)'
            ))
