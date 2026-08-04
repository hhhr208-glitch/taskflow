import pytest
from django.contrib.auth import get_user_model
from django.db import IntegrityError
from users.tests.factories import UserFactory, AdminUserFactory

User = get_user_model()
pytestmark = pytest.mark.django_db


def test_user_str_method_returns_username():
    """WHY: Admin panels show the username, not 'User object (1)'."""
    user = UserFactory.build(username="rsl")
    assert str(user) == "rsl"


def test_create_regular_user():
    """WHY: Regular users should have is_staff=False and is_superuser=False."""
    user = UserFactory(
        username="dude",
        email="dude@example.com"
    )
    
    assert user.username == "dude"
    assert user.email == "dude@example.com"
    assert user.is_active is True
    assert user.is_staff is False
    assert user.is_superuser is False
    assert user.password != "securepass123"
    assert user.check_password("securepass123") is True


def test_create_admin_user():
    """WHY: Admins must have is_staff=True and is_superuser=True."""
    admin = AdminUserFactory(
        username="admin",
        email="admin@example.com"
    )
    
    assert admin.is_staff is True
    assert admin.is_superuser is True
    assert admin.check_password("securepass123") is True


def test_username_must_be_unique():
    """WHY: Django's AbstractUser enforces unique usernames."""
    User.objects.create_user(username="rsl", password="pass123")
    
   
    with pytest.raises(IntegrityError):
        User.objects.create_user(username="rsl", password="pass456")


def test_password_is_hashed_not_plain_text():
    """WHY: Passwords must never be stored in plain text."""
    user = UserFactory(password="mysecret")
    
    assert user.password.startswith("pbkdf2_sha256")
    assert user.check_password("mysecret") is True
    assert user.check_password("wrongpass") is False


def test_manager_create_user():
    """WHY: Django's built-in create_user should work."""
    user = User.objects.create_user(
        username="john",
        email="john@example.com",
        password="johnspass"
    )
    
    assert user.username == "john"
    assert user.check_password("johnspass") is True
    assert user.is_staff is False
    assert user.is_superuser is False


def test_manager_create_superuser():
    """WHY: create_superuser must set staff and superuser flags."""
    admin = User.objects.create_superuser(
        username="superadmin",
        email="super@example.com",
        password="adminpass"
    )
    
    assert admin.is_staff is True
    assert admin.is_superuser is True
    assert admin.check_password("adminpass") is True