from django.contrib import admin
from django.contrib.gis.geos import Point
from django.utils.html import format_html
from django import forms
from django.forms import widgets
from django.contrib.auth.admin import UserAdmin
from django.contrib.auth.models import User
from .models import UserFunnyPic, Line, LocationCategory, Station, Transaction, GeoZone, VehicleLocation, DenueRecord, StationStats, UserDetails, MarkerIcon, Marker, UserStatus, Avatar, BikeReport, BikeReportFavorite, ContentFlag, StationReview, Voting, Neighbourhood, PhoneLocation, Trip, BasicTrip, TripHome, TripOutstanding, PolygonOfInterest, TripsMatching
from .models.official_transports import CablebusLine, CablebusStation, InterurbanoLine, InterurbanoStation, ConcesionadosLine, ConcesionadosStation, MetrobusLine, MetrobusStation, RTPLine, RTPStation, MetroLine, MetroStation, SuburbanoLine, SuburbanoStation, TrenLigeroLine, TrenLigeroStation, TrolebusLine, TrolebusStation, MexicableStation, MexicableLine, MexibusStation, MexibusLine, EcobiciStation
from .models.official_transports.metadata import LineMetadata, StationMetadata
from leaflet.admin import LeafletGeoAdmin
from .models.felony import Felony
from .models.ageb_risk import AgebRisk
from .models.airbnb_listing import AirbnbListing
from .models.despojo_report import DespojoCaseReport

# Create a custom admin site for transportation models
class TransportationAdminSite(admin.AdminSite):
    site_header = 'Transportation Administration'
    site_title = 'Transportation Admin'
    index_title = 'Transportation Models'

# Initialize the custom admin site
transportation_admin = TransportationAdminSite(name='transportation_admin')

class LineMetadataInline(admin.StackedInline):
    model = LineMetadata
    extra = 0
    max_num = 1
    can_delete = False
    fields = ['color', 'stroke', 'status', 'hidden']

class StationMetadataInline(admin.StackedInline):
    model = StationMetadata
    extra = 0
    max_num = 1
    can_delete = False
    fields = ['status']

class LineMetadataForm(forms.ModelForm):
    color = forms.CharField(
        max_length=7,
        required=False,
        widget=widgets.TextInput(attrs={'type': 'color'})
    )
    stroke = forms.FloatField(required=False)
    status = forms.ChoiceField(choices=LineMetadata._meta.get_field('status').choices, required=False)
    hidden = forms.BooleanField(required=False)

    class Meta:
        model = LineMetadata
        fields = ['color', 'stroke', 'status', 'hidden']

class StationMetadataForm(forms.ModelForm):
    status = forms.ChoiceField(choices=StationMetadata._meta.get_field('status').choices, required=False)

    class Meta:
        model = StationMetadata
        fields = ['status']

class LineAdminMixin:
    def get_form(self, request, obj=None, **kwargs):
        form = super().get_form(request, obj, **kwargs)
        if obj and obj.metadata:
            form.base_fields['color'].initial = obj.metadata.color
            form.base_fields['stroke'].initial = obj.metadata.stroke
            form.base_fields['status'].initial = obj.metadata.status
            form.base_fields['hidden'].initial = obj.metadata.hidden
        return form

    def save_model(self, request, obj, form, change):
        super().save_model(request, obj, form, change)
        if not obj.metadata:
            obj.metadata = LineMetadata.objects.create()
        obj.metadata.color = form.cleaned_data.get('color', '#000000')
        obj.metadata.stroke = form.cleaned_data.get('stroke', 2.0)
        obj.metadata.status = form.cleaned_data.get('status', 'active')
        obj.metadata.hidden = form.cleaned_data.get('hidden', False)
        obj.metadata.save()

class StationAdminMixin:
    def get_form(self, request, obj=None, **kwargs):
        form = super().get_form(request, obj, **kwargs)
        if obj and obj.metadata:
            form.base_fields['status'].initial = obj.metadata.status
        return form

    def save_model(self, request, obj, form, change):
        super().save_model(request, obj, form, change)
        if not obj.metadata:
            obj.metadata = StationMetadata.objects.create()
        obj.metadata.status = form.cleaned_data.get('status', 'active')
        obj.metadata.save()

# Register models with the custom admin site
class CablebusLineAdmin(LineAdminMixin, admin.ModelAdmin):
    list_display = ('system', 'line_number', 'route')
    search_fields = ('system', 'line_number', 'route')
    list_filter = ('system',)
    form = LineMetadataForm
    fields = ('system', 'line_number', 'route', 'color', 'stroke', 'status', 'hidden')

