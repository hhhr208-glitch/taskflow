from django.contrib import admin
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from projects.views import ProjectViewSet , InvitationViewSet
from tasks.views import TaskViewSet
from users.views import CookieTokenRefreshView
from users.views import CookieTokenObtainPairView
from django.conf import settings
from django.conf.urls.static import static
from users.views import UserViewSet
from users.views import UserViewSet, CurrentUserView , RegisterView

router = DefaultRouter()
router.register(r'projects', ProjectViewSet , basename='project')
router.register(r'tasks', TaskViewSet , basename='task')
router.register(r'invitations', InvitationViewSet , basename='invitation')
router.register(r'users', UserViewSet , basename='user') 
urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/users/me/', CurrentUserView.as_view(), name='current_user'),
    path('api/', include(router.urls)),
    path('api/token/', CookieTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/token/refresh/', CookieTokenRefreshView.as_view(), name='token_refresh'),
    path('api/register/', RegisterView.as_view(), name='register'),
   
    ]
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)    