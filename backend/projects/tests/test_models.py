from django.test import TestCase
from django.contrib.auth import get_user_model
from projects.models import Project


User = get_user_model()

class ProjectModelTest(TestCase):
    @classmethod
    def setUpTestData(cls):
        # Create a user and a project once for all test methods
        cls.user = User.objects.create_user(username='testuser', password='12345')
        cls.project = Project.objects.create(
            name='Test Project',
            description='A test project',
            owner=cls.user
        )

    def test_project_creation(self):
        self.assertEqual(self.project.name, 'Test Project')
        self.assertEqual(self.project.description, 'A test project')
        self.assertEqual(self.project.owner.username, 'testuser')
        self.assertTrue(isinstance(self.project, Project))

    def test_project_str(self):
        self.assertEqual(str(self.project), 'Test Project')

