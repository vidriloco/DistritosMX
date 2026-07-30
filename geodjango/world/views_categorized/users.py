
from django.shortcuts import render, redirect
from django.contrib import messages
from world.models import Line
from world.models import *
from django.contrib.auth.models import User
from django.http import Http404
from django.urls import reverse

def home_page(request):
    if not request.user.is_authenticated:
        messages.error(request, 'Es necesario iniciar sesión para acceder a tu home')
        return redirect(f"{reverse('account_login')}")
    
    user = request.user
    lines = Line.objects.filter(user=user)
    seo_title = user.username
    seo_image = "https://wikiando.mx/static/images/intro-social-media.jpg"
    seo_url = "https://wikiando.mx/home"

    for line in lines:
        if not line.flyer:
            line.flyer = None

    next_url = request.session.get('next')
    if next_url:
        del request.session['next']
        return redirect(next_url)
    
    return render(request, 'users/home.html', { 
        'is_my_home': True,
        'lines': lines, 
        'edit_mode': True, 
        'seo_title': seo_title, 
        'seo_url': seo_url, 
        'seo_image': seo_image
    })

def settings_page(request):
    if not request.user.is_authenticated:
        messages.error(request, 'Es necesario iniciar sesión para acceder a tus ajustes')
        return redirect(f"{reverse('account_login')}")
    
    user = request.user
    user_details, created = UserDetails.objects.get_or_create(user=user)
    user_details_form = UserDetailsForm(instance=user_details)

    seo_title = user.username
    seo_image = "https://wikiando.mx/static/images/intro-social-media.jpg"
    seo_url = "https://wikiando.mx/home"
    
    return render(request, 'users/settings.html', { 
        'user_details_form': user_details_form,
        'seo_title': seo_title, 
        'seo_url': seo_url, 
        'seo_image': seo_image
    })

def update_settings(request):
    if not request.user.is_authenticated:
        messages.error(request, 'Es necesario iniciar sesión para actualizar tus ajustes')
        return redirect(f"{reverse('account_login')}")
    
    if request.method == 'POST':
        user = request.user
        user_details, created = UserDetails.objects.get_or_create(user=user)
        user_details_form = UserDetailsForm(request.POST, request.FILES, instance=user_details)
        
        if user_details_form.is_valid():
            user_details_form.save()
            messages.success(request, 'Los cambios a tu perfil fueron guardados con éxito')
            return redirect('home')
        
        return render(request, 'users/settings.html', { 'user_details_form': user_details_form })

def delete_account(request):
    return render(request, 'users/delete_account.html')

def destroy_account(request):
    if not request.user.is_authenticated:
        messages.error(request, 'Es necesario iniciar sesión para eliminar tu cuenta')
        return redirect(f"{reverse('account_login')}")
    
    user = request.user
    messages.success(request, 'Tu cuenta ha sido eliminada con éxito')
    user.delete()
    return redirect(f"{reverse('account_login')}")

def profile_page(request, username):    

    try:
        user = User.objects.get(username=username)
    except User.DoesNotExist:
        raise Http404("User does not exist")
    
    if user == request.user:
        return redirect('home')

    seo_title = f"Perfil de {username}"
    seo_description = user.user_details.bio
    seo_image = user.user_details.get_user_pic_url()
    seo_url = f"https://wikiando.mx/profile/{username}"

    lines = Line.objects.filter(user=user)

    for line in lines:
        if not line.flyer:
            line.flyer = None
            
    return render(request, 'users/home.html', { 
        'user': user, 'lines': lines, 'seo_title': seo_title, 'seo_description': seo_description, 'seo_image': seo_image, 'seo_url': seo_url
    })