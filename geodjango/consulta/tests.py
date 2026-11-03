import json

from django.core.management import call_command
from django.test import TestCase, override_settings

from .models import MuestraInicial, Opcion, Respuesta

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

    def test_letter_drafting_stores_nothing(self):
        detalle = self.client.get('/api/areas/movilidad/', **ORDENA).json()
        pregunta = detalle['preguntas'][0]
        elecciones = {pregunta['slug']: pregunta['opciones'][0]['valor']}
        cuerpo = {'elecciones': elecciones, 'municipio': 'Iztapalapa', 'firma': {'nombre': 'Ana'}}
        r = self.client.post('/api/opinion/', json.dumps(cuerpo), content_type='application/json', **ORDENA)
        self.assertIn(pregunta['opciones'][0]['opinion'], r.json()['texto'])
        self.assertEqual(Respuesta.objects.count(), 0)

    def test_answers_counted_once_per_browser(self):
        detalle = self.client.get('/api/areas/movilidad/', **ORDENA).json()
        pregunta = detalle['preguntas'][0]
        primera, segunda = pregunta['opciones'][0]['valor'], pregunta['opciones'][1]['valor']
        visitante = '0b9f3c2e-6a1d-4c5e-9f7a-2d8b1e4c6a3f'
        enviar = lambda cuerpo: self.client.post('/api/respuesta/', json.dumps(cuerpo), content_type='application/json', **ORDENA)

        enviar({'visitante': visitante, 'elecciones': {pregunta['slug']: primera}, 'municipio': 'Iztapalapa'})
        enviar({'visitante': visitante, 'elecciones': {pregunta['slug']: segunda}, 'municipio': 'Iztapalapa'})
        guardada = Respuesta.objects.get()
        self.assertEqual(guardada.elecciones, {pregunta['slug']: segunda})
        self.assertEqual(guardada.municipio, 'Iztapalapa')
        resultados = self.client.get('/api/resultados/', **ORDENA).json()
        self.assertEqual(resultados['respuestas'], 1)

        # Clearing the answers takes the browser out of the count.
        enviar({'visitante': visitante, 'elecciones': {}})
        self.assertEqual(Respuesta.objects.count(), 0)

    def test_starting_sample_added_only_while_on(self):
        pregunta = self.client.get('/api/areas/movilidad/', **ORDENA).json()['preguntas'][0]
        opcion = Opcion.objects.get(pregunta__slug=pregunta['slug'], valor=pregunta['opciones'][0]['valor'])
        opcion.base = 7
        opcion.save()
        muestra = MuestraInicial.load()
        muestra.respuestas = 10
        muestra.save()

        apagada = self.client.get('/api/resultados/', **ORDENA).json()
        self.assertEqual((apagada['respuestas'], apagada['muestra']), (0, 0))

        muestra.activa = True
        muestra.save()
        encendida = self.client.get('/api/resultados/', **ORDENA).json()
        self.assertEqual((encendida['respuestas'], encendida['reales'], encendida['muestra']), (10, 0, 10))
        p = next(q for q in encendida['preguntas'] if q['pregunta'] == pregunta['slug'])
        self.assertEqual(p['total'], 7)
        self.assertEqual(next(a for a in encendida['areas'] if a['slug'] == 'movilidad')['participantes'], 7)

    def test_dashboard_switches_the_sample(self):
        from django.contrib.auth import get_user_model
        staff = get_user_model().objects.create_user('panel', password='x', is_staff=True)
        self.client.force_login(staff)
        pagina = self.client.get('/dashboard/resultados/', HTTP_HOST='localhost')
        self.assertEqual(pagina.status_code, 200)
        opciones = list(Opcion.objects.all())
        datos = {f'base_{o.pk}': '0' for o in opciones}
        datos.update({'activa': 'on', 'respuestas': '50', f'base_{opciones[0].pk}': '20'})
        self.client.post('/dashboard/resultados/', datos, HTTP_HOST='localhost')
        encendida = self.client.get('/api/resultados/', **ORDENA).json()
        self.assertEqual((encendida['respuestas'], encendida['muestra']), (50, 50))

        del datos['activa']
        self.client.post('/dashboard/resultados/', datos, HTTP_HOST='localhost')
        apagada = self.client.get('/api/resultados/', **ORDENA).json()
        self.assertEqual((apagada['respuestas'], apagada['muestra']), (0, 0))
        # Switching off keeps the numbers, ready to switch on again.
        self.assertEqual(Opcion.objects.get(pk=opciones[0].pk).base, 20)

    def test_answers_need_a_browser_id(self):
        r = self.client.post('/api/respuesta/', json.dumps({'visitante': 'x', 'elecciones': {'a': 'b'}}),
                             content_type='application/json', **ORDENA)
        self.assertEqual(r.status_code, 400)
        self.assertEqual(Respuesta.objects.count(), 0)

    def test_main_host_does_not_expose_the_consultation(self):
        self.assertEqual(self.client.get('/api/areas/', HTTP_HOST='localhost').status_code, 404)
