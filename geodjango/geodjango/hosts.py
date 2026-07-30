from django_hosts import patterns, host

host_patterns = patterns('',
    host('www', 'geodjango.urls', name='www'),
    host('metrobus', 'geodjango.subdomain_urls', name='subdomain'),
)