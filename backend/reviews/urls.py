from django.urls import path
from . import views

urlpatterns = [
    path('submit_review/', views.submit_review, name='submit-review'),
    path('get_notes/', views.get_notes, name='get-notes'),
    path('get_review_logs/', views.get_review_logs, name='get-review-logs'),
]