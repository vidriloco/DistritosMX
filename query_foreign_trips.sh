#!/usr/bin/env bash

# Script to query TripHome table in batches and fetch pings for the CAIDs
# Queries trip_home table in batches of 10000, then feeds CAIDs to veraset_fetch_pings_by_device

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
CONTROL_DIR=""
FROM_DATE=""
TO_DATE=""
SCHEMA_TYPE="BASIC"
API_KEY_PROVIDED=false
HAS_BEEN_PROCESSED=""
COUNTRY_ISO=""

# Arguments for veraset_fetch_pings_by_device
FETCH_ARGS=()

while [[ $# -gt 0 ]]; do
    case $1 in
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
            shift 2
            ;;
        --to-date)
            if [ -z "$2" ]; then
                echo "Error: --to-date requires a value"
                exit 1
            fi
            TO_DATE="$2"
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
        --has-been-processed)
            if [ -z "$2" ]; then
                echo "Error: --has-been-processed requires a value (True/False)"
                exit 1
            fi
            if [ "$2" != "True" ] && [ "$2" != "False" ]; then
                echo "Error: --has-been-processed must be True or False"
                exit 1
            fi
            HAS_BEEN_PROCESSED="$2"
            shift 2
            ;;
        --country-iso)
            if [ -z "$2" ]; then
                echo "Error: --country-iso requires a value"
                exit 1
            fi
            COUNTRY_ISO="$2"
            shift 2
            ;;
        *)
            echo "Error: Unknown argument: $1"
            echo "Usage: $0 --control-dir DIR [options]"
            echo ""
            echo "Required Arguments:"
            echo "  --control-dir: Directory where job_id control files will be created"
            echo ""
            echo "Optional Arguments:"
            echo "  --api-key: API key for Veraset API (default: 5e5d168e-78b2-45c5-961f-72c6a80562e2)"
            echo "  --from-date: Start date for ping data query (format: YYYY-MM-DD, passed to veraset_fetch_pings_by_device)"
            echo "  --to-date: End date for ping data query (format: YYYY-MM-DD, passed to veraset_fetch_pings_by_device)"
            echo "  --schema-type: Schema type for the request (default: BASIC)"
            echo "  --batch-size: Number of CAIDs to process in each batch (default: 10000)"
            echo "  --has-been-processed: Filter by processing status (True/False)"
            echo "  --country-iso: Filter by ISO 2-letter country code"
            echo ""
            echo "Date Range Examples:"
            echo "  --from-date 2024-11-01 --to-date 2024-11-30  # Query pings for November 2024"
            echo "  --from-date 2024-01-01 --to-date 2024-12-31  # Query pings for entire year 2024"
            exit 1
            ;;
    esac
done

# Check if required arguments are provided
if [ -z "$CONTROL_DIR" ]; then
    echo "Error: --control-dir is required"
    exit 1
fi

# Validate date format if provided
validate_date() {
    local date_str=$1
    if ! [[ "$date_str" =~ ^[0-9]{4}-[0-9]{2}-[0-9]{2}$ ]]; then
        echo "Error: Invalid date format: $date_str. Expected format: YYYY-MM-DD"
        exit 1
    fi
    # Extract year, month, day
    local year=${date_str:0:4}
    local month=${date_str:5:2}
    local day=${date_str:8:2}
    
    # Basic validation: check ranges
    if [ "$year" -lt 1900 ] || [ "$year" -gt 2100 ]; then
        echo "Error: Invalid year in date: $date_str"
        exit 1
    fi
    if [ "$month" -lt 1 ] || [ "$month" -gt 12 ]; then
        echo "Error: Invalid month in date: $date_str"
        exit 1
    fi
    if [ "$day" -lt 1 ] || [ "$day" -gt 31 ]; then
        echo "Error: Invalid day in date: $date_str"
        exit 1
    fi
    
    # Try to parse with Python for more accurate validation
    if ! python3 -c "from datetime import datetime; datetime.strptime('$date_str', '%Y-%m-%d')" >/dev/null 2>&1; then
        echo "Error: Invalid date: $date_str"
        exit 1
    fi
}

# Validate dates if provided
if [ -n "$FROM_DATE" ]; then
    validate_date "$FROM_DATE"
fi
if [ -n "$TO_DATE" ]; then
    validate_date "$TO_DATE"
fi

