from django.contrib.gis.db import models
from django.contrib.auth.models import User
from django.utils.translation import gettext_lazy as _

class BikeReport(models.Model):
    class Category(models.TextChoices):
        BIKE_THEFT = "bike_theft", _("Asaltos frecuentes")
        BIKE_FRIENDLY = "bike_friendly", _("Lugar bici-amigable")
        BIKE_DANGER = "bike_danger", _("Peligro (Accidente)")
        BIKE_SHOP = "bike_shop", _("Tienda de bicis")
        BIKE_WORKSHOP = "bike_workshop", _("Taller de bicis")
        BIKE_PARKING = "bike_parking", _("Bici-estacionamiento")

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='bike_reports')
    category = models.CharField(max_length=50, choices=Category.choices)
    description = models.TextField()
    location = models.PointField(srid=4326)
    location_address = models.TextField()
    image = models.ImageField(upload_to='bike_reports/', null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    is_verified = models.BooleanField(default=False)

    def __str__(self):
        return f"{self.get_category_display()} - {self.location_address}" 