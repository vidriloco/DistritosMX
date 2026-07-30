from django.utils.translation import gettext_lazy as _
from django.db import models

class Status(models.TextChoices):
    """Status choices for transportation lines."""
    ACTIVE = 'active', _('Active')
    UNDER_CONSTRUCTION = 'under-construction', _('Under Construction')
    PLANNED = 'planned', _('Planned')
    INACTIVE = 'inactive', _('Inactive')

class StationType(models.TextChoices):
    """Types of transportation stations."""
    TERMINAL = 'Terminal', _('Terminal')
    TRANSFER = 'Terminal / Transbordo', _('Terminal / Transfer')
    INTERMEDIATE = 'Intermedia', _('Intermediate') 