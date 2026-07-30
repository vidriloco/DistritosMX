from django.contrib.gis.db import models
from django.contrib.auth.models import User
from django.utils.translation import gettext_lazy as _

class ContentFlag(models.Model):
    class FlagReason(models.TextChoices):
        BULLYING = "bullying", _("Bullying")
        FRAUD = "fraud", _("Fraud")
        SPAM = "spam", _("Spam")
        ADULT_CONTENT = "adult_content", _("Adult Content")
        HATE_VIOLENCE = "hate_violence", _("Hate/Violence")
        DONT_WANT_TO_SEE = "dont_want_to_see", _("Don't Want to See")
        OTHER = "other", _("Other")

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='content_flags')
    content_id = models.IntegerField()
    content_type = models.CharField(max_length=50)
    flag_reason = models.CharField(max_length=50, choices=FlagReason.choices)
    additional_text = models.TextField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'content_flags'
        indexes = [
            models.Index(fields=['content_id', 'content_type']),
        ]

    def __str__(self):
        return f"{self.user.username} flagged {self.content_type} #{self.content_id} for {self.flag_reason}" 