from django.contrib.gis.db import models
from .marker_icon import MarkerIcon
from .line import Line
from django.utils.translation import gettext_lazy as _
from django.contrib.gis.geos import Point
from django import forms
from django.forms import ModelForm, TextInput, Select, Textarea
from django.contrib.gis.geos import GEOSGeometry

class Marker(models.Model):
    class Category(models.TextChoices):
        STATION = "station", _("Estación")
        ANNOTATION = "annotation", _("Anotación")
        MARKER = "marker", _("Marcador")
    
    name = models.CharField(max_length=100, null=False, blank=False)
    description = models.TextField(null=True, blank=True)
    icon = models.ForeignKey(MarkerIcon, on_delete=models.CASCADE, null=False, blank=False)
    line = models.ForeignKey(Line, on_delete=models.CASCADE, null=False, blank=False, related_name='markers')
    coordinates = models.PointField(srid=4326, default=Point(0.0, 0.0))
    
    def get_icon_url(self):
        if self.icon:
            return self.icon.image.url
        return "/static/images/no-station-icon.png"

    def __str__(self):
        return self.name

class MarkerUpdateForm(ModelForm):
    coordinates = forms.CharField(widget=forms.HiddenInput(), required=False)

    class Meta:
        model = Marker
        fields = ['name', 'description', 'icon', 'coordinates']
        widgets = { 
            'name': TextInput(attrs={
            'class': "form-control",
            'style': 'max-width: 100%;',
            'placeholder': 'Ej: Biciestacionamiento'
            }),
            'description': Textarea(attrs={
            'class': "form-control", 
            'style': 'max-width: 100%; height: 100px;',
            'placeholder': 'Ej: Entre Reforma y Bucareli'
            }),
            'icon': Select(attrs={
            'class': "form-control", 
            'style': 'max-width: 100%;'
            }),
        }
        labels = {
            'name': _('Nombre'),
            'description': _('Descripción'),
            'icon': _('Icono'),
        }

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        if self.instance and self.instance.coordinates:
            self.fields['coordinates'].initial = self.instance.coordinates.geojson

    def clean_geom(self):
        coordinates = self.cleaned_data['coordinates']
        if coordinates:
            return GEOSGeometry(coordinates)
        return None

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields['icon'].queryset = MarkerIcon.objects.all()
        self.fields['icon'].label_from_instance = lambda obj: obj.name