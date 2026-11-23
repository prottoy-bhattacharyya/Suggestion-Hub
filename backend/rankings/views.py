from datetime import datetime

from django.http import JsonResponse

from core.utils import avatar_url, get_db_connection


def _positive_int(value, default, maximum=None):
    try:
        parsed = int(value)
    except (TypeError, ValueError):
        return default
    if parsed < 1:
        return default
    if maximum is not None and parsed > maximum:
        return maximum
    return parsed


def _standing(cursor, viewer_id, role, scope, department_id):
    if not viewer_id:
        return None

    cursor.execute(
        """
        SELECT ur.user_id, ur.points, ur.rank_title, ur.rank_global,
               ur.rank_department, ur.is_ranked, u.role, u.department_id
        FROM user_rankings ur
        JOIN users u ON u.id = ur.user_id
        WHERE ur.user_id = %s
        """,
        (viewer_id,),
    )
    row = cursor.fetchone()
    if not row:
        return None

    rank = None
    if (
        row["is_ranked"]
        and row["role"] == role
        and (scope != "department" or row["department_id"] == department_id)
    ):
        rank = row["rank_department"] if scope == "department" else row["rank_global"]

    return {
        "user_id": row["user_id"],
        "rank": rank,
        "points": row["points"],
        "rank_title": row["rank_title"],
        "is_ranked": bool(row["is_ranked"]),
    }


def titles(request):
    if request.method != "GET":
        return JsonResponse({"status": "error", "error": "Invalid request method."}, status=405)

    connection = get_db_connection()
    try:
        with connection.cursor(dictionary=True) as cursor:
            cursor.execute(
                """
                SELECT title, start_point, end_point
                FROM rank_titles
                ORDER BY start_point
                """
            )
            rows = cursor.fetchall()
        return JsonResponse({"status": "success", "titles": rows}, status=200)
    finally:
        connection.close()


