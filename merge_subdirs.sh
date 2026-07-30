#!/bin/bash

# Script to copy all contents of subdirectories into the parent or specified directory
# Usage: ./merge_subdirs.sh <source_directory> [output_directory]
# Or: bash merge_subdirs.sh <source_directory> [output_directory]
# If output_directory is not specified, files will be merged into source_directory

if [ $# -eq 0 ]; then
    echo "Usage: $0 <source_directory> [output_directory]"
    echo "Copies all contents of subdirectories from source_directory"
    echo "If output_directory is specified, files will be copied there"
    echo "Otherwise, files will be copied into source_directory"
    echo "Note: The source directory and its subdirectories remain unchanged"
    exit 1
fi

SOURCE_DIR="$1"
OUTPUT_DIR="${2:-$SOURCE_DIR}"

# Check if source directory exists
if [ ! -d "$SOURCE_DIR" ]; then
    echo "Error: Source directory '$SOURCE_DIR' does not exist"
    exit 1
fi

# Get absolute paths
SOURCE_DIR=$(cd "$SOURCE_DIR" && pwd)
OUTPUT_DIR=$(cd "$(dirname "$OUTPUT_DIR")" && pwd)/$(basename "$OUTPUT_DIR")

# Create output directory if it doesn't exist
if [ ! -d "$OUTPUT_DIR" ]; then
    mkdir -p "$OUTPUT_DIR"
    echo "Created output directory: $OUTPUT_DIR"
fi

# Get absolute path of output directory
OUTPUT_DIR=$(cd "$OUTPUT_DIR" && pwd)

echo "Copying contents from subdirectories in: $SOURCE_DIR"
echo "Output directory: $OUTPUT_DIR"

# Find all immediate subdirectories and copy their contents
find "$SOURCE_DIR" -mindepth 1 -maxdepth 1 -type d | while read -r subdir; do
    echo "Processing: $(basename "$subdir")"
    
    # Copy all files (including hidden files) from subdirectory to output directory
    find "$subdir" -mindepth 1 -maxdepth 1 -type f -exec cp {} "$OUTPUT_DIR" \;
    
    # Copy all subdirectories (if any) from subdirectory to output directory
    find "$subdir" -mindepth 1 -maxdepth 1 -type d -exec cp -r {} "$OUTPUT_DIR" \;
done

echo "Done!"

