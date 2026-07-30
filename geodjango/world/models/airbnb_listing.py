from django.db import models
from django.contrib.gis.db import models as gis_models
from django.contrib.gis.geos import Point

class AirbnbListing(models.Model):
    id = models.BigIntegerField(primary_key=True)
    name = models.CharField(max_length=255)
    host_id = models.BigIntegerField()
    host_name = models.CharField(max_length=255, blank=True, null=True)
    neighbourhood_group = models.CharField(max_length=100, blank=True, null=True)
    neighbourhood = models.CharField(max_length=100)
    location = gis_models.PointField(geography=True)  # Will store latitude/longitude
    room_type = models.CharField(max_length=50)
    price = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    minimum_nights = models.IntegerField(null=True, blank=True)
    number_of_reviews = models.IntegerField(default=0)
    last_review = models.DateField(null=True, blank=True)
    reviews_per_month = models.FloatField(null=True, blank=True)
    calculated_host_listings_count = models.IntegerField(default=1)
    availability_365 = models.IntegerField(null=True, blank=True)
    number_of_reviews_ltm = models.IntegerField(default=0)  # ltm = last twelve months
    license = models.CharField(max_length=100, blank=True, null=True)

    def __str__(self):
        return f"{self.name} - {self.neighbourhood}"

    class Meta:
        db_table = 'world_airbnb_listing'
        verbose_name = 'Airbnb Listing'
        verbose_name_plural = 'Airbnb Listings'
        indexes = [
            models.Index(fields=['neighbourhood']),
            models.Index(fields=['room_type']),
            models.Index(fields=['host_id']),
        ] 