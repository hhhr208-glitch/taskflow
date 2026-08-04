import pytest
from projects.models import Project, Invitation
from projects.serializers import ProjectSerializer, InvitationSerializer
from projects.tests.factories import ProjectFactory, InvitationFactory, UserFactory
from tasks.tests.factories import TaskFactory  # Import TaskFactory for testing annotations

pytestmark = pytest.mark.django_db


# ==========================================
# PROJECT SERIALIZER TESTS
# ==========================================

def test_project_serializer_returns_expected_fields():
    """WHY: Frontend expects specific fields. If someone changes fields, this fails."""
    project = ProjectFactory()
    serializer = ProjectSerializer(instance=project)
    data = serializer.data

    expected_fields = {
        'id', 'name', 'description', 'owner', 'members', 'image',
        'created_at', 'updated_at', 'total_tasks', 'completed_tasks', 
        'members_detail'
    }
    
    assert set(data.keys()) == expected_fields
    assert isinstance(data['id'], int)
    assert isinstance(data['owner'], int)
    assert isinstance(data['members'], list)
    assert isinstance(data['total_tasks'], int)
    assert isinstance(data['completed_tasks'], int)
    assert isinstance(data['members_detail'], list)


def test_project_serializer_total_tasks():
    """WHY: get_total_tasks should count all tasks in the project."""
    user = UserFactory()
    project = ProjectFactory(owner=user)
    
    # Create tasks
    TaskFactory(project=project, status='todo')
    TaskFactory(project=project, status='in_progress')
    TaskFactory(project=project, status='done')
    
    # Test with queryset annotation (how the view uses it)
    from django.db.models import Count
    project_with_annotation = Project.objects.annotate(
        total_tasks=Count('tasks')
    ).get(id=project.id)
    
    serializer = ProjectSerializer(instance=project_with_annotation)
    assert serializer.data['total_tasks'] == 3


def test_project_serializer_total_tasks_fallback():
    """WHY: get_total_tasks should fallback to obj.tasks.count() if no annotation."""
    project = ProjectFactory()
    TaskFactory(project=project)
    TaskFactory(project=project)
    
    # Without annotation, it should use the fallback
    serializer = ProjectSerializer(instance=project)
    assert serializer.data['total_tasks'] == 2


def test_project_serializer_completed_tasks():
    """WHY: get_completed_tasks should count only done tasks."""
    user = UserFactory()
    project = ProjectFactory(owner=user)
    
    TaskFactory(project=project, status='todo')
    TaskFactory(project=project, status='in_progress')
    TaskFactory(project=project, status='done')
    TaskFactory(project=project, status='done')
    
    # Test with queryset annotation (how the view uses it)
    from django.db.models import Count, Q
    project_with_annotation = Project.objects.annotate(
        completed_tasks=Count('tasks', filter=Q(tasks__status='done'))
    ).get(id=project.id)
    
    serializer = ProjectSerializer(instance=project_with_annotation)
    assert serializer.data['completed_tasks'] == 2


def test_project_serializer_completed_tasks_fallback():
    """WHY: get_completed_tasks should fallback to obj.tasks.filter(status='done').count()."""
    project = ProjectFactory()
    TaskFactory(project=project, status='todo')
    TaskFactory(project=project, status='done')
    TaskFactory(project=project, status='done')
    
    # Without annotation, it should use the fallback
    serializer = ProjectSerializer(instance=project)
    assert serializer.data['completed_tasks'] == 2


def test_project_serializer_members_detail():
    """WHY: get_members_detail should combine owner and members into a unique list."""
    user1 = UserFactory(username="alice")
    user2 = UserFactory(username="bob")
    user3 = UserFactory(username="charlie")
    
    project = ProjectFactory(owner=user1)
    project.members.add(user2, user3)
    
    # Also add a member who is NOT the owner
    # The method uses a set to deduplicate, so if owner is also a member, it appears once
    project.members.add(user1)  # Adding owner as member too
    
    serializer = ProjectSerializer(instance=project)
    members_detail = serializer.data['members_detail']
    
    # Should be 3 unique users (owner + 2 members)
    assert len(members_detail) == 3
    usernames = [u['username'] for u in members_detail]
    assert "alice" in usernames
    assert "bob" in usernames
    assert "charlie" in usernames


def test_project_serializer_members_detail_with_no_members():
    """WHY: If project has no members, only owner appears."""
    user = UserFactory(username="alice")
    project = ProjectFactory(owner=user)
    
    serializer = ProjectSerializer(instance=project)
    members_detail = serializer.data['members_detail']
    
    assert len(members_detail) == 1
    assert members_detail[0]['username'] == "alice"


def test_project_serializer_read_only_fields():
    """WHY: read_only_fields = ['owner', 'created_at', 'updated_at'] should be enforced."""
    user1 = UserFactory()
    user2 = UserFactory()
    project = ProjectFactory(owner=user1)
    
    # Attempt to update with new owner
    data = {
        'name': 'New Name',
        'owner': user2.id,  # Should be ignored
    }
    serializer = ProjectSerializer(instance=project, data=data, partial=True)
    assert serializer.is_valid() is True
    
    updated_project = serializer.save()
    # Owner should remain unchanged because it's read_only
    assert updated_project.owner == user1  # Not user2


# ==========================================
# INVITATION SERIALIZER TESTS
# ==========================================

def test_invitation_serializer_returns_expected_fields():
    """WHY: Frontend expects specific invitation fields."""
    invitation = InvitationFactory()
    serializer = InvitationSerializer(instance=invitation)
    data = serializer.data

    expected_fields = {
        'id', 'project', 'invited_user', 'invited_by', 
        'status', 'created_at', 'expires_at'
    }
    
    assert set(data.keys()) == expected_fields
    assert isinstance(data['id'], int)
    assert isinstance(data['project'], int)
    assert isinstance(data['invited_user'], int)
    assert isinstance(data['invited_by'], int)
    assert data['status'] in ['pending', 'accepted', 'declined', 'expired']


def test_invitation_serializer_read_only_fields():
    """WHY: read_only_fields should prevent users from setting these manually."""
    user1 = UserFactory()
    user2 = UserFactory()
    user3 = UserFactory()
    project = ProjectFactory(owner=user1)
    
    # Attempt to set invited_by to a different user
    data = {
        'project': project.id,
        'invited_user': user2.id,
        'invited_by': user3.id,  # Should be ignored
        'status': 'accepted',    # Should be ignored
    }
    
    serializer = InvitationSerializer(data=data)
    assert serializer.is_valid() is True
    
    invitation = serializer.save(invited_by=user1)  # The view sets this
    # The read_only fields should have been ignored
    assert invitation.invited_by == user1  # Not user3
    assert invitation.status == 'pending'  # Not 'accepted'


def test_invitation_serializer_requires_project_and_invited_user():
    """WHY: These fields are required for creating invitations."""
    data = {
        # Missing project and invited_user intentionally
    }
    serializer = InvitationSerializer(data=data)
    assert serializer.is_valid() is False
    assert 'project' in serializer.errors
    assert 'invited_user' in serializer.errors


def test_invitation_serializer_accepts_valid_data():
    """WHY: Valid data should create an invitation."""
    user = UserFactory()
    invitee = UserFactory()
    project = ProjectFactory(owner=user)
    
    data = {
        'project': project.id,
        'invited_user': invitee.id,
    }
    
    serializer = InvitationSerializer(data=data)
    assert serializer.is_valid() is True
    invitation = serializer.save(invited_by=user)
    
    assert invitation.project == project
    assert invitation.invited_user == invitee
    assert invitation.invited_by == user
    assert invitation.status == 'pending'