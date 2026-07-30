#!/usr/bin/env bash

# Script to organize files by ISO country code found in their content
# Reads each file in a directory, extracts the iso_country_code value,
# and moves the file to a subdirectory named after the country code

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
TARGET_DIR=""
RECURSIVE=false
DRY_RUN=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --dir|-d)
            if [ -z "$2" ]; then
                echo "Error: --dir requires a value"
                exit 1
            fi
            TARGET_DIR="$2"
            shift 2
            ;;
        --recursive|-r)
            RECURSIVE=true
            shift
            ;;
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        *)
            echo "Error: Unknown argument: $1"
            echo "Usage: $0 --dir DIRECTORY [--recursive] [--dry-run]"
            echo ""
            echo "Required Arguments:"
            echo "  --dir, -d: Directory containing files to process"
            echo ""
            echo "Optional Arguments:"
            echo "  --recursive, -r: Process files recursively in subdirectories"
            echo "  --dry-run: Show what would be done without actually moving files"
            exit 1
            ;;
    esac
done

# Check if required arguments are provided
if [ -z "$TARGET_DIR" ]; then
    echo "Error: --dir is required"
    exit 1
fi

# Check if directory exists and is a directory
if [ ! -d "$TARGET_DIR" ]; then
    echo "Error: Directory '$TARGET_DIR' does not exist or is not a directory"
    exit 1
fi

# Get absolute path
TARGET_DIR=$(cd "$TARGET_DIR" && pwd)

# Counters
TOTAL_FILES=0
PROCESSED_COUNT=0
MOVED_COUNT=0
SKIPPED_COUNT=0
ERROR_COUNT=0

echo "Processing directory: $TARGET_DIR"
if [ "$RECURSIVE" = true ]; then
    echo "Mode: Recursive"
else
    echo "Mode: Non-recursive (top-level only)"
fi
if [ "$DRY_RUN" = true ]; then
    echo "Mode: DRY RUN - No files will be moved"
fi
echo ""

# Find files based on recursive flag
if [ "$RECURSIVE" = true ]; then
    # Find all files recursively, excluding directories that match country codes
    # (to avoid processing files that are already organized)
    FIND_CMD="find \"$TARGET_DIR\" -type f"
else
    # Find only files in the top-level directory
    FIND_CMD="find \"$TARGET_DIR\" -maxdepth 1 -type f"
fi

# Process each file
while IFS= read -r file; do
    TOTAL_FILES=$((TOTAL_FILES + 1))
    
    # Skip if file is already in a country code directory
    # (check if parent directory is a 2-letter uppercase code)
    parent_dir=$(basename "$(dirname "$file")")
    if [[ "$parent_dir" =~ ^[A-Z]{2}$ ]] && [ "$parent_dir" != "$(basename "$TARGET_DIR")" ]; then
        SKIPPED_COUNT=$((SKIPPED_COUNT + 1))
        if [ "$DRY_RUN" = true ]; then
            echo "[$TOTAL_FILES] ⚠ Skipping (already in country directory): $(basename "$file")"
        fi
        continue
    fi
    
    # Try to extract iso_country_code from the file
    # Pattern: "iso_country_code": "<country-code>", or "iso_country_code": "<country-code>"
    # We'll use grep to find the pattern and extract the country code
    COUNTRY_CODE=$(grep -oE '"iso_country_code"\s*:\s*"[A-Z]{2}"' "$file" 2>/dev/null | head -n 1 | grep -oE '"[A-Z]{2}"' | tr -d '"')
    
    if [ -z "$COUNTRY_CODE" ]; then
        ERROR_COUNT=$((ERROR_COUNT + 1))
        echo "[$TOTAL_FILES] ✗ No country code found: $(basename "$file")"
        continue
    fi
    
    # Validate country code (should be 2 uppercase letters)
    if ! [[ "$COUNTRY_CODE" =~ ^[A-Z]{2}$ ]]; then
        ERROR_COUNT=$((ERROR_COUNT + 1))
        echo "[$TOTAL_FILES] ✗ Invalid country code format: $(basename "$file") (found: $COUNTRY_CODE)"
        continue
    fi
    
    # Create destination directory
    DEST_DIR="$TARGET_DIR/$COUNTRY_CODE"
    
    if [ "$DRY_RUN" = false ]; then
        mkdir -p "$DEST_DIR"
    fi
    
    # Determine destination path
    filename=$(basename "$file")
    DEST_PATH="$DEST_DIR/$filename"
    
    # Handle filename collisions by appending a number
    if [ "$DRY_RUN" = false ] && [ -f "$DEST_PATH" ]; then
        COUNTER=1
        BASE_NAME=$(basename "$file")
        EXT="${BASE_NAME##*.}"
        NAME="${BASE_NAME%.*}"
        
        while [ -f "$DEST_PATH" ]; do
            if [ -n "$EXT" ] && [ "$EXT" != "$BASE_NAME" ]; then
                DEST_PATH="$DEST_DIR/${NAME}_${COUNTER}.${EXT}"
            else
                DEST_PATH="$DEST_DIR/${BASE_NAME}_${COUNTER}"
            fi
            COUNTER=$((COUNTER + 1))
        done
    fi
    
    # Move the file
    if [ "$DRY_RUN" = true ]; then
        echo "[$TOTAL_FILES] → Would move: $(basename "$file") -> $COUNTRY_CODE/$(basename "$DEST_PATH")"
        MOVED_COUNT=$((MOVED_COUNT + 1))
    else
        if mv "$file" "$DEST_PATH" 2>/dev/null; then
            MOVED_COUNT=$((MOVED_COUNT + 1))
            echo "[$TOTAL_FILES] ✓ Moved: $(basename "$file") -> $COUNTRY_CODE/$(basename "$DEST_PATH")"
        else
            ERROR_COUNT=$((ERROR_COUNT + 1))
            echo "[$TOTAL_FILES] ✗ Failed to move: $(basename "$file")"
        fi
    fi
    
    PROCESSED_COUNT=$((PROCESSED_COUNT + 1))
    
    # Progress indicator for large batches
    if [ $((PROCESSED_COUNT % 100)) -eq 0 ]; then
        echo "  Progress: $PROCESSED_COUNT files processed..."
    fi
done < <(eval "$FIND_CMD")

# Final summary
echo ""
echo "=========================================="
echo "Processing Summary:"
echo "  Total files found: $TOTAL_FILES"
echo "  Files processed: $PROCESSED_COUNT"
echo "  Files moved: $MOVED_COUNT"
echo "  Files skipped: $SKIPPED_COUNT"
echo "  Errors: $ERROR_COUNT"
if [ "$DRY_RUN" = true ]; then
    echo ""
    echo "  ⚠ This was a DRY RUN - No files were actually moved"
fi
echo "=========================================="

# Exit with error code if there were errors
if [ $ERROR_COUNT -gt 0 ]; then
    exit 1
fi

exit 0

