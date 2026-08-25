from rest_framework import serializers

from users.serializers import UserSerializer

from .models import ActivityLog, Comment, Issue, Label


class LabelSerializer(serializers.ModelSerializer):
    class Meta:
        model = Label
        fields = ["id", "name", "color"]


class CommentSerializer(serializers.ModelSerializer):
    author = UserSerializer(read_only=True)

    class Meta:
        model = Comment
        fields = ["id", "issue", "author", "body", "created_at", "updated_at"]
        read_only_fields = ["author"]


class ActivityLogSerializer(serializers.ModelSerializer):
    actor = UserSerializer(read_only=True)

    class Meta:
        model = ActivityLog
        fields = ["id", "actor", "field_changed", "old_value", "new_value", "created_at"]


class IssueSerializer(serializers.ModelSerializer):
    reporter = UserSerializer(read_only=True)
    assignee = UserSerializer(read_only=True)
    assignee_id = serializers.IntegerField(write_only=True, required=False, allow_null=True)
    labels = LabelSerializer(many=True, read_only=True)
    label_ids = serializers.PrimaryKeyRelatedField(
        source="labels", queryset=Label.objects.all(), many=True, write_only=True, required=False
    )
    comments = CommentSerializer(many=True, read_only=True)
    activity_log = ActivityLogSerializer(many=True, read_only=True)
    parent_title = serializers.ReadOnlyField(source="parent.title")
    subtasks = serializers.SerializerMethodField()

    class Meta:
        model = Issue
        fields = [
            "id", "project", "parent", "parent_title", "title", "description", "issue_type",
            "status", "priority", "reporter", "assignee", "assignee_id",
            "labels", "label_ids", "comments", "activity_log", "resolution", "subtasks",
            "figma_url", "github_pr", "due_date",
            "created_at", "updated_at",
        ]
        read_only_fields = ["reporter"]

    def get_subtasks(self, obj):
        return IssueListSerializer(obj.subtasks.all(), many=True).data


class IssueListSerializer(serializers.ModelSerializer):
    """Serializer for board/list views with reporter, parent, resolution."""
    reporter = UserSerializer(read_only=True)
    assignee = UserSerializer(read_only=True)
    labels = LabelSerializer(many=True, read_only=True)
    parent_title = serializers.ReadOnlyField(source="parent.title")
    subtasks_count = serializers.SerializerMethodField()

    class Meta:
        model = Issue
        fields = [
            "id", "project", "parent", "parent_title", "title", "description",
            "issue_type", "status", "priority", "reporter", "assignee", "labels",
            "resolution", "subtasks_count", "figma_url", "github_pr", "due_date",
            "created_at", "updated_at"
        ]

    def get_subtasks_count(self, obj):
        return obj.subtasks.count()
