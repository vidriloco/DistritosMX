import uuid
from django.contrib.gis.db import models
from django.utils.translation import gettext_lazy as _
from django import forms
from django.forms import ModelForm, TextInput, Select, FileInput
from django.contrib.gis.geos import GEOSGeometry
import random
import json
import base64
from taggit.managers import TaggableManager
from django.contrib.auth.models import User
from django.core.files.base import ContentFile
from django.utils.text import slugify
import re

class Line(models.Model):
    class System(models.TextChoices):
        METRO = "stc", _("STC Metro")
        METROBUS = "metrobus", _("Metrobus")
        CABLEBUS = "cablebus", _("Cablebus")
        TREN_LIGERO = "tren-ligero", _("Tren Ligero")
        TREN_SUBURBANO = "tren-suburbano", _("Tren Suburbano")
        RTP = "rtp", _("RTP")
        ECOBICI = "ecobici", _("Ecobici")
        TRANSPORTE_CONCESIONADO = "transporte-concesionado", _("Transporte Concesionado")
        TREN_INTERURBANO = "tren-interurbano", _("Tren Interurbano")
        MEXIBUS = "mexibus", _("Mexibus")
        MEXICABLE = "mexicable", _("Mexicable")
        VA_Y_VEN = "va-y-ven", _("Va y Ven")
        PASEO_CICLISTA = "paseo-ciclista", _("Paseo Ciclista")
    
    class OperativeStatus(models.TextChoices):
        OPEN = "open", _("En Operación")
        CLOSED = "closed", _("Fuera de Servicio")
        CONSTRUCTION = "construction", _("En construcción")
        PROPOSAL = "proposal", _("Propuesta")

    class Mode(models.TextChoices):
        PUBLISHED = "published", _("Publicado")
        DRAFT = "draft", _("En borrador")

    def user_directory_path(instance, filename):
        return "pois/{0}-{1}".format(random.randint(1000, 9999), filename)
    
    route = models.CharField(max_length=100)
    identifier = models.CharField(max_length=4)
    system = models.CharField(max_length=50, choices=System.choices)
    operative_status = models.CharField(max_length=15, choices=OperativeStatus.choices)
    geom = models.GeometryField(dim=3, null=True, blank=True)
    updated_at = models.DateTimeField()
    flyer = models.ImageField(upload_to=user_directory_path, null=True)
    mode = models.CharField(max_length=15, choices=Mode.choices)
    color = models.CharField(max_length=7, default="#000000")
    theme = models.CharField(max_length=5, default="sta")
    description = models.TextField(null=True, blank=True)
    tags = TaggableManager()
    slug = models.SlugField(max_length=100, unique=True)
    user = models.ForeignKey(User, on_delete=models.CASCADE)

    def save(self, *args, **kwargs):
        slug_item = str(self.id) + "-" + self.system + "-" + self.identifier + "-" + self.route
        self.slug = slugify(slug_item)
        super().save(*args, **kwargs)

    def __str__(self):
        return self.route
    
    def ready_for_publish(self):
        return self.ready_for_preview()['ready'] == True
    
    def ready_for_save(self):
        return self.has_tags() and self.has_description()

    def has_description(self):
        return self.description is not None and len(self.description) > 0
    
    def has_tags(self):
        return self.tags is not None and len(self.tags.all()) > 0
    
    def has_flyer(self):
        return self.flyer is not None
    
    def has_stations(self):
        return self.stations.all().count() > 0
    
    def is_route_valid(self):
        return self.route is not None and len(self.route) > 0
    
    def is_identifier_valid(self):
        return self.identifier is not None and len(self.identifier) > 0
    
    def is_system_valid(self):
        return self.system is not None and len(self.system) > 0
    
    def is_operative_status_valid(self):
        return self.operative_status is not None and len(self.operative_status) > 0
    
    def is_geom_valid(self):    
        return self.geom is not None

    def published(self):
        return self.mode == Line.Mode.PUBLISHED
    
    def ready_for_preview(self):
        return {
            "is_geom_valid": self.is_geom_valid(),
            "has_stations": self.has_stations(),
            "is_route_valid": self.is_route_valid(),
            "is_identifier_valid": self.is_identifier_valid(),
            "is_system_valid": self.is_system_valid(),
            "is_operative_status_valid": self.is_operative_status_valid(),
            "ready": self.is_geom_valid() and self.has_stations() and self.is_route_valid() and self.is_identifier_valid() and self.is_system_valid() and self.is_operative_status_valid()
        }
    
    def theme_url(self):
        if self.theme == "dar":
            return "mapbox://styles/vidriloco/clwy6gs85010i01qp6127bp3x"
        elif self.theme == "sat":
            return "mapbox://styles/vidriloco/clx2vciu400c701qo520p9x8r"
        elif self.theme == "ocr":
            return "mapbox://styles/vidriloco/clx4cxdtd02z701qm7shmbsf7"
        elif self.theme == "blu":
            return "mapbox://styles/vidriloco/clwy3ijjn010701qpax1s54hk"
        elif self.theme == "asp":
            return "mapbox://styles/vidriloco/clwzges1100kg01nm8hvw4lus"
        elif self.theme == "ate":
            return "mapbox://styles/vidriloco/clx4emew100rx01qoeebl5f8z"
        else:
            return "mapbox://styles/vidriloco/clx4dzh6902so01qphb9efd0f"

    def get_operative_status(self):
        return Line.OperativeStatus(self.operative_status).label
    
    def system_name(self):
        return Line.System(self.system).label
    
    def named_identifier(self):
        if self.system == Line.System.PASEO_CICLISTA:
            return f"Ruta {self.identifier}"
        else:
            return f"Línea {self.identifier}"

    def title(self):
        return f"{self.named_identifier()}: {self.route} ({self.system_name()})"
    
    def get_flyer_url(self):
        if self.flyer:
            return self.flyer.url
        else:
            return "https://wikiando.mx/static/images/intro-social-media.jpg"
    
    def tag_list(self):
        return ", ".join([tag.name for tag in self.tags.all()])

    def has_description(self):
        if self.description:
            clean = re.compile('<.*?>')
            cleaned_description = re.sub(clean, '', self.description)
            return len(cleaned_description) > 0
        return False

    def icon(self):
        if self.system == Line.System.METRO:
            return "metro-logo.png"
        elif self.system == Line.System.METROBUS:
            return "metrobus-logo.png"
        elif self.system == Line.System.CABLEBUS:
            return "cablebus-logo.png"
        elif self.system == Line.System.TREN_LIGERO:
            return "transportes-electricos-logo.png"
        elif self.system == Line.System.TREN_SUBURBANO:
            return "suburbano-logo.png"
        elif self.system == Line.System.RTP:
            return "rtp-logo.png"
        elif self.system == Line.System.ECOBICI:
            return "ecobici-logo.png"
        elif self.system == Line.System.TRANSPORTE_CONCESIONADO:
            return "concesionados-logo.png"
        elif self.system == Line.System.TREN_INTERURBANO:
            return "insurgente-logo.png"
        elif self.system == Line.System.MEXIBUS:
            return "mexibus-logo.png"
        elif self.system == Line.System.MEXICABLE:
            return "mexicable-logo.png"
        elif self.system == Line.System.PASEO_CICLISTA:
            return "bike-logo.png"
        elif self.system == Line.System.VA_Y_VEN:
            return "va-y-ven.png"
        else:
            return "peseros-logo.png"
    
    @staticmethod
    def find_line_for_trails(trails):
        line_counts = {}
        for trail in trails:
            line_id = trail.line()
            if line_id in line_counts:
                line_counts[line_id] += 1
            else:
                line_counts[line_id] = 1
        
        return Line.objects.get(identifier=max(line_counts, key=line_counts.get))
    
    @staticmethod
    def get_all_from_yucatan():
        lines = Line.objects.filter(system=Line.System.VA_Y_VEN, operative_status=Line.OperativeStatus.OPEN, mode=Line.Mode.PUBLISHED)

        return [
            {
            "id": f"{Line.System(line.system)}-{line.pk}",
            "title": line.title(),
            "shorter_title": f"{line.named_identifier()}: {line.route}",
            "updated_at": line.updated_at,
            "flyer_url": line.get_flyer_url(),
            "color": line.color,
            "description": line.description,
            "tags": line.tag_list(),
            "slug": line.slug,
            "user": line.user.username,
            "coordinates": line.geom.coords if line.geom is not None else None,
            "stations": [
                {
                    "name": station.name,
                    "coordinates": station.coordinates.coords if station.coordinates is not None else None,
                }
                for station in line.stations.all()
            ]
            }
            for line in lines
        ]

