from rest_framework.routers import DefaultRouter

from .views import AutomationRuleViewSet, ProjectDocViewSet, ProjectViewSet

router = DefaultRouter()
router.register("projects", ProjectViewSet, basename="project")
router.register("docs", ProjectDocViewSet, basename="doc")
router.register("automation-rules", AutomationRuleViewSet, basename="automation-rule")

urlpatterns = router.urls
