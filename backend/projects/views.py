from django.contrib.auth import get_user_model
from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from .models import AutomationRule, Project, ProjectDoc, ProjectMembership
from .permissions import IsProjectMember, IsProjectMemberOrAbove
from .serializers import (
    AutomationRuleSerializer,
    ProjectDocSerializer,
    ProjectMembershipSerializer,
    ProjectSerializer,
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