class LinePathForm(forms.ModelForm):
    geom = forms.CharField(widget=forms.HiddenInput(), required=False)
    
    class Meta:
        model = Line
        fields = ['color']
        widgets = { }

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        if self.instance and self.instance.geom:
            self.fields['geom'].initial = self.expose_geom  # Convert geometry to GeoJSON string

    def expose_geom(self):
        if self.instance and self.instance.geom:
            geom_data = json.loads(self.instance.geom.geojson)
            if geom_data['type'] == 'MultiLineString':
                features = []
                for line in geom_data['coordinates']:
                    feature = {
                        "type": "Feature",
                        "geometry": {
                            "type": "LineString",
                            "coordinates": line
                        }
                    }
                    features.append(feature)
                return json.dumps(features)
        else:
            return json.dumps([])

    def clean_geom(self):
        geom = self.cleaned_data['geom']
        try:
            geom_data = json.loads(geom)
            coordinates = []
            for feature in geom_data:
                if feature['type'] == 'Feature' and 'geometry' in feature and feature['geometry']['type'] == 'LineString':
                    coordinates.append(feature['geometry']['coordinates'])
            
            geom = json.dumps({
                "type": "MultiLineString",
                "coordinates": coordinates
            })

            if geom:
                return GEOSGeometry(geom, srid=4326)
        except json.JSONDecodeError:
            raise forms.ValidationError("Invalid GeoJSON data")
        
