from django.contrib.gis.db import models
from django.utils.translation import gettext_lazy as _
from django.contrib.auth.models import User

class Voting(models.Model):
    """Model for tracking votes on different content types."""
    
    reference_table_id = models.IntegerField(
        verbose_name=_('Reference Table ID'),
        help_text=_('ID of the content being voted on')
    )
    
    reference_table_type = models.CharField(
        max_length=50,
        verbose_name=_('Reference Table Type'),
        default='StationReview',
        help_text=_('Type of content being voted on (e.g., StationReview)')
    )
    
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        verbose_name=_('User'),
        help_text=_('User who cast the vote')
    )
    
    is_positive = models.BooleanField(
        verbose_name=_('Is Positive'),
        help_text=_('Whether the vote is positive (upvote) or negative (downvote)')
    )
    
    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name=_('Created At'),
        help_text=_('When the vote was cast')
    )

    class Meta:
        unique_together = ('reference_table_id', 'reference_table_type', 'user')
        indexes = [
            models.Index(fields=['reference_table_id', 'reference_table_type']),
            models.Index(fields=['user']),
        ]

    def __str__(self):
        vote_type = "upvote" if self.is_positive else "downvote"
        return f"{self.user.username} {vote_type} on {self.reference_table_type} {self.reference_table_id}" 