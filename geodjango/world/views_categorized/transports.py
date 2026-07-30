from world.models import *
from django.http import JsonResponse
from django.utils import timezone
from django.contrib.gis.geos import GEOSGeometry
from django.shortcuts import render, redirect, get_object_or_404
from django.contrib import messages
from django.urls import reverse
from django.core.management import call_command
from world.transformers.metro_transformer import MetroLineTransformer, MetroStationTransformer
from world.transformers.cablebus_transformer import CablebusLineTransformer, CablebusStationTransformer
from world.transformers.concesionados_transformer import ConcesionadosLineTransformer, ConcesionadosStationTransformer
from world.transformers.interurbano_transformer import InterurbanoLineTransformer, InterurbanoStationTransformer
from world.transformers.metrobus_transformer import MetrobusLineTransformer, MetrobusStationTransformer
from world.transformers.rtp_transformer import RTPLineTransformer, RTPStationTransformer
from world.transformers.suburbano_transformer import SuburbanoLineTransformer, SuburbanoStationTransformer
from world.transformers.tren_ligero_transformer import TrenLigeroLineTransformer, TrenLigeroStationTransformer
from world.transformers.trolebus_transformer import TrolebusLineTransformer, TrolebusStationTransformer
from world.transformers.mexicable_transformer import MexicableLineTransformer, MexicableStationTransformer
from world.transformers.mexibus_transformer import MexibusLineTransformer, MexibusStationTransformer
from world.transformers.ecobici_transformer import EcobiciStationTransformer
from world.models.official_transports.ecobici_stations import EcobiciGroup
from world.transformers.protocols import TransportGeoJSONTransformer
from django.contrib.auth.decorators import login_required, user_passes_test
import requests
import boto3
from botocore.exceptions import ClientError
import os
from django.conf import settings

def get_selected_transport_geojson(request, transport_type):
    geojson_data = {}
    if transport_type == 'metro':
        metro_lines = MetroLine.objects.all()
        metro_stations = MetroStation.objects.all()
        
        geojson_data = TransportGeoJSONTransformer.from_model(
            [MetroLineTransformer.from_model(line) for line in metro_lines],
        ).to_geojson()
    
    elif transport_type == 'cablebus':
        cablebus_lines = CablebusLine.objects.all()
        cablebus_stations = CablebusStation.objects.all()
        geojson_data = TransportGeoJSONTransformer.from_model(
            [CablebusLineTransformer.from_model(line) for line in cablebus_lines],
        ).to_geojson()
    elif transport_type == 'concesionados':
        concesionados_lines = ConcesionadosLine.objects.all()
        geojson_data = TransportGeoJSONTransformer.from_model(
            [ConcesionadosLineTransformer.from_model(line) for line in concesionados_lines],
        ).to_geojson()
    elif transport_type == 'tren-interurbano':
        interurbano_lines = InterurbanoLine.objects.all()
        geojson_data = TransportGeoJSONTransformer.from_model(
            [InterurbanoLineTransformer.from_model(line) for line in interurbano_lines],
        ).to_geojson()
    elif transport_type == 'metrobus':
        metrobus_lines = MetrobusLine.objects.all()
        geojson_data = TransportGeoJSONTransformer.from_model(
            [MetrobusLineTransformer.from_model(line) for line in metrobus_lines],
        ).to_geojson()
    elif transport_type == 'rtp':
        rtp_lines = RTPLine.objects.all()
        geojson_data = TransportGeoJSONTransformer.from_model(
            [RTPLineTransformer.from_model(line) for line in rtp_lines],
        ).to_geojson()
    elif transport_type == 'tren-suburbano':
        suburbano_lines = SuburbanoLine.objects.all()
        geojson_data = TransportGeoJSONTransformer.from_model(
            [SuburbanoLineTransformer.from_model(line) for line in suburbano_lines],
        ).to_geojson()
    elif transport_type == 'tren-ligero':
        tren_ligero_lines = TrenLigeroLine.objects.all()
        geojson_data = TransportGeoJSONTransformer.from_model(
            [TrenLigeroLineTransformer.from_model(line) for line in tren_ligero_lines],
        ).to_geojson()
    elif transport_type == 'trolebus':
        trolebus_lines = TrolebusLine.objects.all()
        geojson_data = TransportGeoJSONTransformer.from_model(
            [TrolebusLineTransformer.from_model(line) for line in trolebus_lines],
        ).to_geojson()
    elif transport_type == 'mexicable':
        mexicable_lines = MexicableLine.objects.all()
        geojson_data = TransportGeoJSONTransformer.from_model(
            [MexicableLineTransformer.from_model(line) for line in mexicable_lines],
        ).to_geojson()
    elif transport_type == 'mexibus':
        mexibus_lines = MexibusLine.objects.all()
        geojson_data = TransportGeoJSONTransformer.from_model(
            [MexibusLineTransformer.from_model(line) for line in mexibus_lines],
        ).to_geojson()
    elif transport_type == 'ecobici':
        ecobici_stations = EcobiciStation.objects.all()
        ecobici_group = EcobiciGroup([EcobiciStationTransformer.from_model(station) for station in ecobici_stations])
        geojson_data = TransportGeoJSONTransformer.from_model([ecobici_group]).to_geojson()
    
    return JsonResponse(geojson_data)