class CablebusStationAdmin(StationAdminMixin, admin.ModelAdmin):
    list_display = ('name', 'line_number', 'station_number', 'station_code', 'station_type', 'borough')
    search_fields = ('name', 'line_number', 'station_code', 'borough')
    list_filter = ('line_number', 'station_type', 'borough', 'has_elevators', 'has_tactile_guide', 'has_braille_plates')
    ordering = ('line_number', 'station_number')
    form = StationMetadataForm
    fields = ('name', 'line_number', 'station_number', 'station_code', 'station_type', 'year', 'has_elevators', 'has_tactile_guide', 'has_braille_plates', 'borough', 'location', 'status')

class InterurbanoStationAdmin(StationAdminMixin, admin.ModelAdmin):
    list_display = ('name', 'station_id', 'station_type', 'line_number', 'borough')
    search_fields = ('name', 'station_id', 'line_number', 'borough')
    list_filter = ('station_type', 'line_number', 'borough')
    form = StationMetadataForm
    fields = ('name', 'station_id', 'station_type', 'line_number', 'borough', 'location', 'status')

class InterurbanoLineAdmin(LineAdminMixin, admin.ModelAdmin):
    list_display = ('line_number', 'route', 'system')
    search_fields = ('line_number', 'route', 'description')
    form = LineMetadataForm
    fields = ('line_number', 'route', 'system', 'description', 'geometry', 'color', 'stroke', 'status', 'hidden')

class ConcesionadosLineAdmin(LineAdminMixin, admin.ModelAdmin):
    list_display = ('system', 'nomenclature', 'route', 'operator', 'type', 'fare')
    search_fields = ('system', 'nomenclature', 'route', 'operator', 'company')
    list_filter = ('system', 'type', 'operator')
    form = LineMetadataForm
    fields = ('system', 'nomenclature', 'route', 'operator', 'type', 'fare', 'schedule', 'frequency', 'length', 'stations', 'geometry', 'company', 'origin_destination', 'nomenclature_od', 'corridor', 'corridor_nomenclature', 'color', 'stroke', 'status', 'hidden')

class ConcesionadosStationAdmin(StationAdminMixin, admin.ModelAdmin):
    list_display = ('nomenclature', 'system', 'route', 'corridor', 'address')
    search_fields = ('nomenclature', 'system', 'route', 'corridor', 'address')
    list_filter = ('system', 'corridor')
    form = StationMetadataForm
    fields = ('system', 'company', 'origin_destination', 'nomenclature_od', 'route', 'address', 'nomenclature', 'corridor', 'corridor_nomenclature', 'location', 'status')

class MetrobusLineAdmin(LineAdminMixin, LeafletGeoAdmin):
    list_display = ('system', 'line', 'route', 'section')
    search_fields = ('system', 'line', 'route', 'section')
    list_filter = ('system', 'line')
    readonly_fields = ('geometry',)
    form = LineMetadataForm
    fields = ('system', 'route', 'section', 'line', 'geometry', 'color', 'stroke', 'status', 'hidden')

class MetrobusStationAdmin(StationAdminMixin, LeafletGeoAdmin):
    list_display = ('name', 'system', 'line', 'station_number', 'type', 'station_code', 'year')
    search_fields = ('name', 'system', 'line', 'station_number', 'eod17_code', 'station_code', 'boroughs')
    list_filter = ('system', 'line', 'type', 'year')
    readonly_fields = ('location',)
    form = StationMetadataForm
    fields = ('name', 'system', 'line', 'station_number', 'eod17_code', 'type', 'boroughs', 'year', 'station_code', 'location', 'status')

class RTPLineAdmin(LineAdminMixin, LeafletGeoAdmin):
    list_display = ('name', 'system', 'route', 'module', 'origin', 'destination', 'status')
    search_fields = ('name', 'system', 'route', 'module', 'origin', 'destination')
    list_filter = ('system', 'status', 'ordinary', 'atenea', 'express', 'ecobus', 'express_di', 'nightbus')
    readonly_fields = ('geometry',)
    form = LineMetadataForm
    fields = ('name', 'system', 'route', 'module', 'origin', 'destination', 'ordinary', 'atenea', 'express', 'ecobus', 'express_di', 'nightbus', 'geometry', 'color', 'stroke', 'status', 'hidden')

class RTPStationAdmin(StationAdminMixin, LeafletGeoAdmin):
    list_display = ('route', 'module', 'direction', 'origin_destination', 'corridor', 'intersection', 'system')
    search_fields = ('route', 'module', 'direction', 'origin_destination', 'corridor', 'intersection', 'system')
    list_filter = ('route', 'module', 'direction', 'system')
    readonly_fields = ('location',)
    form = StationMetadataForm
    fields = ('route', 'module', 'direction', 'origin_destination', 'corridor', 'intersection', 'system', 'location', 'status')

