import pytest
from rest_framework.test import APIClient
from rest_framework import status
from django.urls import reverse
from tasks.models import Task
from tasks.tests.factories import TaskFactory, UserFactory, ProjectFactory

pytestmark = pytest.mark.django_db


# ==========================================
# TEST 1: Unauthorized access (Security)
# ==========================================
def test_list_tasks_requires_authentication():
    """
    WHY: If this returns 200, your API is public and insecure.
    We expect 401 (Unauthorized) - the user MUST be logged in.
    """
    client = APIClient()
    url = reverse('task-list')  
    response = client.get(url)
    
    assert response.status_code == status.HTTP_401_UNAUTHORIZED


# ==========================================
# TEST 2: List view - Users only see their own tasks
# ==========================================
def test_list_tasks_only_shows_users_projects():
    """
    WHY: Your get_queryset filters by project__members OR project__owner.
    We must test that User A cannot see User B's tasks.
    """
    # Given: Two users and two projects
    user1 = UserFactory()
    user2 = UserFactory()
    
    # Project 1: User1 is the owner
    project1 = ProjectFactory(owner=user1)
    # Project 2: User2 is the owner
    project2 = ProjectFactory(owner=user2)
    
    # Tasks in each project
    task1 = TaskFactory(project=project1, title="User1 Task")
    task2 = TaskFactory(project=project2, title="User2 Task")
    
    # When: User1 logs in and requests the list
    client = APIClient()
    client.force_authenticate(user=user1)
    url = reverse('task-list')
    response = client.get(url)
    
    # Then: They should only see their own task
    assert response.status_code == status.HTTP_200_OK
    assert len(response.data) == 1
    assert response.data[0]['title'] == "User1 Task"


# ==========================================
# TEST 3: Create view - Auto-assigns created_by
# ==========================================
def test_create_task_automatically_sets_created_by():
    """
    WHY: Your perform_create does serializer.save(created_by=self.request.user).
    This test verifies the user CANNOT set created_by themselves.
    """
    user = UserFactory()
    project = ProjectFactory(owner=user)
    
    client = APIClient()
    client.force_authenticate(user=user)
    
    url = reverse('task-list')
    data = {
        'title': 'New Task',
        'project': project.id,
        'assignee': user.id,
        'status': 'todo',
        'priority': 'medium',
        'due_date': '2026-12-31',
        # 'created_by': 999  # Intentionally NOT sent
    }
    response = client.post(url, data, format='json')
    
    assert response.status_code == status.HTTP_201_CREATED
    
    # Verify the task was created and the created_by is the logged-in user
    task = Task.objects.get(id=response.data['id'])
    assert task.created_by == user
    assert task.title == 'New Task'


# ==========================================
# TEST 4: Retrieve view - Get specific task
# ==========================================
def test_user_can_retrieve_their_own_task():
    """
    WHY: Users should be able to view tasks they have access to.
    """
    user = UserFactory()
    project = ProjectFactory(owner=user)
    task = TaskFactory(project=project, title="My Task")
    
    client = APIClient()
    client.force_authenticate(user=user)
    
    url = reverse('task-detail', kwargs={'pk': task.id})
    response = client.get(url)
    
    assert response.status_code == status.HTTP_200_OK
    assert response.data['title'] == "My Task"


def test_user_cannot_retrieve_others_task():
    """
    WHY: Security - users cannot access tasks from projects they don't belong to.
    """
    user1 = UserFactory()
    user2 = UserFactory()
    
    project = ProjectFactory(owner=user2)  # User2 owns it
    task = TaskFactory(project=project, title="Private Task")
    
    client = APIClient()
    client.force_authenticate(user=user1)  # User1 tries to access
    
    url = reverse('task-detail', kwargs={'pk': task.id})
    response = client.get(url)
    
    assert response.status_code == status.HTTP_404_NOT_FOUND


