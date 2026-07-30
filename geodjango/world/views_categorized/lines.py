
from world.models import *
from django.http import JsonResponse
from django.utils import timezone
from django.contrib.gis.geos import GEOSGeometry
from django.shortcuts import render, redirect, get_object_or_404
from django.contrib import messages
from django.urls import reverse

def line_new_page(request):
    if request.user.is_authenticated:
        form = LineForm()
        return render(request, 'lines/new.html', {'form': form})
    
    messages.error(request, 'Es necesario iniciar sesión para poder crear una nueva ruta')
    request.session['next'] = request.path
    return redirect(reverse('account_login'))

def line_new_create(request):
    form = LineForm(request.POST, request.FILES)
    if form.is_valid() and request.user.is_authenticated:
        line = form.save(commit=False)
        line.user = request.user
        line.updated_at = timezone.now()
        line.save()
        return redirect('line_edit_page', line_id=line.id)
    else:
        return render(request, 'lines/new.html', {'form': form})
    
def line_create_page(request):
    if request.method == 'POST':
        form = LineForm(request.POST, request.FILES)
        if form.is_valid():
            
            print("Saving")
            line = form.save(commit=False)
            line.updated_at = timezone.now()
            if form.cleaned_data['geom']:
                line.geom = GEOSGeometry(form.cleaned_data['geom'])  # Convert GeoJSON to GEOSGeometry
            line.save()
            return JsonResponse({'success': True })
        else:
            print("failure")
            return JsonResponse({'success': False, 'errors': form.errors}, status=400)
    else:
        form = LineForm()

    return render(request, 'lines/edit.html', {'form': form})

def line_edit_page(request, line_id):
    if not request.user.is_authenticated:
        messages.error(request, 'Es necesario iniciar sesión para poder modificar una ruta existente')
        request.session['next'] = request.path
        return redirect(f"{reverse('account_login')}")
    
    line = get_object_or_404(Line, pk=line_id)
    stations = line.stations.all().order_by('station_number')
    markers = line.markers.all()
    operation_succeeded = False

    seo_title = f" Detalles de {line.title()}"
    seo_description = line.description
    seo_image = line.get_flyer_url() 
    seo_keywords = line.tag_list()

    if request.method == 'POST':
        form = LineForm(request.POST, request.FILES, instance=line)
        if form.is_valid():
            line = form.save(commit=False)
            line.updated_at = timezone.now()
            line.save()
            for station in line.stations.all():
                station.save_with(line)
            operation_succeeded = True

        return render(request, 'lines/edit/cards/_general-info.html', {
            'line': line, 
            'stations': stations,
            'markers': markers,
            'form': form,
            'operation': 'line-updated',
            'operation_succeeded': operation_succeeded,
            'seo_title': seo_title,
            'seo_description': seo_description,
            'seo_image': seo_image,
            'seo_keywords': seo_keywords
        })
    else:
        new_station = Station()
        form = LineForm(instance=line)
        form_path = LinePathForm(instance=line)
        station_form = StationForm(instance=new_station)
        station_update_form = StationUpdateForm(instance=new_station)
        
        indicators = [
            {'id': 'population', 'title_r': 'Población Agregada', 'title_v': 'Población', 'selected': True},
            {'id': 'companies', 'title_r': 'Empresas', 'title_v': 'Empresas'},
            {'id': 'jobs', 'title_r': 'Trabajos', 'title_v': 'Trabajos'},
            {'id': 'education', 'title_r': 'Educación', 'title_v': 'Educación'},
            {'id': 'health', 'title_r': 'Salud', 'title_v': 'Salud'},
            {'id': 'provision', 'title_r': 'Comercio', 'title_v': 'Comercio'},
            {'id': 'leisure', 'title_r': 'Ocio', 'title_v': 'Ocio'},
            {'id': 'housing', 'title_r': 'Vivienda', 'title_v': 'Vivienda'},
            {'id': 'cars', 'title_r': 'Autos', 'title_v': 'Autos'},
            {'id': 'bikes', 'title_r': 'Bicis', 'title_v': 'Bicis'},
            {'id': 'motorcycles', 'title_r': 'Motos', 'title_v': 'Motos'}
        ]

        return render(request, 'lines/edit.html', {
            'form': form, 
            'form_path': form_path, 
            'station_form': station_form, 
            'station_update_form': station_update_form,
            'line': line, 
            'stations': stations,
            'markers': markers,
            'indicators': indicators,
            'rankings': GeoZone.get_ranges_for('population')
        })

