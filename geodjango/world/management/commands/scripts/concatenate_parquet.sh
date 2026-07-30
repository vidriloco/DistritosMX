#!/bin/bash

# Parquet Concatenation Script (Bash version)
# This script concatenates all parquet files within each date directory
# for both home_eval and movement_eval datasets.

set -e  # Exit on any error

# Default values
OUTPUT_DIR="./concatenated"
DATASET="all"
BASE_DIR="."

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --output-dir)
            OUTPUT_DIR="$2"
            shift 2
            ;;
        --dataset)
            DATASET="$2"
            shift 2
            ;;
        --base-dir)
            BASE_DIR="$2"
            shift 2
            ;;
        --help)
            echo "Usage: $0 [--output-dir OUTPUT_DIR] [--dataset DATASET] [--base-dir BASE_DIR]"
            echo "Options:"
            echo "  --output-dir: Directory to save concatenated files (default: ./concatenated)"
            echo "  --dataset: Specific dataset to process (home_eval, movement_eval, or all)"
            echo "  --base-dir: Base directory containing the datasets (default: current directory)"
            exit 0
            ;;
        *)
            echo "Unknown option $1"
            exit 1
            ;;
    esac
done

# Convert to absolute paths
BASE_DIR=$(realpath "$BASE_DIR")
OUTPUT_DIR=$(realpath "$OUTPUT_DIR")

echo "Base directory: $BASE_DIR"
echo "Output directory: $OUTPUT_DIR"
echo "Processing dataset: $DATASET"

# Create output directory
mkdir -p "$OUTPUT_DIR"

# Function to process a dataset
process_dataset() {
    local dataset_name="$1"
    local dataset_path="$BASE_DIR/$dataset_name"
    
    if [ ! -d "$dataset_path" ]; then
        echo "Warning: Dataset directory not found: $dataset_path"
        return
    fi
    
    # Find all date directories
    local date_dirs=($(find "$dataset_path" -maxdepth 1 -type d -name "date=*" | sort))
    
    if [ ${#date_dirs[@]} -eq 0 ]; then
        echo "Warning: No date directories found in $dataset_path"
        return
    fi
    
    echo "Processing ${#date_dirs[@]} date directories for $dataset_name"
    
    for date_dir in "${date_dirs[@]}"; do
        local date_name=$(basename "$date_dir")
        echo "Processing $date_name"
        
        # Find all parquet files in this date directory
        local parquet_files=($(find "$date_dir" -name "*.parquet" | sort))
        
        if [ ${#parquet_files[@]} -eq 0 ]; then
            echo "Warning: No parquet files found in $date_dir"
            continue
        fi
        
        # Create output filename
        local output_filename="${dataset_name}_${date_name#date=}.parquet"
        local output_path="$OUTPUT_DIR/$output_filename"
        
        echo "Concatenating ${#parquet_files[@]} parquet files to $output_path"
        
        # Use pandas to concatenate (requires pandas and pyarrow)
        python3 -c "
import pandas as pd
import sys
import os

files = $(
    printf '%s\n' "${parquet_files[@]}" | python3 -c "
import sys
import json
files = [line.strip() for line in sys.stdin]
print(json.dumps(files))
"
)

try:
    dataframes = []
    for file_path in files:
        df = pd.read_parquet(file_path)
        dataframes.append(df)
    
    if dataframes:
        concatenated_df = pd.concat(dataframes, ignore_index=True)
        os.makedirs(os.path.dirname('$output_path'), exist_ok=True)
        concatenated_df.to_parquet('$output_path', index=False)
        print(f'Successfully concatenated {len(concatenated_df)} rows to $output_path')
    else:
        print('No valid parquet files could be read')
        sys.exit(1)
        
except Exception as e:
    print(f'Error concatenating files: {e}')
    sys.exit(1)
"
        
        if [ $? -eq 0 ]; then
            echo "✓ Successfully processed $date_name"
        else
            echo "✗ Failed to process $date_name"
        fi
    done
}

# Process datasets
if [ "$DATASET" = "home_eval" ] || [ "$DATASET" = "all" ]; then
    echo "Processing home_eval dataset..."
    process_dataset "home_eval"
fi

if [ "$DATASET" = "movement_eval" ] || [ "$DATASET" = "all" ]; then
    echo "Processing movement_eval dataset..."
    process_dataset "movement_eval"
fi

echo "Concatenation process completed!"
