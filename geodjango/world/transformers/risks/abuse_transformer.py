from .protocols import RiskProtocol
from django.contrib.gis.geos import Point
from world.models.felony import Felony
import pytz

class AbuseTransformer(RiskProtocol):
    """Implementation of a Abuse."""

    def __init__(self, 
        id: int,
        day_of_week: str,
        full_date: str,
        date: str,
        time: str,
        year: int,
        category: str,
        type: str,
        location: Point
    ):
        self.id = id
        self.day_of_week = day_of_week
        self.full_date = full_date
        self.date = date
        self.time = time
        self.year = year
        self.category = category
        self.type = type
        self.location = location

    @classmethod
    def from_model(cls, model: Felony) -> 'AbuseTransformer':
        # Convert to GMT-6 timezone
        gmt6 = pytz.timezone('Etc/GMT+6')
        crime_date_time_gmt6 = model.crime_date_time.astimezone(gmt6)
        
        day_of_week = crime_date_time_gmt6.strftime('%A')

        return cls(
            id=model.id,
            day_of_week=day_of_week,
            full_date=crime_date_time_gmt6,
            date=model.crime_date,
            time=model.crime_time,
            year=model.crime_year,
            category=model.crime_category,
            type=model.crime_type,
            location=model.location
        )
    