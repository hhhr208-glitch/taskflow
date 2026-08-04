import pytest
from rest_framework.test import APIClient
from rest_framework import status
from django.urls import reverse
from django.db import IntegrityError
from projects.models import Project, Invitation
from projects.tests.factories import ProjectFactory, InvitationFactory, UserFactory
from django.utils import timezone  
from datetime import timedelta  

pytestmark = pytest.mark.django_db


# ==========================================
# PROJECT VIEW TESTS
# ==========================================

def test_list_projects_requires_authentication():
    """WHY: Security - unauthenticated users cannot see projects."""
    client = APIClient()
    url = reverse('project-list')
    response = client.get(url)
    assert response.status_code == status.HTTP_401_UNAUTHORIZED


def test_list_projects_shows_owned_and_member_projects():
    """WHY: Users should see projects they own OR are members of."""
    user = UserFactory()
    other_user = UserFactory()
    
    # Project 1: user owns it
    project1 = ProjectFactory(owner=user, name="My Project")
    # Project 2: user is a member
    project2 = ProjectFactory(owner=other_user, name="Member Project")
    project2.members.add(user)
    # Project 3: user has nothing to do with it
    project3 = ProjectFactory(owner=other_user, name="Hidden Project")
    
    client = APIClient()
    client.force_authenticate(user=user)
    url = reverse('project-list')
    response = client.get(url)
    
    assert response.status_code == status.HTTP_200_OK
    # Should see 2 projects (owned + member)
    assert len(response.data['results']) == 2  # Pagination wraps in 'results'
    titles = [p['name'] for p in response.data['results']]
    assert "My Project" in titles
    assert "Member Project" in titles
    assert "Hidden Project" not in titles


def test_list_projects_includes_task_annotations():
    """WHY: get_queryset annotates total_tasks and completed_tasks."""
    user = UserFactory()
    project = ProjectFactory(owner=user, name="My Project")
    
    # Create tasks with different statuses
    from tasks.tests.factories import TaskFactory
    TaskFactory(project=project, status='todo', title="Task 1")
    TaskFactory(project=project, status='in_progress', title="Task 2")
    TaskFactory(project=project, status='done', title="Task 3")
    TaskFactory(project=project, status='done', title="Task 4")
    
    client = APIClient()
    client.force_authenticate(user=user)
    url = reverse('project-list')
    response = client.get(url)
    
    assert response.status_code == status.HTTP_200_OK
    project_data = response.data['results'][0]
    assert project_data['total_tasks'] == 4
    assert project_data['completed_tasks'] == 2


def test_user_can_create_project():
    """WHY: Authenticated users can create projects."""
    user = UserFactory()
    
    client = APIClient()
    client.force_authenticate(user=user)
    url = reverse('project-list')
    data = {
        'name': 'My New Project',
        'description': 'Description here',
    }
    response = client.post(url, data, format='json')
    
    assert response.status_code == status.HTTP_201_CREATED
    assert Project.objects.count() == 1
    project = Project.objects.first()
    assert project.owner == user
    assert project.name == 'My New Project'


def test_user_can_retrieve_their_project():
    """WHY: Users can view projects they have access to."""
    user = UserFactory()
    project = ProjectFactory(owner=user, name="My Project")
    
    client = APIClient()
    client.force_authenticate(user=user)
    url = reverse('project-detail', kwargs={'pk': project.id})
    response = client.get(url)
    
    assert response.status_code == status.HTTP_200_OK
    assert response.data['name'] == "My Project"


def test_user_cannot_retrieve_others_project():
    """WHY: Security - users cannot access projects they don't own or belong to."""
    user1 = UserFactory()
    user2 = UserFactory()
    project = ProjectFactory(owner=user2, name="Secret Project")
    
    client = APIClient()
    client.force_authenticate(user=user1)
    url = reverse('project-detail', kwargs={'pk': project.id})
    response = client.get(url)
    
    assert response.status_code == status.HTTP_404_NOT_FOUND


def test_user_can_update_their_project():
    """WHY: Project owners can update their projects."""
    user = UserFactory()
    project = ProjectFactory(owner=user, name="Old Name")
    
    client = APIClient()
    client.force_authenticate(user=user)
    url = reverse('project-detail', kwargs={'pk': project.id})
    data = {
        'name': 'New Name',
        'description': 'Updated description',
    }
    response = client.patch(url, data, format='json')
    
    assert response.status_code == status.HTTP_200_OK
    project.refresh_from_db()
    assert project.name == "New Name"


