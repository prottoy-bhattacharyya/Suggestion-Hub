import os

from .utils import getFileHash, save_file
from core.utils import get_db_connection
from django.shortcuts import render
from django.http import JsonResponse

# Create your views here.
def upload_note(request):
    if not request.method == 'POST':
        return JsonResponse({'error': 'Invalid request method'}, status=400)
    
    uploader_id = request.session.get('user').get('id')
    course_id = request.POST.get('course_id')
    title = request.POST.get('title')
    description = request.POST.get('description')
    type = request.POST.get('type')
    intake = request.POST.get('intake')
    section = request.POST.get('section')
    file = request.FILES.get('file')

    file_path = os.path.join("uploaded_notes", file.name)
    save_file(file, file_path)
    file_hash = getFileHash(file_path)



    conn = get_db_connection()

    try:
        with conn.cursor() as cursor:
            cursor.execute(
                "SELECT COUNT(*) FROM notes WHERE file_hash = %s",
                (file_hash,)
            )
            if cursor.fetchone()[0] > 0:
                cursor.close()
                conn.close()
                return JsonResponse({'status': 'error', 'error': 'Duplicate file detected'}, status=400)
            
            cursor.execute(
                """
                INSERT INTO notes (uploader_id, course_id, title, description, type, intake, section, file, file_hash)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                """, 
                (uploader_id, course_id, title, description, type, intake, section, file_path, file_hash)
            )

            conn.commit()
            return JsonResponse({'status': 'success', 'message': 'Note uploaded successfully'}, status=200)
    except Exception as e:
        conn.rollback()
        return JsonResponse({'status': 'error', 'error': str(e)}, status=500)
    
        


    