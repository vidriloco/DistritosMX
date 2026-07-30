from django.contrib.gis.db import models
from .station import Station

class Transaction(models.Model):
    card_identifier = models.BigIntegerField()
    system_identifier = models.CharField(max_length=10)
    line = models.CharField(max_length=10)
    station_name = models.CharField(max_length=100)
    operation = models.CharField(max_length=10)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    final_amount = models.DecimalField(max_digits=10, decimal_places=2)
    datetime = models.DateTimeField()
    station = models.ForeignKey(Station, on_delete=models.CASCADE, null=True)
    
    def __str__(self):
        return f"{self.card_identifier} - {self.station.name} - {self.datetime}"

    class Meta:
        db_table = 'transactions'
        constraints = [
            models.UniqueConstraint(fields=['system_identifier', 'card_identifier', 'datetime'], name='unique_card_datetime')
        ]