from django.shortcuts import render

def map_admin_page(request):
    return render(request, 'map-admin/index.html', {})

def mundial_2025_page(request):
    """Password-protected view for mundial-2025 project"""
    # Check if user is authenticated via session
    if not request.session.get('mundial_2025_authenticated', False):
        # Still render the page, but frontend will show login modal
        pass
    return render(request, 'map-admin/index.html', {})

def turistas_cdmx_2024_2025_page(request):
    """View for turistas CDMX 2024-2025 project - shows only map and navigation"""
    return render(request, 'map-admin/index.html', {})

def despojos_viviendas_page(request):
    """View for despojos de viviendas project - shows only map and navigation"""
    return render(request, 'map-admin/index.html', {})

def neighbourhoods_map_page(request):
    """View for displaying all neighbourhoods on a map"""
    return render(request, 'neighbourhoods/map.html', {})