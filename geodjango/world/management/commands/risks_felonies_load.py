import os

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from world.models.felony import Felony

DEFAULT_RELATIVE_PATH = 'data/fgj/carpetas.csv'

# A load that keeps fewer than this share of the file's rows means the export
# changed shape again. Better to roll back and look than to publish a table with
# a silent hole in it.
MIN_KEEP_RATIO = 0.95


class Command(BaseCommand):
    help = (
        'Replaces the Felony table with the contents of the FGJ carpetas CSV. '
        'The delete and the load share one transaction, so a failure leaves the '
        'existing data in place.'
    )

    def add_arguments(self, parser):
        parser.add_argument(
            '--path-to-file',
            type=str,
            help='Path to the CSV file. Relative paths resolve against the Django project dir.',
            default=DEFAULT_RELATIVE_PATH,
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Parse the whole file and report, without touching the database.',
        )
        parser.add_argument(
            '--batch-size',
            type=int,
            default=5000,
            help='Rows per bulk_create call.',
        )

    def _resolve(self, given):
        """
        Accept the path as given, as relative to cwd, or as relative to the
        project dir — the previous version hardcoded a cwd-relative path that
        did not exist under the container's workdir.
        """
        candidates = [given, os.path.join(str(settings.BASE_DIR), given)]
        for candidate in candidates:
            if os.path.exists(candidate):
                return os.path.abspath(candidate)
        raise CommandError(
            'CSV not found. Tried:\n  ' + '\n  '.join(os.path.abspath(c) for c in candidates)
        )

    def handle(self, *args, **options):
        file_path = self._resolve(options['path_to_file'])
        if not file_path.endswith('.csv'):
            raise CommandError('File must be a CSV file')

        dry_run = options['dry_run']
        before = Felony.objects.count()
        self.stdout.write(f'Archivo   : {file_path}')
        self.stdout.write(f'En la BD  : {before:,} registros')
        self.stdout.write('Modo      : ' + ('ensayo, sin escribir' if dry_run else 'reemplazo completo'))

        def progress(rows_read, ready):
            self.stdout.write(f'  {rows_read:,} filas leídas, {ready:,} listas…')

        try:
            with transaction.atomic():
                if not dry_run:
                    Felony.objects.all().delete()
                    self.stdout.write('Tabla vaciada dentro de la transacción')

                loaded, stats = Felony.load_from_csv(
                    file_path,
                    batch_size=options['batch_size'],
                    dry_run=dry_run,
                    progress=progress,
                )

                rows_read = stats.pop('filas leídas', 0)
                self.stdout.write('')
                self.stdout.write(f'Filas en el CSV : {rows_read:,}')
                self.stdout.write(f'Registros carga.: {loaded:,}')
                for reason, n in sorted(stats.items(), key=lambda kv: -kv[1]):
                    self.stdout.write(f'  {n:>7,}  {reason}')

                if rows_read and loaded / rows_read < MIN_KEEP_RATIO:
                    raise CommandError(
                        f'Solo se pudo cargar {loaded / rows_read:.1%} del archivo '
                        f'(mínimo {MIN_KEEP_RATIO:.0%}). Se revierte todo; revisa el '
                        f'formato del CSV antes de reintentar.'
                    )

                if dry_run:
                    raise _DryRunRollback

        except _DryRunRollback:
            self.stdout.write(self.style.SUCCESS('\nEnsayo terminado, no se escribió nada.'))
            return

        self.stdout.write(self.style.SUCCESS(
            f'\nListo: {Felony.objects.count():,} registros en la tabla '
            f'(antes {before:,}).'
        ))


class _DryRunRollback(Exception):
    """Unwinds the transaction after a successful dry run."""
