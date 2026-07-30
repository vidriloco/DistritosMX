from typing import List, Optional, Dict, Any
from django.contrib.gis.geos import MultiLineString, Point
from ..models.official_transports.rtp_lines import RTPLine
from ..models.official_transports.rtp_stations import RTPStation
from .protocols import TransportLineProtocol, TransportStationProtocol
from ..models.official_transports.metadata.systems import TransportSystem

class RTPStationTransformer(TransportStationProtocol):
    """Implementation of an RTP station."""
    
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
    def from_model(cls, model: RTPStation) -> 'RTPStationTransformer':
        """Create an RTPStationTransformer instance from an RTPStation model."""
        return cls(
            id=model.id,
            name=model.intersection or f"{model.origin_destination} - {model.route}",
            coordinates=model.location,
            identifier=model.route
        )
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            'id': self.id,
            'name': self.name,
            'coordinates': [self.coordinates.x, self.coordinates.y],
            'image': self.image,
            'identifier': self.identifier
        }

class RTPLineTransformer(TransportLineProtocol):
    """Implementation of an RTP line."""
    
    def __init__(
        self,
        id: int,
        line_number: str,
        system: str,
        route: str,
        paths: List[MultiLineString],
        stations: List[RTPStationTransformer],
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
    def from_model(cls, model: RTPLine) -> 'RTPLineTransformer':
        """Create an RTPLineTransformer instance from an RTPLine model."""
        # Convert the model's geometry to a list of LineStrings
        paths = []
        if model.geometry:
            if model.geometry.geom_type == 'MultiLineString':
                paths = list(model.geometry)
            else:
                paths = [model.geometry]
        
        # Get stations associated with this line
        stations = [
            RTPStationTransformer.from_model(station)
            for station in RTPStation.objects.filter(route=model.route)
        ]
        
        return cls(
            id=model.id,
            line_number=model.route,
            system=model.system,
            route=model.name,
            paths=paths,
            stations=stations,
            color=model.metadata.color if model.metadata else None,
            stroke=model.metadata.stroke if model.metadata else None,
            status=model.metadata.status if model.metadata else None,
            hidden=model.metadata.hidden if model.metadata else False
        )