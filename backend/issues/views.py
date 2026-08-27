from rest_framework import permissions, viewsets
from rest_framework.exceptions import PermissionDenied
from rest_framework.parsers import FormParser, MultiPartParser

from projects.models import ProjectMembership
from projects.permissions import IsProjectMemberOrAbove
from users.models import Notification
from users.utils import send_assignment_email

from .models import ActivityLog, Comment, Issue, IssueAttachment, Label
from .serializers import (
    ActivityLogSerializer,
    AttachmentSerializer,
    CommentSerializer,
    IssueListSerializer,
    IssueSerializer,
    LabelSerializer,
)

TRACKED_FIELDS = ["status", "priority", "assignee_id"]


def _notify_assignee(issue, assigned_by_user):
    """
    Creates an in-app Notification row and sends an assignment email
    to the issue's current assignee. Safe to call — silently skips
    if assignee has no email or is the same person doing the assigning.
    """
    assignee = issue.assignee
    if not assignee:
        return
    # Don't notify if someone assigned themselves
    if assignee == assigned_by_user:
        return

    issue_key = f"{issue.project.key}-{issue.pk}"

    # 1. In-app notification
    Notification.objects.create(
        recipient=assignee,
        actor=assigned_by_user,
        action=f"assigned you to issue {issue_key}",
        target=issue.title,
    )

    # 2. Email notification (non-blocking — errors are logged, not raised)
    if assignee.email:
        send_assignment_email(
            assignee_email=assignee.email,
            assignee_username=assignee.username,
            issue_title=issue.title,
            issue_key=issue_key,
            project_name=issue.project.name,
            assigned_by=assigned_by_user.username,
        )


class IssueViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated, IsProjectMemberOrAbove]

    def get_queryset(self):
        # Visibility: only issues in projects the user is a member of.
        # Optional query params for filtering: ?status=, ?assignee=, ?priority=, ?project=
        qs = Issue.objects.filter(project__memberships__user=self.request.user).distinct()
        params = self.request.query_params
        if params.get("project"):
            qs = qs.filter(project_id=params["project"])
        if params.get("status"):
            qs = qs.filter(status=params["status"])
        if params.get("assignee"):
            qs = qs.filter(assignee_id=params["assignee"])
        if params.get("priority"):
            qs = qs.filter(priority=params["priority"])
        if params.get("label"):
            qs = qs.filter(labels__id=params["label"])
        return qs

    def get_serializer_class(self):
        if self.action == "list":
            return IssueListSerializer
        return IssueSerializer

    def perform_create(self, serializer):
        project = serializer.validated_data["project"]
        if not project.memberships.filter(user=self.request.user).exists():
            raise PermissionDenied("You are not a member of this project.")
        instance = serializer.save(reporter=self.request.user)
        # Notify assignee if one was set at creation time
        if instance.assignee:
            _notify_assignee(instance, self.request.user)

    def perform_update(self, serializer):
        old_instance = self.get_object()
        old_status = old_instance.status
        old_priority = old_instance.priority
        old_assignee_id = old_instance.assignee_id

        instance = serializer.save()

        # Write activity log entries for fields that actually changed
        if old_status != instance.status:
            ActivityLog.objects.create(
                issue=instance, actor=self.request.user, field_changed="status",
                old_value=old_status, new_value=instance.status,
            )
        if old_priority != instance.priority:
            ActivityLog.objects.create(
                issue=instance, actor=self.request.user, field_changed="priority",
                old_value=old_priority, new_value=instance.priority,
            )
        if old_assignee_id != instance.assignee_id:
            ActivityLog.objects.create(
                issue=instance, actor=self.request.user, field_changed="assignee",
                old_value=str(old_assignee_id or ""),
                new_value=str(instance.assignee_id or ""),
            )
            # Notify the new assignee (in-app + email)
            if instance.assignee:
                _notify_assignee(instance, self.request.user)


class CommentViewSet(viewsets.ModelViewSet):
    serializer_class = CommentSerializer
    permission_classes = [permissions.IsAuthenticated, IsProjectMemberOrAbove]

    def get_queryset(self):
        return Comment.objects.filter(issue__project__memberships__user=self.request.user).distinct()

    def perform_create(self, serializer):
        issue = serializer.validated_data["issue"]
        if not issue.project.memberships.filter(user=self.request.user).exists():
            raise PermissionDenied("You are not a member of this project.")
        serializer.save(author=self.request.user)


class LabelViewSet(viewsets.ModelViewSet):
    queryset = Label.objects.all()
    serializer_class = LabelSerializer
    permission_classes = [permissions.IsAuthenticated]


class AttachmentViewSet(viewsets.ModelViewSet):
    serializer_class = AttachmentSerializer
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]
    http_method_names = ["get", "post", "delete", "head", "options"]

    def get_queryset(self):
        qs = IssueAttachment.objects.filter(
            issue__project__memberships__user=self.request.user
        ).distinct()
        issue_id = self.request.query_params.get("issue")
        if issue_id:
            qs = qs.filter(issue_id=issue_id)
        return qs

    def perform_create(self, serializer):
        issue = serializer.validated_data["issue"]
        if not issue.project.memberships.filter(user=self.request.user).exists():
            raise PermissionDenied("You are not a member of this project.")
        serializer.save(uploaded_by=self.request.user)

    def perform_destroy(self, instance):
        # Only uploader or reporter can delete
        if instance.uploaded_by != self.request.user and instance.issue.reporter != self.request.user:
            raise PermissionDenied("You can only delete your own attachments.")
        instance.file.delete(save=False)  # remove file from disk
        instance.delete()
