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

The same definitions feed the sitemap, the client-side route updater (so a
navigation inside the app keeps the right tags) and the short heading and
summary rendered into the page body before React mounts, which is the only
text a crawler that does not run the app's in-browser Babel gets to read.
"""

from django.conf import settings
from django.templatetags.static import static

# The public origin every absolute URL is built from. Overridable so staging
# does not advertise production URLs — and so renaming the site is one edit.
# The site moved from distritos.mx, which no longer resolves; a canonical left
# pointing there tells search engines to index a domain that is gone.
CANONICAL_ORIGIN = getattr(
    settings, 'SEO_CANONICAL_ORIGIN', 'https://laciudad.mx'
).rstrip('/')

# The name in the logo and the header; titles and cards have to match it.
SITE_NAME = 'Ciudad MX'
DEFAULT_IMAGE = 'images/opengraph-seo.jpg'

# Keyed by the `seo` argument the view passes. `path` is the canonical path for
# that page, which is not always the path the visitor arrived on.
#
# `heading` and `summary` are the visible text served before the app loads.
# `index: False` keeps a page out of search and the sitemap; `priority` is its
# sitemap weight.
PAGES = {
    'home': {
        'path': '/',
        'title': 'Ciudad MX — Mapas y datos para entender la Ciudad de México',
        'description': (
            'Mapas interactivos con datos abiertos del INEGI, la FGJ y el DENUE: población, '
            'empleo, inseguridad, vivienda, negocios y transporte público por colonia y AGEB.'
        ),
        'og_title': 'Ciudad MX — Mapas y datos para entender tu ciudad',
        'heading': 'Mapas y datos para entender la Ciudad de México',
        'summary': (
            'Respuestas basadas en datos a preguntas que todos nos hacemos: dónde vivir, '
            'dónde abrir un negocio, cómo moverse y qué pasa en cada colonia.'
        ),
        'priority': '1.0',
    },
    'explorar': {
        'path': '/explorar',
        'title': 'Explorador de datos por colonia y AGEB — Ciudad MX',
        'description': (
            'Mapa interactivo con datos del INEGI, la FGJ e Inside Airbnb: población, empleo, '
            'equipamiento, inseguridad, rentas y transporte por AGEB, colonia o radio.'
        ),
        'og_title': 'Explora la ciudad capa por capa',
        'heading': 'Explorador de datos por colonia y AGEB',
        'summary': (
            'Elige una unidad espacial —AGEB, colonia o un radio alrededor de un punto— y un '
            'tema: oportunidades, inseguridad, vivienda o movilidad. Las zonas se pintan según '
            'el indicador y el panel suma los totales.'
        ),
        'priority': '0.9',
    },
    'negocios': {
        'path': '/negocios',
        'title': 'Analiza una zona antes de abrir tu negocio — Ciudad MX',
        'description': (
            'Estudia una zona antes de abrir: cuántos negocios como el tuyo hay alrededor '
            '(DENUE), cuánta gente vive ahí (Censo) y cómo es el entorno (FGJ), en un radio '
            'de 100, 350 u 800 metros.'
        ),
        'og_title': 'Analiza una zona antes de abrir tu negocio',
        'heading': 'Estudia una zona antes de abrir tu negocio',
        'summary': (
            'Escribe una dirección o marca un punto en el mapa, elige hasta tres giros y '
            'consulta la competencia, la población y el entorno alrededor. Descarga el '
            'informe en PDF.'
        ),
        'priority': '0.9',
    },
    'transporte': {
        'path': '/transporte',
        'title': 'Mapa del transporte público de la CDMX — Ciudad MX',
        'description': (
            'Metro, Metrobús, Cablebús, Tren Ligero, Trolebús, Mexibús, Suburbano y más: '
            'líneas, estaciones y datos de la movilidad en la Ciudad de México.'
        ),
        'og_title': 'El transporte público de la CDMX, en un mapa',
        'heading': 'El transporte público de la Ciudad de México, en un mapa',
        'summary': (
            'Líneas y estaciones del Metro, Metrobús, Cablebús, Tren Ligero, Trolebús, '
            'Mexibús, Suburbano, RTP y Ecobici, con datos de movilidad por hora.'
        ),
        'priority': '0.7',
    },
    'vivienda': {
        'path': '/vivienda',
        'title': 'Comprar o rentar: indicadores de vivienda por colonia — Ciudad MX',
        'description': (
            'Indicadores de calidad de vida por colonia para decidir dónde comprar o rentar '
            'vivienda en la Ciudad de México: precios, servicios, seguridad y gentrificación.'
        ),
        'og_title': '¿Me conviene comprar o rentar aquí?',
        'heading': '¿Me conviene comprar o rentar aquí?',
        'summary': (
            'Consulta los principales indicadores de calidad de vida en tu zona: precios, '
            'disponibilidad de servicios, gentrificación y seguridad.'
        ),
        'priority': '0.6',
    },
    'acerca-de': {
        'path': '/acerca-de',
        'title': 'Acerca de Ciudad MX',
        'description': (
            'Qué es Ciudad MX, de dónde vienen los datos que publicamos y cómo '
            'trabajamos el análisis territorial en México.'
        ),
        'og_title': 'Acerca de Ciudad MX',
        'heading': 'Acerca de Ciudad MX',
        # Placeholder text only so far; a thin page drags the site down.
        # Index it once it says something.
        'index': False,
    },
    'despojos': {
        'path': '/proyectos/mapas/despojos-viviendas',
        'title': 'Despojo de vivienda en la CDMX: el mapa de los casos denunciados — Ciudad MX',
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
        'heading': 'Despojo de vivienda en la CDMX: el mapa de los casos denunciados',
        'summary': (
            'Carpetas de investigación por despojo abiertas ante la Fiscalía General de '
            'Justicia de la Ciudad de México desde 2016, en el mapa y por alcaldía.'
        ),
        'priority': '0.9',
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
        'title': 'Turistas en la CDMX 2024–2025: por dónde se mueven — Ciudad MX',
        'description': (
            'Cómo se mueven las personas visitantes en la Ciudad de México: zonas más '
            'visitadas, temporalidad y concentración por colonia.'
        ),
        'og_title': 'Por dónde se mueven las personas turistas en la CDMX',
        'og_type': 'article',
        'heading': 'Turistas en la CDMX 2024–2025',
        'summary': (
            'Zonas más visitadas, temporalidad y concentración por colonia de las personas '
            'visitantes en la Ciudad de México.'
        ),
        'priority': '0.7',
    },
    'mundial': {
        'path': '/proyectos/mundial-2025',
        'title': 'Mundial 2025 — Ciudad MX',
        'description': 'Proyecto de análisis territorial en torno al Mundial 2025.',
        'og_title': 'Mundial 2025 — Ciudad MX',
        'og_type': 'article',
        # Behind a password: nothing a search result could show.
        'index': False,
    },
    # The legal pages render their own templates; listed here for the sitemap.
    'privacidad': {
        'path': '/privacidad',
        'title': 'Aviso de Privacidad — Ciudad MX',
        'description': 'Cómo trata Ciudad MX los datos personales que recibe.',
        'priority': '0.2',
    },
    'terminos': {
        'path': '/terminos',
        'title': 'Términos y Condiciones — Ciudad MX',
        'description': 'Condiciones de uso de Ciudad MX.',
        'priority': '0.2',
    },
}


def absolute(path_or_static):
    """Absolute URL from a site path or an already-resolved static URL."""
    if path_or_static.startswith(('http://', 'https://')):
        return path_or_static
    return f"{CANONICAL_ORIGIN}{path_or_static if path_or_static.startswith('/') else '/' + path_or_static}"


def _page_tags(page):
    """The tags of one page, as both the template and the client updater use them."""
    description = page['description']
    return {
        'title': page['title'],
        'description': description,
        'keywords': page.get('keywords'),
        'canonical': absolute(page['path']),
        'robots': 'index, follow' if page.get('index', True) else 'noindex, follow',
        'og_type': page.get('og_type', 'website'),
        'og_title': page.get('og_title', page['title']),
        'og_description': page.get('og_description', description),
        'image': absolute(static(page.get('image', DEFAULT_IMAGE))),
        'image_alt': page.get('image_alt', page.get('og_title', page['title'])),
    }


def seo_context(key='home'):
    """
    Build the template context for a page's metadata.

    Unknown keys fall back to the home entry rather than raising: a missing
    definition should degrade to the site-wide card, not break the page.
    """
    page = PAGES.get(key) or PAGES['home']

    return {
        'seo': {
            **_page_tags(page),
            'site_name': SITE_NAME,
            'origin': CANONICAL_ORIGIN,
            'home_url': absolute('/'),
            'logo': absolute(static('images/web-icon.png')),
            'section': page.get('section'),
            'dataset': page.get('dataset'),
            'heading': page.get('heading', page.get('og_title', page['title'])),
            'summary': page.get('summary', page['description']),
            # Every page's tags by path, for the in-app navigation to switch
            # to without reloading. Rendered with json_script.
            'routes': {p['path']: _page_tags(p) for p in PAGES.values()},
        }
    }


def sitemap_entries():
    """Absolute URL and priority of every page that should be in search."""
    return [
        {'loc': absolute(p['path']), 'priority': p.get('priority', '0.5')}
        for p in PAGES.values()
        if p.get('index', True)
    ]
