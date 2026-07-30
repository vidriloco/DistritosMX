from django.utils import timezone
from django.contrib.gis.geos import GEOSGeometry
from django.shortcuts import render, get_object_or_404
from world.models import *

def lines_station_update_page(request, line_id, station_id):
    line = get_object_or_404(Line, pk=line_id)
    station = get_object_or_404(Station, pk=station_id)
    station_form = StationForm(instance=station)
    station_update_form = StationUpdateForm(request.POST, request.FILES, instance=station)
    message = "No fue posible actualizar la estación"

    if request.method == 'POST':
        if station_update_form.is_valid():
            station = station_update_form.save(commit=False)
            station.updated_at = timezone.now()
            station.save_with(line)
            message = "La estación fue actualizada con éxito"
        return render(request, 'lines/edit/cards/_list_of_stations.html', { 
            'line': line,
            'stations': line.stations.all().order_by('station_number'),
            'operation': 'station-updated',
            'station_form': station_form,
            'station_update_form': station_update_form,
            'station_id': station_id,
            'message': message
        })

def lines_station_create_page(request, line_id):
    line = get_object_or_404(Line, pk=line_id)
    new_station = Station()
    message = "No fue posible crear la estación"

    if request.method == 'POST':
        form = StationForm(request.POST, request.FILES)
        station_form = StationForm(instance=new_station)
        station_update_form = StationUpdateForm(instance=new_station)

        if form.is_valid():
            station = form.save(commit=False)
            station.updated_at = timezone.now()
            if form.cleaned_data['coordinates']:
                station.coordinates = GEOSGeometry(form.cleaned_data['coordinates'])
                station.save_with(line)
                line.stations.add(station)
                message = "Estación creada con éxito"
            return render(request, 'lines/edit/cards/_list_of_stations.html', { 
                'line': line,
                'stations': line.stations.all().order_by('station_number'), 
                'operation': 'station-created',
                'station_id': station.id,
                'station_form': station_form,
                'station_update_form': station_update_form,
                'message': message
            })
        else:
            return render(request, 'lines/edit/cards/_list_of_stations.html', { 
                'line': line,
                'stations': line.stations.all().order_by('station_number'), 
                'operation': 'station-failed',
                'station_form': station_form,
                'station_update_form': station_update_form,
                'message': message
            })

def lines_stations_page(request, line_id):
    line = get_object_or_404(Line, pk=line_id)
    station_form = StationForm(instance=Station())
    station_update_form = StationUpdateForm()

    return render(request, 'lines/edit/cards/_list_of_stations.html', { 
        'line': line,
        'stations': line.stations.all().order_by('station_number'),
        'operation': 'stations-refreshed',
        'station_form': station_form,
        'station_update_form': station_update_form
    })

def lines_station_delete_page(request, line_id, station_id):
    line = get_object_or_404(Line, pk=line_id)
    station = get_object_or_404(Station, pk=station_id)
    line.stations.remove(station)

    if station.lines.count() == 0:
        station.delete()

    station_form = StationForm(instance=Station())

    return render(request, 'lines/edit/cards/_list_of_stations.html', { 
        'line': line,
        'stations': line.stations.all().order_by('station_number'),
        'operation': 'station-deleted',
        'station_form': station_form,
        'station_id': station_id
    })

def line_station_details(request, line_id, station_id):
    line = get_object_or_404(Line, pk=line_id)
    station = get_object_or_404(Station, pk=station_id)
    
    return render(request, 'stations/show.html', { 
        'station': station,
        'line': line
    })

def line_station_barrio_details(request, line_id, station_id, radius):
    line = get_object_or_404(Line, pk=line_id)
    station = get_object_or_404(Station, pk=station_id)
    
    if not hasattr(station, 'stats') or station.stats is None:
        station.stats = StationStats.objects.create(station=station)
    stationStats = station.stats
    
    indicators = [
        {'id': 'population', 'title': 'Población', 'stats': f"{stationStats.get_population(radius):,}" },
        {'id': 'housing', 'title': 'Vivienda', 'stats': f"{stationStats.get_housing(radius):,}" },
        {'id': 'companies', 'title': 'Empresas', 'stats': f"{stationStats.get_companies(radius):,}" },
        {'id': 'jobs', 'title': 'Trabajos', 'stats': f"{stationStats.get_jobs(radius):,}" },
        {'id': 'education', 'title': 'Escuelas','stats': f"{stationStats.get_education(radius):,}" },
        {'id': 'health', 'title': 'Centros de salud', 'stats': f"{stationStats.get_health(radius):,}" },
        {'id': 'provision', 'title': 'Comercio', 'stats': f"{stationStats.get_companies(radius):,}" },
        {'id': 'leisure', 'title': 'Espacios de ocio', 'stats': f"{stationStats.get_leisure(radius):,}" },
        {'id': 'cars', 'title': 'Autos', 'stats': f"{stationStats.get_cars(radius):,}" },
        {'id': 'bikes', 'title': 'Bicis', 'stats': f"{stationStats.get_bikes(radius):,}" },
        {'id': 'motorcycles', 'title': 'Motos', 'stats': f"{stationStats.get_motorcycles(radius):,}" },
    ]
    
    return render(request, 'stations/show_with_barrio.html', { 
        'station': station,
        'line': line,
        'indicators': indicators,
        'radius': radius
    })