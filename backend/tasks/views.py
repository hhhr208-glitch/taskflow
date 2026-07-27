from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from django.db import models
from django.db.models import Case, When, Value, IntegerField
from .models import Task
from .serializers import TaskSerializer
from .permissions import TaskPermission
from django.db.models.functions import Lower
from rest_framework.filters import SearchFilter
from django_filters.rest_framework import DjangoFilterBackend

class TaskViewSet(viewsets.ModelViewSet):
    serializer_class = TaskSerializer
    permission_classes = [TaskPermission]
    filter_backends = [SearchFilter , DjangoFilterBackend]
    search_fields = ['title']
    filterset_fields = ('project', 'status', 'assignee', 'priority')  
    def get_queryset(self):
        user = self.request.user
        qs = Task.objects.select_related('project', 'assignee').filter(
            models.Q(project__members=user) | models.Q(project__owner=user)
        ).distinct()

      
        project_id = self.request.query_params.get('project')
        if project_id:
            qs = qs.filter(project_id=project_id)

        return qs

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)