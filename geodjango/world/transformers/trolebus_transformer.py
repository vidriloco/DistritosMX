from typing import List, Optional, Dict, Any
from django.contrib.gis.geos import MultiLineString, Point
from ..models.official_transports.trolebus_lines import TrolebusLine
from ..models.official_transports.trolebus_stations import TrolebusStation
from .protocols import TransportLineProtocol, TransportStationProtocol
from ..models.official_transports.metadata.systems import TransportSystem

class TrolebusStationTransformer(TransportStationProtocol):
    """Implementation of a Trolebús station."""
    
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
    def from_model(cls, model: TrolebusStation) -> 'TrolebusStationTransformer':
        """Create a TrolebusStationTransformer instance from a TrolebusStation model."""
        return cls(
            id=model.id,
            name=model.name,
            coordinates=model.location,
            identifier=model.station_code
        )
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            'id': self.id,
            'name': self.name,
            'coordinates': [self.coordinates.x, self.coordinates.y],
            'image': self.image,
            'identifier': self.identifier
        }

class TrolebusLineTransformer(TransportLineProtocol):
    """Implementation of a Trolebús line."""
    
    def __init__(
        self,
        id: int,
        line_number: str,
        route: str,
        system: str,
        paths: List[MultiLineString],
        stations: List[TrolebusStationTransformer],
        image: Optional[str] = None,
        color: Optional[str] = None,
        stroke: Optional[str] = None,
        status: Optional[str] = None,
        hidden: bool = False
    ):
        self.id = id
        self.line_number = line_number
        self.route = route
        self.system =  TransportSystem.get_code_name_from_db_name(system)
        self.humanized_system = TransportSystem.get_humanized_name_from_db_name(system)
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
    def from_model(cls, model: TrolebusLine) -> 'TrolebusLineTransformer':
        """Create a TrolebusLineTransformer instance from a TrolebusLine model."""
        # Convert the model's geometry to a list of LineStrings
        paths = []
        if model.geometry:
            if model.geometry.geom_type == 'MultiLineString':
                paths = list(model.geometry)
            else:
                paths = [model.geometry]
        
        # Get stations associated with this line
        stations = [
            TrolebusStationTransformer.from_model(station)
            for station in TrolebusStation.objects.filter(line=model.line)
        ]
        
        return cls(
            id=model.id,
            line_number=model.line,
            route=model.route,
            system=model.system,
            paths=paths,
            stations=stations,
            color=model.metadata.color if model.metadata else None,
            stroke=model.metadata.stroke if model.metadata else None,
            status=model.metadata.status if model.metadata else None,
            hidden=model.metadata.hidden if model.metadata else False
        )