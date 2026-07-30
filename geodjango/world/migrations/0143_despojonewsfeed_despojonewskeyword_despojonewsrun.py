from django.db import migrations, models


# The searches and terms that were hardcoded in the command until now. Seeded so
# the harvester keeps behaving the same after the move, and so the admin opens on
# a working configuration instead of an empty table.
SEED_FEEDS = [
    ('gnews-despojo-inmuebles', 'despojo de inmuebles CDMX'),
    ('gnews-despojo-viviendas', 'despojo de viviendas "Ciudad de México"'),
    ('gnews-despojadores', 'despojadores inmuebles CDMX'),
    ('gnews-invasion-inmuebles', 'invasión de inmuebles "Ciudad de México"'),
]

SEED_KEYWORDS = {
    'topic': [
        'despojo', 'despojos', 'despojar', 'despojada', 'despojado',
        'despojador', 'despojadores', 'desalojo ilegal', 'invasión de inmueble',
        'invasión de predio', 'invasión de viviendas', 'predio invadido',
        'casa invadida', 'inmueble invadido',
    ],
    'exclude': [
        'despojos mortales', 'despojo mortuorio', 'restos mortales',
        'despojo agrario', 'despojo territorial indígena',
    ],
    'city': [
        'cdmx', 'ciudad de méxico', 'capital del país', 'alcaldía',
        'azcapotzalco', 'coyoacán', 'cuajimalpa', 'gustavo a. madero',
        'iztacalco', 'iztapalapa', 'magdalena contreras', 'milpa alta',
        'álvaro obregón', 'tláhuac', 'tlalpan', 'xochimilco',
        'benito juárez', 'cuauhtémoc', 'miguel hidalgo', 'venustiano carranza',
    ],
}


def seed(apps, schema_editor):
    Feed = apps.get_model('world', 'DespojoNewsFeed')
    Keyword = apps.get_model('world', 'DespojoNewsKeyword')

    for slug, query in SEED_FEEDS:
        Feed.objects.get_or_create(
            slug=slug,
            defaults={'kind': 'search', 'query': query, 'scoped': True, 'is_active': True},
        )

    for kind, terms in SEED_KEYWORDS.items():
        for term in terms:
            Keyword.objects.get_or_create(term=term, kind=kind, defaults={'is_active': True})


def unseed(apps, schema_editor):
    apps.get_model('world', 'DespojoNewsFeed').objects.filter(
        slug__in=[slug for slug, _ in SEED_FEEDS]
    ).delete()
    apps.get_model('world', 'DespojoNewsKeyword').objects.all().delete()


class Migration(migrations.Migration):

    dependencies = [
        ('world', '0142_despojonewsitem'),
    ]

    operations = [
        migrations.CreateModel(
            name='DespojoNewsFeed',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('slug', models.SlugField(max_length=60, unique=True)),
                ('kind', models.CharField(choices=[('search', 'Búsqueda en Google Noticias'), ('direct', 'Feed RSS de un medio')], default='search', max_length=20)),
                ('query', models.CharField(blank=True, max_length=200)),
                ('url', models.URLField(blank=True, max_length=500)),
                ('name', models.CharField(blank=True, max_length=120)),
                ('scoped', models.BooleanField(default=True, help_text='La fuente ya está acotada a la CDMX. Si no, la nota deberá mencionar la ciudad o una alcaldía para ser considerada.')),
                ('is_active', models.BooleanField(default=True)),
                ('notes', models.CharField(blank=True, max_length=200)),
                ('last_run_at', models.DateTimeField(blank=True, null=True)),
                ('last_status', models.CharField(blank=True, choices=[('ok', 'Correcto'), ('failed', 'Falló')], max_length=20)),
                ('last_message', models.CharField(blank=True, max_length=300)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
            ],
            options={
                'verbose_name': 'Fuente de noticias (despojo)',
                'verbose_name_plural': 'Fuentes de noticias (despojo)',
                'db_table': 'despojo_news_feeds',
                'ordering': ['-is_active', 'slug'],
            },
        ),
        migrations.CreateModel(
            name='DespojoNewsKeyword',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('term', models.CharField(max_length=80)),
                ('kind', models.CharField(choices=[('topic', 'Tema — la nota debe mencionar alguno'), ('exclude', 'Descarte — si aparece, se ignora la nota'), ('city', 'Ciudad — exigido a las fuentes sin acotar')], default='topic', max_length=20)),
                ('is_active', models.BooleanField(default=True)),
                ('notes', models.CharField(blank=True, max_length=200)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
            ],
            options={
                'verbose_name': 'Palabra clave (despojo)',
                'verbose_name_plural': 'Palabras clave (despojo)',
                'db_table': 'despojo_news_keywords',
                'ordering': ['kind', 'term'],
            },
        ),
        migrations.CreateModel(
            name='DespojoNewsRun',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('status', models.CharField(choices=[('running', 'En curso'), ('ok', 'Terminada'), ('partial', 'Terminada con fuentes caídas'), ('failed', 'Falló')], default='running', max_length=20)),
                ('trigger', models.CharField(choices=[('admin', 'Manual desde el admin'), ('command', 'Línea de comandos')], default='admin', max_length=20)),
                ('actor', models.CharField(blank=True, max_length=150)),
                ('days', models.IntegerField(default=7)),
                ('feeds_read', models.IntegerField(default=0)),
                ('feeds_failed', models.IntegerField(default=0)),
                ('entries_read', models.IntegerField(default=0)),
                ('matched', models.IntegerField(default=0)),
                ('created', models.IntegerField(default=0)),
                ('duplicates', models.IntegerField(default=0)),
                ('undated', models.IntegerField(default=0)),
                ('skipped', models.IntegerField(default=0)),
                ('log', models.TextField(blank=True)),
                ('started_at', models.DateTimeField(auto_now_add=True)),
                ('finished_at', models.DateTimeField(blank=True, null=True)),
            ],
            options={
                'verbose_name': 'Ejecución del buscador (despojo)',
                'verbose_name_plural': 'Ejecuciones del buscador (despojo)',
                'db_table': 'despojo_news_runs',
                'ordering': ['-started_at'],
            },
        ),
        migrations.AddIndex(
            model_name='despojonewsrun',
            index=models.Index(fields=['-started_at'], name='despojo_new_started_c23a1c_idx'),
        ),
        migrations.AddConstraint(
            model_name='despojonewskeyword',
            constraint=models.UniqueConstraint(fields=('term', 'kind'), name='despojo_keyword_unique'),
        ),
        migrations.AlterField(
            model_name='despojonewsitem',
            name='url',
            field=models.URLField(max_length=2000),
        ),
        migrations.RunPython(seed, unseed),
    ]
