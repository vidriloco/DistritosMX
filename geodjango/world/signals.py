from django.db.models.signals import pre_delete
from django.dispatch import receiver
from .models.line import Line
from .models.station import Station
from .models.bike_report import BikeReport
from .models.user_status import UserStatus
from .models.user_details import UserDetails
from .models.marker_icon import MarkerIcon
from .models.avatar import Avatar
from .models.user_funny_pic import UserFunnyPic

@receiver(pre_delete, sender=Line)
def delete_line_flyer(sender, instance, **kwargs):
    if instance.flyer:
        instance.flyer.delete(save=False)

@receiver(pre_delete, sender=Station)
def delete_station_icon(sender, instance, **kwargs):
    if instance.icon:
        instance.icon.delete(save=False)

@receiver(pre_delete, sender=BikeReport)
def delete_bike_report_image(sender, instance, **kwargs):
    if instance.image:
        instance.image.delete(save=False)

@receiver(pre_delete, sender=UserStatus)
def delete_user_status_image(sender, instance, **kwargs):
    if instance.image:
        instance.image.delete(save=False)

@receiver(pre_delete, sender=UserDetails)
def delete_user_details_picture(sender, instance, **kwargs):
    if instance.picture:
        instance.picture.delete(save=False)

@receiver(pre_delete, sender=MarkerIcon)
def delete_marker_icon_image(sender, instance, **kwargs):
    if instance.image:
        instance.image.delete(save=False)

@receiver(pre_delete, sender=Avatar)
def delete_avatar_image(sender, instance, **kwargs):
    if instance.image:
        instance.image.delete(save=False)

@receiver(pre_delete, sender=UserFunnyPic)
def delete_user_funny_pic_image(sender, instance, **kwargs):
    if instance.image:
        instance.image.delete(save=False) 