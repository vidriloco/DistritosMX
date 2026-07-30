from typing import List, Optional, Dict, Any
from django.contrib.gis.geos import MultiLineString, Point
from ..models.official_transports.interurbano_lines import InterurbanoLine
from ..models.official_transports.interurbano_stations import InterurbanoStation
from .protocols import TransportLineProtocol, TransportStationProtocol
from ..models.official_transports.metadata.systems import TransportSystem
from ..utils.s3_urls import get_station_image_url

class InterurbanoStationTransformer(TransportStationProtocol):
    """Implementation of an interurbano station."""
    
    def __init__(
        self,
        id: int,
        name: str,
        coordinates: Point,
        image: Optional[str] = None,
        identifier: Optional[str] = None
    ):
        self.id = id
        self.name = name
        self.coordinates = coordinates
        self.image = image
        self.identifier = identifier
    
    def __str__(self) -> str:
        return f"{self.name} ({self.id})"
    
    @classmethod
    def from_model(cls, model: InterurbanoStation) -> 'InterurbanoStationTransformer':
        """Create an InterurbanoStationTransformer instance from an InterurbanoStation model."""
        return cls(
            id=model.id,
            name=model.name,
            image=get_station_image_url('tren-interurbano', model.line_number, model.station_id),
            coordinates=model.location,
            identifier=model.station_id
        )
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            'id': self.id,
            'name': self.name,
            'coordinates': [self.coordinates.x, self.coordinates.y],
            'image': self.image,
            'identifier': self.identifier
        }

class InterurbanoLineTransformer(TransportLineProtocol):
    """Implementation of an interurbano line."""
    
    def __init__(
        self,
        id: int,
        line_number: str,
        system: str,
        route: str,
        paths: List[MultiLineString],
        stations: List[InterurbanoStationTransformer],
        image: Optional[str] = None,
        color: Optional[str] = None,
        stroke: Optional[str] = None,
        status: Optional[str] = None,
        hidden: bool = False
    ):
        self.id = id
        self.line_number = line_number
        self.system =  TransportSystem.get_code_name_from_db_name(system)
        self.humanized_system = TransportSystem.get_humanized_name_from_db_name(system)
        self.route = route
        self.paths = paths
        self.stations = stations
        self.image = image
        self.color = color
        self.stroke = stroke
        self.status = status
        self.hidden = hidden
    def __str__(self) -> str:
        return f"{self.line_number} ({self.system})"
    
    @classmethod
    def from_model(cls, model: InterurbanoLine) -> 'InterurbanoLineTransformer':
        """Create an InterurbanoLineTransformer instance from an InterurbanoLine model."""
        # Convert the model's geometry to a list of LineStrings
        paths = []
        if model.geometry:
            if model.geometry.geom_type == 'MultiLineString':
                paths = list(model.geometry)
            else:
                paths = [model.geometry]
        
        # Get stations associated with this line
        stations = [
            InterurbanoStationTransformer.from_model(station)
            for station in InterurbanoStation.objects.filter(line_number=model.line_number)
        ]
        
        return cls(
            id=model.id,
            line_number=model.line_number,
            system=model.system,
            route=model.route,
            paths=paths,
            stations=stations,
            color=model.metadata.color if model.metadata else None,
            stroke=model.metadata.stroke if model.metadata else None,
            status=model.metadata.status if model.metadata else None,
            hidden=model.metadata.hidden if model.metadata else False
        )
    
    def to_dict(self) -> dict:
        return {
            'id': self.id,
            'line_number': self.line_number,
            'system': self.system,
            'route': self.route,
            'paths': [
                {
                    'coordinates': [
                        [point[0], point[1]]
                        for point in path.coords
                    ]
                }
                for path in self.paths
            ],
            'image': self.image,
            'color': self.color,
            'stroke': self.stroke,
            'status': self.status,
            'hidden': self.hidden,
            'stations': [station.to_dict() for station in self.stations]
        }
