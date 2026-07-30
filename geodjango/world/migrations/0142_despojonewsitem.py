from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('world', '0141_felony_felony_type_year_date_idx'),
    ]

    operations = [
        migrations.CreateModel(
            name='DespojoNewsItem',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('source', models.CharField(max_length=120)),
                ('headline', models.CharField(max_length=400)),
                ('url', models.URLField(max_length=2000)),
                ('summary', models.TextField(blank=True)),
                ('published_at', models.DateTimeField(blank=True, null=True)),
                ('dedupe_key', models.CharField(editable=False, max_length=40, unique=True)),
                ('feed_slug', models.CharField(blank=True, max_length=60)),
                ('review_status', models.CharField(choices=[('pending', 'Por revisar'), ('approved', 'Publicada'), ('rejected', 'Descartada')], default='pending', max_length=20)),
                ('internal_notes', models.TextField(blank=True)),
                ('fetched_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
            ],
            options={
                'verbose_name': 'Nota de prensa (despojo)',
                'verbose_name_plural': 'Notas de prensa (despojo)',
                'db_table': 'despojo_news_items',
                'ordering': ['-published_at', '-fetched_at'],
            },
        ),
        migrations.AddIndex(
            model_name='despojonewsitem',
            index=models.Index(fields=['review_status', '-published_at'], name='despojo_new_review__ff11f7_idx'),
        ),
        migrations.AddIndex(
            model_name='despojonewsitem',
            index=models.Index(fields=['-published_at'], name='despojo_new_publish_cb2882_idx'),
        ),
    ]