def line_delete(request, line_id):
    line = get_object_or_404(Line, pk=line_id)
    if line.delete():
       messages.success(request, 'La ruta ha sido eliminada exitosamente')
    else:
        messages.error(request, 'Lo sentimos, pero no fué posible eliminar la ruta')

    return redirect('home')

def lines_path_edit_page(request, line_id):
    line = get_object_or_404(Line, pk=line_id)
    saved_successfully = False

    if request.method == 'POST':
        form = LinePathForm(request.POST, instance=line)
        
        if form.is_valid():
            line = form.save(commit=False)
            line.updated_at = timezone.now()
            if form.cleaned_data['geom']:
                line.geom = GEOSGeometry(form.cleaned_data['geom'])
                line.save()
                saved_successfully = True
        return render(request, 'lines/edit/cards/_line-path.html', { 
                'line': line,
                'operation': 'line-updated',
                'operation_succeeded': saved_successfully,
                'form_path': form
            })
    else:
        return render(request, 'lines_path_edit.html', {'line': line})

def line_details_slug_page(request, slug):
    line = get_object_or_404(Line, slug=slug)
    line_form = LineDescriptionForm(instance=line)
    current_tags = line.tags.all()

    seo_title = f" Detalles de {line.title()}"
    seo_description = line.description
    seo_image = line.get_flyer_url() 
    seo_keywords = line.tag_list()
    
    return render(request, 'lines/details.html', { 
        'line': line, 
        'line_form': line_form, 
        'current_tags': current_tags,
        'seo_title': seo_title,
        'seo_description': seo_description,
        'seo_image': seo_image,
        'seo_keywords': seo_keywords
    })

def line_description_form(request, line_id):
    line = get_object_or_404(Line, pk=line_id)
    line_form = LineDescriptionForm()
    return render(request, 'lines/show/_edit_description.html', { 'line': line, 'line_form': line_form, 'edit_mode': True })

def line_description_show(request, line_id):
    line = get_object_or_404(Line, pk=line_id)
    
    return render(request, 'lines/show/_description.html', { 'line': line, 'edit_mode': True })

def line_description_update(request, line_id):
    line = get_object_or_404(Line, pk=line_id)
    
    line_form = LineDescriptionForm(request.POST, instance=line)
    if line_form.is_valid():
        line = line_form.save(commit=False)
        line.updated_at = timezone.now()
        line.save()

        return render(request, 'lines/show/_description.html', { 'line': line, 'edit_mode': True })
    else:
        return JsonResponse({'success': False, 'endpoint': '/description/update' }, status=400)

def line_flyer_update(request, line_id):
    line = get_object_or_404(Line, pk=line_id)
    
    line_flyer_form = LineFlyerForm(request.POST, request.FILES, instance=line)

    if line_flyer_form.is_valid():
        line = line_flyer_form.save(commit=False)
        line.updated_at = timezone.now()
        line.save()

    return render(request, 'lines/show/_flyer.html', { 'line': line, 'line_flyer_form': line_flyer_form, 'edit_mode': True })

def line_flyer_delete(request, line_id):
    line = get_object_or_404(Line, pk=line_id)
    line_flyer_form = LineFlyerForm(instance=line)

    line.flyer.delete()
    line.save()
    
    return render(request, 'lines/show/_flyer.html', { 'line': line, 'line_flyer_form': line_flyer_form, 'edit_mode': True })

