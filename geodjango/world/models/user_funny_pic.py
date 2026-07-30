from django.contrib.auth.models import User
from django.contrib.gis.db import models
from django.utils.translation import gettext_lazy as _
import random

class UserFunnyPic(models.Model):
    def user_pic_path(instance, filename):
        return "user-pics/{0}-{1}".format(random.randint(1000, 9999), filename)

    image = models.ImageField(upload_to=user_pic_path, null=True, blank=True)
    name = models.CharField(max_length=100, blank=True, null=True)
    
    def get_user_pic_url(self):
        if self.image:
            return self.image.url
        return "/static/images/logo.png"