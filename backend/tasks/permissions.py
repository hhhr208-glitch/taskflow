from rest_framework.permissions import BasePermission
from projects.models import Project

class TaskPermission(BasePermission):
    def has_permission(self, request, view):

        if not request.user or not request.user.is_authenticated:
            return False

        if request.method == 'POST':
            project_id = request.data.get('project')
            if not project_id:
                return False
            try:
                project = Project.objects.get(id=project_id)
            except Project.DoesNotExist:
                return False
            
            return (request.user == project.owner) or project.members.filter(id=request.user.id).exists() 

       
        return True

    def has_object_permission(self, request, view, obj):
        
        if request.user == obj.project.owner:
            return True

        if request.user == obj.created_by:
            return True    
      
        if request.method == 'PATCH' and request.user == obj.assignee:
            return True
      
        return False


