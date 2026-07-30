from typing import List, Optional, Dict, Any
from django.contrib.gis.geos import MultiLineString, Point
from ..models.official_transports.suburbano_lines import SuburbanoLine
from ..models.official_transports.suburbano_stations import SuburbanoStation
from .protocols import TransportLineProtocol, TransportStationProtocol
from ..models.official_transports.metadata.systems import TransportSystem
from ..utils.s3_urls import get_station_image_url

class SuburbanoStationTransformer(TransportStationProtocol):
    """Implementation of a Suburbano station."""
    
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
    def from_model(cls, model: SuburbanoStation) -> 'SuburbanoStationTransformer':
        """Create a SuburbanoStationTransformer instance from a SuburbanoStation model."""
        return cls(
            id=model.id,
            name=model.name,
            image=get_station_image_url('tren-suburbano', model.line_number, model.station_id),
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

class SuburbanoLineTransformer(TransportLineProtocol):
    """Implementation of a Suburbano line."""
    
    def __init__(
        self,
        id: int,
        line_number: str,
        route: str,
        system: str,
        paths: List[MultiLineString],
        stations: List[SuburbanoStationTransformer],
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
    def from_model(cls, model: SuburbanoLine) -> 'SuburbanoLineTransformer':
        """Create a SuburbanoLineTransformer instance from a SuburbanoLine model."""
        # Convert the model's geometry to a list of LineStrings
        paths = []
        if model.path:  # Note: Suburbano uses 'path' instead of 'geometry'
            if model.path.geom_type == 'MultiLineString':
                paths = list(model.path)
            else:
                paths = [model.path]
        
        # Get stations associated with this line
        stations = [
            SuburbanoStationTransformer.from_model(station)
            for station in SuburbanoStation.objects.filter(line_number=model.line_number)
        ]
        
        return cls(
            id=model.id,
            line_number=model.line_number,
            route=model.route,
            system=model.system,
            paths=paths,
            stations=stations,
            color=model.metadata.color if model.metadata else None,
            stroke=model.metadata.stroke if model.metadata else None,
            status=model.metadata.status if model.metadata else None,
            hidden=model.metadata.hidden if model.metadata else False
        )