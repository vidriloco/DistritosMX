from typing import List, Optional, Dict, Any
from django.contrib.gis.geos import MultiLineString, Point
from ..models.official_transports.metrobus_lines import MetrobusLine
from ..models.official_transports.metrobus_stations import MetrobusStation
from .protocols import TransportLineProtocol, TransportStationProtocol
from ..utils.s3_urls import get_station_image_url
from ..models.official_transports.metadata.systems import TransportSystem

class MetrobusStationTransformer(TransportStationProtocol):
    """Implementation of a metrobus station."""
    
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
    def from_model(cls, model: MetrobusStation, line: MetrobusLine) -> 'MetrobusStationTransformer':
        """Create a MetrobusStationTransformer instance from a MetrobusStation model."""
        return cls(
            id=model.id,
            name=model.name,
            coordinates=model.location,
            identifier=model.station_code or model.station_number,
            image=get_station_image_url('metrobus', line.line, model.station_code)
        )
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            'id': self.id,
            'name': self.name,
            'coordinates': [self.coordinates.x, self.coordinates.y],
            'image': self.image,
            'identifier': self.identifier
        }

class MetrobusLineTransformer(TransportLineProtocol):
    """Implementation of a metrobus line."""
    
    def __init__(
        self,
        id: int,
        line_number: str,
        system: str,
        route: str,
        paths: List[MultiLineString],
        stations: List[MetrobusStationTransformer],
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
        self.hidden = hidden
        self.image = image
        self.color = color
        self.stroke = stroke
        self.status = status
    
    def __str__(self) -> str:
        return f"{self.line_number} ({self.system})"
    
    @classmethod
    def from_model(cls, model: MetrobusLine) -> 'MetrobusLineTransformer':
        """Create a MetrobusLineTransformer instance from a MetrobusLine model."""
        # Convert the model's geometry to a list of LineStrings
        paths = []
        if model.geometry:
            if model.geometry.geom_type == 'MultiLineString':
                paths = list(model.geometry)
            else:
                paths = [model.geometry]
        
        # Get stations associated with this line
        stations = [
            MetrobusStationTransformer.from_model(station, model)
            for station in MetrobusStation.objects.filter(line=model.line)
        ]
        
        return cls(
            id=model.id,
            line_number=model.line,
            system=model.system,
            route=model.route,
            paths=paths,
            stations=stations,
            color=model.metadata.color if model.metadata else None,
            stroke=model.metadata.stroke if model.metadata else None,
            status=model.metadata.status if model.metadata else None,
            hidden=model.metadata.hidden if model.metadata else False
        )