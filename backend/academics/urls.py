from django.urls import path
from . import views

urlpatterns = [
    path('departments_list/', views.department_list, name='department_list'),
    path('courses_list/', views.course_list, name='course_list'),
]