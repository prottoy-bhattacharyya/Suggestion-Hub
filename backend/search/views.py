from django.http import JsonResponse

from core.utils import get_db_connection


def search_people(request):
    q = (request.GET.get("q") or "").strip()

    if len(q) < 2:
        return JsonResponse({"users": []})

    session_user = request.session.get("user")
    viewer_id = session_user["id"] if session_user else 0

    conn = get_db_connection()
    try:
        with conn.cursor() as cursor:
            like = f"%{q}%"

            cursor.execute(
                """
                SELECT
                    u.id,
                    u.full_name,
                    u.email,
                    u.role,
                    u.designation,
                    d.name,
                    (
                        SELECT COUNT(*) FROM follows f
                        WHERE f.following_id = u.id
                    ) AS follower_count,
                    EXISTS(
                        SELECT 1 FROM follows f2
                        WHERE f2.follower_id = %s AND f2.following_id = u.id
                    ) AS is_following
                FROM users u
                LEFT JOIN departments d ON u.department_id = d.id
                WHERE u.is_active = 1
                  AND u.id <> %s
                  AND (u.full_name LIKE %s OR u.email LIKE %s OR d.name LIKE %s)
                ORDER BY (u.full_name LIKE %s) DESC, follower_count DESC, u.full_name
                LIMIT 20
                """,
                (viewer_id, viewer_id, like, like, like, like),
            )
            rows = cursor.fetchall()

            users = [
                {
                    "id": row[0],
                    "full_name": row[1],
                    "email": row[2],
                    "role": row[3],
                    "designation": row[4],
                    "department_name": row[5],
                    "follower_count": int(row[6]),
                    "is_following": bool(row[7]),
                }
                for row in rows
            ]

        return JsonResponse({"users": users})
    finally:
        conn.close()

def search_keywords(request):
    q = (request.GET.get("q") or "").strip()

    if len(q) < 2:
        return JsonResponse({"notes": []})

    conn = get_db_connection()
    try:
        with conn.cursor() as cursor:
            like = f"%{q}%"

            cursor.execute(
                """
                SELECT n.id, n.title, n.description, n.type, n.intake, n.section,
                    c.code AS course_code, n.rating_avg, n.rating_count, n.approved_at, 
                    u.id AS uploader_id, u.full_name AS author_name
                FROM notes n
                JOIN courses c ON c.id = n.course_id
                JOIN users u ON u.id = n.uploader_id
                WHERE (n.title LIKE %s OR n.description LIKE %s) AND n.review_status = 'approved'
                ORDER BY
                CASE
                    WHEN n.title LIKE %s THEN 3          -- title starts with the text
                    WHEN n.title LIKE %s THEN 2          -- a word in the title starts with it
                    WHEN n.title LIKE %s THEN 1          -- text appears anywhere in the title
                    ELSE 0                               -- only the description matched
                END DESC,
                n.approved_at DESC;
                """,
                (like, like, f"{q}%", f"% {q}%", like)
            )
            notes = cursor.fetchall()


            response = [
                {
                    "id": note[0],
                    "title": note[1],
                    "description": note[2],
                    "type": note[3],
                    "intake": note[4],
                    "section": note[5],
                    "course_code": note[6],
                    "rating_avg": float(note[7]) if note[7] is not None else None,
                    "rating_count": int(note[8]),
                    "approved_at": note[9].isoformat() if note[9] else None,
                    "author_id": note[10],
                    "author_name": note[11],
                    'file_url': request.build_absolute_uri(
                        f"/notes/{note[0]}/file/")

                }
                for note in notes
            ]
            

        return JsonResponse({"notes": response})
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)
    finally:
        conn.close()