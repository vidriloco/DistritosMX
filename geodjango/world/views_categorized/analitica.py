from world.models import *
from django.http import HttpResponse
from django.shortcuts import render, redirect, get_object_or_404
from django.http import Http404
import os
from django.conf import settings
from datetime import datetime, timedelta

def transactions_page(request):
    return render(request, 'analytics/transactions.html', {})

def movements_page(request):
    yesterday = datetime.now() - timedelta(days=1)
    yesterday_str = yesterday.strftime('%Y-%m-%d')

    today = datetime.now() + timedelta(days=1)
    today_str = today.strftime('%Y-%m-%d')

    buses = VehicleLocation.objects.values_list('vehicle_id', flat=True).distinct()[0:3]

    return render(request, 'analytics/movements.html', { 'start_date': yesterday_str, 'end_date': today_str, 'buses': buses })

def movements_one_date_page(request, date_start):
    date_end = None
    try:
        date_start = datetime.strptime(date_start, '%Y-%m-%d')
        date_end = date_start + timedelta(days=1)
    except ValueError:
        raise Http404("Invalid date format. Use YYYY-MM-DD.")
    
    buses = VehicleLocation.objects.values_list('vehicle_id', flat=True).distinct()[0:3]
    
    return render(request, 'analytics/movements.html', { 'start_date': date_start.strftime('%Y-%m-%d'), 'end_date': date_end.strftime('%Y-%m-%d'), 'buses': buses })

def movements_of_vehicle_one_date_page(request, vehicle_id, date_start):
    date_end = None
    try:
        date_start = datetime.strptime(date_start, '%Y-%m-%d')
        date_end = date_start + timedelta(days=1)
    except ValueError:
        raise Http404("Invalid date format. Use YYYY-MM-DD.")
    
    return render(request, 'analytics/movements.html', { 'vehicle_id': vehicle_id, 'start_date': date_start.strftime('%Y-%m-%d'), 'end_date': date_end.strftime('%Y-%m-%d') })

def movements_of_vehicle_page(request, vehicle_id, date_start, date_end):
    return render(request, 'analytics/movements.html', { 'vehicle_id': vehicle_id, 'start_date': date_start, 'end_date': date_end })

def analytics_debug(request, vehicle_id, date_start, date_end):
    return render(request, 'analytics/debug.html', { 'vehicle_id': vehicle_id, 'start_date': date_start, 'end_date': date_end })

def transactions_data(request):
    try:
        # Define the path to your CSV file
        file_path = os.path.join(settings.BASE_DIR, 'data', 'exposed', 'merged_transactions_15min.csv')
        
        # Open the CSV file and create a response
        with open(file_path, 'r') as csv_file:
            response = HttpResponse(csv_file.read(), content_type='text/csv')
            response['Content-Disposition'] = 'attachment; filename="merged_transactions_15min.csv"'
            return response

    except FileNotFoundError:
        raise Http404("CSV file not found.")