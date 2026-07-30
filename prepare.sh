#!/bin/bash

cd geodjango

if [[ "$*" != *"-skip-db-reset"* ]]; then
    echo "Resetting the database..."
    python3 manage.py flush --no-input
    python3 manage.py migrate
else
    echo "Skipping database reset..."
fi

if [[ "$*" != *"-skip-station-ingest"* ]]; then
    echo "Ingesting stations..."
    for station_file in data/stations/stc-metro-stations.csv data/stations/cablebus-stations.csv data/stations/metrobus-stations.csv data/stations/tren-ligero-stations.csv data/stations/trolebus-stations.csv; do
        if [ ! -f "$station_file" ]; then
            echo "Error: $station_file does not exist. Aborting."
            exit 1
        fi
        python3 manage.py ingest_stations "$station_file"
    done
else
    echo "Skipping station ingestion..."
fi

if [[ "$*" != *"-skip-location-matching"* ]]; then
    echo "Generating transactions locations..."
    python3 manage.py generate_transactions_location data/transactions/2024-06-26.csv --output_file data/transactions-locations/2024-06-26.csv
    python3 manage.py generate_transactions_location data/transactions/2024-06-27.csv --output_file data/transactions-locations/2024-06-27.csv
else
    echo "Skipping transaction location generation..."
fi

if [[ "$*" != *"-skip-grouping-transaction"* ]]; then
    echo "Grouping transactions..."
    python3 manage.py group_transactions data/transactions-locations/2024-06-26.csv --output_file data/transactions-timed/2024-06-26-client-15min.csv --time_grouping 15 --output_format csv
    python3 manage.py group_transactions data/transactions-locations/2024-06-27.csv --output_file data/transactions-timed/2024-06-27-client-15min.csv --time_grouping 15 --output_format csv
else
    echo "Skipping transaction grouping..."
fi

# New section to merge CSV files
echo "Merging 15-minute grouped transaction files..."
output_file="data/exposed/merged_transactions_15min.csv"
header_file=$(ls data/transactions-timed/*-15min.csv | head -n 1)

# Copy header from the first file
head -n 1 "$header_file" > "$output_file"

# Append data from all files, skipping headers
for file in data/transactions-timed/*-15min.csv; do
    tail -n +2 "$file" >> "$output_file"
done

echo "Merged file created: $output_file"

# New section to transform CSV files to JSON
echo "Transforming CSV files in exposed directory to JSON..."
for csv_file in data/exposed/*.csv; do
    json_file="${csv_file%.csv}.json"
    python3 -c "import csv, json; print(json.dumps([dict(r) for r in csv.DictReader(open('$csv_file'))]))" > "$json_file"
    echo "Transformed $csv_file to $json_file"
done

echo "CSV to JSON transformation complete."


