#!/usr/bin/env bash

# Script to query trips by start_time and displacement, then fetch pings for the CAIDs
# Queries trips matching criteria, then feeds CAIDs to veraset_fetch_pings_by_device

# Ensure we're running with bash
if [ -z "$BASH_VERSION" ]; then
    echo "Error: This script requires bash. Please run it with: bash $0" >&2
    exit 1
fi

# Get the directory where this script is located (project root)
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Change to project root directory
cd "$SCRIPT_DIR" || exit 1

# Activate virtual environment if it exists
if [ -d "venv" ]; then
    . venv/bin/activate
fi

# Default values
BATCH_SIZE=10000
API_KEY="5e5d168e-78b2-45c5-961f-72c6a80562e2"

# Parse arguments
LIMIT=""
CONTROL_DIR=""
FROM_DATE=""
TO_DATE=""
SCHEMA_TYPE="BASIC"
API_KEY_PROVIDED=false

# Arguments for veraset_fetch_pings_by_device
FETCH_ARGS=()

while [[ $# -gt 0 ]]; do
    case $1 in
        --limit|-l)
            if [ -z "$2" ]; then
                echo "Error: --limit requires a value"
                exit 1
            fi
            LIMIT="$2"
            # Validate limit is a positive integer
            if ! [[ "$LIMIT" =~ ^[1-9][0-9]*$ ]]; then
                echo "Error: --limit must be a positive integer"
                exit 1
            fi
            shift 2
            ;;
        --control-dir)
            if [ -z "$2" ]; then
                echo "Error: --control-dir requires a value"
                exit 1
            fi
            CONTROL_DIR="$2"
            FETCH_ARGS+=("--control-dir" "$2")
            shift 2
            ;;
        --api-key)
            if [ -z "$2" ]; then
                echo "Error: --api-key requires a value"
                exit 1
            fi
            API_KEY="$2"
            API_KEY_PROVIDED=true
            FETCH_ARGS+=("--api-key" "$2")
            shift 2
            ;;
        --from-date)
            if [ -z "$2" ]; then
                echo "Error: --from-date requires a value"
                exit 1
            fi
            FROM_DATE="$2"
            FETCH_ARGS+=("--from-date" "$2")
            shift 2
            ;;
        --to-date)
            if [ -z "$2" ]; then
                echo "Error: --to-date requires a value"
                exit 1
            fi
            TO_DATE="$2"
            FETCH_ARGS+=("--to-date" "$2")
            shift 2
            ;;
        --schema-type)
            if [ -z "$2" ]; then
                echo "Error: --schema-type requires a value"
                exit 1
            fi
            SCHEMA_TYPE="$2"
            FETCH_ARGS+=("--schema-type" "$2")
            shift 2
            ;;
        --batch-size)
            if [ -z "$2" ]; then
                echo "Error: --batch-size requires a value"
                exit 1
            fi
            BATCH_SIZE="$2"
            # Validate batch size is a positive integer
            if ! [[ "$BATCH_SIZE" =~ ^[1-9][0-9]*$ ]]; then
                echo "Error: --batch-size must be a positive integer"
                exit 1
            fi
            shift 2
            ;;
        *)
            echo "Error: Unknown argument: $1"
            echo "Usage: $0 --limit X --control-dir DIR --from-date DATE --to-date DATE [options]"
            echo ""
            echo "Required Arguments:"
            echo "  --limit, -l: Number of trips to return (positive integer)"
            echo "  --control-dir: Directory where job_id control files will be created"
            echo "  --from-date: Start date for start_time filter (format: YYYY-MM-DD)"
            echo "  --to-date: End date for start_time filter (format: YYYY-MM-DD)"
            echo ""
            echo "Optional Arguments:"
            echo "  --api-key: API key for Veraset API (default: 5e5d168e-78b2-45c5-961f-72c6a80562e2)"
            echo "  --schema-type: Schema type for the request (default: BASIC)"
            echo "  --batch-size: Number of CAIDs to process in each batch (default: 10000)"
            exit 1
            ;;
    esac
done

# Check if required arguments are provided
if [ -z "$LIMIT" ]; then
    echo "Error: --limit is required"
    exit 1
fi

if [ -z "$CONTROL_DIR" ]; then
    echo "Error: --control-dir is required"
    exit 1
fi

if [ -z "$FROM_DATE" ]; then
    echo "Error: --from-date is required"
    exit 1
