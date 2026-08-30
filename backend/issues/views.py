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

    def perform_destroy(self, instance):
        """Reporter or Admin can delete an issue — matching real Jira."""
        from projects.models import ProjectMembership
        user = self.request.user
        is_reporter = instance.reporter == user
        is_admin = instance.project.memberships.filter(
            user=user, role=ProjectMembership.Role.ADMIN
        ).exists()
        if not (is_reporter or is_admin):
            raise PermissionDenied("Only the issue reporter or a project Admin can delete this issue.")

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

        # Only ADMINs can assign to others when creating — Members can self-assign
        if "assignee_id" in self.request.data and self.request.data["assignee_id"]:
            is_admin = project.memberships.filter(
                user=self.request.user, role="ADMIN"
            ).exists()
            is_self = str(self.request.data["assignee_id"]) == str(self.request.user.id)
            if not is_admin and not is_self:
                raise PermissionDenied("Members can only assign issues to themselves.")

        instance = serializer.save(reporter=self.request.user)
        if instance.assignee:
            _notify_assignee(instance, self.request.user)

    def perform_update(self, serializer):
        old_instance = self.get_object()
        old_status = old_instance.status
        old_priority = old_instance.priority
        old_assignee_id = old_instance.assignee_id

        # Block non-admins from changing assignee — but allow Members to self-assign
        if "assignee_id" in self.request.data:
            new_assignee_id = serializer.validated_data.get("assignee_id")
            if new_assignee_id != old_assignee_id:
                project = old_instance.project
                is_admin = project.memberships.filter(
                    user=self.request.user, role="ADMIN"
                ).exists()
                is_self_assign = (new_assignee_id == self.request.user.id) or (new_assignee_id is None and old_assignee_id == self.request.user.id)
                if not is_admin and not is_self_assign:
                    raise PermissionDenied("Members can only assign issues to themselves. Only Admins can assign to others.")

        # Block non-admins from changing status unless they are the assignee
        if "status" in self.request.data:
            new_status = self.request.data.get("status")
            if new_status != old_instance.status:
                project = old_instance.project
                is_admin = project.memberships.filter(
                    user=self.request.user, role="ADMIN"
                ).exists()
                is_assignee = old_instance.assignee == self.request.user
                if not is_admin and not is_assignee:
                    raise PermissionDenied("Only the assignee or an Admin can change the status of this issue.")

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
        # Notify assignee + reporter + @mentioned members
        _notify_on_comment(comment, self.request.user)


def _notify_on_comment(comment, commenter):
    """
    Dual notification on every new comment — matching real Jira's behaviour:

    1. DEFAULT recipients  — assignee + reporter get notified on every comment
    2. @MENTION recipients — any @username found in the comment body that maps
       to a valid project member gets an additional MENTION notification

    The commenter is always excluded from both lists.
    """
    import re as _re
    from django.contrib.auth import get_user_model
    from users.models import Notification
    from users.utils import send_comment_email

    User = get_user_model()
    issue = comment.issue
    issue_key = f"{issue.project.key}-{issue.pk}"

    # ── Build default recipient set (assignee + reporter) ──
    default_recipients = set()
    if issue.assignee and issue.assignee != commenter:
        default_recipients.add(issue.assignee)
    if issue.reporter and issue.reporter != commenter:
        default_recipients.add(issue.reporter)

    # ── Parse @mentions from comment body ──
    mentioned_usernames = set(_re.findall(r"@([\w]+)", comment.body))
    mention_recipients = set()
    for username in mentioned_usernames:
        user = User.objects.filter(username__iexact=username).first()
        if not user or user == commenter:
            continue
        if not issue.project.memberships.filter(user=user).exists():
            continue
        mention_recipients.add(user)

    # ── Notify default recipients ──
    for recipient in default_recipients:
        Notification.objects.create(
            recipient=recipient,
            actor=commenter,
            action=f"commented on issue {issue_key}",
            target=issue.title,
        )
        if recipient.email:
            send_comment_email(
                recipient_email=recipient.email,
                recipient_username=recipient.username,
                commenter=commenter.username,
                issue_title=issue.title,
                issue_key=issue_key,
                project_name=issue.project.name,
                comment_body=comment.body,
                is_mention=False,
                project_id=issue.project.id,
                issue_id=issue.pk,
            )

    # ── Notify @mention recipients (skip if already notified as default) ──
    for recipient in mention_recipients - default_recipients:
        Notification.objects.create(
            recipient=recipient,
            actor=commenter,
            action=f"mentioned you in a comment on {issue_key}",
            target=issue.title,
        )
        if recipient.email:
            send_comment_email(
                recipient_email=recipient.email,
                recipient_username=recipient.username,
                commenter=commenter.username,
                issue_title=issue.title,
                issue_key=issue_key,
                project_name=issue.project.name,
                comment_body=comment.body,
                is_mention=True,
                project_id=issue.project.id,
                issue_id=issue.pk,
            )

    # ── If someone is both default + mentioned, send a combined notification ──
    for recipient in default_recipients & mention_recipients:
        # Already sent default email above; add a mention in-app notification too
        Notification.objects.create(
            recipient=recipient,
            actor=commenter,
            action=f"mentioned you in a comment on {issue_key}",
            target=issue.title,
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
