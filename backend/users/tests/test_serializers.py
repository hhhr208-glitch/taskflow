import pytest
from django.contrib.auth import get_user_model
from users.serializers import UserSerializer, UserRegisterSerializer
from users.tests.factories import UserFactory

User = get_user_model()
pytestmark = pytest.mark.django_db


# ==========================================
# USER SERIALIZER TESTS
# ==========================================

def test_user_serializer_returns_expected_fields():
    """WHY: Frontend expects specific user fields."""
    user = UserFactory()
    serializer = UserSerializer(instance=user)
    data = serializer.data

    expected_fields = {'id', 'username', 'email'}
    assert set(data.keys()) == expected_fields
    assert isinstance(data['id'], int)
    assert data['username'] == user.username
    assert data['email'] == user.email


def test_user_serializer_read_only():
    """WHY: UserSerializer should allow updates (but you can add read_only_fields)."""
    user = UserFactory(username="oldname", email="old@example.com")
    
    data = {'username': 'newname', 'email': 'new@example.com'}
    serializer = UserSerializer(instance=user, data=data)
    assert serializer.is_valid() is True
    
    updated_user = serializer.save()
    assert updated_user.username == 'newname'
    assert updated_user.email == 'new@example.com'


# ==========================================
# USER REGISTER SERIALIZER TESTS
# ==========================================

def test_register_serializer_valid_data():
    """WHY: Valid registration data should create a user."""
    data = {
        'username': 'newuser',
        'email': 'new@example.com',
        'password': 'SecurePass123!',
        'password2': 'SecurePass123!',
    }
    
    serializer = UserRegisterSerializer(data=data)
    assert serializer.is_valid() is True
    
    user = serializer.save()
    assert user.username == 'newuser'
    assert user.email == 'new@example.com'
    assert user.check_password('SecurePass123!') is True
    assert User.objects.count() == 1


def test_register_serializer_password_mismatch():
    """WHY: Passwords must match."""
    data = {
        'username': 'newuser',
        'email': 'new@example.com',
        'password': 'SecurePass123!',
        'password2': 'WrongPass123!',
    }
    
    serializer = UserRegisterSerializer(data=data)
    assert serializer.is_valid() is False
    assert 'password' in serializer.errors
    assert 'Passwords do not match' in str(serializer.errors['password'])


def test_register_serializer_requires_email():
    """WHY: Email is required (extra_kwargs = {'email': {'required': True}})."""
    data = {
        'username': 'newuser',
        'password': 'SecurePass123!',
        'password2': 'SecurePass123!',
        # 'email' is missing
    }
    
    serializer = UserRegisterSerializer(data=data)
    assert serializer.is_valid() is False
    assert 'email' in serializer.errors


def test_register_serializer_requires_username():
    """WHY: Username is required."""
    data = {
        'email': 'new@example.com',
        'password': 'SecurePass123!',
        'password2': 'SecurePass123!',
        # 'username' is missing
    }
    
    serializer = UserRegisterSerializer(data=data)
    assert serializer.is_valid() is False
    assert 'username' in serializer.errors


def test_register_serializer_username_uniqueness():
    """WHY: Usernames must be unique."""
    UserFactory(username='existinguser')
    
    data = {
        'username': 'existinguser',
        'email': 'new@example.com',
        'password': 'SecurePass123!',
        'password2': 'SecurePass123!',
    }
    
    serializer = UserRegisterSerializer(data=data)
    assert serializer.is_valid() is False
    assert 'username' in serializer.errors


def test_register_serializer_password_validation():
    """WHY: validate_password enforces password complexity."""
    data = {
        'username': 'newuser',
        'email': 'new@example.com',
        'password': 'weak',
        'password2': 'weak',
    }
    
    serializer = UserRegisterSerializer(data=data)
    assert serializer.is_valid() is False
    assert 'password' in serializer.errors


def test_register_serializer_password2_not_stored():
    """WHY: password2 should not be stored in the database."""
    data = {
        'username': 'newuser',
        'email': 'new@example.com',
        'password': 'SecurePass123!',
        'password2': 'SecurePass123!',
    }
    
    serializer = UserRegisterSerializer(data=data)
    assert serializer.is_valid() is True
    
    user = serializer.save()
    # password2 should be removed during validation
    assert not hasattr(user, 'password2')


def test_register_serializer_creates_with_hashed_password():
    """WHY: Passwords must be hashed, not stored in plain text."""
    data = {
        'username': 'newuser',
        'email': 'new@example.com',
        'password': 'SecurePass123!',
        'password2': 'SecurePass123!',
    }
    
    serializer = UserRegisterSerializer(data=data)
    assert serializer.is_valid() is True
    
    user = serializer.save()
    assert user.password.startswith('pbkdf2_sha256')
    assert user.password != 'SecurePass123!'
    assert user.check_password('SecurePass123!') is True