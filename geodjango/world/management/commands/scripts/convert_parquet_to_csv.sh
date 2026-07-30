#!/bin/bash

# Parquet to CSV Conversion Script (Bash version)
# This script converts parquet files to CSV format

set -e  # Exit on any error

# Default values
INPUT_DIR="./concatenated_home_eval"
OUTPUT_DIR="./csv_output"
SOURCE="concatenated"
BASE_DIR="."

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --input-dir)
            INPUT_DIR="$2"
            shift 2
            ;;
        --output-dir)
            OUTPUT_DIR="$2"
            shift 2
            ;;
        --source)
            SOURCE="$2"
            shift 2
            ;;
        --base-dir)
            BASE_DIR="$2"
            shift 2
            ;;
        --help)
            echo "Usage: $0 [--input-dir INPUT_DIR] [--output-dir OUTPUT_DIR] [--source SOURCE] [--base-dir BASE_DIR]"
            echo "Options:"
            echo "  --input-dir: Directory containing parquet files (default: ./concatenated_home_eval)"
            echo "  --output-dir: Directory to save CSV files (default: ./csv_output)"
            echo "  --source: Source of parquet files - 'concatenated' or 'original' (default: concatenated)"
            echo "  --base-dir: Base directory for original files (default: current directory)"
            exit 0
            ;;
        *)
            echo "Unknown option $1"
            exit 1
            ;;
    esac
done

# Convert to absolute paths
INPUT_DIR=$(realpath "$INPUT_DIR")
OUTPUT_DIR=$(realpath "$OUTPUT_DIR")
BASE_DIR=$(realpath "$BASE_DIR")

echo "Input directory: $INPUT_DIR"
echo "Output directory: $OUTPUT_DIR"
echo "Source: $SOURCE"

# Create output directory
mkdir -p "$OUTPUT_DIR"

# Function to convert a single parquet file to CSV
convert_parquet_to_csv() {
    local parquet_file="$1"
    local csv_file="$2"
    
    echo "Converting $parquet_file to $csv_file"
    
    python3 -c "
import pandas as pd
import sys
import os

try:
    # Read parquet file
    df = pd.read_parquet('$parquet_file')
    
    # Create output directory if it doesn't exist
    os.makedirs(os.path.dirname('$csv_file'), exist_ok=True)
    
    # Save as CSV
    df.to_csv('$csv_file', index=False)
    
    print(f'✓ Successfully converted {len(df)} rows to $csv_file')
    
except Exception as e:
    print(f'Error converting $parquet_file: {e}')
    sys.exit(1)
"
}

# Function to process concatenated files
process_concatenated_files() {
    if [ ! -d "$INPUT_DIR" ]; then
        echo "Error: Input directory not found: $INPUT_DIR"
        return 1
    fi
    
    # Find all parquet files
    parquet_files=($(find "$INPUT_DIR" -name "*.parquet" | sort))
    
    if [ ${#parquet_files[@]} -eq 0 ]; then
        echo "Warning: No parquet files found in $INPUT_DIR"
        return 1
    fi
    
    echo "Processing ${#parquet_files[@]} concatenated parquet files"
    
    for parquet_file in "${parquet_files[@]}"; do
        # Create CSV filename
        filename=$(basename "$parquet_file")
        csv_filename="${filename%.parquet}.csv"
        csv_path="$OUTPUT_DIR/$csv_filename"
        
        # Convert to CSV
        convert_parquet_to_csv "$parquet_file" "$csv_path"
        
        if [ $? -eq 0 ]; then
            echo "✓ Successfully processed $filename"
        else
            echo "✗ Failed to process $filename"
        fi
    done
}

# Function to process original files
process_original_files() {
    # Find all date directories
    date_dirs=()
    for dataset in "home_eval" "movement_eval"; do
        dataset_path="$BASE_DIR/$dataset"
        if [ -d "$dataset_path" ]; then
            dates=($(find "$dataset_path" -maxdepth 1 -type d -name "date=*" | sort))
            for date_path in "${dates[@]}"; do
                date_name=$(basename "$date_path")
                date_dirs+=("$dataset $date_name $date_path")
            done
        fi
    done
    
    if [ ${#date_dirs[@]} -eq 0 ]; then
        echo "Warning: No date directories found"
        return 1
    fi
    
    echo "Processing ${#date_dirs[@]} date directories"
    
    for date_info in "${date_dirs[@]}"; do
        read -r dataset date_name date_path <<< "$date_info"
        echo "Processing $dataset/$date_name"
        
        # Find all parquet files in this date directory
        parquet_files=($(find "$date_path" -name "*.parquet" | sort))
        
        if [ ${#parquet_files[@]} -eq 0 ]; then
            echo "Warning: No parquet files found in $date_path"
            continue
        fi
        
        # Create output subdirectory for this date
        date_output_dir="$OUTPUT_DIR/${dataset}_${date_name#date=}"
        
        # Convert each parquet file to CSV
        for parquet_file in "${parquet_files[@]}"; do
            filename=$(basename "$parquet_file")
            csv_filename="${filename%.parquet}.csv"
            csv_path="$date_output_dir/$csv_filename"
            
            convert_parquet_to_csv "$parquet_file" "$csv_path"
            
            if [ $? -eq 0 ]; then
                echo "✓ Converted $filename"
            else
                echo "✗ Failed to convert $filename"
            fi
        done
        
        echo "✓ Completed $dataset/$date_name (${#parquet_files[@]} files)"
    done
}

# Process files based on source type
if [ "$SOURCE" = "concatenated" ]; then
    process_concatenated_files
else  # original
    process_original_files
fi

echo "Conversion process completed!"
