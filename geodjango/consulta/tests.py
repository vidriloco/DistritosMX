import json

from django.core.management import call_command
from django.test import TestCase, override_settings

from .models import Respuesta

ORDENA = {'HTTP_HOST': 'ordena.localhost'}


@override_settings(ALLOWED_HOSTS=['ordena.localhost', 'localhost'])
class OrdenaHostTests(TestCase):
    """Opine's API answers on ordena.laciudad.mx and only there."""

    @classmethod
    def setUpTestData(cls):
        call_command('load_content', stdout=open('/dev/null', 'w'))

    def test_areas_and_detail(self):
        areas = self.client.get('/api/areas/', **ORDENA).json()['areas']
        self.assertTrue(areas)
        detalle = self.client.get(f"/api/areas/{areas[0]['slug']}/", **ORDENA).json()
        self.assertTrue(detalle['preguntas'])

    def test_opinion_only_stored_when_asked(self):
        detalle = self.client.get('/api/areas/movilidad/', **ORDENA).json()
        pregunta = detalle['preguntas'][0]
        elecciones = {pregunta['slug']: pregunta['opciones'][0]['valor']}
        cuerpo = {'elecciones': elecciones, 'municipio': 'Iztapalapa', 'firma': {'nombre': 'Ana'}}
        r = self.client.post('/api/opinion/', json.dumps(cuerpo), content_type='application/json', **ORDENA)
        self.assertIn(pregunta['opciones'][0]['opinion'], r.json()['texto'])
        self.assertEqual(Respuesta.objects.count(), 0)
        cuerpo['guardar'] = True
        self.client.post('/api/opinion/', json.dumps(cuerpo), content_type='application/json', **ORDENA)
        guardada = Respuesta.objects.get()
        # The aggregate keeps the municipality, never the name.
        self.assertEqual(guardada.municipio, 'Iztapalapa')
        self.assertNotIn('Ana', guardada.texto)
        resultados = self.client.get('/api/resultados/', **ORDENA).json()
        self.assertEqual(resultados['respuestas'], 1)

    def test_main_host_does_not_expose_the_consultation(self):
        self.assertEqual(self.client.get('/api/areas/', HTTP_HOST='localhost').status_code, 404)
