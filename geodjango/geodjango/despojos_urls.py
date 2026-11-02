"""despojos.laciudad.mx — the despojos de vivienda map on its own subdomain.

The root serves that page. Everything else the page needs (its API, data and
static files) is the main site's URLs on this same host, so they stay relative.
In the browser, SimpleRouter reads the subdomain's root as the despojos route
and sends any other page back to the main site (see window.routePath in
map-admin/index.html).
"""

from django.urls import path

from geodjango.urls import urlpatterns as main_urlpatterns
from world.views_categorized.management import despojos_viviendas_page

urlpatterns = [
    path('', despojos_viviendas_page, name='despojos_home'),
] + main_urlpatterns
