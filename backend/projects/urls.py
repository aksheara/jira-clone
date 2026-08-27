from rest_framework.routers import DefaultRouter

from .views import (
    AutomationRuleViewSet,
    ProjectDocViewSet,
    ProjectViewSet,
    SprintViewSet,
    WorkflowStateViewSet,
    WorkflowTransitionViewSet,
)

router = DefaultRouter()
router.register("projects", ProjectViewSet, basename="project")
router.register("docs", ProjectDocViewSet, basename="doc")
router.register("automation-rules", AutomationRuleViewSet, basename="automation-rule")
router.register("sprints", SprintViewSet, basename="sprint")
router.register("workflow-states", WorkflowStateViewSet, basename="workflow-state")
router.register("workflow-transitions", WorkflowTransitionViewSet, basename="workflow-transition")

urlpatterns = router.urls
