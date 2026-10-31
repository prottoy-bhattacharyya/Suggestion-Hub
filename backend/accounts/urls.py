from django.urls import path
from . import views

urlpatterns = [
    path('csrf/', views.csrf, name='csrf'),
    path('signup/', views.signup, name='signup'),
    path('login/', views.login, name='login'),
    path('me/', views.me, name='me'),
    path('logout/', views.logout, name='logout'),
    # path('profile/', views.profile, name='profile'),
    # path('forgot_password/', views.forgot_password, name='forgot_password'),
    
]