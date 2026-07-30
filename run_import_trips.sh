#!/bin/bash

# Script to import trips from CSV files for dates 02-08, running each for 10 minutes
# Usage: ./run_import_trips.sh

# Change to the geodjango directory where manage.py is located
cd "$(dirname "$0")/geodjango" || exit 1

# Base path pattern
BASE_PATH="../data/output/data/2025-06/date=2025-06-XX/date=2025-06-XX.csv"

# Loop through dates 02 to 08
for day in {2..8}; do
    # Format day as zero-padded (02, 03, 04, etc.)
    day_padded=$(printf "%02d" "$day")
    
    # Replace XX with the actual day in both places in the path
    csv_path=$(echo "$BASE_PATH" | sed "s/XX/$day_padded/g")
    
    echo "=========================================="
    echo "Processing date: 2025-06-$day_padded"
    echo "CSV file: $csv_path"
    echo "Starting at: $(date)"
    echo "=========================================="
    
    # Run the command with a 10-minute (600 seconds) timeout
    timeout 600 python manage.py veraset_import_trips_from_csv "$csv_path"
    
    # Capture the exit status
    exit_status=$?
    
    echo "=========================================="
    echo "Finished processing date: 2025-06-$day_padded"
    echo "Ended at: $(date)"
    
    # Check if timeout occurred
    if [ $exit_status -eq 124 ]; then
        echo "Status: Timeout (10 minutes reached)"
    elif [ $exit_status -eq 0 ]; then
        echo "Status: Completed successfully"
    else
        echo "Status: Error (exit code: $exit_status)"
    fi
    echo "=========================================="
    echo ""
    
    # Small delay before starting next iteration
    sleep 2
done

echo "All dates processed!"

