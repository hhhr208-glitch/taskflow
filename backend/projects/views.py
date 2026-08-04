from rest_framework import viewsets , status
from rest_framework.permissions import IsAuthenticated
from rest_framework.filters import SearchFilter   
from .models import Project , Invitation
from .serializers import ProjectSerializer , InvitationSerializer
from django.db import models
from django.db.models import Count, Q
from rest_framework.pagination import PageNumberPagination
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.exceptions import PermissionDenied, ValidationError  

class CustomPagination(PageNumberPagination):
    page_size = 10                   
  
class ProjectViewSet(viewsets.ModelViewSet):
    serializer_class = ProjectSerializer
    permission_classes = [IsAuthenticated]
    queryset = Project.objects.none()
    filter_backends = [SearchFilter]              
    search_fields = ['name']
    pagination_class = CustomPagination

    def get_queryset(self):
        user = self.request.user
        return Project.objects.select_related('owner').prefetch_related('members').filter(
            models.Q(members=user) | models.Q(owner=user)
        ).distinct().annotate(
            total_tasks=Count('tasks'),
            completed_tasks=Count('tasks', filter=Q(tasks__status='done'))
        )

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)



class InvitationViewSet(viewsets.ModelViewSet):
    serializer_class = InvitationSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        # Show invitations sent by the user or received by the user
        return Invitation.objects.filter(
            models.Q(invited_by=self.request.user) | models.Q(invited_user=self.request.user)
        )

    def perform_create(self, serializer):
        # Only project owners can invite
        project = serializer.validated_data['project']
        invited_user = serializer.validated_data['invited_user']
        if project.owner != self.request.user:
            raise PermissionDenied("Only project owner can invite")
        # Check if already a member
        if project.members.filter(id=invited_user.id).exists() or project.owner == invited_user:
            raise ValidationError("User is already a member or is the owner") 
        # Check if there's already a pending invitation
        if Invitation.objects.filter(project=project, invited_user=invited_user, status='pending').exists():
            raise ValidationError("Invitation already pending")
        serializer.save(invited_by=self.request.user)

    @action(detail=True, methods=['post'])
    def accept(self, request, pk=None):
        invitation = self.get_object()
        if invitation.invited_user != request.user:
            return Response({"error": "Not your invitation"}, status=status.HTTP_403_FORBIDDEN)
        if invitation.accept():
            return Response({"status": "accepted"})
        return Response({"error": "Cannot accept"}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['post'])
    def decline(self, request, pk=None):
        invitation = self.get_object()
        if invitation.invited_user != request.user:
            return Response({"error": "Not your invitation"}, status=status.HTTP_403_FORBIDDEN)
        if invitation.decline():
            return Response({"status": "declined"})
        return Response({"error": "Cannot decline"}, status=status.HTTP_400_BAD_REQUEST)