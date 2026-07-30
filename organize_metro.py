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
    if props.get('SISTEMA') == 'STC Metro':
        line_num = props.get('LINEA', '').zfill(2)  # Pad with zeros for sorting
        if line_num == '0A':
            line_num = 'A'
        elif line_num == '0B':
            line_num = 'B'
            
        if line_num not in lines:
            lines[line_num] = {
                'stations': [],
                'name': line_num.lstrip('0'),  # Remove leading zeros for display
                'route': props.get('RUTA')
            }

        # If it's a station
        if 'NOMBRE' in props:
            station = {
                'type': 'Feature',
                'properties': {
                    'name': props['NOMBRE'],
                    'station_type': props.get('TIPO', 'Regular'),
                    'station_number': props.get('EST', ''),
                    'station_id': props.get('CVE_EST', ''),
                    'borough': props.get('ALCALDIAS', '')
                },
                'geometry': feature['geometry']
            }
            lines[line_num]['stations'].append(station)
        # If it's a line geometry (has RUTA property and LineString geometry)
        elif 'RUTA' in props and feature['geometry']['type'] == 'LineString':
            line_geometries[line_num] = {
                'type': 'Feature',
                'properties': {
                    'line_number': line_num.lstrip('0'),
                    'system': 'STC Metro',
                    'route': props['RUTA']
                },
                'geometry': feature['geometry']
            }

# Sort stations by their station number within each line
for line in lines.values():
    line['stations'].sort(key=lambda x: x['properties']['station_number'])

# Create the final organized structures
organized_stations = []
organized_lines = []

for line_num in sorted(lines.keys()):
    line = lines[line_num]
    
    # Create a feature collection for stations
    station_feature = {
        'type': 'Feature',
        'properties': {
            'line_number': line['name'],
            'system': 'STC Metro',
            'stations_count': len(line['stations'])
        },
        'features': line['stations']
    }
    organized_stations.append(station_feature)

    # Add line geometry if exists
    if line_num in line_geometries:
        organized_lines.append(line_geometries[line_num])

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
with open('geodjango/data/systems/organized/stc-metro-stations.geojson', 'w') as f:
    json.dump(stations_geojson, f, indent=2, ensure_ascii=False)

with open('geodjango/data/systems/organized/stc-metro-lines.geojson', 'w') as f:
    json.dump(lines_geojson, f, indent=2, ensure_ascii=False) 