class MetroLineAdmin(LineAdminMixin, LeafletGeoAdmin):
    list_display = ('system', 'line', 'route')
    search_fields = ('system', 'line', 'route')
    list_filter = ('system',)
    readonly_fields = ('geometry',)
    form = LineMetadataForm
    fields = ('system', 'line', 'route', 'geometry', 'color', 'stroke', 'status', 'hidden')

class MetroStationAdmin(StationAdminMixin, LeafletGeoAdmin):
    list_display = ('name', 'system', 'line', 'station_number', 'station_code', 'type', 'borough', 'year')
    search_fields = ('name', 'system', 'line', 'station_number', 'station_code', 'eod_code', 'borough')
    list_filter = ('system', 'line', 'type', 'year')
    readonly_fields = ('geometry',)
    form = StationMetadataForm
    fields = ('name', 'system', 'line', 'station_number', 'station_code', 'eod_code', 'type', 'borough', 'year', 'geometry', 'status')

class SuburbanoLineAdmin(LineAdminMixin, LeafletGeoAdmin):
    list_display = ('system', 'line_number', 'route')
    search_fields = ('system', 'line_number', 'route', 'description')
    list_filter = ('system',)
    readonly_fields = ('path',)
    form = LineMetadataForm
    fields = ('system', 'line_number', 'route', 'description', 'path', 'color', 'stroke', 'status', 'hidden')

class SuburbanoStationAdmin(StationAdminMixin, admin.ModelAdmin):
    list_display = ('name', 'system', 'line_number', 'station_id', 'station_type', 'borough')
    search_fields = ('name', 'system', 'line_number', 'station_id', 'borough')
    list_filter = ('system', 'line_number', 'station_type')
    readonly_fields = ('location',)
    form = StationMetadataForm
    fields = ('name', 'system', 'line_number', 'station_id', 'station_type', 'borough', 'location', 'status', 'hidden')

class TrenLigeroLineAdmin(LineAdminMixin, LeafletGeoAdmin):
    list_display = ('system', 'line', 'route')
    search_fields = ('system', 'line', 'route')
    list_filter = ('system',)
    readonly_fields = ('geometry',)
    form = LineMetadataForm
    fields = ('system', 'line', 'route', 'geometry', 'color', 'stroke', 'status', 'hidden')

class TrenLigeroStationAdmin(StationAdminMixin, LeafletGeoAdmin):
    list_display = ('name', 'system', 'line', 'station_number', 'station_code', 'station_type', 'boroughs', 'year')
    search_fields = ('name', 'system', 'line', 'station_number', 'station_code', 'eod_code', 'boroughs')
    list_filter = ('system', 'line', 'station_type', 'year', 'has_ramp', 'has_elevators', 'has_tactile_guide')
    readonly_fields = ('location',)
    form = StationMetadataForm
    fields = ('name', 'system', 'line', 'station_number', 'station_code', 'eod_code', 'station_type', 'boroughs', 'year', 'has_ramp', 'has_elevators', 'has_tactile_guide', 'location', 'status')

class TrolebusLineAdmin(LineAdminMixin, LeafletGeoAdmin):
    list_display = ('system', 'line', 'route', 'circuit')
    search_fields = ('system', 'line', 'route', 'circuit')
    list_filter = ('system',)
    readonly_fields = ('geometry',)
    form = LineMetadataForm
    fields = ('system', 'line', 'route', 'circuit', 'geometry', 'color', 'stroke', 'status', 'hidden')

class TrolebusStationAdmin(StationAdminMixin, LeafletGeoAdmin):
    list_display = ('name', 'system', 'line', 'station_code', 'station_type', 'boroughs', 'has_ramp')
    search_fields = ('name', 'system', 'line', 'station_code', 'boroughs')
    list_filter = ('system', 'line', 'station_type', 'has_ramp')
    readonly_fields = ('location',)
    form = StationMetadataForm
    fields = ('name', 'system', 'line', 'station_code', 'station_type', 'boroughs', 'has_ramp', 'location', 'status')

class MexicableStationAdmin(StationAdminMixin, LeafletGeoAdmin):
    list_display = ('name', 'system', 'line', 'station_number', 'station_code', 'station_type')
    search_fields = ('name', 'system', 'line', 'station_number', 'station_code')
    list_filter = ('system', 'line', 'station_type')
    readonly_fields = ('location',)
    form = StationMetadataForm
    fields = ('name', 'description', 'system', 'line', 'station_number', 'station_code', 'station_type', 'location', 'status')

class MexicableLineAdmin(LineAdminMixin, LeafletGeoAdmin):
    list_display = ('system', 'line_number', 'route')
    search_fields = ('system', 'line_number', 'route', 'description')
    list_filter = ('system',)
    readonly_fields = ('geometry',)
    form = LineMetadataForm
    fields = ('system', 'line_number', 'route', 'description', 'geometry', 'color', 'stroke', 'status', 'hidden')

