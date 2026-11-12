import json
import os
import re

from django.conf import settings
from django.http import FileResponse, HttpResponse, JsonResponse
from django.views.decorators.clickjacking import xframe_options_exempt

from .utils import getFileHash, save_file
from core.utils import get_db_connection

MAX_PDF_BYTES = 20 * 1024 * 1024
MAX_VIDEO_BYTES = 500 * 1024 * 1024
PDF_EXTENSIONS = {".pdf"}
VIDEO_EXTENSIONS = {".mp4", ".webm", ".mov"}
VIDEO_CONTENT_TYPES = {".mp4": "video/mp4", ".webm": "video/webm", ".mov": "video/quicktime"}

# Create your views here.
def upload_note(request):
    if not request.method == 'POST':
        return JsonResponse({'error': 'Invalid request method'}, status=400)

    session_user = request.session.get('user')
    if not session_user:
        return JsonResponse(
            {"status": "failed", "error": "You need to login first."},
            status=401,
        )

    uploader_id = session_user.get('id')
    course_id = request.POST.get('course_id')
    title = request.POST.get('title')
    description = request.POST.get('description')
    type = request.POST.get('type')
    intake = request.POST.get('intake')
    section = request.POST.get('section')
    file = request.FILES.get('file')

    if not file:
        return JsonResponse({'status': 'error', 'error': 'No file provided'}, status=400)

    media_type = (request.POST.get('media_type') or '').lower()

    ext = os.path.splitext(file.name)[1].lower()
    if ext in PDF_EXTENSIONS:
        file_type = 'pdf'
    elif ext in VIDEO_EXTENSIONS:
        file_type = 'video'
    else:
        return JsonResponse(
            {'status': 'error', 'error': 'Unsupported file type. Upload a PDF, MP4, WebM or MOV file.'},
            status=400,
        )

    if media_type and media_type != file_type:
        return JsonResponse(
            {'status': 'error', 'error': 'File does not match the selected upload kind.'},
            status=400,
        )

    max_bytes = MAX_PDF_BYTES if file_type == 'pdf' else MAX_VIDEO_BYTES
    if file.size > max_bytes:
        limit_mb = max_bytes // (1024 * 1024)
        return JsonResponse(
            {'status': 'error', 'error': f'File too large. Maximum size is {limit_mb} MB.'},
            status=400,
        )

    file_path = os.path.join("uploaded_notes", file.name)
    file_hash = getFileHash(file)



    conn = get_db_connection()

    try:
        with conn.cursor() as cursor:
            cursor.execute(
                "SELECT COUNT(*) FROM notes WHERE file_hash = %s",
                (file_hash,)
            )
            if cursor.fetchone()[0] > 0:
                return JsonResponse({'status': 'error', 'error': 'Duplicate file detected'}, status=400)

            # Duplicate check passed — now save the file.
            save_file(file, file_path)
            with conn.cursor() as insert_cursor:
                insert_cursor.execute(
                    """
                    INSERT INTO notes (uploader_id, course_id, title, description, type, intake, section, file, file_type, file_hash)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    """,
                    (uploader_id, course_id, title, description, type, intake, section, file_path, file_type, file_hash)
                )

            conn.commit()
            return JsonResponse({'status': 'success', 'message': 'Note uploaded successfully'}, status=201)
    except Exception as e:
        conn.rollback()
        return JsonResponse({'status': 'error', 'error': str(e)}, status=500)

@xframe_options_exempt
def note_file(request, note_id):
    if not request.session.get('user'):
        return JsonResponse(
            {"status": "failed", "error": "You need to login first."},
            status=401,
        )

    conn = get_db_connection()
    try:
        with conn.cursor() as cursor:
            cursor.execute(
                "SELECT file, file_type, title, review_status, uploader_id FROM notes WHERE id = %s",
                (note_id,)
            )
            row = cursor.fetchone()
    finally:
        conn.close()

    if row is None:
        return JsonResponse({'status': 'error', 'error': 'Note not found'}, status=404)

    file, file_type, title, review_status, uploader_id = row

    session_user = request.session.get('user')

    # Pending notes are only visible to their uploader, teachers and admins.
    if review_status != 'approved':
        if session_user.get('id') != uploader_id and session_user.get('role') not in ('teacher', 'admin'):
            return JsonResponse(
                {'status': 'error', 'error': 'You cannot view this note yet.'},
                status=403,
            )
    path = os.path.normpath(os.path.join(settings.BASE_DIR, file))
    print(f"Path: {path}")
    # normalize slashes for Windows and Linux, and check if the path is within the BASE_DIR and is a file
    path = path.replace("\\", "/")
    print(f"Normalized Path: {path}")
    if not path.startswith(os.path.normpath(settings.BASE_DIR)) or not os.path.isfile(path):
        return JsonResponse({'status': 'error', 'error': 'File missing'}, status=404)

    if file_type == 'pdf':
        content_type = 'application/pdf'
    else:
        ext = os.path.splitext(path)[1].lower()
        content_type = VIDEO_CONTENT_TYPES.get(ext, 'video/mp4')

    file_size = os.path.getsize(path)

    range_header = request.META.get('HTTP_RANGE')
    if range_header:
        match = re.match(r'bytes=(\d*)-(\d*)$', range_header.strip())
        if match:
            raw_start, raw_end = match.groups()
            if raw_start == '' and raw_end == '':
                start, end = 0, file_size - 1
            elif raw_start == '':
                start = max(0, file_size - int(raw_end))
                end = file_size - 1
            else:
                start = int(raw_start)
                end = min(int(raw_end) if raw_end else file_size - 1, file_size - 1)

            if start >= file_size or start > end:
                error_response = JsonResponse(
                    {'status': 'error', 'error': 'Requested range not satisfiable'},
                    status=416,
                )
                error_response['Content-Range'] = f'bytes */{file_size}'
                return error_response

            length = min(end - start + 1, 8 * 1024 * 1024)
            end = start + length - 1

            with open(path, 'rb') as f:
                f.seek(start)
                data = f.read(length)

            response = HttpResponse(data, status=206, content_type=content_type)
            response['Content-Range'] = f'bytes {start}-{end}/{file_size}'
            response['Accept-Ranges'] = 'bytes'
            response['Content-Disposition'] = f'inline; filename="{os.path.basename(path)}"'
            return response

    response = FileResponse(open(path, 'rb'), content_type=content_type)
    response['Accept-Ranges'] = 'bytes'
    response['Content-Disposition'] = f'inline; filename="{os.path.basename(path)}"'
    return response
    
        

