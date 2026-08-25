from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    LoginView,
    MeView,
    NotificationViewSet,
    RegisterView,
    ResendCodeView,
    ResetPasswordView,
    UserListView,
    VerifyCodeView,
    VerifyEmailView,
)

router = DefaultRouter()
router.register("notifications", NotificationViewSet, basename="notification")

urlpatterns = [
    path("register/", RegisterView.as_view(), name="register"),
    path("verify-code/", VerifyCodeView.as_view(), name="verify-code"),
    path("resend-code/", ResendCodeView.as_view(), name="resend-code"),
    path("login/", LoginView.as_view(), name="login"),
    path("verify-email/", VerifyEmailView.as_view(), name="verify-email"),
    path("reset-password/", ResetPasswordView.as_view(), name="reset-password"),
    path("me/", MeView.as_view(), name="me"),
    path("users/", UserListView.as_view(), name="user-list"),
    path("", include(router.urls)),
]


