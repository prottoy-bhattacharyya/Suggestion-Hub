from django.urls import path
from . import views

urlpatterns = [
    path('follow/<int:user_id>/', views.follow, name='follow'),
    # path('unfollow/<int:user_id>/', views.unfollow, name='unfollow'),
    path('is_following/', views.is_following, name='is_following'),
    path('comments/', views.comments, name='comments'),
]