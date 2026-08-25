from rest_framework import serializers

from users.serializers import UserSerializer

from .models import AutomationRule, Project, ProjectDoc, ProjectMembership


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


class ProjectSerializer(serializers.ModelSerializer):
    created_by = UserSerializer(read_only=True)
    members = ProjectMembershipSerializer(source="memberships", many=True, read_only=True)
    docs_count = serializers.SerializerMethodField()
    my_role = serializers.SerializerMethodField()

    class Meta:
        model = Project
        fields = ["id", "name", "key", "description", "created_by", "created_at", "members", "docs_count", "my_role"]

    def get_docs_count(self, obj):
        return obj.docs.count()

    def get_my_role(self, obj):
        request = self.context.get("request")
        if not request or not request.user.is_authenticated:
            return None
        membership = obj.memberships.filter(user=request.user).first()
        return membership.role if membership else None