def get_notes(request):
    user_id = request.GET.get('user_id')
    if not user_id:
        return JsonResponse({'status': 'error', 'error': 'user_id parameter is required'}, status=400)

    logged_in_user = request.session.get('user')
    if not logged_in_user:
        return JsonResponse({'status': 'error', 'error': 'You need to login first.'}, status=401)
    logged_in_user_id = logged_in_user.get('id')
    

    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute(
            """
            select 
                n.id, n.title, n.description, n.type, n.intake, n.section,
                n.rating_avg, n.rating_count, n.created_at, n.review_status,
                u.full_name as uploader_name, r.comment as review_comment,
                n.file_type
            from notes n
            left join users u on n.uploader_id = u.id
            left join reviews r on n.id = r.note_id
            where u.id = %s
            """,
            (user_id,),
        )
        notes = cursor.fetchall()

        if logged_in_user_id != int(user_id):
            # Filter out notes that are not approved for other users
            notes = [note for note in notes if note[9] == 'approved']
        
        response_data = {
            'status': 'success',
            'notes': [
                {
                    'id': note[0],
                    'title': note[1],
                    'description': note[2],
                    'type': note[3],
                    'intake': note[4],
                    'section': note[5],
                    'rating_avg': note[6],
                    'rating_count': note[7],
                    'created_at': note[8].isoformat() if note[8] else None,
                    'review_status': note[9],
                    'uploader_name': note[10],
                    'review_comment': note[11],
                    'file_type': note[12],
                    'file_url': request.build_absolute_uri(
                        f"/notes/{note[0]}/file/"
                    ),
                } for note in notes
            ]
        }
    except Exception as e:
        return JsonResponse (
            {
                'status': 'error',
                'error': str(e)
            },
            status=500
        )

    cursor.close()
    conn.close()

    return JsonResponse(response_data, status=200)


def _get_session_user(request):
    return request.session.get('user')


def note_detail(request, note_id):
    session_user = _get_session_user(request)
    if not session_user:
        return JsonResponse(
            {"status": "failed", "error": "You need to login first."},
            status=401,
        )

    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute(
            """
            SELECT n.id, n.title, n.description, n.type, n.intake, n.section,
                   n.rating_avg, n.rating_count, n.created_at, n.review_status,
                   n.uploader_id, u.full_name AS uploader_name,
                   c.code AS course_code, n.file_type
            FROM notes n
            LEFT JOIN users u ON n.uploader_id = u.id
            LEFT JOIN courses c ON n.course_id = c.id
            WHERE n.id = %s
            """,
            (note_id,),
        )
        row = cursor.fetchone()
    finally:
        cursor.close()
        conn.close()

    if row is None:
        return JsonResponse({'status': 'error', 'error': 'Note not found'}, status=404)

    (
        id_, title, description, type_, intake, section,
        rating_avg, rating_count, created_at, review_status,
        uploader_id, uploader_name, course_code, file_type,
    ) = row

    # Pending notes are only visible to their uploader, teachers and admins.
    if review_status != 'approved':
        can_view = (
            session_user.get('id') == uploader_id
            or session_user.get('role') in ('teacher', 'admin')
        )
        if not can_view:
            return JsonResponse(
                {'status': 'error', 'error': 'You cannot view this note yet.'},
                status=403,
            )

    viewer_id = session_user.get('id')

    my_rating = 0
    my_rating_conn = get_db_connection()
    try:
        with my_rating_conn.cursor() as c2:
            c2.execute(
                "SELECT stars FROM ratings WHERE note_id = %s AND user_id = %s",
                (note_id, viewer_id),
            )
            stars_row = c2.fetchone()
            my_rating = int(stars_row[0]) if stars_row else 0
    finally:
        my_rating_conn.close()

    return JsonResponse(
        {
            'status': 'success',
            'note': {
                'id': id_,
                'title': title,
                'description': description,
                'type': type_,
                'intake': intake,
                'section': section,
                'rating_avg': str(rating_avg),
                'rating_count': rating_count,
                'created_at': created_at.isoformat() if created_at else None,
                'review_status': review_status,
                'uploader_id': uploader_id,
                'uploader_name': uploader_name,
                'course_code': course_code,
                'is_owner': session_user.get('id') == uploader_id,
                'my_rating': my_rating,
                'file_type': file_type,
                'file_url': request.build_absolute_uri(f"/notes/{id_}/file/"),
            },
        },
        status=200,
    )


