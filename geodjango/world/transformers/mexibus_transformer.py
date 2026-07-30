from typing import List, Optional, Dict, Any
from django.contrib.gis.geos import LineString, MultiLineString, Point
from .protocols import TransportLineProtocol, TransportStationProtocol
from ..models.official_transports.mexibus_stations import MexibusStation as MexibusStationModel
from ..models.official_transports.mexibus_lines import MexibusLine as MexibusLineModel
from ..utils.s3_urls import get_station_image_url
from ..models.official_transports.metadata.systems import TransportSystem

class MexibusStationTransformer(TransportStationProtocol):
    """Implementation of a Mexibus station."""
    
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
    def from_model(cls, model: MexibusStationModel, line: MexibusLineModel) -> 'MexibusStationTransformer':
        """Create a MexibusStationTransformer instance from a MexibusStationModel."""
        return cls(
            id=model.id,
            name=model.name,
            coordinates=model.location,
            image=get_station_image_url('mexibus', line.line_number, model.station_code),
            identifier=model.station_code
        )

class MexibusLineTransformer(TransportLineProtocol):
    """Implementation of a Mexibus line."""
    
    def __init__(
        self,
        id: int,
        line_number: str,
        system: str,
        route: str,
        paths: List[MultiLineString],
        stations: List[MexibusStationTransformer],
        image: Optional[str] = None,
        color: Optional[str] = None,
        stroke: Optional[str] = None,
        status: Optional[str] = None,
        hidden: bool = False
    ):
        self.id = id
        self.line_number = line_number
        self.system = TransportSystem.get_code_name_from_db_name(system)
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
    def from_model(cls, model: MexibusLineModel) -> 'MexibusLineTransformer':
        """Create a MexibusLineTransformer instance from a MexibusLineModel."""
        # Convert the model's geometry to a list of LineStrings
        paths = []
        if model.geometry:
            if model.geometry.geom_type == 'MultiLineString':
                paths = list(model.geometry)
            else:
                paths = [model.geometry]
        
        # Get stations associated with this line
        stations = [
            MexibusStationTransformer.from_model(station, model)
            for station in MexibusStationModel.objects.filter(line_number=model.line_number)
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