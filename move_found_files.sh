#!/usr/bin/env bash

# Script to move files from a directory based on a control file
# Reads filenames from control-file and moves matching files from gjson-dir to gjson-dir/FOUND

# Ensure we're running with bash
if [ -z "$BASH_VERSION" ]; then
    echo "Error: This script requires bash. Please run it with: bash $0" >&2
    exit 1
fi

# Get the directory where this script is located (project root)
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Change to project root directory
cd "$SCRIPT_DIR" || exit 1

# Parse arguments
GJSON_DIR=""
CONTROL_FILE=""

while [[ $# -gt 0 ]]; do
    case $1 in
        --gjson-dir|-d)
            if [ -z "$2" ]; then
                echo "Error: --gjson-dir requires a value"
                exit 1
            fi
            GJSON_DIR="$2"
            shift 2
            ;;
        --control-file|-c)
            if [ -z "$2" ]; then
                echo "Error: --control-file requires a value"
                exit 1
            fi
            CONTROL_FILE="$2"
            shift 2
            ;;
        *)
            echo "Error: Unknown argument: $1"
            echo "Usage: $0 --gjson-dir DIR --control-file FILE"
            echo ""
            echo "Required Arguments:"
            echo "  --gjson-dir, -d: Directory containing files to search"
            echo "  --control-file, -c: Path to text file containing filenames (one per line)"
            exit 1
            ;;
    esac
done

# Check if required arguments are provided
if [ -z "$GJSON_DIR" ]; then
    echo "Error: --gjson-dir is required"
    exit 1
fi

if [ -z "$CONTROL_FILE" ]; then
    echo "Error: --control-file is required"
    exit 1
fi

# Check if gjson-dir exists and is a directory
if [ ! -d "$GJSON_DIR" ]; then
    echo "Error: Directory '$GJSON_DIR' does not exist or is not a directory"
    exit 1
fi

# Check if control-file exists and is a file
if [ ! -f "$CONTROL_FILE" ]; then
    echo "Error: Control file '$CONTROL_FILE' does not exist or is not a file"
    exit 1
fi

# Create FOUND directory if it doesn't exist
FOUND_DIR="$GJSON_DIR/FOUND"
if [ ! -d "$FOUND_DIR" ]; then
    mkdir -p "$FOUND_DIR"
    echo "Created FOUND directory: $FOUND_DIR"
fi

# Counters
TOTAL_LINES=0
FOUND_COUNT=0
MOVED_COUNT=0
NOT_FOUND_COUNT=0

echo "Reading filenames from control file: $CONTROL_FILE"
echo "Searching for files in directory: $GJSON_DIR"
echo "Moving found files to: $FOUND_DIR"
echo ""

# Read each line from control file and process
while IFS= read -r filename || [ -n "$filename" ]; do
    # Skip empty lines and whitespace-only lines
    if [ -z "$filename" ] || [ -z "${filename// }" ]; then
        continue
    fi
    
    # Trim whitespace from filename
    filename=$(echo "$filename" | xargs)
    
    TOTAL_LINES=$((TOTAL_LINES + 1))
    
    # Remove .geojson extension if present (we'll add it back when searching)
    base_filename="${filename%.geojson}"
    
    # Look for the file in gjson-dir with .geojson extension (search recursively)
    FOUND_FILE=$(find "$GJSON_DIR" -name "${base_filename}.geojson" -type f 2>/dev/null | head -n 1)
    
    if [ -n "$FOUND_FILE" ]; then
        FOUND_COUNT=$((FOUND_COUNT + 1))
        
        # Get the relative path from gjson-dir to preserve subdirectory structure
        RELATIVE_PATH="${FOUND_FILE#$GJSON_DIR/}"
        
        # Skip if file is already in FOUND directory
        if [[ "$RELATIVE_PATH" == FOUND/* ]]; then
            echo "[$TOTAL_LINES] ⚠ Skipping (already in FOUND): $filename"
            continue
        fi
        
        # Determine destination path
        DEST_PATH="$FOUND_DIR/$(basename "$FOUND_FILE")"
        
        # Handle filename collisions by appending a number
        if [ -f "$DEST_PATH" ]; then
            COUNTER=1
            BASE_NAME=$(basename "$FOUND_FILE")
            EXT="${BASE_NAME##*.}"
            NAME="${BASE_NAME%.*}"
            
            while [ -f "$DEST_PATH" ]; do
                if [ -n "$EXT" ] && [ "$EXT" != "$BASE_NAME" ]; then
                    DEST_PATH="$FOUND_DIR/${NAME}_${COUNTER}.${EXT}"
                else
                    DEST_PATH="$FOUND_DIR/${BASE_NAME}_${COUNTER}"
                fi
                COUNTER=$((COUNTER + 1))
            done
        fi
        
        # Move the file
        if mv "$FOUND_FILE" "$DEST_PATH" 2>/dev/null; then
            MOVED_COUNT=$((MOVED_COUNT + 1))
            echo "[$TOTAL_LINES] ✓ Moved: $filename -> $(basename "$DEST_PATH")"
        else
            echo "[$TOTAL_LINES] ✗ Failed to move: $filename"
        fi
    else
        NOT_FOUND_COUNT=$((NOT_FOUND_COUNT + 1))
        echo "[$TOTAL_LINES] ✗ Not found: $filename"
    fi
done < "$CONTROL_FILE"

# Final summary
echo ""
echo "=========================================="
echo "Processing Summary:"
echo "  Total lines in control file: $TOTAL_LINES"
echo "  Files found: $FOUND_COUNT"
echo "  Files moved: $MOVED_COUNT"
echo "  Files not found: $NOT_FOUND_COUNT"
echo "  Destination directory: $FOUND_DIR"
echo "=========================================="

# Exit with error code if no files were moved
if [ $MOVED_COUNT -eq 0 ]; then
    exit 1
fi

exit 0