def note_rate(request, note_id):
    if request.method != 'POST':
        return JsonResponse({'status': 'error', 'error': 'Invalid request method'}, status=405)

    session_user = _get_session_user(request)
    if not session_user:
        return JsonResponse(
            {"status": "failed", "error": "You need to login first."},
            status=401,
        )

    try:
        body = json.loads(request.body or "{}")
    except json.JSONDecodeError:
        return JsonResponse({'status': 'error', 'error': 'Invalid JSON body'}, status=400)

    try:
        stars = int(body.get("stars"))
    except (TypeError, ValueError):
        return JsonResponse({'status': 'error', 'error': 'stars must be 1-5'}, status=400)

    if not 1 <= stars <= 5:
        return JsonResponse({'status': 'error', 'error': 'stars must be 1-5'}, status=400)

    viewer_id = session_user.get('id')

    conn = get_db_connection()
    try:
        with conn.cursor() as cursor:
            cursor.execute(
                "SELECT uploader_id, review_status FROM notes WHERE id = %s",
                (note_id,),
            )
            row = cursor.fetchone()
            if row is None:
                return JsonResponse({'status': 'error', 'error': 'Note not found'}, status=404)

            uploader_id, review_status = row

            if uploader_id == viewer_id:
                return JsonResponse(
                    {'status': 'error', 'error': "You can't rate your own upload."},
                    status=400,
                )

            if review_status != 'approved':
                return JsonResponse(
                    {'status': 'error', 'error': 'You can only rate approved notes.'},
                    status=400,
                )

            cursor.execute(
                """
                INSERT INTO ratings (note_id, user_id, stars)
                VALUES (%s, %s, %s)
                ON DUPLICATE KEY UPDATE stars = VALUES(stars)
                """,
                (note_id, viewer_id, stars),
            )
            conn.commit()

            cursor.execute(
                "SELECT AVG(stars), COUNT(*) FROM ratings WHERE note_id = %s",
                (note_id,),
            )
            avg, count = cursor.fetchone()

            cursor.execute(
                "UPDATE notes SET rating_avg = %s, rating_count = %s WHERE id = %s",
                (avg or 0, count, note_id),
            )
            conn.commit()
    except Exception as e:
        conn.rollback()
        return JsonResponse({'status': 'error', 'error': str(e)}, status=500)
    finally:
        conn.close()

    return JsonResponse(
        {
            'status': 'success',
            'rating_avg': f"{avg:.2f}" if avg is not None else "0.00",
            'rating_count': count,
            'my_rating': stars,
        },
        status=200,
    )


def note_report(request, note_id):
    if request.method != 'POST':
        return JsonResponse({'status': 'error', 'error': 'Invalid request method'}, status=405)

    session_user = _get_session_user(request)
    if not session_user:
        return JsonResponse(
            {"status": "failed", "error": "You need to login first."},
            status=401,
        )

    try:
        body = json.loads(request.body or "{}")
    except json.JSONDecodeError:
        return JsonResponse({'status': 'error', 'error': 'Invalid JSON body'}, status=400)

    reason = (body.get("reason") or "").strip()
    detail = (body.get("detail") or "").strip()

    if not reason:
        return JsonResponse({'status': 'error', 'error': 'A reason is required.'}, status=400)

    full_reason = reason if not detail else f"{reason} — {detail}"

    conn = get_db_connection()
    try:
        with conn.cursor() as cursor:
            cursor.execute("SELECT id FROM notes WHERE id = %s", (note_id,))
            if cursor.fetchone() is None:
                return JsonResponse({'status': 'error', 'error': 'Note not found'}, status=404)

            cursor.execute(
                "INSERT INTO reports (note_id, reporter_id, reason) VALUES (%s, %s, %s)",
                (note_id, session_user.get('id'), full_reason),
            )
            conn.commit()
            report_id = cursor.lastrowid
    except Exception as e:
        conn.rollback()
        return JsonResponse({'status': 'error', 'error': str(e)}, status=500)
    finally:
        conn.close()

    return JsonResponse(
        {'status': 'success', 'message': 'Report sent to admins.', 'report_id': report_id},
        status=201,
    )