import json
from django.http import JsonResponse
from django.shortcuts import render
from core.utils import get_db_connection


# Create your views here.
def submit_review(request):
    if request.method != "POST":
        return JsonResponse({"status": "error", "message": "Invalid request method."}, status=405)

    
    session_user = request.session.get("user")
    if not session_user:
        return JsonResponse({"status": "error", "message": "User not logged in."}, status=401)

    try:
        data = json.loads(request.body or "{}")
    except json.JSONDecodeError:
        return JsonResponse({"status": "error", "message": "Invalid JSON body."}, status=400)

    note_id = data.get("note_id")
    teacher_id = session_user["id"]
    decision = data.get("decision")
    comment = data.get("comment", "")

    if decision not in ["approved", "rejected", "pending"]:
        return JsonResponse({"status": "error", "message": "Invalid decision value."}, status=400)

    conn = get_db_connection()
    with conn.cursor(dictionary=True) as cursor:
        try:
            cursor.execute("SELECT * FROM users WHERE id = %s", (session_user["id"],))
            user = cursor.fetchone()
            
            if not user:
                return JsonResponse({"status": "error", "message": "User not found."}, status=404)
            if user["role"] != "teacher":
                return JsonResponse({"status": "error", "message": "Only teachers can submit reviews."}, status=403)

            cursor.execute(
                """
                INSERT INTO reviews (note_id, teacher_id, decision, comment) 
                VALUES (%s, %s, %s, %s)""", 
                (note_id, teacher_id, decision, comment)
            )

            conn.commit()
            
            return JsonResponse({"status": "success", "message": "Review submitted successfully."})
        except Exception as e:
            return JsonResponse({"status": "error", "message": str(e)}, status=500)

def get_notes(request):
    if request.method != "GET":
        return JsonResponse({"status": "error", "message": "Invalid request method."}, status=405)

    session_user = request.session.get("user")
    if not session_user:
        return JsonResponse({"status": "error", "message": "User not logged in."}, status=401)

    if session_user["role"] != "teacher":
        return JsonResponse({"status": "error", "message": "Only teachers can view notes."}, status=403)
    
    teacher_id = session_user["id"]
    conn = get_db_connection()
    with conn.cursor(dictionary=True) as cursor:
        try:
            cursor.execute(
                """
                SELECT
                    n.id, n.title, n.description, n.course_id, n.type, c.code AS course_code, n.intake, 
                    n.section, n.review_status, n.created_at, 
                    u.full_name AS uploader_name
                FROM notes n
                JOIN teacher_courses tc ON n.course_id = tc.course_id
                JOIN users u ON n.uploader_id = u.id
                JOIN courses c ON n.course_id = c.id
                WHERE tc.teacher_id = %s
                """,
                (teacher_id,)
            )
            notes = cursor.fetchall()
            return JsonResponse({"status": "success", "notes": notes})
        except Exception as e:
            return JsonResponse({"status": "error", "message": str(e)}, status=500)

def get_review_logs(request):
    if request.method != "GET":
        return JsonResponse({"status": "error", "message": "Invalid request method."}, status=405)

    session_user = request.session.get("user")
    if not session_user:
        return JsonResponse({"status": "error", "message": "User not logged in."}, status=401)

    if session_user["role"] != "teacher":
        return JsonResponse({"status": "error", "message": "Only teachers can view review logs."}, status=403)

    teacher_id = session_user["id"]
    conn = get_db_connection()
    with conn.cursor(dictionary=True) as cursor:
        try:
            cursor.execute(
                """
                SELECT
                    r.id, r.note_id, r.decision, r.comment, r.created_at,
                    n.title AS note_title, n.course_id, c.code AS course_code
                FROM reviews r
                JOIN notes n ON r.note_id = n.id
                JOIN courses c ON n.course_id = c.id
                WHERE r.teacher_id = %s
                """,
                (teacher_id,)
            )
            review_logs = cursor.fetchall()
            return JsonResponse({"status": "success", "review_logs": review_logs})
        except Exception as e:
            return JsonResponse({"status": "error", "message": str(e)}, status=500)
