from typing import List, Optional, Dict, Any
from django.contrib.gis.geos import Point
from .protocols import TransportStationProtocol
from ..models.official_transports.ecobici_stations import EcobiciStation as EcobiciStationModel
from ..models.official_transports.metadata.systems import TransportSystem

class EcobiciStationTransformer(TransportStationProtocol):
    """Implementation of an Ecobici station."""
    
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
    def from_model(cls, model: EcobiciStationModel) -> 'EcobiciStationTransformer':
        """Create an EcobiciStationTransformer instance from an EcobiciStationModel."""
        return cls(
            id=model.id,
            name=f"{model.main_street} y {model.secondary_street}",
            coordinates=model.location,
            identifier=model.station_id
        ) 
        
    