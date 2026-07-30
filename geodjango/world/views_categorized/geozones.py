from django.http import JsonResponse
from world.models import *
from django.shortcuts import render
from world.transformers.geo_transformer import GeoTransformer
from world.models.neighbourhood import Neighbourhood

def geozones_ranges_collections_page(request):
    ranges = GeoZone.get_range_collection()
    
    return JsonResponse({'ranges': ranges })

def geozones_ranges_page(request, field):
    if field == 'cars' or field == 'bikes' or field == 'motorcycles':
        field = field + '_rate'
    rankings = GeoZone.get_ranges_for(field)
    
    return render(request, 'lines/edit/cards/legend/_explanation.html', { 
        'rankings': rankings,
        'field': field
    })

def geozones_find_page(request, coordinates, radius):
    geozones_list = GeoZone.find_all_with_radius(coordinates, radius)
    
    return JsonResponse({'geozones': geozones_list})

def geozones_overlapping_radius_page(request, coordinates, radius):
    x, y = map(float, coordinates.split(','))
    geozones_list = GeoZone.get_intersecting_geozones(x, y, float(radius))
    
    return JsonResponse({'geozones': geozones_list})

def get_all_agebs(request):
    agebs = GeoZone.objects.all()
    
    # Transform each AGEB to GeoJSON Feature format
    features = [GeoTransformer.from_model(ageb).to_dict() for ageb in agebs]
    
    # Create the complete GeoJSON structure
    geojson_data = {
        'type': 'FeatureCollection',
        'features': features
    }
    
    return JsonResponse(geojson_data, content_type='application/json')

def get_all_neighborhoods(request):
    neighborhoods = Neighbourhood.objects.all()

    # Transform each Neighbourhood to GeoJSON Feature format
    features = [GeoTransformer.from_model(neighborhood).to_dict() for neighborhood in neighborhoods]
    
    # Create the complete GeoJSON structure
    geojson_data = {
        'type': 'FeatureCollection',
        'features': features
    }
    
    return JsonResponse(geojson_data, content_type='application/json')