def test_user_cannot_update_others_project():
    """WHY: Only owners can update projects."""
    user1 = UserFactory()
    user2 = UserFactory()
    project = ProjectFactory(owner=user2, name="Secret Project")
    
    client = APIClient()
    client.force_authenticate(user=user1)
    url = reverse('project-detail', kwargs={'pk': project.id})
    data = {'name': 'Hacked Name'}
    response = client.patch(url, data, format='json')
    
    assert response.status_code == status.HTTP_404_NOT_FOUND


def test_user_can_delete_their_project():
    """WHY: Project owners can delete their projects."""
    user = UserFactory()
    project = ProjectFactory(owner=user)
    
    assert Project.objects.count() == 1
    
    client = APIClient()
    client.force_authenticate(user=user)
    url = reverse('project-detail', kwargs={'pk': project.id})
    response = client.delete(url)
    
    assert response.status_code == status.HTTP_204_NO_CONTENT
    assert Project.objects.count() == 0


def test_user_cannot_delete_others_project():
    """WHY: Only owners can delete projects."""
    user1 = UserFactory()
    user2 = UserFactory()
    project = ProjectFactory(owner=user2)
    
    client = APIClient()
    client.force_authenticate(user=user1)
    url = reverse('project-detail', kwargs={'pk': project.id})
    response = client.delete(url)
    
    assert response.status_code == status.HTTP_404_NOT_FOUND
    assert Project.objects.count() == 1


def test_search_projects_by_name():
    """WHY: search_fields = ['name'] should work."""
    user = UserFactory()
    project1 = ProjectFactory(owner=user, name="Searchable Project")
    project2 = ProjectFactory(owner=user, name="Hidden Project")
    
    client = APIClient()
    client.force_authenticate(user=user)
    url = reverse('project-list') + '?search=Searchable'
    response = client.get(url)
    
    assert response.status_code == status.HTTP_200_OK
    assert len(response.data['results']) == 1
    assert response.data['results'][0]['name'] == "Searchable Project"


# ==========================================
# INVITATION VIEW TESTS
# ==========================================

def test_user_can_create_invitation():
    """WHY: Project owners can invite users to their project."""
    user = UserFactory()
    invitee = UserFactory()
    project = ProjectFactory(owner=user)
    
    client = APIClient()
    client.force_authenticate(user=user)
    url = reverse('invitation-list')
    data = {
        'project': project.id,
        'invited_user': invitee.id,
    }
    response = client.post(url, data, format='json')
    
    assert response.status_code == status.HTTP_201_CREATED
    assert Invitation.objects.count() == 1
    invitation = Invitation.objects.first()
    assert invitation.invited_by == user
    assert invitation.invited_user == invitee
    assert invitation.project == project
    assert invitation.status == 'pending'


def test_user_cannot_create_invitation_if_not_project_owner():
    """WHY: perform_create checks project.owner != self.request.user."""
    user1 = UserFactory()
    user2 = UserFactory()
    project = ProjectFactory(owner=user2)  # user1 is NOT owner
    
    client = APIClient()
    client.force_authenticate(user=user1)
    url = reverse('invitation-list')
    data = {
        'project': project.id,
        'invited_user': user2.id,
    }
    response = client.post(url, data, format='json')
    
    # Should be 400 because the view raises PermissionError
    assert response.status_code == status.HTTP_403_FORBIDDEN
    assert Invitation.objects.count() == 0


def test_user_cannot_create_invitation_if_user_already_member():
    """WHY: perform_create checks if user is already a member."""
    user = UserFactory()
    invitee = UserFactory()
    project = ProjectFactory(owner=user)
    project.members.add(invitee)  # Already a member
    
    client = APIClient()
    client.force_authenticate(user=user)
    url = reverse('invitation-list')
    data = {
        'project': project.id,
        'invited_user': invitee.id,
    }
    response = client.post(url, data, format='json')
    
    # Should be 400 because the view raises ValueError
    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert Invitation.objects.count() == 0


def test_user_cannot_create_invitation_if_user_is_owner():
    """WHY: perform_create checks if project.owner == invited_user."""
    user = UserFactory()
    project = ProjectFactory(owner=user)
    
    client = APIClient()
    client.force_authenticate(user=user)
    url = reverse('invitation-list')
    data = {
        'project': project.id,
        'invited_user': user.id,  # Trying to invite the owner
    }
    response = client.post(url, data, format='json')
    
    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert Invitation.objects.count() == 0