class MexibusStationAdmin(StationAdminMixin, LeafletGeoAdmin):
    list_display = ('name', 'system', 'line_number', 'station_number', 'station_code', 'station_type')
    search_fields = ('name', 'system', 'line_number', 'station_number', 'station_code')
    list_filter = ('system', 'line_number', 'station_type')
    readonly_fields = ('location',)
    form = StationMetadataForm
    fields = ('name', 'system', 'line_number', 'station_number', 'station_code', 'station_type', 'location', 'status')

class MexibusLineAdmin(LineAdminMixin, LeafletGeoAdmin):
    list_display = ('system', 'line_number', 'route', 'year', 'length')
    search_fields = ('system', 'line_number', 'route', 'year')
    list_filter = ('system', 'year')
    readonly_fields = ('geometry',)
    form = LineMetadataForm
    fields = ('system', 'line_number', 'route', 'year', 'length', 'geometry', 'color', 'stroke', 'status', 'hidden')

class EcobiciStationAdmin(StationAdminMixin, LeafletGeoAdmin):
    list_display = ('station_id', 'system', 'main_street', 'secondary_street', 'borough', 'status')
    search_fields = ('station_id', 'system', 'main_street', 'secondary_street', 'neighborhood', 'borough')
    list_filter = ('system', 'borough', 'status', 'installation_type')
    readonly_fields = ('location',)
    form = StationMetadataForm
    fields = ('system', 'station_id', 'main_street', 'secondary_street', 'neighborhood', 'borough', 'location', 'installation_type', 'status')

# Register models with the custom admin site
transportation_admin.register(CablebusLine, CablebusLineAdmin)
transportation_admin.register(CablebusStation, CablebusStationAdmin)
transportation_admin.register(InterurbanoStation, InterurbanoStationAdmin)
transportation_admin.register(InterurbanoLine, InterurbanoLineAdmin)
transportation_admin.register(ConcesionadosLine, ConcesionadosLineAdmin)
transportation_admin.register(ConcesionadosStation, ConcesionadosStationAdmin)
transportation_admin.register(MetrobusLine, MetrobusLineAdmin)
transportation_admin.register(MetrobusStation, MetrobusStationAdmin)
transportation_admin.register(RTPLine, RTPLineAdmin)
transportation_admin.register(RTPStation, RTPStationAdmin)
transportation_admin.register(MetroLine, MetroLineAdmin)
transportation_admin.register(MetroStation, MetroStationAdmin)
transportation_admin.register(SuburbanoLine, SuburbanoLineAdmin)
transportation_admin.register(SuburbanoStation, SuburbanoStationAdmin)
transportation_admin.register(TrenLigeroLine, TrenLigeroLineAdmin)
transportation_admin.register(TrenLigeroStation, TrenLigeroStationAdmin)
transportation_admin.register(TrolebusLine, TrolebusLineAdmin)
transportation_admin.register(TrolebusStation, TrolebusStationAdmin)
transportation_admin.register(MexicableStation, MexicableStationAdmin)
transportation_admin.register(MexicableLine, MexicableLineAdmin)
transportation_admin.register(MexibusStation, MexibusStationAdmin)
transportation_admin.register(MexibusLine, MexibusLineAdmin)
transportation_admin.register(EcobiciStation, EcobiciStationAdmin)

class TransactionAdmin(LeafletGeoAdmin):
   list_display=['station_name', 'system_identifier', 'line', 'operation', 'amount', 'final_amount', 'datetime', 'station']

admin.site.register(Transaction, TransactionAdmin)

class LineAdmin(LeafletGeoAdmin):
   list_display=['system', 'route', 'mode', 'identifier', 'operative_status', 'updated_at', 'flyer']

admin.site.register(Line, LineAdmin)

class PoiAdmin(LeafletGeoAdmin):
   search_fields = ['name', 'address', 'categories']
   list_filter=['mode', 'categories']
   list_display=['name', 'description', 'description_en', 'description_fr', 'coordinate', 'attribution', 'website', 'address', 'operative_status', 'updated_at', 'main_image', 'mode']

   def change_view(self, request, object_id, form_url='', extra_context=None):
      obj = self.get_object(request, object_id)
      extra_context = extra_context or {}
      if obj and obj.coordinate:
         extra_context['initial_lat'] = obj.coordinate.y
         extra_context['initial_lon'] = obj.coordinate.x
      return super().change_view(request, object_id, form_url, extra_context=extra_context)

class StationAdmin(LeafletGeoAdmin):
   search_fields = ['name', 'system']
   list_filter = ['system', 'type']
   list_display=['coordinates', 'system', 'name', 'station_number', 'station_key', 'station_eod_key', 'type', 'municipalities_served', 'year']

