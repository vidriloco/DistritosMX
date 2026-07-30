from django.shortcuts import render
from world.models import *
from world.views_categorized import *
from django.http import JsonResponse

def metrobus_view(request):
    return render(request, 'about.html', { })

def welcome_page(request):
    return render(request, 'welcome.html', { 'is_minified': file_exists_in_directory('all_now.min.js') })

def mobile_welcome_page(request):
    return render(request, 'mobile.html', { 'is_minified': file_exists_in_directory('all_now.min.js') })

def mobile_v2_welcome_page(request):
    return render(request, 'mobile-v2.html', { 'is_minified': file_exists_in_directory('all_now.min.js') })

def mobile_mexibus_welcome_page(request):
    return render(request, 'mobile_mexibus.html', { 'is_minified': file_exists_in_directory('all_now.min.js') })

def about_page(request):
    return render(request, 'about.html', { })

def past_page(request):
    return render(request, 'past.html', { 'is_minified': file_exists_in_directory('all_past.min.js') })

def multiverse_page(request):
    return render(request, 'multiverse.html', { 'is_minified': file_exists_in_directory('all_multiverse.min.js') })

def future_page(request):
    return render(request, 'future.html', { 'is_minified': file_exists_in_directory('all_future.min.js') })

def now_page(request):
    return render(request, 'now.html', { 'is_minified': file_exists_in_directory('all_future.min.js') })

def politicas_page(request):
    return render(request, 'politics.html', { 'is_minified': file_exists_in_directory('all_politics.min.js') })

def privacy_policy_page(request, slug):
    if slug == "es":
        return render(request, 'privacy_policy.html', { })
    else:
        return render(request, 'privacy_policy_en.html', { })

def imaginamos_page(request, filter_mode="recientes"):
    lines = None

    if filter_mode == "recientes":
        lines = Line.objects.filter(mode='published').order_by('-updated_at')
    elif filter_mode == "alfabeticamente":
        lines = Line.objects.filter(mode='published').order_by('route')
    else:
        lines = Line.objects.filter(mode='published')

    for line in lines:
        if not line.flyer:
            line.flyer = None
    
    seo_title = "La red que soñamos"
    seo_description = "Propuestas ciudadanas para mejorar la movilidad de las ciudades en México. La red de transporte público que soñamos."
    seo_keywords = "metrobus, metro, tren ligero, transporte público, movilidad, ciudad, ciudadanía, propuestas, sueños"
    seo_image = "https://wikiando.mx/static/images/intro-social-media.jpg"
    seo_url = "https://wikiando.mx/proponemos"

    return render(request, 'dreams/index.html', { 
        'active_tab': 'citizens', 
        'lines': lines,
        'seo_title': seo_title,
        'seo_description': seo_description,
        'seo_keywords': seo_keywords,
        'seo_image': seo_image,
        'seo_url': seo_url
    })