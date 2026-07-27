from django.db import models
from django.conf import settings
from django.utils import timezone
from datetime import timedelta


#this is just our beautiful project over here 
class Project(models.Model):
    name = models.CharField(max_length=200)
    description  = models.TextField()
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL , 
        on_delete = models.CASCADE,
        related_name='owned_projects'
    )
    members = models.ManyToManyField(
        settings.AUTH_USER_MODEL,
        related_name='projects',
        blank=True
    )
    image = models.ImageField(upload_to='project_images/', null=True, blank=True) 
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now= True)
    
    def __str__(self):
        return self.name


class Invitation(models.Model):
    STATUS_CHOICES = (
        ('pending', 'Pending'),
        ('accepted', 'Accepted'),
        ('declined', 'Declined'),
        ('expired', 'Expired'),
    )
    project = models.ForeignKey('Project', on_delete=models.CASCADE, related_name='invitations')
    invited_user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='project_invitations')
    invited_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='sent_invitations')
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='pending')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    expires_at = models.DateTimeField(default=timezone.now() + timedelta(days=7))

    def __str__(self):
        return f"{self.invited_by} invited {self.invited_user} to {self.project.name}"

    def accept(self):
        if self.status == 'pending' and self.expires_at > timezone.now():
            self.project.members.add(self.invited_user)
            self.status = 'accepted'
            self.save()
            return True
        return False

    def decline(self):
        if self.status == 'pending':
            self.status = 'declined'
            self.save()
            return True
        return False

    def is_expired(self):
        return timezone.now() > self.expires_at        
