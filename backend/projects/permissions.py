from rest_framework import permissions

from .models import ProjectMembership


class IsProjectMember(permissions.BasePermission):
    """
    Visibility rule: you must be a member of the project (any role) to
    see it or anything inside it. This is the ONE gate for visibility —
    matches how real Jira works (project membership, not org hierarchy).
    """

    def has_object_permission(self, request, view, obj):
        project = obj if hasattr(obj, "memberships") else obj.project
        return project.memberships.filter(user=request.user).exists()


class IsProjectMemberOrAbove(permissions.BasePermission):
    """
    Action rule: Member or Admin role required to create/edit issues.
    Viewers are read-only.
    """

    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return True
        project_id = request.data.get("project") or view.kwargs.get("project_pk")
        if not project_id:
            return True  # fall back to object-level check
        return ProjectMembership.objects.filter(
            project_id=project_id, user=request.user
        ).exclude(role=ProjectMembership.Role.VIEWER).exists()

    def has_object_permission(self, request, view, obj):
        if request.method in permissions.SAFE_METHODS:
            return True
        # Handle Comment objects which have obj.issue.project
        if hasattr(obj, "issue"):
            project = obj.issue.project
        elif hasattr(obj, "memberships"):
            project = obj
        else:
            project = obj.project
        return project.memberships.filter(
            user=request.user
        ).exclude(role=ProjectMembership.Role.VIEWER).exists()
