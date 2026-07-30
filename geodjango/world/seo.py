"""
Server-rendered SEO and social-card metadata.

Social crawlers — Facebook, WhatsApp, X, LinkedIn, Slack, Telegram — do not run
JavaScript. The app sets per-route metadata client-side, which means none of it
ever reaches them: every shared link resolved to the site-wide card regardless
of the page. These definitions are rendered into the HTML head by the view, so
what a crawler reads is what the page is actually about.

Two rules the tags depend on:

* Every URL in a card must be absolute. A relative `og:image` is dropped
  silently by every major crawler — no warning, no image, just a bare link.
* `og:image` should be 1200x630. Platforms will scale other sizes, but the
  declared width/height must match the file or the crop goes wrong.
"""

from django.conf import settings
from django.templatetags.static import static

# The public origin every absolute URL is built from. Overridable so staging
# does not advertise production URLs — and so renaming the site is one edit.
CANONICAL_ORIGIN = getattr(
    settings, 'SEO_CANONICAL_ORIGIN', 'https://distritos.mx'
).rstrip('/')

SITE_NAME = 'Distritos MX'
DEFAULT_IMAGE = 'images/opengraph-seo.jpg'

# Keyed by the `seo` argument the view passes. `path` is the canonical path for
# that page, which is not always the path the visitor arrived on.
PAGES = {
    'home': {
        'path': '/',
        'title': 'Distritos MX — Análisis territorial de México',
        'description': (
            'Plataforma de análisis territorial y visualización de datos geoespaciales '
            'para México. Explora indicadores demográficos, económicos, de seguridad y '
            'de movilidad urbana.'
        ),
        'og_title': 'Distritos MX — Análisis territorial de México',
    },
    'explorar': {
        'path': '/explorar',
        'title': 'Explorar el territorio — Distritos MX',
        'description': (
            'Mapas interactivos de México con datos del INEGI: población, vivienda, '
            'actividad económica e incidencia delictiva, capa por capa.'
        ),
        'og_title': 'Explora México capa por capa',
    },
    'negocios': {
        'path': '/negocios',
        'title': 'Análisis de negocios y zonas comerciales — Distritos MX',
        'description': (
            'Estudia una zona antes de abrir: competencia, unidades económicas del DENUE, '
            'población alrededor y perfil del entorno en cualquier punto de México.'
        ),
        'og_title': 'Analiza una zona antes de abrir tu negocio',
    },
    'transporte': {
        'path': '/transporte',
        'title': 'Sistemas de transporte público — Distritos MX',
        'description': (
            'Metro, Metrobús, Cablebús, Tren Ligero, Trolebús, Mexibús, Suburbano y más: '
            'líneas, estaciones y datos de la movilidad en la Ciudad de México.'
        ),
        'og_title': 'El transporte público de la CDMX, en un mapa',
    },
    'vivienda': {
        'path': '/vivienda',
        'title': 'Indicadores de vivienda — Distritos MX',
        'description': (
            'Indicadores de vivienda por AGEB y colonia con datos del INEGI, para entender '
            'cómo se habita el territorio.'
        ),
        'og_title': 'Indicadores de vivienda por colonia',
    },
    'acerca-de': {
        'path': '/acerca-de',
        'title': 'Acerca de Distritos MX',
        'description': (
            'Qué es Distritos MX, de dónde vienen los datos que publicamos y cómo '
            'trabajamos el análisis territorial en México.'
        ),
        'og_title': 'Acerca de Distritos MX',
    },
    'despojos': {
        'path': '/proyectos/mapas/despojos-viviendas',
        'title': 'Despojo de vivienda en la CDMX: el mapa de los casos denunciados — Distritos MX',
        'description': (
            'Mapa interactivo del despojo de vivienda en la Ciudad de México a partir de las '
            'carpetas de investigación de la Fiscalía General de Justicia desde 2016: dónde se '
            'concentra, cómo cambia año con año y qué alcaldías acumulan más casos.'
        ),
        'og_title': 'Despojo de vivienda en la CDMX: el mapa de los casos denunciados',
        'og_description': (
            'Miles de carpetas de investigación por despojo abiertas ante la FGJ desde 2016, '
            'colocadas en el mapa: dónde se concentra, cómo cambia año con año y qué alcaldías '
            'acumulan más casos.'
        ),
        'image': 'images/despojossocial-og.jpg',
        'image_alt': (
            'Mapa de la Ciudad de México con las alcaldías sombreadas según el número de '
            'carpetas de investigación por despojo de vivienda'
        ),
        'og_type': 'article',
        'keywords': (
            'despojo de vivienda, despojo CDMX, invasión de inmuebles, FGJ CDMX, '
            'carpetas de investigación, mapa de despojos, Ciudad de México, datos abiertos'
        ),
        'section': 'Investigación',
        # Indexed by Google Dataset Search, which is where people looking for
        # this kind of source material actually start.
        'dataset': {
            'name': 'Carpetas de investigación por despojo de vivienda en la Ciudad de México',
            'description': (
                'Carpetas de investigación por el delito de despojo abiertas ante la Fiscalía '
                'General de Justicia de la Ciudad de México desde 2016, georreferenciadas y '
                'agregadas por alcaldía y por año.'
            ),
            'temporal': '2016/..',
            'spatial': 'Ciudad de México, México',
            'source': 'Fiscalía General de Justicia de la Ciudad de México — datos abiertos',
        },
    },
    'turistas': {
        'path': '/proyectos/mapas/turistas-cdmx-2024-2025',
        'title': 'Turistas en la CDMX 2024–2025 — Distritos MX',
        'description': (
            'Cómo se mueven las personas visitantes en la Ciudad de México: zonas más '
            'visitadas, temporalidad y concentración por colonia.'
        ),
        'og_title': 'Por dónde se mueven las personas turistas en la CDMX',
        'og_type': 'article',
    },
    'mundial': {
        'path': '/proyectos/mundial-2025',
        'title': 'Mundial 2025 — Distritos MX',
        'description': 'Proyecto de análisis territorial en torno al Mundial 2025.',
        'og_title': 'Mundial 2025 — Distritos MX',
        'og_type': 'article',
    },
}


def absolute(path_or_static):
    """Absolute URL from a site path or an already-resolved static URL."""
    if path_or_static.startswith(('http://', 'https://')):
        return path_or_static
    return f"{CANONICAL_ORIGIN}{path_or_static if path_or_static.startswith('/') else '/' + path_or_static}"


def seo_context(key='home'):
    """
    Build the template context for a page's metadata.

    Unknown keys fall back to the home entry rather than raising: a missing
    definition should degrade to the site-wide card, not break the page.
    """
    page = PAGES.get(key) or PAGES['home']

    image_url = absolute(static(page.get('image', DEFAULT_IMAGE)))
    description = page['description']

    return {
        'seo': {
            'title': page['title'],
            'description': description,
            'keywords': page.get('keywords'),
            'canonical': absolute(page['path']),
            'og_type': page.get('og_type', 'website'),
            'og_title': page.get('og_title', page['title']),
            'og_description': page.get('og_description', description),
            'image': image_url,
            'image_alt': page.get('image_alt', page.get('og_title', page['title'])),
            'site_name': SITE_NAME,
            'section': page.get('section'),
            'dataset': page.get('dataset'),
        }
    }
