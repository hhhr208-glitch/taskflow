from rest_framework_simplejwt.views import TokenRefreshView
from rest_framework_simplejwt.exceptions import InvalidToken
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated , AllowAny
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework import status
from rest_framework import viewsets, filters
from django.contrib.auth import get_user_model
from .serializers import UserSerializer
from rest_framework.views import APIView
from .serializers import UserRegisterSerializer




class CookieTokenRefreshView(TokenRefreshView):
    def post(self, request, *args, **kwargs):
        # Get refresh token from cookie instead of request body
        refresh_token = request.COOKIES.get('refresh_token')
        if not refresh_token:
            return Response({"detail": "Refresh token missing"}, status=status.HTTP_400_BAD_REQUEST)
        
        # Manually create serializer with the token from cookie
        serializer = self.get_serializer(data={'refresh': refresh_token})
        try:
            serializer.is_valid(raise_exception=True)
        except InvalidToken as e:
            return Response({"detail": str(e)}, status=status.HTTP_401_UNAUTHORIZED)
        
        # Set new access token as cookie
        access_token = serializer.validated_data['access']
        response = Response({"message": "Token refreshed"}, status=status.HTTP_200_OK)
        response.set_cookie(
            'access_token', access_token,
            httponly=True,
            secure=False,   # True in production with HTTPS
            samesite='Lax',
        )
        return response




class CookieTokenObtainPairView(TokenObtainPairView):
    def post(self, request, *args, **kwargs):
        response = super().post(request, *args, **kwargs)
        if response.status_code == status.HTTP_200_OK:
            access = response.data.get('access')
            refresh = response.data.get('refresh')
            response.set_cookie(
                'access_token', access,
                httponly=True,
                secure=False,  # True if using HTTPS
                samesite='Lax',
            )
            response.set_cookie(
                'refresh_token', refresh,
                httponly=True,
                secure=False,
                samesite='Lax',
            )
          
            del response.data['access']
            del response.data['refresh']
        return response        





User = get_user_model()

class UserViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = UserSerializer
    filter_backends = [filters.SearchFilter]
    search_fields = ['username', 'email']
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return User.objects.all()        




class CurrentUserView(APIView):
    permission_classes = [IsAuthenticated]
    def get(self, request):
        serializer = UserSerializer(request.user)
        return Response(serializer.data)        






User = get_user_model()

class RegisterView(APIView):
   
    
    permission_classes = [AllowAny]  # Anyone can access this
    authentication_classes = []   

    def post(self, request):
        serializer = UserRegisterSerializer(data=request.data)
        
        if serializer.is_valid():
            
            user = serializer.save()
            
            
            refresh = RefreshToken.for_user(user)
            access_token = str(refresh.access_token)
            refresh_token = str(refresh)
            
           
            response = Response(
                {
                    "message": "User created successfully",
                    "user": {
                        "id": user.id,
                        "username": user.username,
                        "email": user.email,
                    }
                },
                status=status.HTTP_201_CREATED
            )
            
            
            response.set_cookie(
                'access_token', access_token,
                httponly=True,
                secure=False,      
                samesite='Lax',
                path='/',
            )
            response.set_cookie(
                'refresh_token', refresh_token,
                httponly=True,
                secure=False,
                samesite='Lax',
                path='/',
            )
            
            return response
        
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