fi

if [ -z "$TO_DATE" ]; then
    echo "Error: --to-date is required"
    exit 1
fi

# Add API key to fetch args if not already provided
if [ "$API_KEY_PROVIDED" = false ]; then
    FETCH_ARGS+=("--api-key" "$API_KEY")
fi

# Query trips and capture CAIDs (stdout) and warnings (stderr) separately
echo "Querying trips with start_time between $FROM_DATE and $TO_DATE and displacement > 2..."
# Use a temporary file to capture stderr
TEMP_STDERR=$(mktemp)
CAIDS_OUTPUT=$(python geodjango/manage.py query_trips_by_time_displacement \
    --from-date "$FROM_DATE" \
    --to-date "$TO_DATE" \
    --limit "$LIMIT" 2>"$TEMP_STDERR")
EXIT_CODE=$?
WARNINGS=$(cat "$TEMP_STDERR")
rm -f "$TEMP_STDERR"

# Display warnings if any
if [ -n "$WARNINGS" ]; then
    echo "$WARNINGS" >&2
    # Check if warnings indicate no trips found
    if echo "$WARNINGS" | grep -qi "No trips found"; then
        echo "No trips found matching the criteria."
        exit 0
    fi
fi

# Check if we got any CAIDs
if [ -z "$CAIDS_OUTPUT" ]; then
    echo "No CAIDs found matching the criteria."
    exit 0
fi

# Convert CAIDs to array (one per line), filtering out empty lines and ensuring uniqueness
# CAIDs should be non-empty hex strings (at least 10 chars)
# Use sort -u to ensure all CAIDs are unique
readarray -t CAID_ARRAY <<< "$(echo "$CAIDS_OUTPUT" | \
    grep -v '^$' | \
    grep -v '^[[:space:]]*$' | \
    grep -E '^[a-f0-9]{10,}$' | \
    sort -u)"

# Count the number of CAIDs
DEVICE_COUNT=${#CAID_ARRAY[@]}

if [ $DEVICE_COUNT -eq 0 ]; then
    echo "No valid CAIDs found."
    exit 0
fi

echo "Found $DEVICE_COUNT CAID(s)"
echo "Processing in batches of $BATCH_SIZE..."

# Calculate total number of batches
TOTAL_BATCHES=$(( (DEVICE_COUNT + BATCH_SIZE - 1) / BATCH_SIZE ))
SUCCESSFUL_BATCHES=0
FAILED_BATCHES=0

# Process in batches
for (( i=0; i<DEVICE_COUNT; i+=BATCH_SIZE )); do
    BATCH_NUM=$(( (i / BATCH_SIZE) + 1 ))
    
    # Extract batch of CAIDs
    BATCH_CAIDS=("${CAID_ARRAY[@]:i:BATCH_SIZE}")
    BATCH_SIZE_ACTUAL=${#BATCH_CAIDS[@]}
    
    echo ""
    echo "Processing batch $BATCH_NUM/$TOTAL_BATCHES ($BATCH_SIZE_ACTUAL CAID(s))..."
    
    # Execute veraset_fetch_pings_by_device with the batch of CAIDs
    if python geodjango/manage.py veraset_fetch_pings_by_device \
        "${FETCH_ARGS[@]}" \
        --device-ids "${BATCH_CAIDS[@]}"; then
        SUCCESSFUL_BATCHES=$((SUCCESSFUL_BATCHES + 1))
        echo "  ✓ Batch $BATCH_NUM/$TOTAL_BATCHES completed successfully"
    else
        FAILED_BATCHES=$((FAILED_BATCHES + 1))
        echo "  ✗ Batch $BATCH_NUM/$TOTAL_BATCHES failed"
    fi
done

# Final summary
echo ""
echo "=========================================="
echo "Processing Summary:"
echo "  Total CAIDs: $DEVICE_COUNT"
echo "  Batch size: $BATCH_SIZE"
echo "  Total batches: $TOTAL_BATCHES"
echo "  Successful batches: $SUCCESSFUL_BATCHES"
echo "  Failed batches: $FAILED_BATCHES"
echo "=========================================="

# Deactivate virtual environment if it was activated
if [ -d "venv" ] && [ -n "$VIRTUAL_ENV" ]; then
    deactivate
fi

# Exit with error code if any batches failed
if [ $FAILED_BATCHES -gt 0 ]; then
    exit 1
fi

exit 0

