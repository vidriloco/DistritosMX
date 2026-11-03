from django.urls import path

from . import views

urlpatterns = [
    path("consulta/", views.consulta_info),
    path("financiamiento/", views.financiamiento),
    path("areas/", views.areas),
    path("areas/<slug:slug>/", views.area_detalle),
    path("opinion/", views.opinion),
    path("respuesta/", views.respuesta),
    path("resultados/", views.resultados),
]
