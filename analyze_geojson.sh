#!/bin/bash

if [ $# -lt 1 ]; then
    echo "Usage: $0 <directory> [output_file]"
    exit 1
fi

TARGET_DIR="$1"
OUTPUT_FILE="${2:-analysis.json}"

if [ ! -d "$TARGET_DIR" ]; then
    echo "Error: Directory '$TARGET_DIR' does not exist"
    exit 1
fi

python3 << EOF
import os
import json
from pathlib import Path
from datetime import datetime

target_dir = Path("$TARGET_DIR")
output_file = "$OUTPUT_FILE"

result = {}
total = 0

for subdir in sorted(target_dir.iterdir()):
    if subdir.is_dir():
        country_code = subdir.name
        result[country_code] = []
        
        # Process all geojson and json files in this subdirectory
        for geojson_file in sorted(subdir.glob("*.geojson")) + sorted(subdir.glob("*.json")):
            try:
                with open(geojson_file, 'r') as f:
                    data = json.load(f)
                
                # Get features
                features = data.get('features', [])
                numberOfPOIS = len(features)
                
                # Extract identifier from caid (if available) or filename
                identifier = geojson_file.stem
                if features:
                    first_props = features[0].get('properties', {})
                    caid = first_props.get('caid')
                    if caid:
                        identifier = caid
                
                if numberOfPOIS == 0:
                    continue
                
                # Extract all utc_timestamps
                timestamps = []
                for feature in features:
                    props = feature.get('properties', {})
                    utc_timestamp = props.get('utc_timestamp')
                    if utc_timestamp:
                        timestamps.append(utc_timestamp)
                
                if not timestamps:
                    continue
                
                # Parse timestamps and find min/max
                # Handle different timestamp formats
                parsed_timestamps = []
                for ts in timestamps:
                    try:
                        # Try parsing with microseconds
                        if '.' in ts and '+' in ts:
                            dt = datetime.strptime(ts, "%Y-%m-%dT%H:%M:%S.%f%z")
                        elif '+' in ts:
                            dt = datetime.strptime(ts, "%Y-%m-%dT%H:%M:%S%z")
                        else:
                            # Fallback for other formats
                            dt = datetime.fromisoformat(ts.replace('Z', '+00:00'))
                        parsed_timestamps.append(dt)
                    except Exception as e:
                        # Skip invalid timestamps
                        continue
                
                if not parsed_timestamps:
                    continue
                
                # Find earliest and latest
                startDate = min(parsed_timestamps)
                endDate = max(parsed_timestamps)
                
                # Format as "YYYY-MM-DD HH:MM:SS"
                startDate_str = startDate.strftime("%Y-%m-%d %H:%M:%S")
                endDate_str = endDate.strftime("%Y-%m-%d %H:%M:%S")
                
                result[country_code].append({
                    "identifier": identifier,
                    "startDate": startDate_str,
                    "endDate": endDate_str,
                    "pings": numberOfPOIS
                })
                
                total += 1
                
            except Exception as e:
                print(f"Error processing {geojson_file}: {e}", file=os.sys.stderr)
                continue

with open(output_file, 'w') as f:
    json.dump(result, f, indent=2)

print(f"Done. Total: {total} files processed")
print(f"Output: {output_file}")
EOF
