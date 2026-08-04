import pytest
from django.db import IntegrityError
from django.utils import timezone
from datetime import timedelta
from projects.models import Project, Invitation
from projects.tests.factories import ProjectFactory, InvitationFactory, UserFactory

pytestmark = pytest.mark.django_db


# ==========================================
# PROJECT MODEL TESTS
# ==========================================

def test_project_str_method():
    """WHY: Admin panels and logs show the name."""
    project = ProjectFactory.build(name="My Awesome Project")
    assert str(project) == "My Awesome Project"


def test_project_requires_owner():
    """WHY: owner is NOT NULL. Database must enforce this."""
    with pytest.raises(IntegrityError):
        Project.objects.create(name="No Owner", description="Should fail")


def test_project_owner_cascade_delete():
    """WHY: on_delete=models.CASCADE - if owner deleted, their projects go too."""
    user = UserFactory()
    project = ProjectFactory(owner=user)
    
    assert Project.objects.count() == 1
    
    user.delete()
    
    assert Project.objects.count() == 0


def test_project_members_many_to_many():
    """WHY: Users can be added to projects as members."""
    user1 = UserFactory()
    user2 = UserFactory()
    project = ProjectFactory()
    
    # Add members
    project.members.add(user1, user2)
    
    # Verify both are members
    assert user1 in project.members.all()
    assert user2 in project.members.all()
    assert project.members.count() == 2


# ==========================================
# INVITATION MODEL TESTS
# ==========================================

def test_invitation_str_method():
    """WHY: Admin panels show meaningful invitations."""
    project = ProjectFactory(name="Secret Project")
    inviter = UserFactory(username="alice")
    invitee = UserFactory(username="bob")
    
    invitation = InvitationFactory.build(
        project=project,
        invited_by=inviter,
        invited_user=invitee
    )
    
    expected = "alice invited bob to Secret Project"
    assert str(invitation) == expected


def test_invitation_default_expires_at():
    """WHY: Invitations should expire after approximately 7 days."""
    invitation = InvitationFactory()
    now = timezone.now()
    expires = invitation.expires_at
    
    # Check it's roughly 7 days in the future (allow 1 hour tolerance)
    difference = expires - now
    # Should be between 6 days 23 hours and 7 days 1 hour
    assert difference >= timedelta(days=6, hours=23)
    assert difference <= timedelta(days=7, hours=1)

def test_invitation_default_status():
    """WHY: New invitations start as 'pending'."""
    invitation = InvitationFactory()
    assert invitation.status == 'pending'


def test_invitation_accept():
    """WHY: Accepting adds the user to project members."""
    user = UserFactory()
    project = ProjectFactory()
    invitation = InvitationFactory(
        invited_user=user,
        project=project,
        status='pending',
        expires_at=timezone.now() + timedelta(days=1)
    )
    
    # Verify user is NOT a member yet
    assert user not in project.members.all()
    
    # Accept the invitation
    result = invitation.accept()
    
    assert result is True
    assert invitation.status == 'accepted'
    assert user in project.members.all()


def test_invitation_accept_expired():
    """WHY: Expired invitations cannot be accepted."""
    user = UserFactory()
    project = ProjectFactory()
    invitation = InvitationFactory(
        invited_user=user,
        project=project,
        status='pending',
        expires_at=timezone.now() - timedelta(days=1)  # Already expired
    )
    
    result = invitation.accept()
    
    assert result is False
    assert invitation.status == 'pending'  # Still pending
    assert user not in project.members.all()

def test_invitation_accept_already_accepted():
    """WHY: Calling accept() on an already accepted invitation does nothing."""
    user = UserFactory()
    project = ProjectFactory()
    invitation = InvitationFactory(
        invited_user=user,
        project=project,
        status='pending',
        expires_at=timezone.now() + timedelta(days=1)
    )
    
    # First accept – should work
    assert invitation.accept() is True
    assert invitation.status == 'accepted'
    assert user in project.members.all()
    
    # Second accept – should do nothing
    assert invitation.accept() is False
    assert invitation.status == 'accepted'
    assert user in project.members.all()  # Still a member


def test_invitation_decline():
    """WHY: Declining sets status to 'declined'."""
    invitation = InvitationFactory(status='pending')
    
    result = invitation.decline()
    
    assert result is True
    assert invitation.status == 'declined'


def test_invitation_decline_already_accepted():
    """WHY: Cannot decline an already accepted invitation."""
    invitation = InvitationFactory(status='accepted')
    
    result = invitation.decline()
    
    assert result is False
    assert invitation.status == 'accepted'


def test_invitation_is_expired():
    """WHY: Check if invitation has expired."""
    # Not expired
    invitation1 = InvitationFactory(expires_at=timezone.now() + timedelta(days=1))
    assert invitation1.is_expired() is False
    
    # Expired
    invitation2 = InvitationFactory(expires_at=timezone.now() - timedelta(days=1))
    assert invitation2.is_expired() is True