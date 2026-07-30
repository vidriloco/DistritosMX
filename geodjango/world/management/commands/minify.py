import os
import subprocess
from django.core.management.base import BaseCommand
from django.conf import settings

class Command(BaseCommand):
    help = 'Execute uglifyjs command'

    def handle(self, *args, **options):
        project_directory = settings.BASE_DIR

        # Ensure project_dir is a valid directory
        if not os.path.isdir(project_directory):
            self.stderr.write("Invalid project directory.")
            return
        bash_script_path = os.path.join(project_directory, 'world/management/commands/scripts/minify-all.sh')

        # Run the Bash script
        try:
            subprocess.run(['bash', bash_script_path], check=True)
        except subprocess.CalledProcessError as e:
            self.stderr.write(f"Command execution failed with error: {e}")