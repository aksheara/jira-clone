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
            project_id=issue.project.id,
            issue_id=issue.pk,
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

        # Only ADMINs can set assignee when creating an issue
        assignee_id = serializer.validated_data.get("assignee_id")
        if assignee_id:
            is_admin = project.memberships.filter(
                user=self.request.user, role="ADMIN"
            ).exists()
            if not is_admin:
                raise PermissionDenied("Only project Admins can assign issues to team members.")

        instance = serializer.save(reporter=self.request.user)
        if instance.assignee:
            _notify_assignee(instance, self.request.user)

    def perform_update(self, serializer):
        old_instance = self.get_object()
        old_status = old_instance.status
        old_priority = old_instance.priority
        old_assignee_id = old_instance.assignee_id

        # Block non-admins from changing assignee
        new_assignee_id = serializer.validated_data.get("assignee_id", old_assignee_id)
        if new_assignee_id != old_assignee_id:
            project = old_instance.project
            is_admin = project.memberships.filter(
                user=self.request.user, role="ADMIN"
            ).exists()
            if not is_admin:
                raise PermissionDenied("Only project Admins can assign or reassign issues.")

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
        comment = serializer.save(author=self.request.user)
        # Parse @mentions and notify each mentioned user
        _notify_mentions(comment, self.request.user)


def _notify_mentions(comment, actor):
    """
    Parses @username tokens from comment body.
    For each valid project member found, creates an in-app Notification
    and sends a mention email. Skips the commenter themselves.
    """
    import re as _re
    from django.contrib.auth import get_user_model
    from users.models import Notification
    from users.utils import send_mention_email

    User = get_user_model()
    issue = comment.issue
    issue_key = f"{issue.project.key}-{issue.pk}"

    # Extract all @username tokens (alphanumeric + underscore)
    mentioned_usernames = set(_re.findall(r"@([\w]+)", comment.body))
    if not mentioned_usernames:
        return

    for username in mentioned_usernames:
        user = User.objects.filter(username__iexact=username).first()
        if not user or user == actor:
            continue
        # Only notify if they're a member of the project
        if not issue.project.memberships.filter(user=user).exists():
            continue

        # In-app notification
        Notification.objects.create(
            recipient=user,
            actor=actor,
            action=f"mentioned you in a comment on {issue_key}",
            target=issue.title,
        )

        # Email notification
        if user.email:
            send_mention_email(
                mentioned_email=user.email,
                mentioned_username=user.username,
                mentioned_by=actor.username,
                issue_title=issue.title,
                issue_key=issue_key,
                project_name=issue.project.name,
                comment_body=comment.body,
            )


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
