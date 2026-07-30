from typing import Protocol, Dict, Any, List
from django.contrib.gis.geos import Point
import json

class RiskProtocol(Protocol):
    """Protocol defining the interface for a risk."""
    
    # Basic information
    id: int
    day_of_week: str
    date: str
    time: str
    year: int
    category: str
    type: str
    
    location: Point

    def to_geojson(self) -> Dict[str, Any]:
        """Convert the line to a GeoJSON property for JSON serialization."""

        return {
            'type': 'Feature',
            'properties': {
                'id': self.id,
                'dayOfWeek': self.day_of_week,
                'fullDate': self.full_date,
                'date': self.date,
                'time': self.time,
                'year': self.year,
                'category': self.category,
                'type': self.type
            },
            'geometry': {
                'type': 'Point',
                'coordinates': [self.location.coords[0], self.location.coords[1]]
            }
        }

class RiskGeoJSONTransformer():
    """Protocol defining the interface for a transport GeoJSON."""
    
    risks: List[RiskProtocol]

    def __init__(self, risks: List[RiskProtocol], name: str):
        self.risks = risks
        self.name = name

    @classmethod
    def from_model(cls, risks: List[RiskProtocol], name: str) -> 'RiskGeoJSON':
        """Create a RiskGeoJSON instance from a RiskModel."""
        return cls(risks=risks, name=name)

    def to_geojson(self) -> Dict[str, Any]:
        """Convert the risks to a GeoJSON property for JSON serialization."""
        return {
            'type': 'FeatureCollection',
            'name': self.name,
            'features': [risk.to_geojson() for risk in self.risks]
        }


class AgebRiskTransformer:
    @staticmethod
    def from_model(ageb_risk):
        return {
            "type": "Feature",
            "geometry": json.loads(ageb_risk.geometry.geojson),
            "properties": {
                "geo_key": ageb_risk.geo_key,
                "municipality_key": ageb_risk.municipality_key,
                "borough": ageb_risk.borough,
                "entity": ageb_risk.entity,
                "sexual_abuse_risk_level": ageb_risk.sexual_abuse_risk_level,
                "metrobus_agression_risk_level": ageb_risk.metrobus_agression_risk_level,
                "taxi_theft_risk_level": ageb_risk.taxi_theft_risk_level,
                "microbus_theft_risk_level": ageb_risk.microbus_theft_risk_level,
                "harassment_risk_level": ageb_risk.harassment_risk_level
            }
        }
