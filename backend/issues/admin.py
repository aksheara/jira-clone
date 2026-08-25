from django.contrib import admin

from .models import ActivityLog, Comment, Issue, Label


@admin.register(Issue)
class IssueAdmin(admin.ModelAdmin):
    list_display = ["id", "title", "project", "status", "priority", "assignee"]
    list_filter = ["status", "priority", "issue_type", "project"]
    search_fields = ["title", "description"]


admin.site.register(Label)
admin.site.register(Comment)
admin.site.register(ActivityLog)
