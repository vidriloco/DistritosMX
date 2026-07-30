from django.contrib.gis.db import models
from django.utils.translation import gettext_lazy as _
import random

class Avatar(models.Model):
    def avatar_path(instance, filename):
        return "avatars/{0}-{1}".format(random.randint(1000, 9999), filename)

    image = models.ImageField(upload_to=avatar_path, null=True, blank=True)
    identifier = models.IntegerField(unique=True)
    name = models.CharField(max_length=255, null=True, blank=True)
    
    def get_avatar_url(self):
        if self.image:
            return self.image.url
        return "/static/images/default-avatar.png" 