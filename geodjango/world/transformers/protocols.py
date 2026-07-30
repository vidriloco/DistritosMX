from typing import Protocol, List, Optional, Dict, Any
from django.contrib.gis.geos import LineString, MultiLineString, Point

class TransportStationProtocol(Protocol):
    """Protocol defining the interface for a transport station."""
    
    # Basic information
    id: int
    name: str
    coordinates: Point
    
    # Optional attributes
    image: Optional[str]
    identifier: Optional[str]
    
    def __str__(self) -> str:
        """String representation of the station."""
        ...

    def to_dict(self) -> Dict[str, Any]:
        """Convert the station to a dictionary for JSON serialization."""
        return {
            'id': self.id,
            'name': self.name,
            'coordinates': [self.coordinates.x, self.coordinates.y],
            'image': self.image,
            'identifier': self.identifier
        }

    def to_geojson(self, line: 'TransportLineProtocol') -> Dict[str, Any]:
        """Convert the line to a GeoJSON property for JSON serialization."""
        return {
            'type': 'Feature',
            'properties': {
                'id': self.id,
                'name': self.name,
                'image': self.image,
                'identifier': self.identifier,
                'line_number': line.line_number,
                'system': line.system,
                'humanized_system': line.humanized_system,
                'route': line.route,
                'color': line.color,
                'type': 'station',
                'status': line.status
            },
            'geometry': {
                'type': 'Point',
                'coordinates': [self.coordinates.x, self.coordinates.y]
            }
        }

class TransportLineProtocol(Protocol):
    """Protocol defining the interface for a transport line."""
    
    # Basic information
    id: int
    line_number: str
    system: str
    humanized_system: str
    route: str
    paths: List[MultiLineString]
    hidden: bool
    
    # Optional attributes
    image: Optional[str]
    color: Optional[str]
    stroke: Optional[str]
    status: Optional[str]
    
    # Related objects
    stations: List[TransportStationProtocol]
    
    def __str__(self) -> str:
        """String representation of the line."""
        ...
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert the line to a dictionary for JSON serialization."""
        return {
            'id': self.id,
            'line_number': self.line_number,
            'system': self.system,
            'humanized_system': self.humanized_system,
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

    def to_geojson(self) -> List[Dict[str, Any]]:
        """Convert the line to a GeoJSON property for JSON serialization."""
        geometries = [{
            'type': 'Feature',
            'properties': {
                'id': self.id,
                'line_number': self.line_number,
                'system': self.system,
                'humanized_system': self.humanized_system,
                'route': self.route,
                'image': self.image,
                'color': self.color,
                'stroke': self.stroke,
                'status': self.status,
                'hidden': self.hidden,
                'type': 'line'
            },
            'geometry': {
                'type': 'MultiLineString',
                'coordinates': [
                    [
                        [point[0], point[1]]
                        for point in path.coords
                    ]
                    for path in self.paths
                ]
            }
        }]

        for station in self.stations:
            geometries.append(station.to_geojson(self))

        return geometries

class TransportGeoJSONTransformer():
    """Protocol defining the interface for a transport GeoJSON."""
    
    lines: List[TransportLineProtocol]

    def __init__(self, lines: List[TransportLineProtocol]):
        self.lines = lines

    @classmethod
    def from_model(cls, lines: List[TransportLineProtocol]) -> 'TransportGeoJSON':
        """Create a TransportGeoJSON instance from a TransportModel."""
        return cls(lines=lines)

    def to_geojson(self) -> Dict[str, Any]:
        """Convert the transport to a GeoJSON property for JSON serialization."""
        
        # First collect all features from all lines
        all_features = []
        for line in self.lines:
            if line.hidden:
                continue
            all_features.extend(line.to_geojson())

        # Separate line features and station features
        line_features = [f for f in all_features if f['properties']['type'] == 'line']
        station_features = [f for f in all_features if f['properties']['type'] == 'station']

        # Consolidate stations by coordinates
        consolidated_stations = {}
        for station in station_features:
            line_number = station['properties']['line_number']

            # Create a coordinate key by joining x and y coordinates
            coord_key = f"{station['geometry']['coordinates'][0]},{station['geometry']['coordinates'][1]}"
            route_name = f"{line_number}: {station['properties']['route']}"

            if coord_key not in consolidated_stations:
                # First occurrence of this station
                consolidated_stations[coord_key] = station
                consolidated_stations[coord_key]['properties']['routes'] = [route_name]
                consolidated_stations[coord_key]['properties']['lines_serving'] = [line_number]
                consolidated_stations[coord_key]['properties']['lines_served'] = line_number
            else:
                # Add the route to the existing station's routes list if it's not already there
                if route_name not in consolidated_stations[coord_key]['properties']['routes']:
                    consolidated_stations[coord_key]['properties']['routes'].append(route_name)
                    consolidated_stations[coord_key]['properties']['lines_serving'].append(line_number)
                    consolidated_stations[coord_key]['properties']['lines_served'] += f" {line_number}"

        # Combine line features with consolidated station features
        features = line_features + list(consolidated_stations.values())

        return {
            'type': 'FeatureCollection',
            'features': features
        }
