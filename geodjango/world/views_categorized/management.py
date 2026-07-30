from django.shortcuts import render

from world.seo import seo_context

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
    key = MAP_ADMIN_SEO_BY_PATH.get(request.path.rstrip('/') or '/', 'home')
    return render(request, 'map-admin/index.html', seo_context(key))

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