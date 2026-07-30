from django.apps import AppConfig
from allauth.account.signals import user_signed_up
from django.dispatch import receiver

@receiver(user_signed_up)
def create_user_profile(request, user, **kwargs):
    from .models import UserDetails
    UserDetails.objects.create(user=user)

class WorldConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'world'

    def ready(self):
        import world.signals  # Import signals when app is ready
        receiver(user_signed_up)(create_user_profile)
