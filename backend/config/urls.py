from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path, re_path
from django.views.generic import TemplateView

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/auth/", include("users.urls")),
    path("api/", include("projects.urls")),
    path("api/", include("issues.urls")),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)

# Catch-all route to serve the React Single Page Application (SPA)
urlpatterns += [
    re_path(r'^(?!api/|admin/|media/|static/).*$', TemplateView.as_view(template_name="index.html")),
]