def get_all_transports(request):
    response_data = {}
    
    metro_lines = MetroLine.objects.all()
    response_data['metro'] = [MetroLineTransformer.from_model(line).to_dict() for line in metro_lines]
    
    cablebus_lines = CablebusLine.objects.all()
    response_data['cablebus'] = [CablebusLineTransformer.from_model(line).to_dict() for line in cablebus_lines]
    
    concesionados_lines = ConcesionadosLine.objects.all()
    response_data['concesionados'] = [ConcesionadosLineTransformer.from_model(line).to_dict() for line in concesionados_lines]
    
    interurbano_lines = InterurbanoLine.objects.all()
    response_data['interurbano'] = [InterurbanoLineTransformer.from_model(line).to_dict() for line in interurbano_lines]
        
    metrobus_lines = MetrobusLine.objects.all()
    response_data['metrobus'] = [MetrobusLineTransformer.from_model(line).to_dict() for line in metrobus_lines]
        
    rtp_lines = RTPLine.objects.all()
    response_data['rtp'] = [RTPLineTransformer.from_model(line).to_dict() for line in rtp_lines]
        
    suburbano_lines = SuburbanoLine.objects.all()
    response_data['suburbano'] = [SuburbanoLineTransformer.from_model(line).to_dict() for line in suburbano_lines]
        
    tren_ligero_lines = TrenLigeroLine.objects.all()
    response_data['tren-ligero'] = [TrenLigeroLineTransformer.from_model(line).to_dict() for line in tren_ligero_lines]
        
    trolebus_lines = TrolebusLine.objects.all()
    response_data['trolebus'] = [TrolebusLineTransformer.from_model(line).to_dict() for line in trolebus_lines]

    mexicable_lines = MexicableLine.objects.all()
    response_data['mexicable'] = [MexicableLineTransformer.from_model(line).to_dict() for line in mexicable_lines]

    mexibus_lines = MexibusLine.objects.all()
    response_data['mexibus'] = [MexibusLineTransformer.from_model(line).to_dict() for line in mexibus_lines]

    # Add Ecobici stations
    ecobici_stations = EcobiciStation.objects.all()
    response_data['ecobici'] = [EcobiciStationTransformer.from_model(station).to_dict() for station in ecobici_stations]

    return JsonResponse(response_data)

def is_superuser(user):
    return user.is_authenticated and user.is_superuser

def get_transport_systems():
    """Return the list of available transport systems."""
    return [
        'metro',
        'cablebus',
        'concesionados',
        'tren-interurbano',
        'metrobus',
        'rtp',
        'tren-suburbano',
        'tren-ligero',
        'trolebus',
        'mexicable',
        'mexibus',
        'ecobici'
    ]

def upload_system_geojson_to_s3(s3_client, system, request):
    """Upload a system's GeoJSON to S3."""
    try:
        # Get the GeoJSON data directly from our function
        geojson_response = get_selected_transport_geojson(request, system)
        geojson_data = geojson_response.content
        
        # Upload to S3
        s3_client.put_object(
            Bucket=settings.AWS_STORAGE_BUCKET_NAME,
            Key=f'transports/geojsons/{system}.geojson',
            Body=geojson_data,
            ContentType='application/json'
        )
        return True, f"Successfully uploaded {system} GeoJSON to S3"
    except Exception as e:
        return False, f"Error processing {system}: {str(e)}"

@login_required
@user_passes_test(is_superuser)
def perform_sync(request):
    """Perform the actual sync operation by calling the management command."""
    try:
        # Initialize S3 client
        s3_client = boto3.client(
            's3',
            aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
            aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
            region_name=settings.AWS_S3_REGION_NAME
        )
        
        # For each system, generate its GeoJSON and upload to S3
        for system in get_transport_systems():
            success, message = upload_system_geojson_to_s3(s3_client, system, request)
            if not success:
                return False, message
                
        return True, "Transport data synchronized and uploaded to S3 successfully"
    except Exception as e:
        return False, f"Error during synchronization: {str(e)}"

@login_required
@user_passes_test(is_superuser)
def sync_transports_index(request):
    if not request.user.is_authenticated or not request.user.is_superuser:
        return redirect('/')
        
    if request.method == 'POST':
        success, message = perform_sync(request)
        return JsonResponse({
            'success': success,
            'message': message
        })
    return render(request, 'transit/index.html')

