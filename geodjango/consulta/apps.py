from django.apps import AppConfig


class ConsultaConfig(AppConfig):
    """Opine, the POZMVM consultation, served on ordena.laciudad.mx (see geodjango/ordena_urls.py)."""

    name = 'consulta'
    verbose_name = 'Consulta POZMVM (Opine)'
    # The migrations were written with BigAutoField ids; this project's default is AutoField.
    default_auto_field = 'django.db.models.BigAutoField'
