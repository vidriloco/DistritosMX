"""
Django Management Command: Convert Parquet Files to CSV

This command reads all parquet files in a directory and writes them to a single CSV file.
The output CSV file is named after the directory and saved in the same directory.

Usage:
    python manage.py veraset_parquet_to_csv --input-dir INPUT_DIR [--batch-size BATCH_SIZE]

Options:
    --input-dir: Directory containing parquet files (required)
    --batch-size: Number of files to process in each batch to prevent memory issues (default: 50)
"""

import os
import glob
import pandas as pd
from typing import List
from django.core.management.base import BaseCommand, CommandError


class Command(BaseCommand):
    help = 'Convert all parquet files in a directory to a single CSV file'

    def find_parquet_files(self, directory: str) -> List[str]:
        """Find all parquet files in a directory."""
        pattern = os.path.join(directory, "*.parquet")
        files = glob.glob(pattern)
        return sorted(files)

    def convert_parquet_to_csv(self, file_paths: List[str], output_path: str, batch_size: int = 50) -> bool:
        """
        Convert multiple parquet files into a single CSV file using batch processing.
        This prevents memory exhaustion when processing many large files.
        
        Args:
            file_paths: List of parquet file paths to convert
            output_path: Output CSV file path
            batch_size: Number of files to process in each batch (default: 50)
            
        Returns:
            bool: True if successful, False otherwise
        """
        try:
            if not file_paths:
                self.stdout.write(self.style.WARNING(f"No parquet files found to convert"))
                return False
                
            self.stdout.write(f"Converting {len(file_paths)} parquet files to {output_path}")
            self.stdout.write(f"Using batch size of {batch_size} files to prevent memory issues")
            
            # Create output directory if it doesn't exist
            os.makedirs(os.path.dirname(output_path), exist_ok=True)
            
            total_rows = 0
            files_processed = 0
            first_batch = True
            
            # Process files in batches to avoid memory exhaustion
            for i in range(0, len(file_paths), batch_size):
                batch = file_paths[i:i + batch_size]
                batch_num = (i // batch_size) + 1
                total_batches = (len(file_paths) + batch_size - 1) // batch_size
                
                self.stdout.write(f"Processing batch {batch_num}/{total_batches} ({len(batch)} files)...")
                
                # Read batch of parquet files
                batch_dataframes = []
                for file_path in batch:
                    try:
                        df = pd.read_parquet(file_path)
                        batch_dataframes.append(df)
                        total_rows += len(df)
                        files_processed += 1
                        if files_processed % 10 == 0:
                            self.stdout.write(f"  Loaded {files_processed}/{len(file_paths)} files ({total_rows:,} rows so far)")
                    except Exception as e:
                        self.stdout.write(self.style.ERROR(f"Error reading {file_path}: {e}"))
                        continue
                
                if not batch_dataframes:
                    self.stdout.write(self.style.WARNING(f"No valid files in batch {batch_num}"))
                    continue
                
                # Concatenate batch
                batch_df = pd.concat(batch_dataframes, ignore_index=True)
                
                # Free memory from individual batch dataframes
                del batch_dataframes
                
                # Append to CSV file (or create if first batch)
                if first_batch:
                    # Write header and first batch
                    batch_df.to_csv(output_path, index=False, mode='w')
                    first_batch = False
                else:
                    # Append without header
                    batch_df.to_csv(output_path, index=False, mode='a', header=False)
                
                # Free memory
                del batch_df
                
                self.stdout.write(f"  Batch {batch_num} complete: {total_rows:,} total rows so far")
            
            if files_processed == 0:
                self.stdout.write(self.style.ERROR("No valid parquet files could be read"))
                return False
            
            self.stdout.write(f"Successfully converted {files_processed} files ({total_rows:,} rows) to {output_path}")
            return True
            
        except MemoryError as e:
            self.stdout.write(self.style.ERROR(f"Memory error: {e}"))
            self.stdout.write(self.style.ERROR("Try reducing batch_size or processing fewer files at once"))
            return False
        except Exception as e:
            self.stdout.write(self.style.ERROR(f"Error converting files: {e}"))
            import traceback
            self.stdout.write(self.style.ERROR(traceback.format_exc()))
            return False

    def add_arguments(self, parser):
        parser.add_argument(
            '--input-dir',
            required=True,
            help='Directory containing parquet files (required)'
        )
        parser.add_argument(
            '--batch-size',
            type=int,
            default=50,
            help='Number of files to process in each batch to prevent memory issues (default: 50). Reduce if process is killed due to memory.'
        )

    def handle(self, *args, **options):
        """Main function to orchestrate the conversion process."""
        # Convert to absolute path
        input_dir = os.path.abspath(options['input_dir'])
        batch_size = options.get('batch_size', 50)
        
        if not os.path.exists(input_dir):
            raise CommandError(f"Input directory not found: {input_dir}")
        
        if not os.path.isdir(input_dir):
            raise CommandError(f"Input path is not a directory: {input_dir}")
        
        self.stdout.write(f"Input directory: {input_dir}")
        self.stdout.write(f"Batch size: {batch_size} files per batch")
        
        # Find all parquet files in the directory
        parquet_files = self.find_parquet_files(input_dir)
        
        if not parquet_files:
            self.stdout.write(self.style.WARNING(f"No parquet files found in {input_dir}"))
            return
        
        # Create output filename based on directory name
        dir_name = os.path.basename(os.path.abspath(input_dir))
        output_filename = f"{dir_name}.csv"
        output_path = os.path.join(input_dir, output_filename)
        
        self.stdout.write(f"Output file: {output_path}")
        
        # Convert parquet files to CSV
        success = self.convert_parquet_to_csv(parquet_files, output_path, batch_size)
        
        if success:
            self.stdout.write(self.style.SUCCESS("✓ Conversion process completed!"))
        else:
            self.stdout.write(self.style.ERROR("✗ Conversion process failed"))


