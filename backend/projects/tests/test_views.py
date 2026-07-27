from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework.test import APITestCase, APIClient
from rest_framework import status
from projects.models import Project
from tasks.models import Task

User = get_user_model()


class ProjectViewSetTest(APITestCase):
    @classmethod
    def setUpTestData(cls):
        # Create users
        cls.owner = User.objects.create_user(username='owner', password='pass123')
        cls.member = User.objects.create_user(username='member', password='pass123')
        cls.other = User.objects.create_user(username='other', password='pass123')
        
        # Create a project owned by 'owner'
        cls.project_owner = Project.objects.create(
            name='Owner Project',
            description='Owned by owner',
            owner=cls.owner
        )
        # Add 'member' to the project's members
        cls.project_owner.members.add(cls.member)
        
        # Create another project for 'other' user (should not be visible to owner/member)
        cls.project_other = Project.objects.create(
            name='Other Project',
            description='Owned by other',
            owner=cls.other
        )
        
        # Create tasks to test annotations
        Task.objects.create(
            title='Task 1',
            status='done',
            project=cls.project_owner
        )
        Task.objects.create(
            title='Task 2',
            status='todo',
            project=cls.project_owner
        )
        Task.objects.create(
            title='Task 3',
            status='in_progress',
            project=cls.project_owner
        )
        
        # Setup API client
        cls.client = APIClient()
        cls.projects_url = reverse('project-list')  # assumes router name 'project-list'

    def test_list_projects_authenticated(self):
        """Authenticated user sees only projects they own or are member of"""
        self.client.force_authenticate(user=self.owner)
        response = self.client.get(self.projects_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['count'], 1)
        self.assertEqual(response.data['results'][0]['name'], 'Owner Project')
    
    def test_list_projects_unauthenticated(self):
        """Unauthenticated user gets 401"""
        response = self.client.get(self.projects_url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
    
    def test_create_project_sets_owner(self):
        self.client.force_authenticate(user=self.owner)
        data = {'name': 'New Project', 'description': 'Test create'}
        response = self.client.post(self.projects_url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['owner'], self.owner.id)
        self.assertEqual(Project.objects.filter(name='New Project').count(), 1)
    
    def test_create_project_unauthenticated(self):
        data = {'name': 'Should Fail', 'description': 'No auth'}
        response = self.client.post(self.projects_url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
    
    def test_pagination_is_10(self):
        """Test that page_size is 10 and response has pagination fields"""
        # Create 11 projects for this test (additional)
        for i in range(11):
            Project.objects.create(name=f'Extra {i}', owner=self.owner)
        self.client.force_authenticate(user=self.owner)
        response = self.client.get(self.projects_url)
        self.assertIn('count', response.data)
        self.assertIn('next', response.data)
        self.assertIn('previous', response.data)
        self.assertIn('results', response.data)
        self.assertEqual(len(response.data['results']), 10)
    
    def test_search_filter_by_name(self):
        self.client.force_authenticate(user=self.owner)
        # Add a second project for this owner (to search among them)
        other_proj = Project.objects.create(name='Unique Search Project', owner=self.owner)
        response = self.client.get(self.projects_url, {'search': 'Unique'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['count'], 1)
        self.assertEqual(response.data['results'][0]['name'], 'Unique Search Project')
    
    def test_annotations_total_and_completed_tasks(self):
        """Test that total_tasks and completed_tasks are correctly annotated"""
        self.client.force_authenticate(user=self.owner)
        response = self.client.get(self.projects_url)
        project_data = response.data['results'][0]  # Owner Project
        self.assertEqual(project_data['total_tasks'], 3)
        self.assertEqual(project_data['completed_tasks'], 1)
    
    def test_member_can_see_project(self):
        """User added as member should see the project"""
        self.client.force_authenticate(user=self.member)
        response = self.client.get(self.projects_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['count'], 1)
        self.assertEqual(response.data['results'][0]['name'], 'Owner Project')
    
    def test_non_member_does_not_see_project(self):
        """User who is neither owner nor member sees no projects (except their own, none)"""
        self.client.force_authenticate(user=self.other)
        response = self.client.get(self.projects_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['count'], 0)