admin.site.register(Station, StationAdmin)

class LocationCategoryAdmin(admin.ModelAdmin):
   list_display=['name', 'slug']

admin.site.register(LocationCategory, LocationCategoryAdmin)

class GeoZoneAdmin(admin.ModelAdmin):
   list_display=['id', 'airbnb_listings', 'airbnb_listings_price', 'airbnb_listings_price_average', 'CVEGEO', 'ecobici_stations', 'cablebus_stations', 'metro_stations', 'metrobus_stations', 'rtp_stations', 'concesionados_stations', 'tren_interurbano_stations', 'tren_suburbano_stations', 'mexibus_stations', 'mexicable_stations', 'tren_ligero_stations', 'thefts_2024', 'thefts_2020', 'population', 'health', 'cars_rate', 'bikes_rate', 'companies', 'jobs']
   list_filter = ['CVEGEO']

admin.site.register(GeoZone, GeoZoneAdmin)

class VehicleLocationAdmin(LeafletGeoAdmin):
   list_display=['station_number', 'vehicle_id', 'time_minutes_left', 'vehicle_line', 'vehicle_destination', 'vehicle_location', 'created_at']
   list_filter = ['is_intrapolated', 'has_been_processed', 'vehicle_id', 'station_number']

admin.site.register(VehicleLocation, VehicleLocationAdmin)

class DenueRecordAdmin(LeafletGeoAdmin):
   list_display=['nombre_act', 'codigo_act', 'per_ocu']
   list_filter = ['codigo_act', 'per_ocu']

admin.site.register(DenueRecord, DenueRecordAdmin)

class StationStatsAdmin(LeafletGeoAdmin):
   list_display=['station', 'education_300', 'health_300']
   list_filter = ['station']

admin.site.register(StationStats, StationStatsAdmin)

class UserDetailsAdmin(admin.ModelAdmin):
   list_display=['pk', 'user']
   list_filter = ['user']

admin.site.register(UserDetails, UserDetailsAdmin)

class MarkerAdmin(admin.ModelAdmin):
   list_display=['name', 'icon']
   list_filter = ['name']

admin.site.register(Marker, MarkerAdmin)

class MarkerIconAdmin(admin.ModelAdmin):
   list_display=['name', 'image']
   list_filter = ['name']

admin.site.register(MarkerIcon, MarkerIconAdmin)

class UserFunnyPicAdmin(admin.ModelAdmin):
   list_display=['image']

admin.site.register(UserFunnyPic, UserFunnyPicAdmin)

class UserStatusAdmin(admin.ModelAdmin):
   list_display=['user', 'event_location_category', 'report_type', 'created_at']
   list_filter = ['user']

admin.site.register(UserStatus, UserStatusAdmin)

class AvatarAdmin(admin.ModelAdmin):
   list_display=['image', 'identifier', 'name']

admin.site.register(Avatar, AvatarAdmin)

class BikeReportAdmin(admin.ModelAdmin):
   list_display=['category', 'description', 'created_at', 'location']
   list_filter = ['category']

admin.site.register(BikeReport, BikeReportAdmin)

class BikeReportFavoriteAdmin(admin.ModelAdmin):
   list_display=['user', 'bike_report', 'created_at']
   list_filter = ['user', 'bike_report']

admin.site.register(BikeReportFavorite, BikeReportFavoriteAdmin)

class ContentFlagAdmin(admin.ModelAdmin):
    list_display = ['user', 'content_type', 'content_id', 'flag_reason', 'created_at', 'get_content_link']
    list_filter = ['content_type', 'flag_reason', 'created_at']
    search_fields = ['user__username', 'content_id', 'additional_text']
    readonly_fields = ['created_at']
    
    def get_content_link(self, obj):
        """Generate a link to the flagged content based on content_type and content_id"""
        if obj.content_type == 'BikeReport':
            try:
                return format_html('<a href="/admin/world/bikereport/{}/change/">View BikeReport</a>', obj.content_id)
            except BikeReport.DoesNotExist:
                return 'Content not found'
        return 'No link available'
    
    get_content_link.short_description = 'Content Link'

admin.site.register(ContentFlag, ContentFlagAdmin)

class LineMetadataAdmin(admin.ModelAdmin):
    list_display = ['color', 'stroke', 'status', 'get_related_lines']
    list_filter = ['status']
    search_fields = ['color', 'stroke']
    
    def get_related_lines(self, obj):
        related_lines = []
        for attr in dir(obj):
            if attr.endswith('_line') and getattr(obj, attr, None):
                related_lines.append(str(getattr(obj, attr)))
        return ', '.join(related_lines) if related_lines else '-'
    get_related_lines.short_description = 'Related Lines'

