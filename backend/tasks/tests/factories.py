import factory
from django.contrib.auth import get_user_model
from tasks.models import Task
from projects.models import Project

User = get_user_model()


class UserFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = User
        django_get_or_create = ('username',)

    username = factory.Sequence(lambda n: f"testuser_{n}")
    email = factory.LazyAttribute(lambda obj: f"{obj.username}@example.com")
    password = factory.PostGenerationMethodCall('set_password', 'securepass123')


class ProjectFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Project

    name = factory.Sequence(lambda n: f"Test Project {n}")
    description = factory.Faker('paragraph', nb_sentences=2)
    owner = factory.SubFactory(UserFactory)


class TaskFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Task

    title = factory.Faker('sentence', nb_words=4)
    description = factory.Faker('paragraph', nb_sentences=3)
    status = factory.Iterator(['todo', 'in_progress', 'done'])
    priority = factory.Iterator(['low', 'medium', 'high'])
    project = factory.SubFactory(ProjectFactory)
    assignee = factory.SubFactory(UserFactory)
    created_by = factory.SubFactory(UserFactory)
    due_date = factory.Faker('future_date')