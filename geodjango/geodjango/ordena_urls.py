"""ordena.laciudad.mx — Opine, the citizen site for the POZMVM consultation.

The pages are the Vite build in ordena/ (kept with its own design, not the
map site's), so this host only answers the consultation's API under /api/ and
hands every other path to that build: a file if there is one, the page the SEO
build pre-rendered for the route if there is one, and the app shell otherwise.
"""

import mimetypes

from django.conf import settings
from django.contrib import admin
from django.http import FileResponse, Http404
from django.urls import include, path, re_path
from django.views.decorators.http import require_GET

mimetypes.add_type('application/javascript', '.mjs')


@require_GET
def ordena_frontend(request, ruta=''):
    dist = settings.ORDENA_DIST.resolve()
    destino = (dist / ruta).resolve()
    # Nothing outside the build, whatever the path says.
    if destino != dist and dist not in destino.parents:
        raise Http404
    if destino.is_dir():
        destino = destino / 'index.html'
    if not destino.is_file():
        # A stale asset is a 404, not the app shell served as JavaScript.
        if ruta.startswith('assets/'):
            raise Http404
        # A client-side route the SEO build did not pre-render.
        destino = dist / 'index.html'
        if not destino.is_file():
            raise Http404('Falta compilar ordena/ (npm run build)')
    respuesta = FileResponse(open(destino, 'rb'))
    if ruta.startswith('assets/'):
        # Vite hashes asset file names, so they can be cached for a year.
        respuesta['Cache-Control'] = 'public, max-age=31536000, immutable'
    else:
        respuesta['Cache-Control'] = 'no-cache'
    return respuesta


urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include('consulta.urls')),
    re_path(r'^(?P<ruta>.*)$', ordena_frontend),
]
