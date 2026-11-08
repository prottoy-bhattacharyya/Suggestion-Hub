from django.urls import path
from . import views

urlpatterns = [
    path('upload/', views.upload_note, name='upload-note'),
    path('get_notes/', views.get_notes, name='get-notes'),
    path('<int:note_id>/file/', views.note_file, name='note-file'),
    path('<int:note_id>/detail/', views.note_detail, name='note-detail'),
    path('<int:note_id>/rate/', views.note_rate, name='note-rate'),
    path('<int:note_id>/report/', views.note_report, name='note-report'),
]
