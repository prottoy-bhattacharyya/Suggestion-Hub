from django.urls import path
from . import views

urlpatterns = [
    path('follow/<int:user_id>/', views.follow, name='follow'),
    path('unfollow/<int:user_id>/', views.unfollow, name='unfollow'),
    path('is_following/', views.is_following, name='is_following'),
    path('comments/', views.comments, name='comments'),
    path('my_followers/', views.my_followers, name='my_followers'),
    path('my_following/', views.my_following, name='my_following'),
    path('followers/<int:user_id>/', views.followers, name='followers'),
    path('following/<int:user_id>/', views.following, name='following'),
]