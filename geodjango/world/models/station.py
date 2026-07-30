from django.contrib.gis.db import models
from django import forms
from django.forms import ModelForm, TextInput, Select, FileInput, Textarea
from django.contrib.gis.geos import GEOSGeometry
import random
from django.utils.translation import gettext_lazy as _
from .station_stats import StationStats 
import os
from django.conf import settings

class Station(models.Model):

    def user_directory_path(instance, filename):
        return "stations/{0}-{1}".format(random.randint(1000, 9999), filename)

    coordinates = models.PointField(srid=4326)
    system = models.CharField(max_length=50)
    name = models.CharField(max_length=100)
    lines = models.ManyToManyField('Line', related_name='stations')
    station_number = models.IntegerField()
    station_key = models.CharField(max_length=20)
    station_eod_key = models.CharField(max_length=20)
    type = models.CharField(max_length=50)
    municipalities_served = models.CharField(max_length=100)
    year = models.IntegerField(null=True)
    icon = models.ImageField(upload_to=user_directory_path, null=True, blank=True)
    description = models.TextField(null=True, blank=True)

    def __str__(self):
        return self.name
    
    def lat(self):
        return self.coordinates.y
    
    def lng(self):
        return self.coordinates.x
    
    def coordinate_formatted(self):
        return f"{self.lat()}, {self.lng()}"
    
    def get_icon_url(self):
        if self.icon:
            return self.icon.url
        icon_path = "/static/images/ordered-marker-" + str(self.station_number) + ".png"
        full_path = str(settings.BASE_DIR) + "/world" + icon_path
        print(full_path)
        if os.path.exists(full_path):
            return icon_path
        return "/static/images/ordered-marker-incognito.png"
    
    def icon_filename(self):
        return self.get_icon_url().split('/')[-1]

    def save_with(self, line):
        station_number_str = f"{self.station_number:02d}"
        self.station_key = f"{line.system.upper()}{line.identifier.upper()}{station_number_str}"
        self.save()

        if not StationStats.objects.filter(station=self).exists():
            StationStats.objects.create(station=self)

class StationUpdateForm(ModelForm):
    icon = forms.ImageField(required=False)

    class Meta:
        model = Station
        fields = ['name', 'station_number', 'icon', 'description']
        widgets = { 
            'name': TextInput(attrs={
                'class': "form-control",
                'style': 'max-width: 100%;',
                'placeholder': 'Ej: Tasqueña'
                }),
            'station_number': TextInput(attrs={
                'class': "form-control", 
                'style': 'max-width: 100%;',
                'placeholder': 'Ej: 1'
                }),
            'icon': FileInput(),
            'description': Textarea(attrs={
                'class': "form-control", 
                'style': 'max-width: 100%; height: 100px;',
                'placeholder': 'Detalles de esta estación'
            }),
        }
        labels = {
            'name': _('Nombre'),
            'station_number': _('Número de estación (en la ruta)'),
            'description': _('Descripción')
        }


class StationForm(forms.ModelForm):
    coordinates = forms.CharField(widget=forms.HiddenInput(), required=False)
    system = forms.CharField(widget=forms.HiddenInput(), required=True)
    lines = forms.CharField(widget=forms.HiddenInput(), required=True)
    icon = forms.ImageField(required=False)

    class Meta:
        model = Station
        fields = ['name', 'station_number', 'system', 'icon', 'description']
        widgets = { 
            'icon': FileInput(),
            'name': TextInput(attrs={
                'class': "form-control",
                'style': 'max-width: 100%;',
                'placeholder': 'Ej: Tasqueña'
                }),
            'station_number': TextInput(attrs={
                'class': "form-control", 
                'style': 'max-width: 100%;',
                'placeholder': 'Ej: 1'
                }),
            'description': Textarea(attrs={
                'class': "form-control", 
                'style': 'max-width: 100%; height: 100px;',
                'placeholder': 'Detalles de esta estación'
            }),
        }
        labels = {
            'icon': _('Icono'),
            'name': _('Nombre'),
            'station_number': _('Número de estación (en la ruta)'),
            'description': _('Descripción')
        }

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        if self.instance and self.instance.coordinates:
            self.fields['coordinates'].initial = self.instance.coordinates.geojson  # Convert geometry to GeoJSON string

    def clean_geom(self):
        coordinates = self.cleaned_data['coordinates']
        if coordinates:
            return GEOSGeometry(coordinates)  # Convert GeoJSON string back to GEOSGeometry
        return None