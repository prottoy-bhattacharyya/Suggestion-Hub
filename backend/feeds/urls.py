from django.urls import path
from . import views

urlpatterns = [
    path('get_feeds/', views.feeds, name='feeds'),
]