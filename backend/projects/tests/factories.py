import factory
from django.contrib.auth import get_user_model
from django.utils import timezone
from datetime import timedelta
from projects.models import Project, Invitation

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
    
    @factory.post_generation
    def members(self, create, extracted, **kwargs):
        if not create:
            return
        if extracted:
            for user in extracted:
                self.members.add(user)


class InvitationFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Invitation

    project = factory.SubFactory(ProjectFactory)
    invited_user = factory.SubFactory(UserFactory)
    invited_by = factory.SubFactory(UserFactory)
    status = 'pending'
    expires_at = timezone.now() + timedelta(days=7)