from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response

from .models import AutomationRule, Project, ProjectDoc, ProjectMembership, Sprint
from .permissions import IsProjectMember, IsProjectMemberOrAbove
from .serializers import (
    AutomationRuleSerializer,
    ProjectDocSerializer,
    ProjectMembershipSerializer,
    ProjectSerializer,
    SprintSerializer,
)

User = get_user_model()


class ProjectViewSet(viewsets.ModelViewSet):
    serializer_class = ProjectSerializer
    permission_classes = [permissions.IsAuthenticated, IsProjectMemberOrAbove]

    def get_queryset(self):
        # A user only ever sees projects they're a member of.
        return Project.objects.filter(memberships__user=self.request.user).distinct()

    def perform_create(self, serializer):
        project = serializer.save(created_by=self.request.user)
        ProjectMembership.objects.create(
            project=project, user=self.request.user, role=ProjectMembership.Role.ADMIN
        )

    @action(detail=True, methods=["post"])
    def add_member(self, request, pk=None):
        """POST {user_id or username/email, role} -> adds or updates user role in this project."""
        project = self.get_object()
        user_id = request.data.get("user_id")
        username = request.data.get("username")
        email = request.data.get("email")
        role = request.data.get("role", ProjectMembership.Role.MEMBER)

        target_user = None
        if user_id:
            target_user = User.objects.filter(id=user_id).first()
        elif username:
            target_user = User.objects.filter(username__iexact=username.strip()).first()
        elif email:
            target_user = User.objects.filter(email__iexact=email.strip()).first()

        if not target_user:
            return Response({"error": "User not found."}, status=status.HTTP_404_NOT_FOUND)

        if role not in [ProjectMembership.Role.ADMIN, ProjectMembership.Role.MEMBER, ProjectMembership.Role.VIEWER]:
            role = ProjectMembership.Role.MEMBER

        membership, _ = ProjectMembership.objects.update_or_create(
            project=project,
            user=target_user,
            defaults={"role": role},
        )
        return Response(ProjectSerializer(project, context={"request": request}).data)

    @action(detail=True, methods=["post"])
    def remove_member(self, request, pk=None):
        """POST {user_id} -> removes user from this project."""
        project = self.get_object()
        user_id = request.data.get("user_id")
        if not user_id:
            return Response({"error": "user_id is required."}, status=status.HTTP_400_BAD_REQUEST)

        ProjectMembership.objects.filter(project=project, user_id=user_id).delete()
        return Response(ProjectSerializer(project, context={"request": request}).data)


class ProjectDocViewSet(viewsets.ModelViewSet):
    """CRUD API for project documentation pages."""
    serializer_class = ProjectDocSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        project_id = self.request.query_params.get("project")
        qs = ProjectDoc.objects.all()
        if project_id:
            qs = qs.filter(project_id=project_id)
        return qs

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)


class AutomationRuleViewSet(viewsets.ModelViewSet):
    """CRUD API for project automation rules."""
    serializer_class = AutomationRuleSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        project_id = self.request.query_params.get("project")
        qs = AutomationRule.objects.all()
        if project_id:
            qs = qs.filter(project_id=project_id)
        return qs


class SprintViewSet(viewsets.ModelViewSet):
    """
    CRUD + start/complete actions for sprints.
    GET    /api/sprints/?project=<id>  — list sprints for a project
    POST   /api/sprints/               — create a planned sprint
    PATCH  /api/sprints/<id>/          — edit name/goal/dates
    POST   /api/sprints/<id>/start/    — activate sprint (only one active per project)
    POST   /api/sprints/<id>/complete/ — complete sprint, optionally move unfinished issues to backlog
    DELETE /api/sprints/<id>/          — delete a PLANNED sprint
    """
    serializer_class = SprintSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = Sprint.objects.filter(
            project__memberships__user=self.request.user
        ).distinct()
        project_id = self.request.query_params.get("project")
        if project_id:
            qs = qs.filter(project_id=project_id)
        return qs

    def perform_create(self, serializer):
        project = serializer.validated_data["project"]
        if not project.memberships.filter(user=self.request.user).exists():
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("You are not a member of this project.")
        serializer.save()

    def perform_destroy(self, instance):
        if instance.status != Sprint.Status.PLANNED:
            raise ValidationError("Only planned sprints can be deleted.")
        # Move issues back to backlog
        instance.issues.all().update(sprint=None)
        instance.delete()

    @action(detail=True, methods=["post"])
    def start(self, request, pk=None):
        """Activate this sprint. Fails if another sprint is already active in the project."""
        sprint = self.get_object()
        if sprint.status != Sprint.Status.PLANNED:
            return Response(
                {"detail": f"Only PLANNED sprints can be started. This sprint is {sprint.status}."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        already_active = Sprint.objects.filter(
            project=sprint.project, status=Sprint.Status.ACTIVE
        ).exclude(pk=sprint.pk).exists()
        if already_active:
            return Response(
                {"detail": "Another sprint is already active in this project. Complete it before starting a new one."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        sprint.status = Sprint.Status.ACTIVE
        if not sprint.start_date:
            sprint.start_date = timezone.now().date()
        sprint.save()
        return Response(SprintSerializer(sprint).data)

    @action(detail=True, methods=["post"])
    def complete(self, request, pk=None):
        """
        Complete this sprint.
        Unfinished issues (not DONE) are moved back to backlog (sprint=None)
        unless move_to_sprint_id is provided to re-assign them to another sprint.
        """
        sprint = self.get_object()
        if sprint.status != Sprint.Status.ACTIVE:
            return Response(
                {"detail": "Only ACTIVE sprints can be completed."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        move_to_sprint_id = request.data.get("move_to_sprint_id")
        unfinished = sprint.issues.exclude(status="DONE")

        if move_to_sprint_id:
            target = Sprint.objects.filter(
                pk=move_to_sprint_id, project=sprint.project
            ).first()
            if not target:
                return Response(
                    {"detail": "Target sprint not found in this project."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            unfinished.update(sprint=target)
        else:
            unfinished.update(sprint=None)

        sprint.status = Sprint.Status.COMPLETED
        sprint.completed_at = timezone.now()
        if not sprint.end_date:
            sprint.end_date = timezone.now().date()
        sprint.save()

        return Response({
            **SprintSerializer(sprint).data,
            "moved_to_backlog": unfinished.count() if not move_to_sprint_id else 0,
        })
