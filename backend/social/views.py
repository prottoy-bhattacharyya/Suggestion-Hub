import json
from django.http import JsonResponse
from django.shortcuts import render
from core.utils import get_db_connection

# Create your views here.
def follow(request, user_id):
    if request.method != "POST":
        return JsonResponse(
            {"status": "failed", "error": "Invalid request method."},
            status=405,
        )

    session_user = request.session.get('user')
    if not session_user:
        return JsonResponse(
            {"status": "failed", "error": "You need to login first."},
            status=401,
        )

    follower_id = session_user.get("id")

    if user_id == follower_id:
        return JsonResponse(
            {"status": "failed", "error": "You cannot follow yourself."},
            status=400,
        )

    action = "follow"
    try:
        body = json.loads(request.body or "{}")
        if isinstance(body.get("action"), str):
            action = body["action"]
    except json.JSONDecodeError:
        pass

    if action not in ("follow", "unfollow"):
        return JsonResponse(
            {"status": "failed", "error": "Invalid action."},
            status=400,
        )

    conn = get_db_connection()
    try:
        with conn.cursor() as cursor:
            # Check if the user to follow/unfollow exists
            cursor.execute("SELECT id FROM users WHERE id = %s", (user_id,))
            if cursor.fetchone() is None:
                return JsonResponse(
                    {"status": "failed", "error": "User not found."},
                    status=404,
                )

            # Perform the follow/unfollow action
            if action == "follow":
                cursor.execute(
                    "INSERT IGNORE INTO follows (follower_id, following_id) VALUES (%s, %s)",
                    (follower_id, user_id),
                )
            else:
                cursor.execute(
                    "DELETE FROM follows WHERE follower_id = %s AND following_id = %s",
                    (follower_id, user_id),
                )
            conn.commit()

            # Get the updated follower count and following status
            cursor.execute(
                "SELECT COUNT(*) FROM follows WHERE following_id = %s",
                (user_id,),
            )
            follower_count = cursor.fetchone()[0]


            # Check if the session user is following the target user
            cursor.execute(
                """
                SELECT COUNT(*)
                FROM follows
                WHERE follower_id = %s AND following_id = %s
                """,
                (follower_id, user_id),
            )
            is_following = cursor.fetchone()[0] > 0

        return JsonResponse(
            {
                "status": "success",
                "action": action,
                "is_following": is_following,
                "follower_count": follower_count,
            }
        )
    finally:
        conn.close()

def is_following(request):
    user_id = request.GET.get("user_id")
    if user_id is None:
        return JsonResponse(
            {"status": "failed", "error": "user_id is required."},
            status=400,
        )

    session_user = request.session.get('user')
    if not session_user:
        return JsonResponse(
            {"status": "failed", "error": "You need to login first."},
            status=401,
        )

    follower_id = session_user.get("id")

    conn = get_db_connection()
    try:
        with conn.cursor() as cursor:
            cursor.execute(
                """
                SELECT COUNT(*)
                FROM follows
                WHERE follower_id = %s AND following_id = %s
                """,
                (follower_id, user_id),
            )
            is_following = cursor.fetchone()[0] > 0

        return JsonResponse(
            {
                "status": "success",
                "is_following": is_following,
            }
        )
    finally:
        conn.close()