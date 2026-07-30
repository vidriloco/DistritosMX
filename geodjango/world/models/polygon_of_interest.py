import json
from django.db import models
from django.contrib.gis.db import models as gis_models
from django.contrib.gis.geos import GEOSGeometry
from django.contrib.gis.measure import D


class PolygonOfInterest(models.Model):
    """
    Model to store polygon of interest data from GeoJSON.
    Represents geographic boundaries (colonias, settlements, etc.) with administrative information.
    """
    
    # Geographic identification fields
    cvegeo = models.CharField(
        max_length=20,
        null=True,
        blank=True,
        db_index=True,
        help_text="Geographic key (CVEGEO)"
    )
    cve_ent = models.CharField(
        max_length=2,
        null=True,
        blank=True,
        db_index=True,
        help_text="Entity code (CVE_ENT)"
    )
    cve_mun = models.CharField(
        max_length=3,
        null=True,
        blank=True,
        db_index=True,
        help_text="Municipality code (CVE_MUN)"
    )
    cve_loc = models.CharField(
        max_length=4,
        null=True,
        blank=True,
        help_text="Location code (CVE_LOC)"
    )
    cve_asen = models.CharField(
        max_length=4,
        null=True,
        blank=True,
        help_text="Settlement code (CVE_ASEN)"
    )
    
    # Postal code
    cp = models.CharField(
        max_length=10,
        null=True,
        blank=True,
        db_index=True,
        help_text="Postal code (CP)"
    )
    
    # Administrative information
    fecha_act = models.CharField(
        max_length=20,
        null=True,
        blank=True,
        help_text="Update date (FECHA_ACT)"
    )
    institucion = models.CharField(
        max_length=200,
        null=True,
        blank=True,
        help_text="Institution (INSTITUCIO)"
    )
    nom_asen = models.CharField(
        max_length=200,
        null=True,
        blank=True,
        db_index=True,
        help_text="Settlement name (NOM_ASEN)"
    )
    tipo = models.CharField(
        max_length=50,
        null=True,
        blank=True,
        db_index=True,
        help_text="Type (TIPO) - e.g., COLONIA"
    )
    turistico = models.CharField(
        max_length=20,
        null=True,
        blank=True,
        db_index=True,
        help_text="Touristic classification (TURISTICO)"
    )
    
    # Geometry measurements
    shape_leng = models.FloatField(
        null=True,
        blank=True,
        help_text="Shape length (Shape_Leng)"
    )
    shape_area = models.FloatField(
        null=True,
        blank=True,
        help_text="Shape area (Shape_Area)"
    )
    
    # Geometry field - MultiPolygon to handle the GeoJSON structure
    geometry = gis_models.MultiPolygonField(
        srid=4326,
        help_text="Geographic boundary as MultiPolygon"
    )
    
    # Metadata
    created_at = models.DateTimeField(
        auto_now_add=True,
        help_text="When this record was created in our system"
    )
    updated_at = models.DateTimeField(
        auto_now=True,
        help_text="When this record was last updated"
    )
    
    class Meta:
        db_table = 'polygon_of_interest'
        verbose_name = 'Polygon of Interest'
        verbose_name_plural = 'Polygons of Interest'
        indexes = [
            models.Index(fields=['cvegeo']),
            models.Index(fields=['cve_ent']),
            models.Index(fields=['cve_mun']),
            models.Index(fields=['cp']),
            models.Index(fields=['nom_asen']),
            models.Index(fields=['tipo']),
            models.Index(fields=['turistico']),
            models.Index(fields=['cve_ent', 'cve_mun']),
        ]
        # Add spatial index for geometry field
        # Django/PostGIS will automatically create a spatial index
    
    def __str__(self):
        identifier = self.nom_asen or self.cvegeo or f"Polygon-{self.id or 'NEW'}"
        return f"{identifier} ({self.tipo or 'N/A'})"
    
    @staticmethod
    def get_polygons_containing_point(latitude, longitude):
        """
        Get all polygons that contain a given point.
        
        Args:
            latitude: Latitude of the point
            longitude: Longitude of the point
            
        Returns:
            QuerySet of PolygonOfInterest objects
        """
        from django.contrib.gis.geos import Point
        point = Point(longitude, latitude, srid=4326)
        return PolygonOfInterest.objects.filter(geometry__contains=point)
    
    @staticmethod
    def get_polygons_intersecting_point(latitude, longitude):
        """
        Get all polygons that intersect with a given point.
        
        Args:
            latitude: Latitude of the point
            longitude: Longitude of the point
            
        Returns:
            QuerySet of PolygonOfInterest objects
        """
        from django.contrib.gis.geos import Point
        point = Point(longitude, latitude, srid=4326)
        return PolygonOfInterest.objects.filter(geometry__intersects=point)
    
    @staticmethod
    def get_trips_in_polygon(polygon_id, trip_model='Trip'):
        """
        Get all trips that are located within a specific polygon.
        
        Args:
            polygon_id: ID of the PolygonOfInterest
            trip_model: Either 'Trip' or 'BasicTrip'
            
        Returns:
            QuerySet of Trip or BasicTrip objects
        """
        from .trip import Trip, BasicTrip
        
        try:
            polygon = PolygonOfInterest.objects.get(pk=polygon_id)
        except PolygonOfInterest.DoesNotExist:
            if trip_model == 'Trip':
                return Trip.objects.none()
            else:
                return BasicTrip.objects.none()
        
        if trip_model == 'Trip':
            return Trip.objects.filter(location__within=polygon.geometry)
        else:
            return BasicTrip.objects.filter(location__within=polygon.geometry)
    
    @staticmethod
    def get_trips_intersecting_polygon(polygon_id, trip_model='Trip'):
        """
        Get all trips that intersect with a specific polygon.
        
        Args:
            polygon_id: ID of the PolygonOfInterest
            trip_model: Either 'Trip' or 'BasicTrip'
            
        Returns:
            QuerySet of Trip or BasicTrip objects
        """
        from .trip import Trip, BasicTrip
        
        try:
            polygon = PolygonOfInterest.objects.get(pk=polygon_id)
        except PolygonOfInterest.DoesNotExist:
            if trip_model == 'Trip':
                return Trip.objects.none()
            else:
                return BasicTrip.objects.none()
        
        if trip_model == 'Trip':
            return Trip.objects.filter(location__intersects=polygon.geometry)
        else:
            return BasicTrip.objects.filter(location__intersects=polygon.geometry)
    
    @staticmethod
    def get_trips_in_polygons_by_cvegeo(cvegeo_list, trip_model='Trip'):
        """
        Get all trips that are located within polygons matching given CVEGEO codes.
        
        Args:
            cvegeo_list: List of CVEGEO codes
            trip_model: Either 'Trip' or 'BasicTrip'
            
        Returns:
            QuerySet of Trip or BasicTrip objects
        """
        from .trip import Trip, BasicTrip
        
        polygons = PolygonOfInterest.objects.filter(cvegeo__in=cvegeo_list)
        
        if not polygons.exists():
            if trip_model == 'Trip':
                return Trip.objects.none()
            else:
                return BasicTrip.objects.none()
        
        # Combine all polygon geometries
        combined_geometry = None
        for polygon in polygons:
            if combined_geometry is None:
                combined_geometry = polygon.geometry
            else:
                combined_geometry = combined_geometry.union(polygon.geometry)
        
        if trip_model == 'Trip':
            return Trip.objects.filter(location__within=combined_geometry)
        else:
            return BasicTrip.objects.filter(location__within=combined_geometry)
    
    @staticmethod
    def get_trips_in_polygons_by_tipo(tipo, trip_model='Trip'):
        """
        Get all trips that are located within polygons of a specific type.
        
        Args:
            tipo: Type of polygon (e.g., 'COLONIA')
            trip_model: Either 'Trip' or 'BasicTrip'
            
        Returns:
            QuerySet of Trip or BasicTrip objects
        """
        from .trip import Trip, BasicTrip
        
        polygons = PolygonOfInterest.objects.filter(tipo=tipo)
        
        if not polygons.exists():
            if trip_model == 'Trip':
                return Trip.objects.none()
            else:
                return BasicTrip.objects.none()
        
        # Combine all polygon geometries
        combined_geometry = None
        for polygon in polygons:
            if combined_geometry is None:
                combined_geometry = polygon.geometry
            else:
                combined_geometry = combined_geometry.union(polygon.geometry)
        
        if trip_model == 'Trip':
            return Trip.objects.filter(location__within=combined_geometry)
        else:
            return BasicTrip.objects.filter(location__within=combined_geometry)
    
    @staticmethod
    def get_trips_in_polygons_by_turistico(turistico, trip_model='Trip'):
        """
        Get all trips that are located within polygons with a specific touristic classification.
        
        Args:
            turistico: Touristic classification (e.g., 'TDR P')
            trip_model: Either 'Trip' or 'BasicTrip'
            
        Returns:
            QuerySet of Trip or BasicTrip objects
        """
        from .trip import Trip, BasicTrip
        
        polygons = PolygonOfInterest.objects.filter(turistico=turistico)
        
        if not polygons.exists():
            if trip_model == 'Trip':
                return Trip.objects.none()
            else:
                return BasicTrip.objects.none()
        
        # Combine all polygon geometries
        combined_geometry = None
        for polygon in polygons:
            if combined_geometry is None:
                combined_geometry = polygon.geometry
            else:
                combined_geometry = combined_geometry.union(polygon.geometry)
        
        if trip_model == 'Trip':
            return Trip.objects.filter(location__within=combined_geometry)
        else:
            return BasicTrip.objects.filter(location__within=combined_geometry)
    
    @classmethod
    def from_geojson_feature(cls, feature):
        """
        Create a PolygonOfInterest instance from a GeoJSON feature.
        
        Args:
            feature: A GeoJSON feature dictionary
            
        Returns:
            PolygonOfInterest instance (not saved)
        """
        import hashlib
        
        props = feature.get('properties', {})
        geometry = feature.get('geometry', {})
        
        # Convert geometry to GEOSGeometry
        geos_geometry = GEOSGeometry(json.dumps(geometry))
        
        # Get CVEGEO or generate one if missing
        cvegeo = props.get('CVEGEO') or props.get('cvegeo')
        if not cvegeo:
            # Try to construct from component codes
            cve_ent = props.get('CVE_ENT') or props.get('cve_ent') or ''
            cve_mun = props.get('CVE_MUN') or props.get('cve_mun') or ''
            cve_loc = props.get('CVE_LOC') or props.get('cve_loc') or ''
            cve_asen = props.get('CVE_ASEN') or props.get('cve_asen') or ''
            
            # If we have component codes, construct CVEGEO
            if cve_ent and cve_mun and cve_loc and cve_asen:
                cvegeo = f"{cve_ent}{cve_mun}{cve_loc}{cve_asen}"
            else:
                # Generate a hash-based identifier from geometry and name
                nom_asen = props.get('NOM_ASEN') or props.get('nom_asen') or 'UNKNOWN'
                geometry_str = json.dumps(geometry)
                hash_input = f"{nom_asen}_{geometry_str}".encode('utf-8')
                hash_value = hashlib.md5(hash_input).hexdigest()[:12]
                cvegeo = f"GEN_{hash_value}"
        
        # Create instance
        instance = cls(
            cvegeo=cvegeo if cvegeo else None,
            cve_ent=props.get('CVE_ENT') or props.get('cve_ent'),
            cve_mun=props.get('CVE_MUN') or props.get('cve_mun'),
            cve_loc=props.get('CVE_LOC') or props.get('cve_loc'),
            cve_asen=props.get('CVE_ASEN') or props.get('cve_asen'),
            cp=props.get('CP') or props.get('cp'),
            fecha_act=props.get('FECHA_ACT') or props.get('fecha_act'),
            institucion=props.get('INSTITUCIO') or props.get('institucion'),
            nom_asen=props.get('NOM_ASEN') or props.get('nom_asen'),
            tipo=props.get('TIPO') or props.get('tipo'),
            shape_leng=props.get('Shape_Leng') or props.get('shape_leng'),
            shape_area=props.get('Shape_Area') or props.get('shape_area'),
            turistico=props.get('TURISTICO') or props.get('turistico'),
            geometry=geos_geometry
        )
        
        return instance
    
    def to_geojson_feature(self):
        """
        Convert this polygon to a GeoJSON feature.
        
        Returns:
            Dictionary representing a GeoJSON feature
        """
        return {
            'type': 'Feature',
            'properties': {
                'CVEGEO': self.cvegeo,
                'CVE_ENT': self.cve_ent,
                'CVE_MUN': self.cve_mun,
                'CVE_LOC': self.cve_loc,
                'CVE_ASEN': self.cve_asen,
                'CP': self.cp,
                'FECHA_ACT': self.fecha_act,
                'INSTITUCIO': self.institucion,
                'NOM_ASEN': self.nom_asen,
                'TIPO': self.tipo,
                'Shape_Leng': self.shape_leng,
                'Shape_Area': self.shape_area,
                'TURISTICO': self.turistico,
            },
            'geometry': self.geometry.geojson if self.geometry else None
        }

