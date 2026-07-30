from django.contrib.auth.models import User
from django.contrib.gis.db import models
from .user_funny_pic import UserFunnyPic
from .avatar import Avatar
from django import forms
from django.forms import TextInput, Textarea, FileInput
from django.utils.translation import gettext_lazy as _
import random

class UserDetails(models.Model):
    GENDER_CHOICES = [
        ('M', 'Masculine'),
        ('F', 'Feminine'),
        ('O', 'Other'),
    ]
        
    bio = models.TextField(blank=True, null=True)
    twitter = models.URLField(blank=True, null=True)
    facebook = models.URLField(blank=True, null=True)
    youtube = models.URLField(blank=True, null=True)
    instagram = models.URLField(blank=True, null=True)
    tiktok = models.URLField(blank=True, null=True)
    website = models.URLField(blank=True, null=True)
    picture = models.FileField(upload_to='user_details/', blank=True, null=True)
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='user_details')
    default_picture = models.ForeignKey(UserFunnyPic, on_delete=models.SET_NULL, blank=True, null=True)
    default_avatar = models.ForeignKey(Avatar, on_delete=models.SET_NULL, blank=True, null=True)
    session_key = models.CharField(max_length=40, blank=True, null=True)
    date_of_birth = models.DateField(blank=True, null=True)
    gender = models.CharField(max_length=1, choices=GENDER_CHOICES, blank=True, null=True)
    
    def generate_new_session_key(self):
        self.session_key = User.objects.make_random_password(length=40)
        self.save()

    def has_valid_session_key(self):
        return self.session_key is not None and len(self.session_key) == 40

    def save(self, *args, **kwargs):
        if not self.default_picture and not self.picture:
            self.default_picture = UserFunnyPic.objects.order_by('?').first()
        if not self.default_avatar:
            self.default_avatar = Avatar.objects.order_by('?').first()
        super().save(*args, **kwargs)

    def get_user_pic_url(self):
        if self.picture:
            return self.picture.url
        if self.default_picture:
            return self.default_picture.get_user_pic_url()
        return None
    
    def get_user_avatar_url(self):
        if self.default_avatar:
            return self.default_avatar.get_avatar_url()
        return None
    
class UserDetailsForm(forms.ModelForm):

    class Meta:
        def user_directory_path(instance, filename):
            return "users/{0}-{1}".format(random.randint(1000, 9999), filename)
        
        model = UserDetails
        fields = ['bio', 'twitter', 'facebook', 'youtube', 'instagram', 'tiktok', 'website', 'picture']
        widgets = { 
            'bio': Textarea(attrs={
                'class': "form-control",
                'style': 'max-width: 100%; height: 60px;',
                'placeholder': 'Comparte algo sobre ti ...'
            }),
            'twitter': TextInput(attrs={
                'class': "form-control",
                'style': 'max-width: 100%;',
                'placeholder': 'Link a tu cuenta de X'
            }),
            'facebook': TextInput(attrs={
                'class': "form-control",
                'style': 'max-width: 100%;',
                'placeholder': 'Link a tu cuenta de Facebook'
            }),
            'youtube': TextInput(attrs={
                'class': "form-control",
                'style': 'max-width: 100%;',
                'placeholder': 'Link a tu cuenta de Youtube'
            }),
            'instagram': TextInput(attrs={
                'class': "form-control",
                'style': 'max-width: 100%;',
                'placeholder': 'Link a tu cuenta de Instagram'
            }),
            'tiktok': TextInput(attrs={
                'class': "form-control",
                'style': 'max-width: 100%;',
                'placeholder': 'Link a tu cuenta de Tiktok'
            }),
            'website': TextInput(attrs={
                'class': "form-control",
                'style': 'max-width: 100%;',
                'placeholder': 'Link a tu sitio web'
            }),
            'picture': FileInput(attrs={
                'class': "form-control"
            })
        }

        def clean(self):
            cleaned_data = super().clean()
            url_fields = ['twitter', 'facebook', 'youtube', 'instagram', 'tiktok', 'website']
            for field in url_fields:
                url = cleaned_data.get(field)
                if url and not forms.URLField().clean(url):
                    self.add_error(field, _('Enter a valid URL.'))
            return cleaned_data

        labels = {
            'bio': _('Bio'),
            'twitter': _('X'),
            'website': _('Sitio web'),
            'picture': _('Foto')
        }

        