def get_selected_transports(request):
    # Initialize response data
    response_data = {}
    
    # Check for each transport system in the request parameters
    if 'metro' in request.GET:
        metro_lines = MetroLine.objects.all()
        response_data['metro'] = [MetroLineTransformer.from_model(line).to_dict() for line in metro_lines]
    
    if 'cablebus' in request.GET:
        cablebus_lines = CablebusLine.objects.all()
        response_data['cablebus'] = [CablebusLineTransformer.from_model(line).to_dict() for line in cablebus_lines]
    
    if 'concesionados' in request.GET:
        concesionados_lines = ConcesionadosLine.objects.all()
        response_data['concesionados'] = [ConcesionadosLineTransformer.from_model(line).to_dict() for line in concesionados_lines]
    
    if 'interurbano' in request.GET:
        interurbano_lines = InterurbanoLine.objects.all()
        response_data['interurbano'] = [InterurbanoLineTransformer.from_model(line).to_dict() for line in interurbano_lines]
        
    if 'metrobus' in request.GET:
        metrobus_lines = MetrobusLine.objects.all()
        response_data['metrobus'] = [MetrobusLineTransformer.from_model(line).to_dict() for line in metrobus_lines]
        
    if 'rtp' in request.GET:
        rtp_lines = RTPLine.objects.all()
        response_data['rtp'] = [RTPLineTransformer.from_model(line).to_dict() for line in rtp_lines]
        
    if 'suburbano' in request.GET:
        suburbano_lines = SuburbanoLine.objects.all()
        response_data['suburbano'] = [SuburbanoLineTransformer.from_model(line).to_dict() for line in suburbano_lines]
        
    if 'tren-ligero' in request.GET:
        tren_ligero_lines = TrenLigeroLine.objects.all()
        response_data['tren-ligero'] = [TrenLigeroLineTransformer.from_model(line).to_dict() for line in tren_ligero_lines]
        
    if 'trolebus' in request.GET:
        trolebus_lines = TrolebusLine.objects.all()
        response_data['trolebus'] = [TrolebusLineTransformer.from_model(line).to_dict() for line in trolebus_lines]

    if 'mexicable' in request.GET:
        mexicable_lines = MexicableLine.objects.all()
        response_data['mexicable'] = [MexicableLineTransformer.from_model(line).to_dict() for line in mexicable_lines]

    if 'mexibus' in request.GET:
        mexibus_lines = MexibusLine.objects.all()
        response_data['mexibus'] = [MexibusLineTransformer.from_model(line).to_dict() for line in mexibus_lines]

    if 'ecobici' in request.GET:
        ecobici_stations = EcobiciStation.objects.all()
        response_data['ecobici'] = [EcobiciStationTransformer.from_model(station).to_dict() for station in ecobici_stations]

    # If no specific transport was requested, return all
    if not response_data:
        metro_lines = MetroLine.objects.all()
        cablebus_lines = CablebusLine.objects.all()
        concesionados_lines = ConcesionadosLine.objects.all()
        interurbano_lines = InterurbanoLine.objects.all()
        metrobus_lines = MetrobusLine.objects.all()
        rtp_lines = RTPLine.objects.all()
        suburbano_lines = SuburbanoLine.objects.all()
        tren_ligero_lines = TrenLigeroLine.objects.all()
        trolebus_lines = TrolebusLine.objects.all()
        mexicable_lines = MexicableLine.objects.all()
        mexibus_lines = MexibusLine.objects.all()
        ecobici_stations = EcobiciStation.objects.all()
        
        response_data = {
            'metro': [MetroLineTransformer.from_model(line).to_dict() for line in metro_lines],
            'cablebus': [CablebusLineTransformer.from_model(line).to_dict() for line in cablebus_lines],
            'concesionados': [ConcesionadosLineTransformer.from_model(line).to_dict() for line in concesionados_lines],
            'interurbano': [InterurbanoLineTransformer.from_model(line).to_dict() for line in interurbano_lines],
            'metrobus': [MetrobusLineTransformer.from_model(line).to_dict() for line in metrobus_lines],
            'rtp': [RTPLineTransformer.from_model(line).to_dict() for line in rtp_lines],
            'suburbano': [SuburbanoLineTransformer.from_model(line).to_dict() for line in suburbano_lines],
            'tren_ligero': [TrenLigeroLineTransformer.from_model(line).to_dict() for line in tren_ligero_lines],
            'trolebus': [TrolebusLineTransformer.from_model(line).to_dict() for line in trolebus_lines],
            'mexicable': [MexicableLineTransformer.from_model(line).to_dict() for line in mexicable_lines],
            'mexibus': [MexibusLineTransformer.from_model(line).to_dict() for line in mexibus_lines],
            'ecobici': [EcobiciStationTransformer.from_model(station).to_dict() for station in ecobici_stations]
        }
    
    return JsonResponse(response_data)