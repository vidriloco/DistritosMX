#!/usr/bin/env bash

# Script to sync Veraset trip data from S3
# Iterates through files in a directory and syncs each one until a non-empty response is found

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
DIRECTORY=""
TARGET_DIR="trips"

while [[ $# -gt 0 ]]; do
    case $1 in
        --directory|-d)
            if [ -z "$2" ]; then
                echo "Error: --directory requires a value"
                exit 1
            fi
            DIRECTORY="$2"
            shift 2
            ;;
        --target-dir)
            if [ -z "$2" ]; then
                echo "Error: --target-dir requires a value"
                exit 1
            fi
            TARGET_DIR="$2"
            shift 2
            ;;
        *)
            echo "Error: Unknown argument: $1"
            echo "Usage: $0 --directory DIR [options]"
            echo ""
            echo "Required Arguments:"
            echo "  --directory, -d: Directory containing files to process"
            echo ""
            echo "Optional Arguments:"
            echo "  --target-dir: Target directory for syncing (default: trips)"
            exit 1
            ;;
    esac
done

# Check if required arguments are provided
if [ -z "$DIRECTORY" ]; then
    echo "Error: --directory is required"
    exit 1
fi

# Check if directory exists
if [ ! -d "$DIRECTORY" ]; then
    echo "Error: Directory '$DIRECTORY' does not exist"
    exit 1
fi

# Create target directory if it doesn't exist
if [ ! -d "$TARGET_DIR" ]; then
    mkdir -p "$TARGET_DIR"
    echo "Created target directory: $TARGET_DIR"
fi

# Get list of files in the directory (excluding directories)
FILES=()
while IFS= read -r -d '' file; do
    if [ -f "$file" ]; then
        FILES+=("$file")
    fi
done < <(find "$DIRECTORY" -maxdepth 1 -type f -print0 2>/dev/null)

if [ ${#FILES[@]} -eq 0 ]; then
    echo "No files found in directory: $DIRECTORY"
    exit 0
fi

echo "Found ${#FILES[@]} file(s) in directory: $DIRECTORY"
echo "Processing files concurrently (max 5) until a non-empty sync response is found..."
echo ""

# Process files with concurrency limit
MAX_CONCURRENT=5
PROCESSED=0
DELETED=0
FOUND_NON_EMPTY=false
declare -A JOB_PIDS
declare -A JOB_FILES
STOP_FILE="/tmp/sync_veraset_stop_$$"

# Function to wait for jobs when limit is reached and check for stop condition
wait_for_jobs() {
    while [ ${#JOB_PIDS[@]} -ge $MAX_CONCURRENT ]; do
        # Check if we should stop
        if [ -f "$STOP_FILE" ]; then
            return 0
        fi
        
        for pid in "${!JOB_PIDS[@]}"; do
            if ! kill -0 "$pid" 2>/dev/null; then
                # Job completed, remove from tracking
                wait "$pid"
                unset JOB_PIDS["$pid"]
                unset JOB_FILES["$pid"]
            fi
        done
        sleep 0.1
    done
}

# Function to process a single file
process_file() {
    local file="$1"
    local file_index="$2"
    
    # Check if we should stop before processing
    if [ -f "$STOP_FILE" ]; then
        return 1
    fi
    
    # Get filename without path and extension
    local filename=$(basename "$file")
    local filename_no_ext="${filename%.*}"
    
    # Skip if filename is empty after removing extension
    if [ -z "$filename_no_ext" ]; then
        echo "[$file_index] Skipping file with no name (after extension removal): $filename"
        return 1
    fi
    
    echo "[$file_index] Processing file $file_index/${#FILES[@]}: $filename"
    echo "[$file_index]   Using filename (no extension): $filename_no_ext"
    
    # Build S3 path
    local S3_PATH="s3://veraset-prd-platform-us-west-2/output/TallerDeApps/$filename_no_ext/"
    
    echo "[$file_index]   Syncing from: $S3_PATH"
    echo "[$file_index]   To: $TARGET_DIR"
    
    # Execute AWS S3 sync command and capture output
    local SYNC_OUTPUT=$(aws s3 sync "$S3_PATH" "$TARGET_DIR" 2>&1)
    local SYNC_EXIT_CODE=$?
    
    # Check if command succeeded
    if [ $SYNC_EXIT_CODE -ne 0 ]; then
        echo "[$file_index]   ✗ AWS S3 sync failed with exit code: $SYNC_EXIT_CODE"
        echo "[$file_index]   Error output: $SYNC_OUTPUT"
        echo ""
        return 1
    fi
    
    # Check if output is non-empty (meaning files were synced)
    if [ -n "$SYNC_OUTPUT" ]; then
        echo "[$file_index]   ✓ Non-empty response received!"
        echo "[$file_index]   Sync output:"
        echo "$SYNC_OUTPUT" | sed "s/^/[$file_index]     /"
        echo ""
        
        # Signal that we found a non-empty response (stop processing new files)
        touch "$STOP_FILE"
        touch "/tmp/sync_veraset_found_$$"
        
        # Only delete the file if we found a non-empty sync response
        if rm -f "$file" 2>/dev/null; then
            echo "[$file_index]   ✓ File deleted: $filename"
            echo "1" >> "/tmp/sync_veraset_deleted_$$"
        else
            echo "[$file_index]   ⚠ Warning: Failed to delete file: $filename"
        fi
        echo ""
        return 0
    else
        echo "[$file_index]   → Empty response (no files synced), continuing..."
        echo ""
        return 1
    fi
}

# Process each file with concurrency control
for i in "${!FILES[@]}"; do
    file="${FILES[$i]}"
    file_index=$((i + 1))
    
    # Check if we should stop before starting new jobs
    if [ -f "$STOP_FILE" ]; then
        break
    fi
    
    # Wait if we've reached the concurrency limit
    wait_for_jobs
    
    # Check again after waiting
    if [ -f "$STOP_FILE" ]; then
        break
    fi
    
    PROCESSED=$((PROCESSED + 1))
    
    # Process file in background
    process_file "$file" "$file_index" &
    
    pid=$!
    JOB_PIDS["$pid"]=1
    JOB_FILES["$pid"]="$file"
done

# Wait for all remaining jobs to complete
for pid in "${!JOB_PIDS[@]}"; do
    wait "$pid"
done

# Check if any job found a non-empty response
if [ -f "/tmp/sync_veraset_found_$$" ]; then
    FOUND_NON_EMPTY=true
    rm -f "/tmp/sync_veraset_found_$$"
fi

# Count deleted files
if [ -f "/tmp/sync_veraset_deleted_$$" ]; then
    DELETED=$(wc -l < "/tmp/sync_veraset_deleted_$$")
    rm -f "/tmp/sync_veraset_deleted_$$"
fi

# Clean up stop file
rm -f "$STOP_FILE"

# Final summary
echo "=========================================="
echo "Processing Summary:"
echo "  Total files found: ${#FILES[@]}"
echo "  Files processed: $PROCESSED"
echo "  Files deleted: $DELETED"
if [ "$FOUND_NON_EMPTY" = true ]; then
    echo "  Status: ✓ Found non-empty sync response"
    echo "  Stopped at file: $(basename "${FILES[$((PROCESSED - 1))]}")"
else
    echo "  Status: ✗ No non-empty sync responses found"
fi
echo "=========================================="

# Exit with error code if no non-empty response was found
if [ "$FOUND_NON_EMPTY" = false ]; then
    exit 1
fi

exit 0

