from django.contrib.gis.db import models
from django.contrib.gis.geos import Polygon
from django.contrib.gis.measure import D
from turfpy.measurement import area
from turfpy.transformation import circle
from geojson import Feature, Point
import json

class DenueRecord(models.Model):
    id = models.BigIntegerField(primary_key=True)
    clee = models.CharField()
    nom_estab = models.CharField()
    raz_social = models.CharField(null=True, blank=True)
    codigo_act = models.CharField()
    nombre_act = models.CharField()
    per_ocu = models.CharField()
    numero_ext = models.CharField(null=True, blank=True)
    letra_ext = models.CharField(null=True, blank=True)
    edificio = models.CharField(null=True, blank=True)
    edificio_e = models.CharField(null=True, blank=True)
    numero_int = models.CharField(null=True, blank=True)
    letra_int = models.CharField(null=True, blank=True)
    tipo_asent = models.CharField(null=True, blank=True)
    nomb_asent = models.CharField(null=True, blank=True)
    tipoCenCom = models.CharField(null=True, blank=True)
    nom_CenCom =    models.CharField(null=True, blank=True)
    num_local = models.CharField(null=True, blank=True)
    cod_postal = models.CharField(null=True, blank=True)
    cve_ent = models.CharField()
    entidad = models.CharField()
    cve_mun = models.CharField()
    municipio = models.CharField()
    cve_loc = models.CharField()
    localidad = models.CharField()
    ageb = models.CharField()
    manzana = models.CharField()
    tipoUniEco = models.CharField(null=True, blank=True)
    geometry = models.PointField(srid=4326)
    year = models.IntegerField()

    def __str__(self):
        return self.nom_estab
    
    def average_jobs(self):
        switcher = {
            "0 a 5 personas": 2.5,
            "6 a 10 personas": 8,
            "11 a 30 personas": 20.5,
            "31 a 50 personas": 40.5,
            "51 a 100 personas": 75.5,
            "101 a 250 personas": 175.5,
            "251 y más personas": 251
        }
        return switcher.get(self.per_ocu, 0)
    
    @staticmethod
    def all_specific_indicator_within_radius(indicator, station, radius):

        code_map = {
            'education': '61',
            'health': '62',
            'leisure': '71',
            'provision': '46'
        }

        code = code_map.get(indicator, None)
        radius_in_km = radius / 1000.0

        circle_geom = circle(Point((station.coordinates.x, station.coordinates.y)), radius=radius, units='m')
        polygon = Polygon(circle_geom['geometry']['coordinates'][0])

        if code:
            return DenueRecord.objects.filter(
                geometry__intersects=polygon,
                codigo_act__startswith=code
            )
        else:
            return DenueRecord.objects.filter(
                geometry__intersects=polygon
            )
    
    @staticmethod
    def all_jobs_within_radius(coordinates, radius):
        jobs = DenueRecord.all_specific_indicator_within_radius('jobs', coordinates, radius)
        return sum([job.average_jobs() for job in jobs])
