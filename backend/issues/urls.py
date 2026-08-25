from rest_framework.routers import DefaultRouter

from .views import CommentViewSet, IssueViewSet, LabelViewSet

router = DefaultRouter()
router.register("issues", IssueViewSet, basename="issue")
router.register("comments", CommentViewSet, basename="comment")
router.register("labels", LabelViewSet, basename="label")

urlpatterns = router.urls