class StationMetadataAdmin(admin.ModelAdmin):
    list_display = ['status', 'get_related_stations']
    list_filter = ['status']
    
    def get_related_stations(self, obj):
        related_stations = []
        for attr in dir(obj):
            if attr.endswith('_station') and getattr(obj, attr, None):
                related_stations.append(str(getattr(obj, attr)))
        return ', '.join(related_stations) if related_stations else '-'
    get_related_stations.short_description = 'Related Stations'

admin.site.register(LineMetadata, LineMetadataAdmin)
admin.site.register(StationMetadata, StationMetadataAdmin)

class StationReviewAdmin(LeafletGeoAdmin):
    list_display = ['transport_system', 'transport_identifier', 'happiness_value', 'report_type', 'get_user', 'review_date']
    list_filter = ['transport_system', 'report_type', 'happiness_value', 'created_at']
    search_fields = ['transport_identifier', 'message', 'transport_system', 'user__username']
    readonly_fields = ['created_at']
    fieldsets = (
        ('Review Information', {
            'fields': ('happiness_value', 'report_type', 'message', 'image')
        }),
        ('Location Information', {
            'fields': ('location',)
        }),
        ('Reviewed Station Information', {
            'fields': ('reviewed_object_location',)
        }),
        ('Transport Information', {
            'fields': ('transport_id', 'transport_identifier', 'transport_system')
        }),
        ('User Information', {
            'fields': ('user',)
        }),
        ('Timestamp', {
            'fields': ('created_at',),
            'classes': ('collapse',)
        })
    )

    def get_user(self, obj):
        return obj.user.username if obj.user else '-'
    get_user.short_description = 'User'
    get_user.admin_order_field = 'user__username'

admin.site.register(StationReview, StationReviewAdmin)

class CustomUserAdmin(UserAdmin):
    list_display = ('username', 'email', 'first_name', 'last_name', 'is_staff', 'date_joined')
    list_filter = ('is_staff', 'is_superuser', 'is_active', 'date_joined')
    ordering = ('-date_joined',)

# Unregister the default User admin and register our custom one
admin.site.unregister(User)
admin.site.register(User, CustomUserAdmin)

class VotingAdmin(admin.ModelAdmin):
    list_display = ['reference_table_type', 'reference_table_id', 'get_user', 'is_positive', 'created_at']
    list_filter = ['reference_table_type', 'is_positive', 'created_at']
    search_fields = ['reference_table_id', 'user__username']
    readonly_fields = ['created_at']
    
    def get_user(self, obj):
        return obj.user.username if obj.user else '-'
    get_user.short_description = 'User'
    get_user.admin_order_field = 'user__username'

admin.site.register(Voting, VotingAdmin)

class FelonyAdmin(LeafletGeoAdmin):
    list_display = ['crime_category', 'crime_type', 'crime_date', 'crime_time', 'crime_date_time', 'location']
    list_filter = ['crime_category', 'start_year', 'crime_type']
    search_fields = []

admin.site.register(Felony, FelonyAdmin)

class AirbnbListingAdmin(LeafletGeoAdmin):
    list_display = ['id', 'name', 'location', 'host_name', 'neighbourhood_group', 'neighbourhood', 'room_type', 'price', 'minimum_nights', 'number_of_reviews', 'reviews_per_month', 'calculated_host_listings_count', 'availability_365', 'number_of_reviews_ltm', 'license']
    list_filter = ['neighbourhood_group', 'room_type']
    search_fields = ['name', 'host_name', 'neighbourhood']

admin.site.register(AirbnbListing, AirbnbListingAdmin)

class AgebRiskAdmin(LeafletGeoAdmin):
    list_display = ['geo_key', 'sexual_abuse_risk_level', 'metrobus_agression_risk_level', 'taxi_theft_risk_level', 'microbus_theft_risk_level', 'harassment_risk_level']
    list_filter = ['sexual_abuse_risk_level', 'metrobus_agression_risk_level', 'taxi_theft_risk_level', 'microbus_theft_risk_level', 'harassment_risk_level', 'geo_key']
    search_fields = ['geo_key']

class NeighbourhoodAdmin(LeafletGeoAdmin):
    list_display = ['neighbourhood_name', 'municipality_name', 'neighbourhood_code', 'municipality_code', 'created_at']
    list_filter = ['municipality_name', 'municipality_code']
    search_fields = ['neighbourhood_name', 'municipality_name', 'neighbourhood_code', 'municipality_code']
    readonly_fields = ['created_at', 'updated_at']

