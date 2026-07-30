from django.contrib.gis.db import models
from django.utils.translation import gettext_lazy as _
import json
from django.contrib.gis.geos import Point
from .metadata import StationMetadata
from world.utils.string_utils import parse_line_number


class CablebusStation(models.Model):
    """Model representing a Cablebús station in Mexico City."""
    
    name = models.CharField(
        _("name"),
        max_length=100,
        help_text=_("Name of the station")
    )
    line_number = models.CharField(
        _("line number"),
        max_length=2,
        help_text=_("Line number of the station")
    )
    station_number = models.CharField(
        _("station number"),
        max_length=2,
        help_text=_("Station number within the line")
    )
    station_code = models.CharField(
        _("station code"),
        max_length=6,
        unique=True,
        help_text=_("Unique code for the station (e.g. CB0101)")
    )
    station_type = models.CharField(
        _("station type"),
        max_length=100,
        choices=[
            ("Terminal", _("Terminal")),
            ("Intermedia", _("Intermedia")),
            ("Antena", _("Antena")),
        ],
        help_text=_("Type of station")
    )
    year = models.IntegerField(
        _("year"),
        help_text=_("Year when the station was opened")
    )
    has_elevators = models.BooleanField(
        _("has elevators"),
        default=False,
        help_text=_("Whether the station has elevators")
    )
    has_tactile_guide = models.BooleanField(
        _("has tactile guide"),
        default=False,
        help_text=_("Whether the station has tactile guides")
    )
    has_braille_plates = models.BooleanField(
        _("has braille plates"),
        default=False,
        help_text=_("Whether the station has braille plates")
    )
    borough = models.CharField(
        _("borough"),
        max_length=50,
        help_text=_("Borough where the station is located")
    )
    location = models.PointField(
        _("location"),
        srid=4326,
        dim=3,
        help_text=_("Geographic coordinates of the station")
    )

    # Metadata
    metadata = models.OneToOneField(
        StationMetadata,
        on_delete=models.CASCADE,
        related_name='cablebus_station',
        help_text="Status metadata for this station",
        null=True,
        blank=True
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = _("Cablebús station")
        verbose_name_plural = _("Cablebús stations")
        ordering = ["line_number", "station_number"]

    def __str__(self):
        return f"{self.name} (Line {self.line_number})"

    @classmethod
    def load_from_geojson(cls, geojson_path):
        """
        Load stations from a GeoJSON file.
        
        Args:
            geojson_path (str): Path to the GeoJSON file containing station data
            
        Returns:
            int: Number of stations loaded
        """
        with open(geojson_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
            
        stations_loaded = 0
        for feature in data['features']:
            props = feature['properties']
            coords = feature['geometry']['coordinates']
            
            station_data = {
                'name': props['NOMBRE'],
                'line_number': parse_line_number(props['LINEA']),
                'station_number': props['EST'],
                'station_code': props['CVE_EST'],
                'station_type': props['TIPO'],
                'year': props['AÑO'],
                'has_elevators': props['Elevadores'] == 'Sí',
                'has_tactile_guide': props['Guia_tact'] == 'Sí',
                'has_braille_plates': props['P_braile'] == 'Sí',
                'borough': props['ALCALDIAS'],
                'location': Point(coords[0], coords[1], 0, srid=4326)
            }
            
            # Update or create the station
            cls.objects.update_or_create(
                station_code=station_data['station_code'],
                defaults=station_data
            )
            stations_loaded += 1
            
        return stations_loaded
