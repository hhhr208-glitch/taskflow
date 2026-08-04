import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status
from django.urls import reverse
from users.tests.factories import UserFactory
from django.core.cache import cache
from axes.models import AccessAttempt



User = get_user_model()
pytestmark = pytest.mark.django_db




# ==========================================
# REGISTER VIEW TESTS
# ==========================================

def test_register_user_success():
    """WHY: Registration should create a user and set auth cookies."""
    client = APIClient()
    url = reverse('register')
    
    data = {
        'username': 'newuser',
        'email': 'new@example.com',
        'password': 'SecurePass123!',
        'password2': 'SecurePass123!',
    }
    
    response = client.post(url, data, format='json')
    
    assert response.status_code == status.HTTP_201_CREATED
    assert response.data['message'] == 'User created successfully'
    assert response.data['user']['username'] == 'newuser'
    assert response.data['user']['email'] == 'new@example.com'
    assert User.objects.count() == 1
    
    # Check that cookies are set
    assert 'access_token' in response.cookies
    assert 'refresh_token' in response.cookies
    assert response.cookies['access_token']['httponly'] is True


def test_register_user_password_mismatch():
    """WHY: Passwords must match."""
    client = APIClient()
    url = reverse('register')
    
    data = {
        'username': 'newuser',
        'email': 'new@example.com',
        'password': 'SecurePass123!',
        'password2': 'WrongPass123!',
    }
    
    response = client.post(url, data, format='json')
    
    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert 'password' in response.data
    assert User.objects.count() == 0


def test_register_user_missing_email():
    """WHY: Email is required."""
    client = APIClient()
    url = reverse('register')
    
    data = {
        'username': 'newuser',
        'password': 'SecurePass123!',
        'password2': 'SecurePass123!',
    }
    
    response = client.post(url, data, format='json')
    
    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert 'email' in response.data
    assert User.objects.count() == 0


def test_register_user_duplicate_username():
    """WHY: Usernames must be unique."""
    UserFactory(username='existinguser')
    
    client = APIClient()
    url = reverse('register')
    
    data = {
        'username': 'existinguser',
        'email': 'new@example.com',
        'password': 'SecurePass123!',
        'password2': 'SecurePass123!',
    }
    
    response = client.post(url, data, format='json')
    
    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert 'username' in response.data
    assert User.objects.count() == 1


def test_register_user_weak_password():
    """WHY: Password must meet complexity requirements."""
    client = APIClient()
    url = reverse('register')
    
    data = {
        'username': 'newuser',
        'email': 'new@example.com',
        'password': 'weak',
        'password2': 'weak',
    }
    
    response = client.post(url, data, format='json')
    
    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert 'password' in response.data


# ==========================================
# LOGIN VIEW TESTS (CookieTokenObtainPairView)
# ==========================================

def test_login_success():
    """WHY: Valid credentials should return tokens in cookies."""
    user = UserFactory(username='testuser', password='securepass123')
    
    client = APIClient()
    url = reverse('token_obtain_pair')
    
    data = {
        'username': 'testuser',
        'password': 'securepass123',
    }
    
    response = client.post(url, data, format='json')
    
    assert response.status_code == status.HTTP_200_OK
    assert 'access_token' in response.cookies
    assert 'refresh_token' in response.cookies
    assert response.cookies['access_token']['httponly'] is True


def test_login_invalid_credentials():
    """WHY: Wrong password should return 401."""
    UserFactory(username='testuser', password='securepass123')
    
    client = APIClient()
    url = reverse('token_obtain_pair')
    
    data = {
        'username': 'testuser',
        'password': 'WrongPass123!',
    }
    
    response = client.post(url, data, format='json')
    
    assert response.status_code == status.HTTP_401_UNAUTHORIZED
    assert 'access_token' not in response.cookies
    assert 'refresh_token' not in response.cookies


def test_login_nonexistent_user():
    """WHY: Non-existent user should return 401."""
    client = APIClient()
    url = reverse('token_obtain_pair')
    
    data = {
        'username': 'nonexistent',
        'password': 'SecurePass123!',
    }
    
    response = client.post(url, data, format='json')
    
    assert response.status_code == status.HTTP_401_UNAUTHORIZED


# ==========================================
# TOKEN REFRESH VIEW TESTS
# ==========================================

from django.test import override_settings