class PhoneLocationAdmin(LeafletGeoAdmin):
    list_display = ['device_id', 'device_os', 'country', 'timestamp', 'created_at', 'location']
    list_filter = ['device_os', 'country', 'location_context', 'consent', 'created_at']
    search_fields = ['device_id', 'app_id', 'publisher_id', 'quad_id', 'ip_address']
    readonly_fields = ['created_at', 'timestamp', 'location']
    ordering = ['-created_at']
    
    fieldsets = (
        ('Device Information', {
            'fields': ('device_id', 'id_type', 'device_os', 'os_version', 'user_agent')
        }),
        ('Location Data', {
            'fields': ('latitude', 'longitude', 'horizontal_accuracy', 'location', 'geohash')
        }),
        ('Timing', {
            'fields': ('timestamp', 'created_at')
        }),
        ('Network & Context', {
            'fields': ('ip_address', 'location_context', 'consent')
        }),
        ('Application Data', {
            'fields': ('source_id', 'publisher_id', 'app_id', 'quad_id')
        }),
        ('Geographic', {
            'fields': ('country',)
        }),
    )
    
    def get_queryset(self, request):
        """Optimize queryset for admin performance"""
        return super().get_queryset(request).select_related()
    
    def has_add_permission(self, request):
        """Disable manual addition - data should come from CSV import"""
        return False

admin.site.register(AgebRisk, AgebRiskAdmin)
admin.site.register(Neighbourhood, NeighbourhoodAdmin)
admin.site.register(PhoneLocation, PhoneLocationAdmin)

class TripAdmin(LeafletGeoAdmin):
    list_display = ['caid', 'id_type', 'iso_country_code', 'utc_timestamp', 'velocity', 'displacement', 'pings', 'is_visitor', 'created_at']
    list_filter = ['id_type', 'iso_country_code', 'overlap_flag', 'high_velocity_flag', 'is_visitor', 'created_at', 'utc_timestamp']
    search_fields = ['caid', 'ip_address', 'heading_cardinal']
    readonly_fields = ['created_at', 'updated_at', 'location']
    ordering = ['-utc_timestamp']
    
    fieldsets = (
        ('Device Information', {
            'fields': ('caid', 'id_type', 'ip_address')
        }),
        ('Location Data', {
            'fields': ('latitude', 'longitude', 'horizontal_accuracy', 'location', 'iso_country_code')
        }),
        ('Timing', {
            'fields': ('utc_timestamp', 'start_time', 'end_time', 'traverse_time', 'created_at', 'updated_at')
        }),
        ('Trip Metrics', {
            'fields': ('velocity', 'displacement', 'heading', 'heading_cardinal', 'pings')
        }),
        ('Trip Flags', {
            'fields': ('overlap_flag', 'high_velocity_flag', 'high_velocity_pings', 'overlap_trip_list', 'is_visitor')
        }),
        ('Trip Details', {
            'fields': ('trip_index', 'poi_ids')
        }),
        ('Raw Data', {
            'fields': ('trip_fields', 'trip_ping_fields', 'trip_to_trip_fields'),
            'classes': ('collapse',)
        }),
    )
    
    def get_queryset(self, request):
        """Optimize queryset for admin performance"""
        return super().get_queryset(request)
    
    def has_add_permission(self, request):
        """Disable manual addition - data should come from CSV import"""
        return False

admin.site.register(Trip, TripAdmin)

class BasicTripAdmin(LeafletGeoAdmin):
    list_display = ['caid', 'id_type', 'iso_country_code', 'utc_timestamp', 'horizontal_accuracy', 'created_at']
    list_filter = ['id_type', 'iso_country_code', 'created_at', 'utc_timestamp']
    search_fields = ['caid', 'ip_address']
    readonly_fields = ['created_at', 'updated_at', 'location']
    ordering = ['-utc_timestamp']
    
    fieldsets = (
        ('Device Information', {
            'fields': ('caid', 'id_type', 'ip_address')
        }),
        ('Location Data', {
            'fields': ('latitude', 'longitude', 'horizontal_accuracy', 'location', 'iso_country_code')
        }),
        ('Timing', {
            'fields': ('utc_timestamp', 'created_at', 'updated_at')
        }),
        ('POI Information', {
            'fields': ('poi_ids',)
        }),
    )
    
    def get_queryset(self, request):
        """Optimize queryset for admin performance"""
        return super().get_queryset(request)
    
    def has_add_permission(self, request):
        """Disable manual addition - data should come from CSV import"""
        return False

admin.site.register(BasicTrip, BasicTripAdmin)

class TripHomeAdmin(admin.ModelAdmin):
    list_display = ['caid', 'has_been_processed', 'country_iso', 'created_at', 'updated_at']
    list_filter = ['has_been_processed', 'country_iso', 'created_at', 'updated_at']
    search_fields = ['caid', 'country_iso']
    readonly_fields = ['created_at', 'updated_at']
    ordering = ['-created_at']
    
    fieldsets = (
        ('Device Information', {
            'fields': ('caid',)
        }),
        ('Status', {
            'fields': ('has_been_processed', 'country_iso')
        }),
        ('Metadata', {
            'fields': ('created_at', 'updated_at')
        }),
    )

