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
