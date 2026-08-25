from django.conf import settings
from django.db import models


class Project(models.Model):
    """
    A container for issues. Whoever creates the project becomes its
    Owner via the ProjectMembership below.
    """
    name = models.CharField(max_length=200)
    key = models.CharField(max_length=10, unique=True, help_text="Short prefix, e.g. 'WEB' for WEB-123")
    description = models.TextField(blank=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name="created_projects"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.key} - {self.name}"


class ProjectMembership(models.Model):
    class Role(models.TextChoices):
        ADMIN = "ADMIN", "Admin"
        MEMBER = "MEMBER", "Member"
        VIEWER = "VIEWER", "Viewer"

    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name="memberships")
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="project_memberships")
    role = models.CharField(max_length=10, choices=Role.choices, default=Role.MEMBER)
    joined_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("project", "user")

    def __str__(self):
        return f"{self.user} - {self.project} ({self.role})"


class ProjectDoc(models.Model):
    """
    Project documentation files (PRD, Architecture, Retrospectives, Meeting notes).
    """
    class TemplateType(models.TextChoices):
        PRD = "PRD", "Product Requirements (PRD)"
        ARCHITECTURE = "ARCHITECTURE", "Architecture & System Design"
        RETRO = "RETRO", "Sprint Retrospective"
        MEETING = "MEETING", "Meeting Notes & Decisions"
        CUSTOM = "CUSTOM", "Custom Document"

    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name="docs")
    title = models.CharField(max_length=255)
    content = models.TextField(blank=True)
    template_type = models.CharField(max_length=20, choices=TemplateType.choices, default=TemplateType.CUSTOM)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name="created_docs"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-updated_at"]

    def __str__(self):
        return f"[{self.project.key}] {self.title}"


class AutomationRule(models.Model):
    """
    Automated workflow rules for projects.
    """
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name="automation_rules")
    name = models.CharField(max_length=255)
    trigger = models.CharField(max_length=255)
    action = models.CharField(max_length=255)
    enabled = models.BooleanField(default=True)
    execution_count = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["id"]

    def __str__(self):
        return f"{self.name} ({'Enabled' if self.enabled else 'Disabled'})"
