from django.urls import path
from . import views

urlpatterns = [
    path('get_feeds/', views.feeds, name='feeds'),
    path('get_feeds_by_following/', views.get_feeds_by_following, name='get-notes-by-following'),
]