@override_settings(REST_FRAMEWORK={
    'DEFAULT_THROTTLE_CLASSES': [],
    'DEFAULT_THROTTLE_RATES': {}
})
def test_refresh_token_success():
    """WHY: Valid refresh token should return new access token."""
    user = UserFactory(username='testuser', password='securepass123')
    
    client = APIClient()
    login_url = reverse('token_obtain_pair')
    login_data = {
        'username': 'testuser',
        'password': 'securepass123',
    }
    login_response = client.post(login_url, login_data, format='json')
    
    
    assert login_response.status_code == status.HTTP_200_OK
    
    if 'refresh_token' in login_response.cookies:
        refresh_token = login_response.cookies['refresh_token'].value
    else:
        
        refresh_token = login_response.data.get('refresh')
        client.cookies['refresh_token'] = refresh_token
    
   
    url = reverse('token_refresh')
    response = client.post(url, format='json')
    
    assert response.status_code == status.HTTP_200_OK
    assert response.data['message'] == 'Token refreshed'
    assert 'access_token' in response.cookies



def test_refresh_token_missing():
    """WHY: Missing refresh token should return 400."""
    # 1. Reset Axes (clear failed attempt records)
    AccessAttempt.objects.all().delete()
    
    # 2. Reset DRF throttle cache (clear rate limit counters)
    cache.clear()
    
    client = APIClient()
    url = reverse('token_refresh')
    
    response = client.post(url, format='json')
    
    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert response.data['detail'] == 'Refresh token missing'
# ==========================================
# CURRENT USER VIEW TESTS
# ==========================================

def test_current_user_authenticated():
    """WHY: Authenticated users can see their own profile."""
    user = UserFactory(username='testuser', email='test@example.com')
    
    client = APIClient()
    client.force_authenticate(user=user)
    url = reverse('current_user')
    
    response = client.get(url)
    
    assert response.status_code == status.HTTP_200_OK
    assert response.data['username'] == 'testuser'
    assert response.data['email'] == 'test@example.com'
    assert 'id' in response.data


def test_current_user_unauthenticated():
    """WHY: Unauthenticated users should get 401."""
    client = APIClient()
    
    # FORCE: Explicitly set no authentication
    client.force_authenticate(user=None)  
    
    url = reverse('current_user')
    response = client.get(url)
    
    assert response.status_code == status.HTTP_401_UNAUTHORIZED


# ==========================================
# USER VIEWSET TESTS (List users)
# ==========================================

def test_user_list_authenticated():
    """WHY: Authenticated users can list all users."""
    user1 = UserFactory(username='alice')
    user2 = UserFactory(username='bob')
    user3 = UserFactory(username='charlie')
    
    client = APIClient()
    client.force_authenticate(user=user1)
    url = reverse('user-list')
    
    response = client.get(url)
    
    assert response.status_code == status.HTTP_200_OK
    assert len(response.data) == 3
    usernames = [u['username'] for u in response.data]
    assert 'alice' in usernames
    assert 'bob' in usernames
    assert 'charlie' in usernames


def test_user_list_unauthenticated():
    """WHY: Unauthenticated users cannot list users."""
    client = APIClient()
    
    # FORCE: Explicitly set no authentication
    client.force_authenticate(user=None)  
    
    url = reverse('user-list')
    response = client.get(url)
    
    assert response.status_code == status.HTTP_401_UNAUTHORIZED

def test_user_list_search_by_username():
    """WHY: Search filter should work by username."""
    user = UserFactory(username='testuser', email='test@example.com')
    UserFactory(username='otheruser', email='other@example.com')
    
    client = APIClient()
    client.force_authenticate(user=user)
    url = reverse('user-list') + '?search=test'
    
    response = client.get(url)
    
    assert response.status_code == status.HTTP_200_OK
    assert len(response.data) == 1
    assert response.data[0]['username'] == 'testuser'


def test_user_list_search_by_email():
    """WHY: Search should work on email field too."""
    user = UserFactory(username='testuser', email='test@example.com')
    UserFactory(username='otheruser', email='other@example.com')
    
    client = APIClient()
    client.force_authenticate(user=user)
    url = reverse('user-list') + '?search=test@example.com'
    
    response = client.get(url)
    
    assert response.status_code == status.HTTP_200_OK
    assert len(response.data) == 1
    assert response.data[0]['email'] == 'test@example.com'