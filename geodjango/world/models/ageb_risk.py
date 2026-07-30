from django.contrib.gis.db import models
import json
from django.contrib.gis.geos import GEOSGeometry
from django.db import transaction

class AgebRisk(models.Model):
    """
    Model representing AGEB (Área Geoestadística Básica) risk data.
    This model stores information about risk levels and demographics for basic geostatistical areas.
    """
    # Geometry field for the polygon
    geometry = models.PolygonField(srid=6365)
    
    # Basic identification fields
    geo_key = models.CharField(max_length=13, help_text="Geographic key of the AGEB", db_column='cvegeo', unique=True)
    municipality_key = models.CharField(max_length=5, help_text="Municipality key", db_column='cve_mum')
    borough = models.CharField(max_length=100, help_text="Name of the borough", db_column='alcaldia')
    entity = models.CharField(max_length=100, help_text="Name of the entity", db_column='entidad')
    
    # Risk and classification fields
    sexual_abuse_risk_level = models.CharField(max_length=100, help_text="Risk level", null=True, blank=True)
    metrobus_agression_risk_level = models.CharField(max_length=100, help_text="Risk level", null=True, blank=True)
    taxi_theft_risk_level = models.CharField(max_length=100, help_text="Taxi theft risk level", null=True, blank=True)
    microbus_theft_risk_level = models.CharField(max_length=100, help_text="Microbus theft risk level", null=True, blank=True)
    harassment_risk_level = models.CharField(max_length=100, help_text="Risk level", null=True, blank=True)

    class Meta:
        verbose_name = "AGEB Risk"
        verbose_name_plural = "AGEB Risks"
        indexes = [
            models.Index(fields=['geo_key']),
            models.Index(fields=['municipality_key']),
            models.Index(fields=['borough']),
        ]

    def __str__(self):
        return f"{self.borough} - {self.geo_key}"

    @classmethod
    def ingest_geojson(cls, geojson_file_path, risk_type):
        """
        Ingest data from a GeoJSON file into the AgebRisk model.
        
        Args:
            geojson_file_path (str): Path to the GeoJSON file
            risk_type (str): Type of risk to ingest. Must be one of:
                - 'sexual-abuse'
                - 'metrobus-agression'
                - 'taxi-theft'
                - 'microbus-theft'
                - 'harassment'
        
        Returns:
            tuple: (created_count, updated_count) - Number of records created and updated
        """
        # Map risk types to model fields
        risk_type_mapping = {
            'sexual-abuse': 'sexual_abuse_risk_level',
            'metrobus-agression': 'metrobus_agression_risk_level',
            'taxi-theft': 'taxi_theft_risk_level',
            'microbus-theft': 'microbus_theft_risk_level',
            'harassment': 'harassment_risk_level'
        }
        
        if risk_type not in risk_type_mapping:
            raise ValueError(f"Invalid risk_type. Must be one of: {', '.join(risk_type_mapping.keys())}")
        
        target_field = risk_type_mapping[risk_type]
        created_count = 0
        updated_count = 0
        
        # Read and parse the GeoJSON file
        with open(geojson_file_path, 'r', encoding='utf-8') as f:
            geojson_data = json.load(f)
        
        # Process each feature in the GeoJSON
        with transaction.atomic():
            for feature in geojson_data['features']:
                properties = feature['properties']
                geo_key = properties.get('cvegeo')
                
                if not geo_key:
                    continue
                
                # Try to get existing record
                try:
                    ageb_risk = cls.objects.get(geo_key=geo_key)
                    # Update existing record
                    setattr(ageb_risk, target_field, properties.get('intensidad'))
                    ageb_risk.save()
                    updated_count += 1
                except cls.DoesNotExist:
                    # Create new record
                    ageb_risk = cls(
                        geo_key=geo_key,
                        municipality_key=properties.get('cve_mum'),
                        borough=properties.get('alcaldia'),
                        entity=properties.get('entidad'),
                        geometry=GEOSGeometry(json.dumps(feature['geometry']))
                    )
                    setattr(ageb_risk, target_field, properties.get('intensidad'))
                    ageb_risk.save()
                    created_count += 1
        
        return created_count, updated_count
