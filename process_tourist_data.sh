#!/usr/bin/env bash

# Script to execute veraset_process_trips_home Django management command
# and feed the returned CAIDs to veraset_fetch_pings_by_device

# Ensure we're running with bash
if [ -z "$BASH_VERSION" ]; then
    echo "Error: This script requires bash. Please run it with: bash $0" >&2
    exit 1
fi

# Get the directory where this script is located (project root)
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Change to project root directory
cd "$SCRIPT_DIR" || exit 1

# API Key for Veraset API
API_KEY="5e5d168e-78b2-45c5-961f-72c6a80562e2"

# Default batch size
BATCH_SIZE=10

# Activate virtual environment if it exists
if [ -d "venv" ]; then
    . venv/bin/activate
fi

# Parse arguments
# Filter arguments for veraset_process_trips_home
FILTER_ARGS=()
# Arguments for veraset_fetch_pings_by_device
FETCH_ARGS=()
CONTROL_DIR=""
DEVICE_IDS=""
API_KEY_PROVIDED=false

# Parse all arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        # Filter arguments (for veraset_process_trips_home)
        --has-been-processed|--country-iso)
            if [ -z "$2" ]; then
                echo "Error: $1 requires a value"
                exit 1
            fi
            FILTER_ARGS+=("$1" "$2")
            shift 2
            ;;
        # Required fetch arguments
        --control-dir)
            if [ -z "$2" ]; then
                echo "Error: --control-dir requires a value"
                exit 1
            fi
            CONTROL_DIR="$2"
            FETCH_ARGS+=("$1" "$2")
            shift 2
            ;;
        # Optional fetch arguments
        --api-key)
            if [ -z "$2" ]; then
                echo "Error: $1 requires a value"
                exit 1
            fi
            API_KEY="$2"
            API_KEY_PROVIDED=true
            FETCH_ARGS+=("$1" "$2")
            shift 2
            ;;
        --from-date|--to-date|--schema-type)
            if [ -z "$2" ]; then
                echo "Error: $1 requires a value"
                exit 1
            fi
            FETCH_ARGS+=("$1" "$2")
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
            echo "Usage: $0 [--has-been-processed True|False] [--country-iso CODE] --control-dir DIR [--api-key KEY] [--from-date DATE] [--to-date DATE] [--schema-type TYPE] [--batch-size SIZE]"
            exit 1
            ;;
    esac
done

# Check if control-dir is provided (required for veraset_fetch_pings_by_device)
if [ -z "$CONTROL_DIR" ]; then
    echo "Error: --control-dir is required"
    echo "Usage: $0 [--has-been-processed True|False] [--country-iso CODE] --control-dir DIR [--api-key KEY] [--from-date DATE] [--to-date DATE] [--schema-type TYPE] [--batch-size SIZE]"
    exit 1
fi

# Add API key to fetch args if not already provided
if [ "$API_KEY_PROVIDED" = false ]; then
    FETCH_ARGS+=("--api-key" "$API_KEY")
fi

# Execute veraset_process_trips_home and capture CAIDs
echo "Fetching CAIDs from TripHome records..."
CAIDS_CSV=$(python geodjango/manage.py veraset_process_trips_home "${FILTER_ARGS[@]}")

# Check if we got any CAIDs
if [ -z "$CAIDS_CSV" ]; then
    echo "No CAIDs found matching the criteria."
    exit 0
fi

# Convert comma-separated CAIDs to an array
IFS=',' read -ra CAID_ARRAY <<< "$CAIDS_CSV"

# Count the number of device IDs
DEVICE_COUNT=${#CAID_ARRAY[@]}
echo "Found $DEVICE_COUNT device ID(s)"
echo "Processing in batches of $BATCH_SIZE..."

# Calculate total number of batches
TOTAL_BATCHES=$(( (DEVICE_COUNT + BATCH_SIZE - 1) / BATCH_SIZE ))
SUCCESSFUL_BATCHES=0
FAILED_BATCHES=0

# Display job summary and ask for confirmation
echo ""
echo "=========================================="
echo "Job Summary:"
echo "  Total device IDs: $DEVICE_COUNT"
echo "  Batch size: $BATCH_SIZE"
echo "  Total batches to execute: $TOTAL_BATCHES"
echo "=========================================="
echo ""
read -p "Do you want to proceed with executing these $TOTAL_BATCHES batch(es)? (y/n): " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Execution cancelled by user."
    exit 0
fi
echo ""

# Process in batches
for (( i=0; i<DEVICE_COUNT; i+=BATCH_SIZE )); do
    BATCH_NUM=$(( (i / BATCH_SIZE) + 1 ))
    
    # Extract batch of device IDs
    BATCH_CAIDS=("${CAID_ARRAY[@]:i:BATCH_SIZE}")
    BATCH_SIZE_ACTUAL=${#BATCH_CAIDS[@]}
    
    echo ""
    echo "Processing batch $BATCH_NUM/$TOTAL_BATCHES ($BATCH_SIZE_ACTUAL device ID(s))..."
    
    # Execute veraset_fetch_pings_by_device with the batch of device IDs
    # Pass device IDs as separate arguments: --device-ids id1 id2 id3 ...
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
echo "  Total device IDs: $DEVICE_COUNT"
echo "  Batch size: $BATCH_SIZE"
echo "  Total batches: $TOTAL_BATCHES"
echo "  Successful batches: $SUCCESSFUL_BATCHES"
echo "  Failed batches: $FAILED_BATCHES"
echo "=========================================="

# Deactivate virtual environment if it was activated
if [ -d "venv" ] && [ -n "$VIRTUAL_ENV" ]; then
    deactivate
fi

