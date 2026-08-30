from rest_framework import permissions, viewsets
from rest_framework.exceptions import PermissionDenied
from rest_framework.parsers import FormParser, MultiPartParser

from projects.models import ProjectMembership
from projects.permissions import IsProjectMemberOrAbove
from users.models import Notification
from users.utils import send_assignment_email, send_notification_email

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
    Notifies the assignee when an issue is assigned to them.
    Rules:
    - Never notify if the assignee is the same person doing the assigning (self-assign)
    - Sends one email with full issue card + why-footer (assignee reason)
    """
    assignee = issue.assignee
    if not assignee:
        return
    # Rule 1: Never notify about your own action
    if assignee == assigned_by_user:
        return

    issue_key = f"{issue.project.key}-{issue.pk}"

    # In-app notification
    Notification.objects.create(
        recipient=assignee,
        actor=assigned_by_user,
        action=f"assigned you to issue {issue_key}",
        target=issue.title,
    )

    # Email — uses shared template with full issue card
    if assignee.email:
        send_notification_email(
            recipient_email=assignee.email,
            recipient_username=assignee.username,
            actor=assigned_by_user.username,
            action="assigned you to",
            issue_key=issue_key,
            issue_title=issue.title,
            project_name=issue.project.name,
            project_id=issue.project.id,
            issue_id=issue.pk,
            why_reason="assignee",
            issue_type=issue.issue_type,
            issue_priority=issue.priority,
            issue_status=issue.status,
            issue_reporter=issue.reporter.username if issue.reporter else None,
            issue_assignee=assignee.username,
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
        try:
            if instance.assignee:
                _notify_assignee(instance, self.request.user)
        except Exception as e:
            print(f"[Assignment notification error]: {e}")

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
            try:
                if instance.assignee:
                    _notify_assignee(instance, self.request.user)
            except Exception as e:
                print(f"[Assignment notification error]: {e}")


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
        # Wrapped in try/except so email failures never break comment saving
        try:
            _notify_on_comment(comment, self.request.user)
        except Exception as e:
            print(f"[Comment notification error]: {e}")


def _notify_on_comment(comment, commenter):
    """
    Dual notification on every new comment — matching real Jira's behaviour.

    Rules:
    1. Never notify the commenter about their own comment
    2. Assignee + reporter are default recipients on every comment
    3. @mentions add extra recipients from project members
    4. DEDUP — if someone qualifies under multiple reasons, send ONE email
       with the most relevant reason (mention > assignee > reporter)
    5. Shared send_notification_email() template with comment block + why-footer
    """
    import re as _re
    from django.contrib.auth import get_user_model
    from users.models import Notification
    from users.utils import send_notification_email

    User = get_user_model()
    issue = comment.issue
    issue_key = f"{issue.project.key}-{issue.pk}"

    # Common issue card data passed to every email
    issue_card = dict(
        issue_key=issue_key,
        issue_title=issue.title,
        project_name=issue.project.name,
        project_id=issue.project.id,
        issue_id=issue.pk,
        comment_body=comment.body,
        issue_type=issue.issue_type,
        issue_priority=issue.priority,
        issue_status=issue.status,
        issue_reporter=issue.reporter.username if issue.reporter else None,
        issue_assignee=issue.assignee.username if issue.assignee else None,
    )

    # ── Step 1: Parse @mentions ──
    mentioned_usernames = set(_re.findall(r"@([\w]+)", comment.body))
    mention_set = set()
    for username in mentioned_usernames:
        user = User.objects.filter(username__iexact=username).first()
        if not user or user == commenter:
            continue
        if not issue.project.memberships.filter(user=user).exists():
            continue
        mention_set.add(user)

    # ── Step 2: Build recipient map {user → highest_reason} ──
    # Priority order: mention > assignee > reporter
    recipient_reasons = {}

    # Reporter (lowest priority)
    if issue.reporter and issue.reporter != commenter:
        recipient_reasons[issue.reporter] = "reporter"

    # Assignee (overrides reporter)
    if issue.assignee and issue.assignee != commenter:
        recipient_reasons[issue.assignee] = "assignee"

    # Mention (highest priority — overrides both)
    for user in mention_set:
        recipient_reasons[user] = "mention"

    # ── Step 3: Send one notification per recipient (deduplicated) ──
    for recipient, reason in recipient_reasons.items():

        # In-app notification
        action_text = {
            "assignee": f"commented on issue {issue_key}",
            "reporter":  f"commented on issue {issue_key}",
            "mention":   f"mentioned you in a comment on {issue_key}",
        }[reason]

        Notification.objects.create(
            recipient=recipient,
            actor=commenter,
            action=action_text,
            target=issue.title,
        )

        # Email — one email per recipient, correct why-footer
        if recipient.email:
            action_label = {
                "assignee": "commented on",
                "reporter":  "commented on",
                "mention":   "mentioned you in a comment on",
            }[reason]

            send_notification_email(
                recipient_email=recipient.email,
                recipient_username=recipient.username,
                actor=commenter.username,
                actor_email=commenter.email,
                action=action_label,
                why_reason=reason,
                **issue_card,
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
