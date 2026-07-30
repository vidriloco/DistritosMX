"""
Django Management Command: String Replace

This command searches for two different strings in all files within a given directory
and replaces them with corresponding replacement strings. Only files that contain
the search strings are copied to the output directory.

Usage:
    python manage.py string_replace --input-dir INPUT_DIR --output-dir OUTPUT_DIR --s1 STRING1 --s2 STRING2 --r1 REPLACEMENT1 --r2 REPLACEMENT2

Options:
    --input-dir: Directory containing files to process (required)
    --output-dir: Directory to save processed files (required)
    --s1: First string to search for (required)
    --s2: Second string to search for (required)
    --r1: First replacement string (required)
    --r2: Second replacement string (required)
    --file-extensions: Comma-separated list of file extensions to process (default: txt,py,js,html,css,json,md,xml,yaml,yml)
    --recursive: Process files recursively in subdirectories (default: True)
    --preserve-structure: Preserve directory structure in output (default: True)

Note: Only files containing at least one of the search strings will be copied to the output directory.
Files without any matches will be skipped and not copied.
"""

import os
import shutil
import glob
from pathlib import Path
from typing import List, Set
from django.core.management.base import BaseCommand, CommandError


class Command(BaseCommand):
    help = 'Replace strings in files within a directory and save to output directory'

    def add_arguments(self, parser):
        parser.add_argument(
            '--input-dir',
            required=True,
            help='Directory containing files to process'
        )
        parser.add_argument(
            '--output-dir',
            required=True,
            help='Directory to save processed files'
        )
        parser.add_argument(
            '--s1',
            required=True,
            help='First string to search for'
        )
        parser.add_argument(
            '--s2',
            required=True,
            help='Second string to search for'
        )
        parser.add_argument(
            '--r1',
            required=True,
            help='First replacement string'
        )
        parser.add_argument(
            '--r2',
            required=True,
            help='Second replacement string'
        )
        parser.add_argument(
            '--file-extensions',
            default='txt,py,js,html,css,json,md,xml,yaml,yml',
            help='Comma-separated list of file extensions to process (default: txt,py,js,html,css,json,md,xml,yaml,yml)'
        )
        parser.add_argument(
            '--recursive',
            action='store_true',
            default=True,
            help='Process files recursively in subdirectories (default: True)'
        )
        parser.add_argument(
            '--preserve-structure',
            action='store_true',
            default=True,
            help='Preserve directory structure in output (default: True)'
        )

    def validate_paths(self, input_dir: str, output_dir: str) -> None:
        """Validate input and output directories."""
        # Check if input directory exists
        if not os.path.exists(input_dir):
            raise CommandError(f"Input directory does not exist: {input_dir}")
        
        if not os.path.isdir(input_dir):
            raise CommandError(f"Input path is not a directory: {input_dir}")
        
        # Create output directory if it doesn't exist
        os.makedirs(output_dir, exist_ok=True)

    def get_file_extensions(self, extensions_str: str) -> Set[str]:
        """Parse file extensions string into a set."""
        extensions = set()
        for ext in extensions_str.split(','):
            ext = ext.strip().lower()
            if ext:
                # Add dot if not present
                if not ext.startswith('.'):
                    ext = f'.{ext}'
                extensions.add(ext)
        return extensions

    def find_files(self, input_dir: str, extensions: Set[str], recursive: bool = True) -> List[str]:
        """Find all files with specified extensions in the input directory."""
        files = []
        
        if recursive:
            # Use glob to find files recursively
            for ext in extensions:
                pattern = os.path.join(input_dir, '**', f'*{ext}')
                files.extend(glob.glob(pattern, recursive=True))
        else:
            # Only search in the immediate directory
            for ext in extensions:
                pattern = os.path.join(input_dir, f'*{ext}')
                files.extend(glob.glob(pattern))
        
        # Filter out directories and return only files
        files = [f for f in files if os.path.isfile(f)]
        return sorted(files)

    def process_file(self, input_file: str, output_file: str, s1: str, s2: str, r1: str, r2: str) -> tuple[bool, bool]:
        """
        Process a single file by replacing strings.
        
        Args:
            input_file: Path to input file
            output_file: Path to output file
            s1: First string to search for
            s2: Second string to search for
            r1: First replacement string
            r2: Second replacement string
            
        Returns:
            tuple: (success: bool, has_replacements: bool)
        """
        try:
            # Read the input file
            with open(input_file, 'r', encoding='utf-8', errors='ignore') as f:
                content = f.read()
            
            # Count occurrences before replacement
            s1_count = content.count(s1)
            s2_count = content.count(s2)
            
            # Check if there are any replacements to make
            has_replacements = s1_count > 0 or s2_count > 0
            
            if not has_replacements:
                # No replacements needed, skip this file
                self.stdout.write(f"Skipped {input_file} (no replacements found)")
                return True, False
            
            # Perform replacements
            new_content = content.replace(s1, r1).replace(s2, r2)
            
            # Create output directory if it doesn't exist
            os.makedirs(os.path.dirname(output_file), exist_ok=True)
            
            # Write the processed content to output file
            with open(output_file, 'w', encoding='utf-8') as f:
                f.write(new_content)
            
            # Log the results
            self.stdout.write(
                f"Processed {input_file} -> {output_file} "
                f"(s1: {s1_count} replacements, s2: {s2_count} replacements)"
            )
            
            return True, True
            
        except Exception as e:
            self.stderr.write(f"Error processing {input_file}: {e}")
            return False, False

    def get_output_path(self, input_file: str, input_dir: str, output_dir: str, preserve_structure: bool) -> str:
        """Generate output file path based on input file and settings."""
        if preserve_structure:
            # Preserve directory structure
            rel_path = os.path.relpath(input_file, input_dir)
            return os.path.join(output_dir, rel_path)
        else:
            # Flatten structure - just use filename
            filename = os.path.basename(input_file)
            return os.path.join(output_dir, filename)

    def handle(self, *args, **options):
        """Main function to orchestrate the string replacement process."""
        # Get arguments
        input_dir = os.path.abspath(options['input_dir'])
        output_dir = os.path.abspath(options['output_dir'])
        s1 = options['s1']
        s2 = options['s2']
        r1 = options['r1']
        r2 = options['r2']
        file_extensions = self.get_file_extensions(options['file_extensions'])
        recursive = options['recursive']
        preserve_structure = options['preserve_structure']
        
        # Validate paths
        try:
            self.validate_paths(input_dir, output_dir)
        except CommandError as e:
            self.stderr.write(str(e))
            return
        
        # Display configuration
        self.stdout.write(f"Input directory: {input_dir}")
        self.stdout.write(f"Output directory: {output_dir}")
        self.stdout.write(f"Search string 1: '{s1}' -> Replace with: '{r1}'")
        self.stdout.write(f"Search string 2: '{s2}' -> Replace with: '{r2}'")
        self.stdout.write(f"File extensions: {', '.join(sorted(file_extensions))}")
        self.stdout.write(f"Recursive: {recursive}")
        self.stdout.write(f"Preserve structure: {preserve_structure}")
        self.stdout.write("")
        
        # Find files to process
        files = self.find_files(input_dir, file_extensions, recursive)
        
        if not files:
            self.stdout.write(self.style.WARNING("No files found matching the specified extensions"))
            return
        
        self.stdout.write(f"Found {len(files)} files to process")
        self.stdout.write("")
        
        # Process files
        processed_count = 0
        skipped_count = 0
        error_count = 0
        
        for input_file in files:
            output_file = self.get_output_path(input_file, input_dir, output_dir, preserve_structure)
            
            success, has_replacements = self.process_file(input_file, output_file, s1, s2, r1, r2)
            
            if success:
                if has_replacements:
                    processed_count += 1
                else:
                    skipped_count += 1
            else:
                error_count += 1
        
        # Summary
        self.stdout.write("")
        self.stdout.write(self.style.SUCCESS(f"Processing completed!"))
        self.stdout.write(f"Files with replacements: {processed_count}")
        self.stdout.write(f"Files skipped (no replacements): {skipped_count}")
        if error_count > 0:
            self.stdout.write(self.style.WARNING(f"Errors encountered: {error_count} files"))