def test_user_cannot_create_duplicate_pending_invitation():
    """WHY: perform_create checks if pending invitation already exists."""
    user = UserFactory()
    invitee = UserFactory()
    project = ProjectFactory(owner=user)
    
    # Create first invitation
    InvitationFactory(
        project=project,
        invited_user=invitee,
        invited_by=user,
        status='pending'
    )
    
    # Try to create another
    client = APIClient()
    client.force_authenticate(user=user)
    url = reverse('invitation-list')
    data = {
        'project': project.id,
        'invited_user': invitee.id,
    }
    response = client.post(url, data, format='json')
    
    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert Invitation.objects.count() == 1  # Still only one


def test_user_can_accept_invitation():
    """WHY: Invited users can accept invitations."""
    user = UserFactory()
    project = ProjectFactory()
    invitation = InvitationFactory(
        invited_user=user,
        project=project,
        status='pending'
    )
    
    client = APIClient()
    client.force_authenticate(user=user)
    url = reverse('invitation-accept', kwargs={'pk': invitation.id})
    response = client.post(url)
    
    assert response.status_code == status.HTTP_200_OK
    assert response.data['status'] == 'accepted'
    invitation.refresh_from_db()
    assert invitation.status == 'accepted'
    assert user in project.members.all()


def test_user_cannot_accept_others_invitation():
    """WHY: Users cannot accept invitations meant for others (returns 404)."""
    user1 = UserFactory()
    user2 = UserFactory()
    invitation = InvitationFactory(invited_user=user2)
    
    client = APIClient()
    client.force_authenticate(user=user1)
    url = reverse('invitation-accept', kwargs={'pk': invitation.id})
    response = client.post(url)
    
    assert response.status_code == status.HTTP_404_NOT_FOUND
    invitation.refresh_from_db()
    assert invitation.status == 'pending'  


def test_user_cannot_accept_expired_invitation():
    """WHY: invitation.accept() returns False if expired."""
    user = UserFactory()
    invitation = InvitationFactory(
        invited_user=user,
        status='pending',
        expires_at=timezone.now() - timedelta(days=1)  # Expired
    )
    
    client = APIClient()
    client.force_authenticate(user=user)
    url = reverse('invitation-accept', kwargs={'pk': invitation.id})
    response = client.post(url)
    
    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert response.data['error'] == "Cannot accept"
    assert invitation.status == 'pending'


def test_user_cannot_decline_others_invitation():
    """WHY: Users cannot decline invitations meant for others (returns 404)."""
    user1 = UserFactory()
    user2 = UserFactory()
    invitation = InvitationFactory(invited_user=user2)
    
    client = APIClient()
    client.force_authenticate(user=user1)
    url = reverse('invitation-decline', kwargs={'pk': invitation.id})
    response = client.post(url)
    
    # Because the invitation isn't in the user's queryset, it returns 404
    assert response.status_code == status.HTTP_404_NOT_FOUND
    invitation.refresh_from_db()
    assert invitation.status == 'pending'  



def test_user_cannot_decline_already_accepted_invitation():
    """WHY: invitation.decline() returns False if already accepted."""
    user = UserFactory()
    invitation = InvitationFactory(
        invited_user=user,
        status='accepted'
    )
    
    client = APIClient()
    client.force_authenticate(user=user)
    url = reverse('invitation-decline', kwargs={'pk': invitation.id})
    response = client.post(url)
    
    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert response.data['error'] == "Cannot decline"


def test_user_sees_their_invitations():
    """WHY: get_queryset filters invitations sent or received by the user."""
    user = UserFactory()
    other_user = UserFactory()
    
    # Invitation sent by user
    invitation1 = InvitationFactory(invited_by=user, invited_user=other_user)
    # Invitation received by user
    invitation2 = InvitationFactory(invited_by=other_user, invited_user=user)
    # Invitation neither sent nor received by user
    invitation3 = InvitationFactory(invited_by=other_user, invited_user=other_user)
    
    client = APIClient()
    client.force_authenticate(user=user)
    url = reverse('invitation-list')
    response = client.get(url)
    
    assert response.status_code == status.HTTP_200_OK
    assert len(response.data) == 2  # Only two invitations
    ids = [inv['id'] for inv in response.data]
    assert invitation1.id in ids
    assert invitation2.id in ids
    assert invitation3.id not in ids