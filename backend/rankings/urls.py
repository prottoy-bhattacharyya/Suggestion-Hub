from django.urls import path

from . import views

urlpatterns = [
    path("titles/", views.titles),
    path("users/", views.users),
    path("me/", views.me),
]
