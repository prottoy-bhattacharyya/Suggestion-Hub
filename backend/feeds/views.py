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
                    n.created_at, n.review_status, n.uploader_id, u.full_name
                FROM notes n
                LEFT JOIN users u ON n.uploader_id = u.id
                WHERE n.review_status = 'approved' OR n.uploader_id = %s
                ORDER BY n.created_at DESC
                """,
                (viewer_id,),
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
                    "uploader_name": row[11],
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


