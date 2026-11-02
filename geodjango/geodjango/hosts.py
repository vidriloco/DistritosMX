from django_hosts import patterns, host

host_patterns = patterns('',
    host('www', 'geodjango.urls', name='www'),
    host('metrobus', 'geodjango.subdomain_urls', name='subdomain'),
    # Opine, the POZMVM consultation, with its own design and its own frontend.
    host('ordena', 'geodjango.ordena_urls', name='ordena'),
    # The despojos de vivienda map, on its own subdomain.
    host('despojos', 'geodjango.despojos_urls', name='despojos'),
)
