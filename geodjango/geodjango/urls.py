from django.contrib import admin
from django.urls import path, include, re_path
from world import api
from world.views import *
from django.shortcuts import redirect
from django.conf import settings
from django.conf.urls.static import static
from world import api
from world.views_categorized.management import *
from django.views.generic import RedirectView
from django.contrib.staticfiles.storage import staticfiles_storage
from world.admin import transportation_admin
from world.views_categorized.transports import *
from world.views_categorized.api import bike_report_favorite, vote_on_review, get_business_categories, get_business_location_stats, get_business_indicators, get_phone_locations_by_date, get_phone_locations_by_date_range, get_phone_locations_batches, list_trip_files, validate_mundial_password, check_mundial_auth
from world.views_categorized.risks import *
from world.views_categorized.despojos import (
    get_despojo_points,
    get_despojo_summary,
    get_despojo_boroughs,
    get_despojo_news,
    submit_despojo_report,
)
from world.views_categorized.contact import submit_contact_lead
from world.views_categorized.legal import privacy_page, terms_page
from world.views_categorized.dashboard import (
    dashboard_home,
    dashboard_news,
    dashboard_sources,
    dashboard_runs,
    dashboard_run,
    dashboard_leads,
    dashboard_reports,
)
from django.views.static import serve
import os

urlpatterns = [
    re_path(r'^media/(?P<path>.*)$', serve,{'document_root': settings.MEDIA_ROOT}),
    re_path(r'^static/(?P<path>.*)$', serve,{'document_root': settings.STATIC_ROOT}),
    path('', map_admin_page, name='map_admin_page'),
    path('explorar', map_admin_page, name='explorar_page'),
    path('explorar/', map_admin_page, name='explorar_page_with_slash'),
    path('negocios', map_admin_page, name='negocios_page'),
    path('negocios/review', map_admin_page, name='negocios_page'),
    path('negocios/stats', map_admin_page, name='negocios_page'),
    path('transporte', map_admin_page, name='transporte_page'),
    path('proyectos/mundial-2025', mundial_2025_page, name='recorridos_page'),
    path('proyectos/mapas/turistas-cdmx-2024-2025', turistas_cdmx_2024_2025_page, name='turistas_cdmx_page'),
    path('proyectos/mapas/despojos-viviendas', despojos_viviendas_page, name='despojos_viviendas_page'),
    path('colonias', neighbourhoods_map_page, name='neighbourhoods_map_page'),
    path('colonias/', neighbourhoods_map_page, name='neighbourhoods_map_page_with_slash'),
    path('vivienda', map_admin_page, name='negocios_indicators_page'),
    # Trip Faker page
    #path('trip-faker', map_admin_page, name='trip_faker_page'),
    #path('trip-faker/', map_admin_page, name='trip_faker_page_with_slash'),
    path('negocios/', map_admin_page, name='negocios_page_with_slash'),
    path('acerca-de', map_admin_page, name='acerca_de_page'),
    path('acerca-de/', map_admin_page, name='acerca_de_page_with_slash'),

    # Legal pages, linked from every form that collects personal data
    path('privacidad', privacy_page, name='privacy_page'),
    path('privacidad/', privacy_page, name='privacy_page_with_slash'),
    path('terminos', terms_page, name='terms_page'),
    path('terminos/', terms_page, name='terms_page_with_slash'),

    # API for AGEBs
    path('api/agebs/all', get_all_agebs, name='get_all_agebs'),
    path('api/neighborhoods/all', get_all_neighborhoods, name='get_all_neighborhoods'),

    # API for Risks (FGJ felonies by crime type)
    path('api/risks/<str:risk_type>', get_risk_by_type, name='get_risk_by_type'),
    path('api/risks/case/<int:risk_id>', get_risk_by_id, name='get_risk_by_id'),

    # API for Despojos (proyectos/mapas/despojos-viviendas)
    path('api/despojos/points', get_despojo_points, name='get_despojo_points'),
    path('api/despojos/summary', get_despojo_summary, name='get_despojo_summary'),
    path('api/despojos/by-borough', get_despojo_boroughs, name='get_despojo_boroughs'),
    path('api/despojos/news', get_despojo_news, name='get_despojo_news'),
    path('api/despojos/report', submit_despojo_report, name='submit_despojo_report'),

    # Contact form in the navigation bar
    path('api/contacto', submit_contact_lead, name='submit_contact_lead'),


    path('api/business/location/stats', get_business_location_stats, name='get_business_location_stats'),
    path('api/business/indicators', get_business_indicators, name='get_business_indicators'),
    
    # API for Business
    path('api/business/categories', get_business_categories, name='get_business_categories'),

    # API for Phone Locations
    path('api/phones/day/<str:date>', get_phone_locations_by_date, name='get_phone_locations_by_date'),
    path('api/phones/day/<str:date>.geojson', get_phone_locations_by_date, name='get_phone_locations_by_date_geojson'),
    path('api/phones/day/<str:date>.csv', get_phone_locations_by_date, name='get_phone_locations_by_date_csv'),
    path('api/phones/range/<str:start_date>/<str:end_date>', get_phone_locations_by_date_range, name='get_phone_locations_by_date_range'),
    path('api/phones/range/<str:start_date>/<str:end_date>.geojson', get_phone_locations_by_date_range, name='get_phone_locations_by_date_range_geojson'),
    path('api/phones/range/<str:start_date>/<str:end_date>.csv', get_phone_locations_by_date_range, name='get_phone_locations_by_date_range_csv'),
    path('api/phones/range/zip/<int:hour_num>/<str:start_date>/<str:end_date>.zip', get_phone_locations_batches, name='get_phone_locations_batches'),

    # API for Trips
    path('api/trips/list', list_trip_files, name='list_trip_files'),
    
    # API for Password Validation
    path('api/mundial-2025/validate-password', validate_mundial_password, name='validate_mundial_password'),
    path('api/mundial-2025/check-auth', check_mundial_auth, name='check_mundial_auth'),

    # Domain validation endpoint for SSL certificate
    path('.well-known/pki-validation/<str:filename>', serve_domain_validation, name='domain_validation'),

    # Serve JSON files from data/agebs/ directory
    re_path(r'^data/agebs/(?P<path>.*)$', serve, {
        'document_root': os.path.join(settings.BASE_DIR, 'data', 'agebs')
    }),

    re_path(r'^data/transports/(?P<path>.*)$', serve, {
        'document_root': os.path.join(settings.BASE_DIR, 'data', 'transports')
    }),
    
    # Staff panel. Every view is behind the admin's own session check; an
    # anonymous visitor is bounced to the admin login and returned here.
    path('dashboard', RedirectView.as_view(pattern_name='dashboard_home', permanent=False)),
    path('dashboard/', dashboard_home, name='dashboard_home'),
    path('dashboard/notas/', dashboard_news, name='dashboard_news'),
    path('dashboard/fuentes/', dashboard_sources, name='dashboard_sources'),
    path('dashboard/ejecuciones/', dashboard_runs, name='dashboard_runs'),
    path('dashboard/ejecuciones/<int:pk>/', dashboard_run, name='dashboard_run'),
    path('dashboard/leads/', dashboard_leads, name='dashboard_leads'),
    path('dashboard/reportes/', dashboard_reports, name='dashboard_reports'),

    path('admin/', admin.site.urls),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)