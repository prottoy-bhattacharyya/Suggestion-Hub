from django.urls import path
from . import views

urlpatterns = [
    path('csrf/', views.csrf, name='csrf'),
    path('signup/', views.signup, name='signup'),
    path('login/', views.login, name='login'),
    path('me/', views.me, name='me'),
    path('logout/', views.logout, name='logout'),
    path('profile/<int:user_id>/', views.profile, name='profile'),
    path('profile/me', views.me, name='my_profile'),
    path('profile/avatar/', views.upload_avatar, name='upload-avatar'),
    path('avatar/<int:user_id>/', views.user_avatar, name='user-avatar'),
    # path('forgot_password/', views.forgot_password, name='forgot_password'),
    
]