def users(request):
    if request.method != "GET":
        return JsonResponse({"status": "error", "error": "Invalid request method."}, status=405)

    role = request.GET.get("role", "student")
    if role not in ("student", "teacher"):
        return JsonResponse(
            {"status": "error", "error": "role must be student or teacher."},
            status=400,
        )

    scope = request.GET.get("scope", "all")
    if scope not in ("all", "department"):
        return JsonResponse(
            {"status": "error", "error": "scope must be all or department."},
            status=400,
        )

    department_id = None
    if scope == "department":
        try:
            department_id = int(request.GET.get("department_id"))
        except (TypeError, ValueError):
            return JsonResponse(
                {"status": "error", "error": "department_id is required for department scope."},
                status=400,
            )

    limit = _positive_int(request.GET.get("limit"), 20, 100)
    offset = _positive_int(request.GET.get("offset"), 0, 1000000)
    if request.GET.get("offset") in (None, "", "0"):
        offset = 0

    viewer = request.session.get("user")
    viewer_id = viewer.get("id") if viewer else None

    where = "ur.is_ranked = 1 AND u.role = %s"
    params = [role]
    if scope == "department":
        where += " AND u.department_id = %s"
        params.append(department_id)

    rank_column = "ur.rank_department" if scope == "department" else "ur.rank_global"
    if role == "teacher":
        tie_breaker = "ur.completed_reviews DESC, ur.followers DESC"
    else:
        tie_breaker = (
            "ur.approved_uploads DESC, ur.ratings_received DESC, "
            "ur.views_received DESC, ur.followers DESC"
        )

    connection = get_db_connection()
    try:
        with connection.cursor(dictionary=True) as cursor:
            cursor.execute(
                f"""
                SELECT COUNT(*) AS total
                FROM user_rankings ur
                JOIN users u ON u.id = ur.user_id
                WHERE {where}
                """,
                params,
            )
            total = cursor.fetchone()["total"]

            cursor.execute(
                f"""
                SELECT ur.user_id, ur.points, ur.rank_title,
                       ur.rank_global, ur.rank_department,
                       ur.approved_uploads, ur.ratings_received,
                       ur.views_received, ur.followers,
                       ur.comments_received, ur.completed_reviews,
                        u.full_name, u.role, u.department_id, u.avatar,
                        d.name AS department_name,
                       CASE WHEN ur.user_id = %s THEN 1 ELSE 0 END AS is_me
                FROM user_rankings ur
                JOIN users u ON u.id = ur.user_id
                LEFT JOIN departments d ON d.id = u.department_id
                WHERE {where}
                ORDER BY {rank_column} ASC, ur.points DESC, {tie_breaker},
                         u.full_name ASC, ur.user_id ASC
                LIMIT %s OFFSET %s
                """,
                [viewer_id, *params, limit, offset],
            )
            entries = cursor.fetchall()

            if viewer_id and entries:
                candidate_ids = [
                    entry["user_id"] for entry in entries if entry["user_id"] != viewer_id
                ]
                following_ids = set()
                if candidate_ids:
                    placeholders = ", ".join(["%s"] * len(candidate_ids))
                    cursor.execute(
                        f"""
                        SELECT following_id
                        FROM follows
                        WHERE follower_id = %s AND following_id IN ({placeholders})
                        """,
                        [viewer_id, *candidate_ids],
                    )
                    following_ids = {row["following_id"] for row in cursor.fetchall()}
                for entry in entries:
                    entry["is_following"] = entry["user_id"] in following_ids
            else:
                for entry in entries:
                    entry["is_following"] = None

            for entry in entries:
                entry["is_me"] = bool(entry["is_me"])
                entry["avatar_url"] = avatar_url(request, entry["user_id"], entry["avatar"])
                entry["rank"] = (
                    entry["rank_department"] if scope == "department" else entry["rank_global"]
                )
                entry["title"] = entry.pop("rank_title")
                entry["stats"] = {
                    "approved_uploads": entry.pop("approved_uploads"),
                    "ratings_received": entry.pop("ratings_received"),
                    "views_received": entry.pop("views_received"),
                    "followers": entry.pop("followers"),
                    "comments_received": entry.pop("comments_received"),
                    "completed_reviews": entry.pop("completed_reviews"),
                }

            viewer_standing = _standing(cursor, viewer_id, role, scope, department_id)

        return JsonResponse(
            {
                "status": "success",
                "role": role,
                "scope": scope,
                "department_id": department_id,
                "period": "all",
                "total": total,
                "generated_at": datetime.now().isoformat(),
                "entries": entries,
                "viewer": viewer_standing,
            },
            status=200,
        )
    finally:
        connection.close()


def me(request):
    if request.method != "GET":
        return JsonResponse({"status": "error", "error": "Invalid request method."}, status=405)

    session_user = request.session.get("user")
    if not session_user:
        return JsonResponse(
            {"status": "failed", "error": "You need to login first."},
            status=401,
        )

    role = request.GET.get("role", session_user.get("role", "student"))
    if role not in ("student", "teacher"):
        role = "student" if session_user.get("role") != "teacher" else "teacher"

    scope = request.GET.get("scope", "all")
    if scope not in ("all", "department"):
        scope = "all"

    department_id = None
    if scope == "department":
        try:
            department_id = int(request.GET.get("department_id"))
        except (TypeError, ValueError):
            department_id = session_user.get("department_id")

    connection = get_db_connection()
    try:
        with connection.cursor(dictionary=True) as cursor:
            standing = _standing(cursor, session_user.get("id"), role, scope, department_id)
            cursor.execute(
                """
                SELECT title, start_point, end_point
                FROM rank_titles
                ORDER BY start_point
                """
            )
            title_rows = cursor.fetchall()
    finally:
        connection.close()

    points = standing["points"] if standing else 0
    next_title = next((row for row in title_rows if row["start_point"] > points), None)

    return JsonResponse(
        {
            "status": "success",
            "role": role,
            "scope": scope,
            "period": "all",
            "viewer": standing,
            "next_title": next_title["title"] if next_title else None,
            "points_to_next_title": (
                next_title["start_point"] - points if next_title else 0
            ),
            "titles": title_rows,
        },
        status=200,
    )
