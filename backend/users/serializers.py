from django.contrib.auth import get_user_model
from rest_framework import serializers

from .models import EmailVerificationCode, Notification
from .utils import (
    generate_otp_code,
    send_verification_email,
    validate_email_deliverability,
    validate_password_strength,
)

User = get_user_model()


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["id", "username", "email", "first_name", "last_name", "avatar_url"]


class UserWithProjectsSerializer(serializers.ModelSerializer):
    projects_count = serializers.SerializerMethodField()
    assigned_issues_count = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            "id", "username", "email", "first_name", "last_name", "avatar_url",
            "projects_count", "assigned_issues_count", "date_joined"
        ]

    def get_projects_count(self, obj):
        return obj.project_memberships.count()

    def get_assigned_issues_count(self, obj):
        return getattr(obj, "assigned_issues", []).count() if hasattr(obj, "assigned_issues") else 0


class RegisterSerializer(serializers.ModelSerializer):
    email = serializers.EmailField(required=True, allow_blank=False)
    password = serializers.CharField(write_only=True, min_length=8)

    class Meta:
        model = User
        fields = ["id", "email", "password", "first_name", "last_name"]

    def validate_email(self, value):
        email = value.strip().lower()
        if not email:
            raise serializers.ValidationError("Email address is required.")

        # 1. Format & Deliverability / Disposable domain validation
        is_valid, err_msg = validate_email_deliverability(email)
        if not is_valid:
            raise serializers.ValidationError(err_msg)

        # 2. Check duplicate email in database
        if User.objects.filter(email__iexact=email).exists():
            raise serializers.ValidationError(
                "An account with this email address already exists. Please log in or use a different email."
            )
        return email

    def validate_password(self, value):
        is_valid, err_msg = validate_password_strength(value)
        if not is_valid:
            raise serializers.ValidationError(err_msg)
        return value

    def _generate_unique_username(self, email: str) -> str:
        """Derives a unique username from the email local part."""
        import re
        base = re.sub(r"[^a-z0-9_]", "_", email.split("@")[0].lower())
        username = base
        counter = 1
        while User.objects.filter(username__iexact=username).exists():
            username = f"{base}_{counter}"
            counter += 1
        return username

    def create(self, validated_data):
        email = validated_data["email"]
        username = self._generate_unique_username(email)

        # Create user in pending/inactive state until email is verified
        user = User.objects.create_user(
            username=username,
            email=email,
            password=validated_data["password"],
            first_name=validated_data.get("first_name", ""),
            last_name=validated_data.get("last_name", ""),
            is_active=False,
        )

        # Generate 6-digit OTP code & dispatch email
        code = generate_otp_code(6)
        EmailVerificationCode.objects.create(
            email=user.email,
            user=user,
            code=code,
            purpose="REGISTRATION",
        )
        send_verification_email(
            email=user.email,
            code=code,
            purpose="REGISTRATION",
            username=user.username,
        )

        return user




class NotificationSerializer(serializers.ModelSerializer):
    actor = UserSerializer(read_only=True)

    class Meta:
        model = Notification
        fields = ["id", "recipient", "actor", "action", "target", "read", "created_at"]
        read_only_fields = ["recipient"]
