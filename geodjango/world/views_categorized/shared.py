from django.conf import settings
import os

def file_exists_in_directory(file_name):
    directory_path = os.path.join(settings.BASE_DIR, 'world', 'static', 'js')
    file_path = os.path.join(directory_path, file_name)
    return os.path.exists(file_path) and os.path.isfile(file_path)