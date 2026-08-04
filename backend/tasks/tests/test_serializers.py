import pytest
from tasks.models import Task
from tasks.serializers import TaskSerializer
from tasks.tests.factories import TaskFactory, ProjectFactory, UserFactory

pytestmark = pytest.mark.django_db


# ==========================================
# TEST 1: Serializer Output (Read)
# ==========================================
def test_serializer_returns_expected_fields():
    """
    WHY: Frontend expects certain fields. 
    If someone accidentally removes a field, this test fails.
    """
    task = TaskFactory()
    serializer = TaskSerializer(instance=task)
    data = serializer.data

    expected_fields = {
        'id', 'title', 'description', 'status', 'priority', 
        'project', 'assignee', 'created_by', 'due_date', 
        'created_at', 'updated_at'
    }
    
    assert set(data.keys()) == expected_fields
    
    # Check the types (IDs should be integers)
    assert isinstance(data['id'], int)
    assert isinstance(data['project'], int)
    assert isinstance(data['assignee'], int)
    assert isinstance(data['created_by'], int)
    assert data['status'] in ['todo', 'in_progress', 'done']


# ==========================================
# TEST 2: Validation (Required fields)
# ==========================================
def test_serializer_rejects_missing_project():
    """
    WHY: Project is NOT NULL in the DB. 
    The serializer should catch this BEFORE hitting the database.
    """
    data = {
        'title': 'My Task',
        'status': 'todo',
        # 'project' is missing intentionally
    }
    serializer = TaskSerializer(data=data)
    assert serializer.is_valid() is False
    assert 'project' in serializer.errors
    assert serializer.errors['project'][0] == 'This field is required.'


# ==========================================
# TEST 3: Validation (Invalid choices)
# ==========================================
def test_serializer_rejects_invalid_status():
    """
    WHY: Status has choices ['todo', 'in_progress', 'done'].
    If the frontend sends 'urgent', the database would reject it.
    The serializer must reject it first.
    """
    user = UserFactory()
    project = ProjectFactory()
    
    data = {
        'title': 'Invalid Task',
        'project': project.id,
        'assignee': user.id,
        'created_by': user.id,
        'status': 'urgent',  # <-- INVALID CHOICE
        'priority': 'medium',
        'due_date': '2026-12-31',
    }
    serializer = TaskSerializer(data=data)
    assert serializer.is_valid() is False
    assert 'status' in serializer.errors


# ==========================================
# TEST 4: Security (Prevent user ID spoofing)
# ==========================================
def test_serializer_accepts_assignee_and_created_by():
    """
    WHY: This is the MOST important test.
    If the serializer accepts 'created_by', it means a malicious user
    could set the creator to someone else.
    """
    manager = UserFactory(username="manager")
    developer = UserFactory(username="developer")
    project = ProjectFactory(owner=manager)
    
    data = {
        'title': 'Secure Task',
        'project': project.id,
        'assignee': developer.id,
        'created_by': manager.id,
        'status': 'todo',
        'priority': 'high',
        'due_date': '2026-12-31',
    }
    
    serializer = TaskSerializer(data=data)
    assert serializer.is_valid() is True
    
    # Save it and verify the task exists
    task = serializer.save()
    assert task.assignee.username == "developer"
    assert task.created_by.username == "manager"


# ==========================================
# TEST 5: Create with valid data
# ==========================================
def test_serializer_creates_task():
    """
    WHY: The happy path. Test that a valid payload actually creates a Task.
    """
    user = UserFactory()
    project = ProjectFactory(owner=user)
    
    data = {
        'title': 'New Task',
        'description': 'Description here',
        'project': project.id,
        'assignee': user.id,
        'created_by': user.id,
        'status': 'todo',
        'priority': 'medium',
        'due_date': '2026-12-31',
    }
    
    serializer = TaskSerializer(data=data)
    assert serializer.is_valid() is True
    
    task = serializer.save()
    assert Task.objects.count() == 1
    assert task.title == 'New Task'
    assert task.project == project
    assert task.assignee == user