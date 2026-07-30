from django.db import models
from django.contrib.gis.db import models as gis_models
from django.contrib.gis.geos import Point
from django.contrib.auth.models import User
from django.utils.translation import gettext_lazy as _

class UserStatus(models.Model):
    class ReportType(models.TextChoices):
        ALL_GOOD = "all_good", _("✅ Todo bien")
        DELAYED = "delayed", _("⏰ Transporte retrasado")
        CROWDED = "crowded", _("👥 Transporte lleno")
        STOLEN = "stolen", _("🚫 Me robaron")
        HARASSED = "harassed", _("😖 Me acosaron")
        BROKEN = "broken", _("🔧 Fallas en el transporte")
        OTHER = "other", _("Otro")

    class EventLocationCategory(models.TextChoices):
        NOT_APPLICABLE = "not_applicable", _("No aplica")
        CABLEBUS = "cablebus", _("Cablebús")
        CONCESIONADOS = "concesionados", _("Transporte Concesionado")
        ECOBICI = "ecobici", _("Ecobici")
        ELECTRICOS = "electricos", _("Trolebús")
        INSURGENTE = "insurgente", _("Tren el Insurgente")
        MEXIBUS = "mexibus", _("Mexibús")
        MEXICABLE = "mexicable", _("Mexicable")
        METRO = "metro", _("Metro")
        METROBUS = "metrobus", _("Metrobús")
        PESEROS = "peseros", _("Peseros")
        RTP = "rtp", _("RTP")
        SUBURBANO = "suburbano", _("Tren Suburbano")
        TREN_LIGERO = "tren_ligero", _("Tren Ligero")
        OTHER = "other", _("Otro")

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='statuses')
    happiness_value = models.IntegerField(help_text=_("Value from 1 to 5"))
    report_type = models.CharField(max_length=100, choices=ReportType.choices)
    location = gis_models.PointField(srid=4326)
    location_address = models.TextField()
    event_location_category = models.CharField(max_length=100, choices=EventLocationCategory.choices)
    message = models.TextField(null=True, blank=True)
    image = models.ImageField(upload_to='status_images/', null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    is_verified = models.BooleanField(default=False)

    def __str__(self):
        return f"{self.user.username}'s status at {self.created_at}"

    class Meta:
        ordering = ['-created_at'] 