from django.contrib.gis.db import models
import json
from django.contrib.gis.geos import MultiLineString, GEOSGeometry
from pathlib import Path
from .metadata import LINE_COLORS
from .metadata import LINE_STROKES
from .metadata import TransportSystem
from .metadata import LineMetadata
from .metadata import Status
from world.utils.string_utils import parse_line_number


class ConcesionadosLine(models.Model):
    """Model representing Concesionado (concession) bus lines in Mexico City."""
    
    system = models.CharField(
        max_length=100,
        help_text="Name of the transport system"
    )
    line_number = models.CharField(
        max_length=10,
        help_text="Line number or identifier"
    )
    route = models.CharField(
        max_length=100,
        help_text="Route name or description"
    )
    operator = models.CharField(
        max_length=100,
        help_text="Name of the operator company"
    )
    type = models.CharField(
        max_length=50,
        help_text="Type of service"
    )
    fare = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        help_text="Fare in Mexican pesos"
    )
    schedule = models.CharField(
        max_length=100,
        help_text="Operating schedule"
    )
    frequency = models.CharField(
        max_length=50,
        help_text="Service frequency"
    )
    length = models.DecimalField(
        max_digits=8,
        decimal_places=2,
        help_text="Route length in kilometers"
    )
    stations = models.IntegerField(
        help_text="Number of stations"
    )
    geometry = models.MultiLineStringField(
        srid=4326,
        dim=3,
        help_text="Geographic coordinates of the line"
    )
    company = models.CharField(
        max_length=100,
        help_text="Name of the operator company",
        blank=True,
        null=True
    )
    origin_destination = models.CharField(
        max_length=100, 
        help_text="Origin and destination of the line",
        blank=True,
        null=True
    )
    nomenclature_od = models.CharField(
        max_length=10,
        help_text="Nomenclature of the origin and destination",
        blank=True,
        null=True
    )
    corridor = models.CharField(
        max_length=100,
        help_text="Corridor of the line",
        blank=True,
        null=True
    )
    corridor_nomenclature = models.CharField(
        max_length=10,  
        help_text="Nomenclature of the corridor",
        blank=True,
        null=True
    )
    nomenclature = models.CharField(
        max_length=10,
        help_text="Nomenclature of the line",
        blank=True,
        null=True
    )
    metadata = models.OneToOneField(
        LineMetadata,
        on_delete=models.CASCADE,
        related_name='concesionados_line',
        help_text="Visual and status metadata for this line",
        null=True,
        blank=True
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    

    class Meta:
        verbose_name = "Concesionado Line"
        verbose_name_plural = "Concesionado Lines"
        unique_together = ['system', 'nomenclature', 'route', 'origin_destination']

    def __str__(self):
        return f"{self.system} - Line {self.nomenclature}: {self.route}"

    def save(self, *args, **kwargs):
        is_new = self._state.adding
        super().save(*args, **kwargs)
        
        if is_new and not self.metadata:
            metadata = LineMetadata.objects.create(
                color=LINE_COLORS[TransportSystem.CONCESIONADOS]['default'],
                stroke=LINE_STROKES[TransportSystem.CONCESIONADOS],
                status=Status.ACTIVE
            )
            self.metadata = metadata
            self.save()

    @classmethod
    def load_from_geojson(cls, file_path):
        """
        Ingest data from a GeoJSON file into the database.
        
        Args:
            geojson_path (str): Path to the GeoJSON file
            
        Returns:
            int: Number of records created
        """
        with open(file_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        created_count = 0
        
        # Process each feature in the GeoJSON
        for feature in data['features']:
            properties = feature['properties']
            geometry = feature['geometry']
            
            # Create geometry from GeoJSON
            geos_geometry = GEOSGeometry(json.dumps(geometry))
            
            # Create or update the record
            line = cls(
                system=properties['SISTEMA'],
                route=properties['RUTA'],
                operator=properties.get('OPERADOR', ''),
                type=properties.get('TIPO', ''),
                fare=properties.get('TARIFA', 0),
                schedule=properties.get('HORARIO', ''),
                frequency=properties.get('FRECUENCIA', ''),
                length=properties.get('LONGITUD', 0),
                stations=properties.get('ESTACIONES', 0),
                company=properties.get('EMPRESA', ''),
                origin_destination=properties.get('ORIG_DEST', ''),
                nomenclature_od=properties.get('NOMEN_OD', ''),
                corridor=properties.get('CORREDOR', ''),
                corridor_nomenclature=properties.get('NOMEN_CORR', ''),
                nomenclature=parse_line_number(properties.get('NOMENCL', '')),
                geometry=geos_geometry
            )
            line.save()  # Save individually to trigger metadata creation       
            created_count += 1
            # Get status from properties or use default
            status = properties.get('status', Status.ACTIVE)
            # Update metadata status if it exists
            if line.metadata:
                line.metadata.status = status
                line.metadata.save()
        
        return created_count
