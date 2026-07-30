from django.core.management import BaseCommand
from django.conf import settings
import os
from world.models.avatar import Avatar
from django.core.files import File

class Command(BaseCommand):
    help = "Import funny avatar images from the data/assets/avatars directory"

    def handle(self, *args, **options):
        avatars_dir = os.path.join(settings.BASE_DIR, 'data', 'assets', 'avatars')
        
        if not os.path.exists(avatars_dir):
            self.stdout.write(self.style.ERROR(f'Directory not found: {avatars_dir}'))
            return

        # Get list of image files
        image_files = [f for f in os.listdir(avatars_dir) if f.lower().endswith(('.png', '.jpg', '.jpeg', '.gif'))]
        
        if not image_files:
            self.stdout.write(self.style.WARNING('No image files found in the avatars directory'))
            return

        # Create Avatar entries for each image
        for image_file in image_files:
            image_path = os.path.join(avatars_dir, image_file)
            
            # Extract numeric identifier from filename (assuming format: number.extension)
            try:
                identifier = int(os.path.splitext(image_file)[0])
            except ValueError:
                self.stdout.write(self.style.ERROR(f'Skipping file with non-numeric name: {image_file}'))
                continue
            
            # Check if avatar with this identifier already exists
            if not Avatar.objects.filter(identifier=identifier).exists():
                with open(image_path, 'rb') as f:
                    django_file = File(f, name=image_file)
                    Avatar.objects.create(
                        identifier=identifier,
                        image=django_file
                    )
                self.stdout.write(self.style.SUCCESS(f'Successfully imported: {image_file}'))
            else:
                self.stdout.write(self.style.WARNING(f'Skipping existing avatar with identifier: {identifier}'))

        self.stdout.write(self.style.SUCCESS(f'Import completed. Processed {len(image_files)} images.'))
        
        