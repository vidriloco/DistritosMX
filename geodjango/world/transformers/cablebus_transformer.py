from typing import List, Optional, Dict, Any
from django.contrib.gis.geos import LineString, MultiLineString, Point
from .protocols import TransportLineProtocol, TransportStationProtocol
from ..models.official_transports.cablebus_stations import CablebusStation as CablebusStationModel
from ..models.official_transports.cablebus_lines import CablebusLine as CablebusLineModel
from ..models import CablebusStation, CablebusLine
from ..utils.s3_urls import get_station_image_url
from ..models.official_transports.metadata.systems import TransportSystem

class CablebusStationTransformer(TransportStationProtocol):
    """Implementation of a Cablebus station."""
    
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
    def from_model(cls, model: CablebusStationModel, line: CablebusLineModel) -> 'CablebusStationTransformer':
        """Create a CablebusStationTransformer instance from a CablebusStationModel."""

        return cls( 
            id=model.id,
            name=model.name,
            coordinates=model.location,
            image=get_station_image_url('cablebus', line.line_number, model.station_code),
            identifier=model.station_code
        )

class CablebusLineTransformer(TransportLineProtocol):
    """Implementation of a Cablebus line."""
    
    def __init__(
        self,
        id: int,
        line_number: str,
        system: str,
        route: str,
        paths: List[MultiLineString],
        stations: List[CablebusStationTransformer],
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
    def from_model(cls, model: CablebusLineModel) -> 'CablebusLineTransformer':
        """Create a CablebusLineTransformer instance from a CablebusLineModel."""
        # Convert the model's geometry to a list of LineStrings
        paths = []
        if model.geometry:
            if model.geometry.geom_type == 'MultiLineString':
                paths = list(model.geometry)
            else:
                paths = [model.geometry]
        
        # Get stations associated with this line
        stations = [
            CablebusStationTransformer.from_model(station, model)
            for station in CablebusStationModel.objects.filter(line_number=model.line_number)
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
