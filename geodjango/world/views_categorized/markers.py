from world.models import *
from django.http import JsonResponse
from django.utils import timezone
from django.contrib.gis.geos import GEOSGeometry
from django.shortcuts import render, redirect, get_object_or_404
from django.urls import reverse

def line_markers(request, line_id):
    line = get_object_or_404(Line, pk=line_id)
    markers = line.markers.all()
    return render(request, 'markers/collection.html', { 'line': line, 'markers': markers })
    
def line_markers_form(request, line_id):
    line = get_object_or_404(Line, pk=line_id)
    marker_form = MarkerUpdateForm()

    return render(request, 'markers/form.html', { 'line': line, 'marker_form': marker_form })

def line_markers_delete(request, line_id, marker_id):
    line = get_object_or_404(Line, pk=line_id)
    marker = get_object_or_404(Marker, pk=marker_id, line=line)
    marker.delete()
    markers = line.markers.all()

    return render(request, 'markers/collection.html', { 'line': line, 'markers': markers })

def create_marker(request, line_id):
    line = get_object_or_404(Line, pk=line_id)
    markers = line.markers.all()

    if request.method == 'POST':
        marker_form = MarkerUpdateForm(request.POST)
        if marker_form.is_valid():
            marker = marker_form.save(commit=False)
            marker.line = line
            marker.save()

    return render(request, 'markers/collection.html', { 'line': line, 'markers': markers })