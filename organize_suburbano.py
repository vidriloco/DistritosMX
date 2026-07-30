import json
import os

# Read the original file
with open('geodjango/data/systems/dirty/stc-metro.geojson', 'r') as f:
    data = json.load(f)

# Create dictionaries to store lines and their data
lines = {}
line_geometries = {}

# First pass: Get all the lines and their data
for feature in data['features']:
    props = feature.get('properties', {})
    
    # Check if this is a Suburbano feature by looking at the layer property
    layer = props.get('layer', '')
    is_suburbano = 'Tren Suburbano' in layer
    
    if is_suburbano:
        line_id = props.get('LINEA') or 'main'  # If LINEA is not present, use 'main'
            
        if line_id not in lines:
            lines[line_id] = {
                'stations': [],
                'name': line_id,
                'route': props.get('RUTA')
            }

        # If it's a station - check for Point geometry
        if feature['geometry']['type'] == 'Point':
            station_name = (props.get('NOMBRE') or props.get('Name') or 
                          props.get('name') or props.get('estacion'))
            
            if station_name:  # Only add if we have a name
                station = {
                    'type': 'Feature',
                    'properties': {
                        'name': station_name,
                        'station_type': props.get('TIPO', 'Regular'),
                        'station_number': props.get('EST', str(len(lines[line_id]['stations']) + 1)),
                        'station_id': props.get('CVE_EST', ''),
                        'borough': props.get('ALCALDIAS', ''),
                        'layer': layer,
                        'description': props.get('description', '')  # Include any additional description
                    },
                    'geometry': feature['geometry']
                }
                lines[line_id]['stations'].append(station)
        
        # If it's a line geometry (LineString)
        elif feature['geometry']['type'] == 'LineString':
            line_geometries[line_id] = {
                'type': 'Feature',
                'properties': {
                    'line_id': line_id,
                    'system': 'Tren Suburbano',
                    'route': props.get('RUTA', ''),
                    'description': props.get('description', ''),  # Include description if available
                    'layer': layer
                },
                'geometry': feature['geometry']
            }

# Create the final organized structures
organized_stations = []
organized_lines = []

for line_id in sorted(lines.keys()):
    line = lines[line_id]
    
    # Create a feature collection for stations
    if line['stations']:  # Only add if there are stations
        station_feature = {
            'type': 'Feature',
            'properties': {
                'line_id': line_id,
                'system': 'Tren Suburbano',
                'route': line['route'],
                'stations_count': len(line['stations'])
            },
            'features': line['stations']
        }
        organized_stations.append(station_feature)

    # Add line geometry if exists
    if line_id in line_geometries:
        organized_lines.append(line_geometries[line_id])

# Create the final GeoJSON structures
stations_geojson = {
    'type': 'FeatureCollection',
    'features': organized_stations
}

lines_geojson = {
    'type': 'FeatureCollection',
    'features': organized_lines
}

# Ensure the output directory exists
os.makedirs('geodjango/data/systems/organized', exist_ok=True)

# Write the organized data
with open('geodjango/data/systems/organized/suburbano-stations.geojson', 'w') as f:
    json.dump(stations_geojson, f, indent=2, ensure_ascii=False)

with open('geodjango/data/systems/organized/suburbano-lines.geojson', 'w') as f:
    json.dump(lines_geojson, f, indent=2, ensure_ascii=False)

# Print some statistics
total_stations = sum(len(line['stations']) for line in lines.values())
print(f"Found {total_stations} stations for the Tren Suburbano system") 