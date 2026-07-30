# myproject/subdomain_urls.py

from django.urls import path
from world.views import metrobus_view
from django.views.generic import RedirectView
from django.contrib.staticfiles.storage import staticfiles_storage

urlpatterns = [
    path('', metrobus_view, name='metrobus_view'),
    path('ads.txt', RedirectView.as_view(url=staticfiles_storage.url('ads.txt'))),
]