def line_flyer_form(request, line_id):
    line = get_object_or_404(Line, pk=line_id)
    line_flyer_form = LineFlyerForm(instance=line)
    return render(request, 'lines/show/_edit_flyer.html', { 'line': line, 'line_flyer_form': line_flyer_form, 'edit_mode': True })

def line_flyer(request, line_id):
    line = get_object_or_404(Line, pk=line_id)
    line_flyer_form = LineFlyerForm(instance=line)
    return render(request, 'lines/show/_flyer.html', { 'line': line, 'line_flyer_form': line_flyer_form, 'edit_mode': True })

def validate_line(request, line_id):
    line = get_object_or_404(Line, pk=line_id)
    
    return JsonResponse({'preview-ready': line.ready_for_preview(), 'save-ready': line.ready_for_publish() })

def line_preview_page(request, line_id):
    if not request.user.is_authenticated:
        messages.error(request, 'Es necesario iniciar sesión para poder previsualizar una ruta existente')
        request.session['next'] = request.path
        return redirect(f"{reverse('account_login')}")
    
    line = get_object_or_404(Line, pk=line_id)
    line_form = LineDescriptionForm(instance=line)
    line_flyer_form = LineFlyerForm(instance=line)
    current_tags = line.tags.all()

    seo_title = f" Previsualizando {line.title()}"
    seo_description = line.description
    seo_image = line.get_flyer_url()
    seo_keywords = line.tag_list()

    return render(request, 'lines/show.html', { 
        'line': line, 
        'line_form': line_form, 
        'line_flyer_form': line_flyer_form, 
        'current_tags': current_tags, 
        'edit_mode': True,
        'seo_title': seo_title,
        'seo_description': seo_description,
        'seo_image': seo_image,
        'seo_keywords': seo_keywords
    })

def line_details_page(request, line_id):
    line = get_object_or_404(Line, pk=line_id)
    current_tags = line.tags.all()

    return render(request, 'lines/details.html', { 
        'line': line, 
        'current_tags': current_tags
    })

def line_publish_modal(request, line_id):
    line = get_object_or_404(Line, pk=line_id)
    return render(request, 'lines/show/_publish_modal.html', { 'line': line })

def line_change_publish_state(request, line_id):
    line = get_object_or_404(Line, pk=line_id)

    if line.mode == Line.Mode.PUBLISHED:
        line.mode = Line.Mode.DRAFT
    else:
        line.mode = Line.Mode.PUBLISHED
    line.save()
    
    return render(request, 'lines/show/_route_mode_changed_modal.html', { 'line': line })

def line_details(request, line_id):
    line = get_object_or_404(Line, pk=line_id)
    
    stations_geojson = [{ 'id': station.id, 'name': station.name, 'icon': station.get_icon_url(), 'lat': station.coordinates.y, 'lng': station.coordinates.x, 'geometry': station.coordinates.geojson } for station in line.stations.all()]
    markers_geojson = [{ 'id': marker.id, 'name': marker.name, 'description': marker.description, 'icon': marker.get_icon_url(), 'lat': marker.coordinates.y, 'lng': marker.coordinates.x, 'geometry': marker.coordinates.geojson } for marker in line.markers.all()] 

    return JsonResponse({
        'lineGeometry': line.geom.geojson, 
        'color': line.color, 
        'name': line.route, 
        'identifier': line.identifier,
        'named_identifier': line.named_identifier(),
        'system': line.system_name(),
        'stations': stations_geojson,
        'markers': markers_geojson
    })

def line_set_map_theme(request, line_id, theme_name):
    line = get_object_or_404(Line, pk=line_id)
    line.theme = theme_name
    line.save()
    
    return JsonResponse({'theme_url': line.theme_url() })