# Validate date range if both dates are provided
if [ -n "$FROM_DATE" ] && [ -n "$TO_DATE" ]; then
    # Use Python for cross-platform date comparison
    COMPARE_RESULT=$(python3 -c "
from datetime import datetime
from_date = datetime.strptime('$FROM_DATE', '%Y-%m-%d')
to_date = datetime.strptime('$TO_DATE', '%Y-%m-%d')
if from_date > to_date:
    print('ERROR')
" 2>/dev/null)
    if [ "$COMPARE_RESULT" = "ERROR" ]; then
        echo "Error: --from-date ($FROM_DATE) must be before or equal to --to-date ($TO_DATE)"
        exit 1
    fi
fi

# Add API key to fetch args if not already provided
if [ "$API_KEY_PROVIDED" = false ]; then
    FETCH_ARGS+=("--api-key" "$API_KEY")
fi

# Add date arguments only if provided (veraset_fetch_pings_by_device has defaults)
if [ -n "$FROM_DATE" ]; then
    FETCH_ARGS+=("--from-date" "$FROM_DATE")
fi
if [ -n "$TO_DATE" ]; then
    FETCH_ARGS+=("--to-date" "$TO_DATE")
fi

# Build filter arguments for Django query
FILTER_ARGS=()
if [ -n "$HAS_BEEN_PROCESSED" ]; then
    FILTER_ARGS+=("--has-been-processed" "$HAS_BEEN_PROCESSED")
fi
if [ -n "$COUNTRY_ISO" ]; then
    FILTER_ARGS+=("--country-iso" "$COUNTRY_ISO")
fi

# Query TripHome records and get total count
echo "Querying TripHome table..."
COUNT_OUTPUT=$(python geodjango/manage.py shell -c "
from world.models.trip_home import TripHome
queryset = TripHome.objects.all().order_by('id')
$(if [ -n "$HAS_BEEN_PROCESSED" ]; then
    if [ "$HAS_BEEN_PROCESSED" = "True" ]; then
        echo "queryset = queryset.filter(has_been_processed=True)"
    else
        echo "queryset = queryset.filter(has_been_processed=False)"
    fi
fi)
$(if [ -n "$COUNTRY_ISO" ]; then
    echo "queryset = queryset.filter(country_iso='$COUNTRY_ISO')"
fi)
print(queryset.count())
" 2>&1)

TOTAL_COUNT=$(echo "$COUNT_OUTPUT" | tail -1 | grep -E '^[0-9]+$')

if [ -z "$TOTAL_COUNT" ] || [ "$TOTAL_COUNT" -eq 0 ]; then
    echo "No TripHome records found matching the criteria."
    exit 0
fi

echo "Found $TOTAL_COUNT TripHome record(s)"
echo "Processing in batches of $BATCH_SIZE..."

# Calculate total number of batches
TOTAL_BATCHES=$(( (TOTAL_COUNT + BATCH_SIZE - 1) / BATCH_SIZE ))
SUCCESSFUL_BATCHES=0
FAILED_BATCHES=0

# Process in batches
OFFSET=0
BATCH_NUM=0

while [ $OFFSET -lt $TOTAL_COUNT ]; do
    BATCH_NUM=$((BATCH_NUM + 1))
    
    echo ""
    echo "Processing batch $BATCH_NUM/$TOTAL_BATCHES (offset: $OFFSET, limit: $BATCH_SIZE)..."
    
    # Query CAIDs for this batch using Django shell
    LIMIT=$((OFFSET + BATCH_SIZE))
    CAIDS_OUTPUT=$(python geodjango/manage.py shell -c "
from world.models.trip_home import TripHome
queryset = TripHome.objects.all().order_by('id')
$(if [ -n "$HAS_BEEN_PROCESSED" ]; then
    if [ "$HAS_BEEN_PROCESSED" = "True" ]; then
        echo "queryset = queryset.filter(has_been_processed=True)"
    else
        echo "queryset = queryset.filter(has_been_processed=False)"
    fi
fi)
$(if [ -n "$COUNTRY_ISO" ]; then
    echo "queryset = queryset.filter(country_iso='$COUNTRY_ISO')"
fi)
caids = list(queryset.values_list('caid', flat=True)[$OFFSET:$LIMIT])
for caid in caids:
    print(caid)
" 2>&1)
    
    # Extract CAIDs from output (filter out Django shell messages)
    CAID_ARRAY=()
    while IFS= read -r line; do
        # Filter out empty lines and Django shell messages
        if [[ -n "$line" ]] && [[ "$line" =~ ^[a-f0-9]{10,}$ ]]; then
            CAID_ARRAY+=("$line")
        fi
    done <<< "$CAIDS_OUTPUT"
    
    BATCH_SIZE_ACTUAL=${#CAID_ARRAY[@]}
    
    if [ $BATCH_SIZE_ACTUAL -eq 0 ]; then
        echo "  No valid CAIDs found in this batch, skipping..."
        OFFSET=$((OFFSET + BATCH_SIZE))
        continue
    fi
    
    echo "  Found $BATCH_SIZE_ACTUAL CAID(s) in this batch"
    
    # Execute veraset_fetch_pings_by_device with the batch of CAIDs
    if python geodjango/manage.py veraset_fetch_pings_by_device \
        "${FETCH_ARGS[@]}" \
        --device-ids "${CAID_ARRAY[@]}"; then
        SUCCESSFUL_BATCHES=$((SUCCESSFUL_BATCHES + 1))
        echo "  ✓ Batch $BATCH_NUM/$TOTAL_BATCHES completed successfully"
    else
        FAILED_BATCHES=$((FAILED_BATCHES + 1))
        echo "  ✗ Batch $BATCH_NUM/$TOTAL_BATCHES failed"
    fi
    
    OFFSET=$((OFFSET + BATCH_SIZE))
done

# Final summary
echo ""
echo "=========================================="
echo "Processing Summary:"
echo "  Total TripHome records: $TOTAL_COUNT"
if [ -n "$FROM_DATE" ] || [ -n "$TO_DATE" ]; then
    echo "  Ping date range: ${FROM_DATE:-"N/A"} to ${TO_DATE:-"N/A"}"
fi
if [ -n "$COUNTRY_ISO" ]; then
    echo "  Country filter: $COUNTRY_ISO"
fi
if [ -n "$HAS_BEEN_PROCESSED" ]; then
    echo "  Processing status: $HAS_BEEN_PROCESSED"
fi
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

