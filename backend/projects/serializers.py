from rest_framework import serializers

from users.serializers import UserSerializer

from .models import AutomationRule, Project, ProjectDoc, ProjectMembership, Sprint, WorkflowState, WorkflowTransition


class ProjectMembershipSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    user_id = serializers.IntegerField(write_only=True)

    class Meta:
        model = ProjectMembership
        fields = ["id", "user", "user_id", "role", "joined_at"]


class ProjectDocSerializer(serializers.ModelSerializer):
    created_by = UserSerializer(read_only=True)

    class Meta:
        model = ProjectDoc
        fields = [
            "id", "project", "title", "content", "template_type",
            "created_by", "created_at", "updated_at"
        ]
        read_only_fields = ["created_by"]


class AutomationRuleSerializer(serializers.ModelSerializer):
    class Meta:
        model = AutomationRule
        fields = [
            "id", "project", "name", "trigger", "action",
            "enabled", "execution_count", "created_at"
        ]


class WorkflowStateSerializer(serializers.ModelSerializer):
    class Meta:
        model = WorkflowState
        fields = ["id", "project", "name", "color", "category", "position", "is_default"]


class WorkflowTransitionSerializer(serializers.ModelSerializer):
    from_state_name = serializers.ReadOnlyField(source="from_state.name")
    to_state_name = serializers.ReadOnlyField(source="to_state.name")

    class Meta:
        model = WorkflowTransition
        fields = ["id", "project", "from_state", "from_state_name", "to_state", "to_state_name"]


class SprintSerializer(serializers.ModelSerializer):
    issues_count = serializers.SerializerMethodField()
    completed_count = serializers.SerializerMethodField()

    class Meta:
        model = Sprint
        fields = [
            "id", "project", "name", "goal", "status",
            "start_date", "end_date", "created_at", "completed_at",
            "issues_count", "completed_count",
        ]
        read_only_fields = ["status", "created_at", "completed_at"]

    def get_issues_count(self, obj):
        return obj.issues.count()

    def get_completed_count(self, obj):
        return obj.issues.filter(status="DONE").count()


class ProjectSerializer(serializers.ModelSerializer):
    created_by = UserSerializer(read_only=True)
    members = ProjectMembershipSerializer(source="memberships", many=True, read_only=True)
    docs_count = serializers.SerializerMethodField()
    my_role = serializers.SerializerMethodField()
    workflow_states = WorkflowStateSerializer(many=True, read_only=True)

    class Meta:
        model = Project
        fields = [
            "id", "name", "key", "description", "created_by", "created_at",
            "members", "docs_count", "my_role", "workflow_states",
        ]

    def get_docs_count(self, obj):
        return obj.docs.count()

    def get_my_role(self, obj):
        request = self.context.get("request")
        if not request or not request.user.is_authenticated:
            return None
        membership = obj.memberships.filter(user=request.user).first()
        return membership.role if membership else None
