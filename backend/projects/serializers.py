from rest_framework import serializers
from .models import Project , Invitation
from users.serializers import UserSerializer   # you must have this UserSerializer
class ProjectSerializer(serializers.ModelSerializer):
    total_tasks = serializers.SerializerMethodField()
    completed_tasks = serializers.SerializerMethodField()
    members_detail = serializers.SerializerMethodField()
    class Meta:
        model = Project
        fields = '__all__'
        read_only_fields = ['owner', 'created_at', 'updated_at']
        
        
    def get_total_tasks(self, obj):
        return getattr(obj, 'total_tasks', obj.tasks.count())

    def get_completed_tasks(self, obj):
        return getattr(obj, 'completed_tasks', obj.tasks.filter(status='done').count())    
    def get_members_detail(self, obj):
        # Combine owner and members into a single list of unique users
        users = {obj.owner}                     # start with owner (User instance)
        users.update(obj.members.all())         # add all members
        return UserSerializer(list(users), many=True).data


class InvitationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Invitation
        fields = ['id', 'project', 'invited_user', 'invited_by', 'status', 'created_at', 'expires_at']
        read_only_fields = ['invited_by', 'status', 'created_at', 'expires_at']        