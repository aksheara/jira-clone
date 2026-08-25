from django.contrib.auth import get_user_model
from rest_framework import generics, permissions, status, viewsets
from rest_framework.authtoken.models import Token
from rest_framework.authtoken.views import ObtainAuthToken
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import EmailVerificationCode, Notification
from .serializers import (
    NotificationSerializer,
    RegisterSerializer,
    UserSerializer,
    UserWithProjectsSerializer,
)
from .utils import generate_otp_code, send_verification_email

User = get_user_model()


class RegisterView(generics.CreateAPIView):
    """POST username/email/password -> creates inactive user + dispatches 6-digit OTP email."""
    queryset = User.objects.all()
    serializer_class = RegisterSerializer
    permission_classes = [permissions.AllowAny]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()

        last_code = (
            EmailVerificationCode.objects.filter(email=user.email, purpose="REGISTRATION", is_used=False)
            .order_by("-created_at")
            .first()
        )

        return Response(
            {
                "require_verification": True,
                "email": user.email,
                "username": user.username,
                "code": last_code.code if last_code else "",
                "detail": f"A 6-digit verification code has been sent to {user.email}.",
            },
            status=status.HTTP_201_CREATED,
        )



class VerifyCodeView(APIView):
    """
    POST email, code, purpose ('REGISTRATION' or 'PASSWORD_RESET')
    Validates 6-digit OTP code and activates user account if purpose is REGISTRATION.
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request, *args, **kwargs):
        email = request.data.get("email", "").strip().lower()
        code = request.data.get("code", "").strip()
        purpose = request.data.get("purpose", "REGISTRATION").strip().upper()

        if not email or not code:
            return Response(
                {"detail": "Email address and 6-digit verification code are required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Lookup matching verification code
        v_code = (
            EmailVerificationCode.objects.filter(
                email__iexact=email,
                code=code,
                purpose=purpose,
                is_used=False,
            )
            .order_by("-created_at")
            .first()
        )

        if not v_code or not v_code.is_valid(expiration_minutes=15):
            return Response(
                {"detail": "Invalid or expired verification code. Please check or request a new code."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if purpose == "REGISTRATION":
            # Activate user account
            user = User.objects.filter(email__iexact=email).first()
            if not user:
                return Response({"detail": "User account not found."}, status=status.HTTP_404_NOT_FOUND)

            user.is_active = True
            user.save()
            v_code.is_used = True
            v_code.save()

            token, _ = Token.objects.get_or_create(user=user)
            return Response(
                {
                    "verified": True,
                    "token": token.key,
                    "user": UserSerializer(user).data,
                    "detail": "Email successfully verified! Welcome to Jira Software.",
                },
                status=status.HTTP_200_OK,
            )

        elif purpose == "PASSWORD_RESET":
            return Response(
                {
                    "verified": True,
                    "detail": "Code verified. You may now enter your new password.",
                },
                status=status.HTTP_200_OK,
            )

        return Response({"detail": "Unsupported purpose."}, status=status.HTTP_400_BAD_REQUEST)


class ResendCodeView(APIView):
    """POST email, purpose -> generates fresh 6-digit OTP code and dispatches email."""
    permission_classes = [permissions.AllowAny]

    def post(self, request, *args, **kwargs):
        email = request.data.get("email", "").strip().lower()
        purpose = request.data.get("purpose", "REGISTRATION").strip().upper()

        if not email:
            return Response({"detail": "Email address is required."}, status=status.HTTP_400_BAD_REQUEST)

        user = User.objects.filter(email__iexact=email).first()
        if not user and purpose == "REGISTRATION":
            return Response({"detail": "No registration found for this email."}, status=status.HTTP_404_NOT_FOUND)
        if not user and purpose == "PASSWORD_RESET":
            return Response({"detail": "No account found with this email."}, status=status.HTTP_404_NOT_FOUND)

        # Invalidate old unused codes
        EmailVerificationCode.objects.filter(email__iexact=email, purpose=purpose, is_used=False).update(is_used=True)

        # Generate fresh code
        code = generate_otp_code(6)
        EmailVerificationCode.objects.create(
            email=email,
            user=user,
            code=code,
            purpose=purpose,
        )
        send_verification_email(
            email=email,
            code=code,
            purpose=purpose,
            username=user.username if user else "",
        )

        return Response(
            {
                "success": True,
                "code": code,
                "detail": f"A new verification code has been dispatched to {email}.",
            },
            status=status.HTTP_200_OK,
        )


class LoginView(ObtainAuthToken):
    """POST username/password -> checks active status & returns auth token + basic user info."""
    def post(self, request, *args, **kwargs):
        serializer = self.serializer_class(data=request.data, context={"request": request})
        
        # Check credentials
        try:
            serializer.is_valid(raise_exception=True)
            user = serializer.validated_data["user"]
        except Exception:
            # Check if user exists but is inactive (unverified email)
            username = request.data.get("username", "").strip()
            user_inactive = User.objects.filter(username__iexact=username, is_active=False).first() or \
                            User.objects.filter(email__iexact=username, is_active=False).first()
            if user_inactive:
                return Response(
                    {
                        "detail": "Your email address has not been verified yet. Please enter the verification code sent to your email.",
                        "email": user_inactive.email,
                        "unverified": True,
                    },
                    status=status.HTTP_403_FORBIDDEN,
                )
            return Response(
                {"detail": "Invalid username or password. Please check your credentials."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not user.is_active:
            return Response(
                {
                    "detail": "Your account is not active. Please verify your email.",
                    "email": user.email,
                    "unverified": True,
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        token, _ = Token.objects.get_or_create(user=user)
        return Response({"token": token.key, "user": UserSerializer(user).data})


class VerifyEmailView(APIView):
    """POST email -> verifies email exists in DB and dispatches a 6-digit password reset OTP."""
    permission_classes = [permissions.AllowAny]

    def post(self, request, *args, **kwargs):
        email_or_username = request.data.get("email", "").strip()
        if not email_or_username:
            return Response(
                {"detail": "Please enter your email or username."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user = (
            User.objects.filter(email__iexact=email_or_username).first()
            or User.objects.filter(username__iexact=email_or_username).first()
        )

        if not user:
            return Response(
                {"detail": "No account found matching this email or username."},
                status=status.HTTP_404_NOT_FOUND,
            )

        # Invalidate old unused reset codes
        EmailVerificationCode.objects.filter(
            email__iexact=user.email,
            purpose="PASSWORD_RESET",
            is_used=False,
        ).update(is_used=True)

        # Generate fresh reset code
        code = generate_otp_code(6)
        EmailVerificationCode.objects.create(
            email=user.email,
            user=user,
            code=code,
            purpose="PASSWORD_RESET",
        )
        send_verification_email(
            email=user.email,
            code=code,
            purpose="PASSWORD_RESET",
            username=user.username,
        )

        return Response(
            {
                "exists": True,
                "username": user.username,
                "email": user.email,
                "code": code,
                "detail": f"A 6-digit password reset code has been sent to {user.email}.",
            },
            status=status.HTTP_200_OK,
        )



class ResetPasswordView(APIView):
    """POST email, code, new_password -> verifies OTP code and updates user password."""
    permission_classes = [permissions.AllowAny]

    def post(self, request, *args, **kwargs):
        email_or_username = request.data.get("email", "").strip()
        code = request.data.get("code", "").strip()
        new_password = request.data.get("new_password", "").strip()

        if not email_or_username or not code or not new_password:
            return Response(
                {"detail": "Email, 6-digit verification code, and new password are required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        is_valid_pwd, pwd_err = validate_password_strength(new_password)
        if not is_valid_pwd:
            return Response(
                {"detail": pwd_err},
                status=status.HTTP_400_BAD_REQUEST,
            )


        user = (
            User.objects.filter(email__iexact=email_or_username).first()
            or User.objects.filter(username__iexact=email_or_username).first()
        )

        if not user:
            return Response(
                {"detail": "No account found with this email or username."},
                status=status.HTTP_404_NOT_FOUND,
            )

        # Validate 6-digit OTP code
        v_code = (
            EmailVerificationCode.objects.filter(
                email__iexact=user.email,
                code=code,
                purpose="PASSWORD_RESET",
                is_used=False,
            )
            .order_by("-created_at")
            .first()
        )

        if not v_code or not v_code.is_valid(expiration_minutes=15):
            return Response(
                {"detail": "Invalid or expired verification code. Please check your email or request a new code."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user.set_password(new_password)
        user.save()

        # Invalidate code & old auth tokens
        v_code.is_used = True
        v_code.save()
        Token.objects.filter(user=user).delete()
        token = Token.objects.create(user=user)

        return Response(
            {
                "success": True,
                "username": user.username,
                "token": token.key,
                "detail": "Password has been successfully updated. You may now log in.",
            },
            status=status.HTTP_200_OK,
        )


class MeView(generics.RetrieveUpdateAPIView):
    """GET / PATCH current logged-in user."""
    serializer_class = UserSerializer

    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        return self.request.user


class UserListView(generics.ListAPIView):
    """GET /api/auth/users/?search= -> search/list all users for teams directory, assignment and member invites."""
    serializer_class = UserWithProjectsSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = User.objects.all().order_by("username")
        query = self.request.query_params.get("search", "").strip()
        if query:
            qs = qs.filter(username__icontains=query) | qs.filter(email__icontains=query)
        return qs


class NotificationViewSet(viewsets.ModelViewSet):
    """CRUD API for user notifications."""
    serializer_class = NotificationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Notification.objects.filter(recipient=self.request.user)

    def perform_create(self, serializer):
        serializer.save(actor=self.request.user)

    @action(detail=False, methods=["post"])
    def mark_all_read(self, request):
        Notification.objects.filter(recipient=request.user, read=False).update(read=True)
        return Response({"status": "all marked as read"})

    @action(detail=False, methods=["delete"])
    def clear_all(self, request):
        Notification.objects.filter(recipient=request.user).delete()
        return Response({"status": "cleared all"})
