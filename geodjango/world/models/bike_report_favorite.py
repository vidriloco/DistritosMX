from django.contrib.gis.db import models
from django.contrib.auth.models import User
from .bike_report import BikeReport

class BikeReportFavorite(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='favorite_bike_reports')
    bike_report = models.ForeignKey(BikeReport, on_delete=models.CASCADE, related_name='favorited_by')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('user', 'bike_report')
        db_table = 'bike_report_favorites'

    def __str__(self):
        return f"{self.user.username} favorited {self.bike_report}" 