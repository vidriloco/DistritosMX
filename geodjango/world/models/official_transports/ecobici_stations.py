from django.contrib.gis.db import models
from django.utils.translation import gettext_lazy as _
from django.contrib.gis.geos import MultiLineString
from world.models.official_transports.metadata import StationMetadata
from world.models.official_transports.metadata.systems import TransportSystem

class EcobiciStation(models.Model):
    """Model for Ecobici stations."""
    
    system = models.CharField(
        max_length=50,
        default='Ecobici',
        verbose_name=_('System')
    )
    station_id = models.CharField(
        max_length=10,
        verbose_name=_('Station ID')
    )
    main_street = models.CharField(
        max_length=255,
        verbose_name=_('Main Street')
    )
    secondary_street = models.CharField(
        max_length=255,
        verbose_name=_('Secondary Street')
    )
    neighborhood = models.CharField(
        max_length=255,
        verbose_name=_('Neighborhood')
    )
    borough = models.CharField(
        max_length=100,
        verbose_name=_('Borough')
    )
    location = models.PointField(
        srid=4326,
        verbose_name=_('Location')
    )
    installation_type = models.CharField(
        max_length=50,
        verbose_name=_('Installation Type')
    )
    status = models.CharField(
        max_length=50,
        verbose_name=_('Status')
    )
    metadata = models.OneToOneField(
        StationMetadata,
        on_delete=models.CASCADE,
        related_name='ecobici_station',
        null=True,
        blank=True
    )

    class Meta:
        verbose_name = _('Ecobici Station')
        verbose_name_plural = _('Ecobici Stations')
        ordering = ['station_id']

    def __str__(self):
        return f"{self.system} - {self.main_street} y {self.secondary_street} ({self.station_id})"

    @classmethod
    def load_from_geojson(cls, geojson_file):
        """Load Ecobici stations data from a GeoJSON file."""
        import json
        from django.contrib.gis.geos import Point

        with open(geojson_file, 'r', encoding='utf-8') as f:
            data = json.load(f)

        stations = []
        for feature in data['features']:
            properties = feature['properties']
            geometry = feature['geometry']
            
            # Create new station
            station = cls.objects.create(
                system=properties['sistema'],
                station_id=properties['num_cicloe'],
                main_street=properties['calle_prin'],
                secondary_street=properties['calle_secu'],
                neighborhood=properties['colonia'],
                borough=properties['alcaldia'],
                location=Point(geometry['coordinates']),
                installation_type=properties['sitio_de_e'],
                status=properties['estatus']
            )

            stations.append(station)

        return len(stations) 

class EcobiciGroup:
    """A container class for Ecobici stations that implements the TransportLineProtocol interface."""
    
    def __init__(self, stations):
        self.id = 0
        self.line_number = '0'
        self.system = 'ecobici'
        self.humanized_system = TransportSystem.get_humanized_name_from_db_name('Ecobici')
        self.route = None
        self.paths = []
        self.stations = stations
        self.hidden = False
        self.color = None
        self.stroke = None
        self.status = None
        self.image = None

    def to_geojson(self):
        """Convert the group to a GeoJSON feature collection."""
        features = []
        
        # Add station features
        for station in self.stations:
            features.append({
                'type': 'Feature',
                'properties': {
                    'id': station.id,
                    'name': station.name,
                    'image': station.image,
                    'identifier': station.identifier,
                    'line_number': self.line_number,
                    'system': self.system,
                    'humanized_system': self.humanized_system,
                    'route': self.route,
                    'color': self.color,
                    'type': 'station',
                    'status': self.status
                },
                'geometry': {
                    'type': 'Point',
                    'coordinates': [station.coordinates.x, station.coordinates.y]
                }
            })
        
        return features