from django.http import JsonResponse

from core.utils import get_db_connection


def feeds(request):
    session_user = request.session.get("user")
    if not session_user:
        return JsonResponse(
            {"status": "failed", "error": "You need to login first."},
            status=401,
        )

    viewer_id = session_user["id"]
    print(type(viewer_id))

    conn = get_db_connection()
    try:
        with conn.cursor() as cursor:
            cursor.execute(
                """
                SELECT
                    n.id, n.title, COALESCE(n.description, ''), n.type,
                    n.intake, COALESCE(n.section, ''), n.rating_avg, n.rating_count,
                    n.created_at, n.review_status, n.uploader_id, c.code AS course_code, u.full_name,
                    n.file_type
                FROM notes n
                LEFT JOIN users u ON n.uploader_id = u.id
                LEFT JOIN courses c ON n.course_id = c.id
                WHERE n.review_status = 'approved'
                ORDER BY n.created_at DESC
                """,
            )
            rows = cursor.fetchall()

            notes = [
                {
                    "id": row[0],
                    "title": row[1],
                    "description": row[2],
                    "type": row[3],
                    "intake": row[4],
                    "section": row[5],
                    "rating_avg": row[6],
                    "rating_count": row[7],
                    "created_at": row[8].isoformat() if row[8] else None,
                    "review_status": row[9],
                    "uploader_id": row[10],
                    "course_code": row[11],
                    "uploader_name": row[12],
                    "file_type": row[13],
                    "file_url": request.build_absolute_uri(f"/notes/{row[0]}/file/"),
                }
                for row in rows
            ]

        return JsonResponse(
            {
                "status": "success",
                "message": "Feeds fetched successfully",
                "notes": notes,
            }
        )
    finally:
        conn.close()


def get_feeds_by_following(request):
    session_user = request.session.get('user')
    if not session_user:
        return JsonResponse(
            {"status": "failed", "error": "You need to login first."},
            status=401,
        )

    user_id = session_user.get("id")

    conn = get_db_connection()
    try:
        with conn.cursor(dictionary=True) as cursor:
            cursor.execute(
                """
                SELECT n.id, n.title, n.description, n.type, n.intake, n.section,
                       n.rating_avg, n.rating_count, n.created_at, n.review_status,
                       u.full_name AS uploader_name, r.comment AS review_comment,
                       n.file_type
                FROM notes n
                JOIN users u ON n.uploader_id = u.id
                LEFT JOIN reviews r ON n.id = r.note_id
                WHERE u.id IN (
                    SELECT following_id FROM follows WHERE follower_id = %s
                )
                AND n.review_status = 'approved'
                """,
                (user_id,),
            )
            notes = cursor.fetchall()

        for note in notes:
            note["created_at"] = note["created_at"].strftime("%Y-%m-%d") if note["created_at"] else None
            note["file_url"] = request.build_absolute_uri(f"/notes/{note['id']}/file/")

        return JsonResponse({"status": "success", "notes": notes})
    finally:
        conn.close()