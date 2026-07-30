#!/bin/bash

# Script to assign country codes to files and organize them by country
# Usage: ./assign_countries.sh <directory> <country_iso_code> <number_of_files>
# Example: ./assign_countries.sh /data/geojsons/2024-11 US 100

if [ $# -lt 3 ]; then
    echo "Usage: $0 <directory> <country_iso_code> <number_of_files>"
    echo "  directory: Path to directory containing files to process"
    echo "  country_iso_code: ISO country code to assign (e.g., US, CA, BR)"
    echo "  number_of_files: Number of files to process"
    echo ""
    echo "Example:"
    echo "  $0 /data/geojsons/2024-11 US 100"
    exit 1
fi

TARGET_DIR="$1"
COUNTRY_CODE="$2"
NUM_FILES="$3"

# Check if directory exists
if [ ! -d "$TARGET_DIR" ]; then
    echo "Error: Directory '$TARGET_DIR' does not exist"
    exit 1
fi

# Get absolute path
TARGET_DIR=$(cd "$TARGET_DIR" && pwd)

# Validate number of files
if ! [[ "$NUM_FILES" =~ ^[0-9]+$ ]]; then
    echo "Error: Number of files must be a positive integer"
    exit 1
fi

echo "Processing directory: $TARGET_DIR"
echo "Country code: $COUNTRY_CODE"
echo "Number of files to process: $NUM_FILES"
echo ""

# Get first N files from directory (non-recursive, only files, not directories)
TEMP_FILE=$(mktemp)
find "$TARGET_DIR" -maxdepth 1 -type f | head -n "$NUM_FILES" > "$TEMP_FILE"

total_found=$(wc -l < "$TEMP_FILE" | tr -d ' ')

if [ $total_found -eq 0 ]; then
    echo "No files found in directory"
    rm -f "$TEMP_FILE"
    exit 0
fi

if [ $total_found -lt $NUM_FILES ]; then
    echo "Warning: Requested $NUM_FILES files but only $total_found available. Processing all available files."
fi

# Create destination directory
DEST_DIR="$TARGET_DIR/$COUNTRY_CODE"
mkdir -p "$DEST_DIR"
echo "Destination directory: $DEST_DIR"
echo ""

# Process files
processed=0

while IFS= read -r file && [ $processed -lt $NUM_FILES ]; do
    # Replace MX with assigned country code
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS uses BSD sed
        sed -i '' "s/\"iso_country_code\": \"MX\"/\"iso_country_code\": \"$COUNTRY_CODE\"/g" "$file"
    else
        # Linux uses GNU sed
        sed -i "s/\"iso_country_code\": \"MX\"/\"iso_country_code\": \"$COUNTRY_CODE\"/g" "$file"
    fi
    
    # Move file to country directory
    filename=$(basename "$file")
    mv "$file" "$DEST_DIR/$filename"
    
    ((processed++))
    
    # Progress indicator
    if [ $((processed % 100)) -eq 0 ]; then
        echo "Processed $processed/$NUM_FILES files..."
    fi
done < "$TEMP_FILE"

# Clean up temp file
rm -f "$TEMP_FILE"

echo ""
echo "Processing complete!"
echo "Files processed: $processed"
echo "Files moved to: $DEST_DIR"
