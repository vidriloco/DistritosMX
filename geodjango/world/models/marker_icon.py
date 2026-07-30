from django.contrib.gis.db import models
import random
from django.utils.translation import gettext_lazy as _

class MarkerIcon(models.Model):
    def image_directory_path(instance, filename):
        return "marker-icon/{0}-{1}".format(random.randint(1000, 9999), filename)

    name = models.CharField(max_length=100)
    slug = models.CharField(max_length=100)
    image = models.ImageField(upload_to=image_directory_path, null=True, blank=True)