# ==========================================
# TEST 5: Update view - Only owners can update
# ==========================================
def test_user_can_update_their_own_task():
    """
    WHY: Users should be able to edit tasks in projects they own/are members of.
    """
    user = UserFactory()
    project = ProjectFactory(owner=user)
    task = TaskFactory(project=project, title="Old Title")
    
    client = APIClient()
    client.force_authenticate(user=user)
    
    url = reverse('task-detail', kwargs={'pk': task.id})
    data = {
        'title': 'Updated Title',
        'project': project.id,
        'assignee': user.id,
        'created_by': user.id,
        'status': 'in_progress',
        'priority': 'high',
        'due_date': '2026-12-31',
    }
    response = client.put(url, data, format='json')
    
    assert response.status_code == status.HTTP_200_OK
    task.refresh_from_db()
    assert task.title == 'Updated Title'
    assert task.status == 'in_progress'


def test_user_cannot_update_others_task():
    """
    WHY: Security - users cannot edit tasks they don't own.
    This tests your TaskPermission class.
    """
    user1 = UserFactory()
    user2 = UserFactory()
    
    project = ProjectFactory(owner=user2)
    task = TaskFactory(project=project, title="Private Task")
    
    client = APIClient()
    client.force_authenticate(user=user1)
    
    url = reverse('task-detail', kwargs={'pk': task.id})
    data = {
        'title': 'Hacked Title',
        'project': project.id,
        'assignee': user2.id,
        'created_by': user2.id,
        'status': 'done',
        'priority': 'low',
        'due_date': '2026-12-31',
    }
    response = client.put(url, data, format='json')
    
   
    assert response.status_code ==  status.HTTP_404_NOT_FOUND


# ==========================================
# TEST 6: Delete view
# ==========================================
def test_user_can_delete_their_own_task():
    """
    WHY: Users should be able to delete their own tasks.
    """
    user = UserFactory()
    project = ProjectFactory(owner=user)
    task = TaskFactory(project=project)
    
    client = APIClient()
    client.force_authenticate(user=user)
    
    url = reverse('task-detail', kwargs={'pk': task.id})
    response = client.delete(url)
    
    assert response.status_code == status.HTTP_204_NO_CONTENT
    assert Task.objects.count() == 0


def test_user_cannot_delete_others_task():
    """
    WHY: Security - users cannot delete tasks they don't own.
    """
    user1 = UserFactory()
    user2 = UserFactory()
    
    project = ProjectFactory(owner=user2)
    task = TaskFactory(project=project)
    
    client = APIClient()
    client.force_authenticate(user=user1)
    
    url = reverse('task-detail', kwargs={'pk': task.id})
    response = client.delete(url)
    
    assert response.status_code ==  status.HTTP_404_NOT_FOUND
    assert Task.objects.count() == 1  # Task still exists


# ==========================================
# TEST 7: Filtering
# ==========================================
def test_list_tasks_filters_by_status():
    """
    WHY: Your view has filterset_fields = ('project', 'status', 'assignee', 'priority').
    We test that the filter works correctly.
    """
    user = UserFactory()
    project = ProjectFactory(owner=user)
    
    task_todo = TaskFactory(project=project, status='todo', title="Todo Task")
    task_done = TaskFactory(project=project, status='done', title="Done Task")
    
    client = APIClient()
    client.force_authenticate(user=user)
    
    url = reverse('task-list') + '?status=todo'
    response = client.get(url)
    
    assert response.status_code == status.HTTP_200_OK
    assert len(response.data) == 1
    assert response.data[0]['title'] == "Todo Task"


# ==========================================
# TEST 8: Search
# ==========================================
def test_list_tasks_search_by_title():
    """
    WHY: Your view has search_fields = ['title'].
    We test that searching works correctly.
    """
    user = UserFactory()
    project = ProjectFactory(owner=user)
    
    task1 = TaskFactory(project=project, title="Search for this task")
    task2 = TaskFactory(project=project, title="Ignore this one")
    
    client = APIClient()
    client.force_authenticate(user=user)
    
    url = reverse('task-list') + '?search=Search'
    response = client.get(url)
    
    assert response.status_code == status.HTTP_200_OK
    assert len(response.data) == 1
    assert response.data[0]['title'] == "Search for this task"