admin.site.register(TripHome, TripHomeAdmin)

class TripOutstandingAdmin(admin.ModelAdmin):
    list_display = ['caid', 'record_count', 'start_date', 'end_date', 'total_displacement', 'total_traverse_time', 'total_pings', 'created_at', 'updated_at']
    list_filter = ['start_date', 'end_date', 'created_at', 'updated_at']
    search_fields = ['caid']
    readonly_fields = ['created_at', 'updated_at']
    ordering = ['-total_displacement']
    
    fieldsets = (
        ('Device Information', {
            'fields': ('caid',)
        }),
        ('Record Statistics', {
            'fields': ('record_count', 'total_pings')
        }),
        ('Date Range', {
            'fields': ('start_date', 'end_date')
        }),
        ('Aggregated Metrics', {
            'fields': ('total_traverse_time', 'total_displacement')
        }),
        ('Metadata', {
            'fields': ('created_at', 'updated_at')
        }),
    )

admin.site.register(TripOutstanding, TripOutstandingAdmin)

class PolygonOfInterestAdmin(LeafletGeoAdmin):
    list_display = ['nom_asen', 'cvegeo', 'tipo', 'turistico', 'cve_ent', 'cve_mun', 'cp', 'created_at']
    list_filter = ['tipo', 'turistico', 'cve_ent', 'cve_mun', 'created_at']
    search_fields = ['nom_asen', 'cvegeo', 'cp', 'cve_ent', 'cve_mun']
    readonly_fields = ['created_at', 'updated_at']
    ordering = ['nom_asen']
    
    fieldsets = (
        ('Geographic Identification', {
            'fields': ('cvegeo', 'cve_ent', 'cve_mun', 'cve_loc', 'cve_asen')
        }),
        ('Location Information', {
            'fields': ('nom_asen', 'tipo', 'cp', 'turistico')
        }),
        ('Administrative Information', {
            'fields': ('institucion', 'fecha_act')
        }),
        ('Geometry', {
            'fields': ('geometry', 'shape_leng', 'shape_area')
        }),
        ('Metadata', {
            'fields': ('created_at', 'updated_at')
        }),
    )
    
    def get_queryset(self, request):
        """Optimize queryset for admin performance"""
        return super().get_queryset(request)

admin.site.register(PolygonOfInterest, PolygonOfInterestAdmin)

class TripsMatchingAdmin(admin.ModelAdmin):
    list_display = ['trip_id', 'origin_polygon', 'origin_polygon_name', 'destination_polygon', 'destination_polygon_name', 'date', 'created_at']
    list_filter = ['date', 'origin_polygon', 'destination_polygon', 'created_at', 'updated_at']
    search_fields = ['trip_id', 'origin_polygon', 'origin_polygon_name', 'destination_polygon', 'destination_polygon_name']
    readonly_fields = ['created_at', 'updated_at']
    ordering = ['-date', '-created_at']
    
    fieldsets = (
        ('Trip Identification', {
            'fields': ('trip_id', 'date')
        }),
        ('Origin Polygon', {
            'fields': ('origin_polygon', 'origin_polygon_name')
        }),
        ('Destination Polygon', {
            'fields': ('destination_polygon', 'destination_polygon_name')
        }),
        ('Metadata', {
            'fields': ('created_at', 'updated_at')
        }),
    )
    
    def get_queryset(self, request):
        """Optimize queryset for admin performance"""
        return super().get_queryset(request)

admin.site.register(TripsMatching, TripsMatchingAdmin)


class DespojoCaseReportAdmin(admin.ModelAdmin):
    """
    Reports contain personal data of crime victims. Everything submitted by the
    public is read-only here; only the triage fields can be edited.
    """
    list_display = ['name', 'borough', 'year_of_events', 'denuncia_status', 'review_status', 'created_at']
    list_filter = ['review_status', 'denuncia_status', 'borough', 'created_at']
    search_fields = ['name', 'email', 'borough', 'neighborhood']
    readonly_fields = ['name', 'email', 'borough', 'neighborhood', 'year_of_events',
                       'denuncia_status', 'account', 'consent_contact', 'created_at']
    ordering = ['-created_at']

    fieldsets = (
        ('Contacto', {
            'fields': ('name', 'email', 'consent_contact')
        }),
        ('Caso', {
            'fields': ('borough', 'neighborhood', 'year_of_events', 'denuncia_status', 'account')
        }),
        ('Seguimiento', {
            'fields': ('review_status', 'internal_notes', 'created_at')
        }),
    )

    def has_add_permission(self, request):
        # Reports only arrive through the public form.
        return False

admin.site.register(DespojoCaseReport, DespojoCaseReportAdmin)
