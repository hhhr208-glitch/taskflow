import pytest
from django.db import IntegrityError
from tasks.models import Task
from tasks.tests.factories import TaskFactory, UserFactory, ProjectFactory

pytestmark = pytest.mark.django_db


def test_task_str_method_returns_title():
    task = TaskFactory.build(title="Build the testing suite")
    assert str(task) == "Build the testing suite"


def test_task_default_status_and_priority():
    # Using ORM directly to let database defaults kick in (no factory overrides)
    project = ProjectFactory()
    task = Task.objects.create(
        title="Test Defaults",
        project=project,
    )
    assert task.status == 'todo'
    assert task.priority == 'medium'


def test_task_requires_project():
    with pytest.raises(IntegrityError):
        TaskFactory.create(project=None)


def test_task_allows_null_assignee_created_by_and_due_date():
    task = TaskFactory(
        assignee=None,
        created_by=None,
        due_date=None
    )
    task.refresh_from_db()
    assert task.assignee is None
    assert task.created_by is None
    assert task.due_date is None


def test_task_deleted_when_project_deleted():
    project = ProjectFactory()
    task = TaskFactory(project=project)
    assert Task.objects.count() == 1
    project.delete()
    assert Task.objects.count() == 0


def test_assignee_and_created_by_can_be_different_users():
    manager = UserFactory(username="manager")
    developer = UserFactory(username="developer")
    task = TaskFactory(
        created_by=manager,
        assignee=developer
    )
    assert task.created_by.username == "manager"
    assert task.assignee.username == "developer"