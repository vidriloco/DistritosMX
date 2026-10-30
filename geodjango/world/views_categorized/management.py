from django.http import HttpResponse
from django.shortcuts import render
from django.views.decorators.http import require_GET

from world.seo import CANONICAL_ORIGIN, seo_context, sitemap_entries

# The whole app is one template served under many paths, so the SEO key cannot
# come from the template — the view has to say which page this is. Crawlers
# never run the client-side router that would otherwise decide it.
MAP_ADMIN_SEO_BY_PATH = {
    '/': 'home',
    '/explorar': 'explorar',
    '/negocios': 'negocios',
    '/transporte': 'transporte',
    '/vivienda': 'vivienda',
    '/acerca-de': 'acerca-de',
}

def map_admin_page(request):
    path = request.path.rstrip('/') or '/'
    key = MAP_ADMIN_SEO_BY_PATH.get(path)
    # /negocios/review and /negocios/stats are views of the same tool, so they
    # share its tags and canonical rather than falling back to the home page's.
    if key is None and path.startswith('/negocios/'):
        key = 'negocios'
    return render(request, 'map-admin/index.html', seo_context(key or 'home'))


@require_GET
def robots_txt(request):
    # Served by the app, not as a static file: Cloudflare puts its own
    # content-signals block in front of whatever the origin answers here, and
    # with no origin file crawlers got that block alone — no rules, no sitemap.
    lines = [
        'User-agent: *',
        'Allow: /',
        'Disallow: /admin/',
        'Disallow: /dashboard/',
        'Disallow: /api/',
        'Disallow: /proyectos/mundial-2025',
        '',
        f'Sitemap: {CANONICAL_ORIGIN}/sitemap.xml',
        '',
    ]
    return HttpResponse('\n'.join(lines), content_type='text/plain; charset=utf-8')


@require_GET
def sitemap_xml(request):
    urls = ''.join(
        f'  <url><loc>{e["loc"]}</loc><priority>{e["priority"]}</priority></url>\n'
        for e in sitemap_entries()
    )
    body = (
        '<?xml version="1.0" encoding="UTF-8"?>\n'
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
        f'{urls}'
        '</urlset>\n'
    )
    return HttpResponse(body, content_type='application/xml; charset=utf-8')

def mundial_2025_page(request):
    """Password-protected view for mundial-2025 project"""
    # Check if user is authenticated via session
    if not request.session.get('mundial_2025_authenticated', False):
        # Still render the page, but frontend will show login modal
        pass
    return render(request, 'map-admin/index.html', seo_context('mundial'))

def turistas_cdmx_2024_2025_page(request):
    """View for turistas CDMX 2024-2025 project - shows only map and navigation"""
    return render(request, 'map-admin/index.html', seo_context('turistas'))

def despojos_viviendas_page(request):
    """View for despojos de viviendas project - shows only map and navigation"""
    return render(request, 'map-admin/index.html', seo_context('despojos'))

def neighbourhoods_map_page(request):
    """View for displaying all neighbourhoods on a map"""
    return render(request, 'neighbourhoods/map.html', {})