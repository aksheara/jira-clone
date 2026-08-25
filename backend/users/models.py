from datetime import timedelta
from django.contrib.auth.models import AbstractUser
from django.db import models
from django.utils import timezone


class User(AbstractUser):
    """
    Custom user model with avatar and job title.
    """
    avatar_url = models.URLField(blank=True, null=True)

    def __str__(self):
        return self.username


class EmailVerificationCode(models.Model):
    """
    6-digit OTP code for registration email verification and password resets.
    """
    PURPOSE_CHOICES = [
        ("REGISTRATION", "Account Registration"),
        ("PASSWORD_RESET", "Password Reset"),
    ]

    email = models.EmailField(db_index=True)
    user = models.ForeignKey(User, on_delete=models.CASCADE, null=True, blank=True, related_name="verification_codes")
    code = models.CharField(max_length=6)
    purpose = models.CharField(max_length=30, choices=PURPOSE_CHOICES, default="REGISTRATION")
    created_at = models.DateTimeField(auto_now_add=True)
    is_used = models.BooleanField(default=False)

    class Meta:
        ordering = ["-created_at"]

    def is_valid(self, expiration_minutes: int = 15) -> bool:
        """Checks if code is unused and within expiration window."""
        if self.is_used:
            return False
        return timezone.now() <= self.created_at + timedelta(minutes=expiration_minutes)

    def __str__(self):
        return f"{self.email} [{self.purpose}] - {self.code}"


class Notification(models.Model):
    """
    User notifications for assignments, mentions, status updates, and system events.
    """
    recipient = models.ForeignKey(User, on_delete=models.CASCADE, related_name="notifications")
    actor = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name="sent_notifications")
    action = models.CharField(max_length=255)
    target = models.CharField(max_length=255)
    read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.recipient.username}: {self.action} on {self.target}"