class LineForm(forms.ModelForm):

    class Meta:
        model = Line
        fields = ['route', 'identifier', 'system', 'operative_status']
        widgets = {
            'route': TextInput(attrs={
                'class': "form-control",
                'style': 'max-width: 100%;',
                'placeholder': 'Ej. Tasqueña - Cuatro Caminos'
                }),
            'identifier': TextInput(attrs={
                'class': "form-control", 
                'style': 'max-width: 100%;',
                'placeholder': 'Ej. L2'
                }),
            'system': Select(attrs={
                'class': "form-control", 
                'style': 'max-width: 100%;',
                'placeholder': 'Sistema'
                }),
            'operative_status': Select(attrs={
                'class': "form-control", 
                'style': 'max-width: 100%;',
                'placeholder': 'Estado operativo'
                })
        }
        labels = {
            'route': _('Ruta / Derrotero'),
            'identifier': _('Identificador'),
            'system': _('Sistema'),
            'operative_status': _('Estado operativo'),
            'flyer': _('Imagen'),
            'mode': _('Estado')
        }

class LineDescriptionForm(forms.ModelForm):
    description = forms.CharField(widget=forms.HiddenInput(), required=False)

    class Meta:
        model = Line
        fields = ['description']
        labels = {
            'description': _('Descripción')
        }

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        if self.instance:
            self.fields['description'].initial = self.instance.description

class LineFlyerForm(forms.ModelForm):
    flyer = forms.ImageField(required=False)

    class Meta:
        model = Line
        fields = ['flyer']
        widgets = {
            'flyer': FileInput(),
        }
        labels = {
            'flyer': _('Carátula')
        }