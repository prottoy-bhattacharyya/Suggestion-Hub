import json
import os
from django.shortcuts import render
from django.http import FileResponse, JsonResponse
from django.middleware.csrf import get_token
from core.utils import (
    avatar_absolute_path,
    avatar_relative_path,
    avatar_url,
    get_db_connection,
    process_avatar,
    write_avatar_file,
)

# Create your views here.
def csrf(request):
    return JsonResponse({"csrfToken": get_token(request)})

def signup(request):
    if not request.method == 'POST':
        return JsonResponse({"error": "Invalid request method."}, status=405)


    data = json.loads(request.body)

    email = data.get("email")
    password = data.get("password")
    full_name = data.get("fullName")
    account_type = data.get("accountType")
    student_id = data.get("studentId")
    department_id = data.get("departmentId")
    intake = data.get("intake")
    section = data.get("section")
    designation = data.get("designation")
    employee_id = data.get("employeeId")

    conn = get_db_connection()
    cursor = conn.cursor()

    is_email_exists_query = "SELECT COUNT(*) FROM users WHERE email = %s"
    cursor.execute(is_email_exists_query, (email,))
    email_exists = cursor.fetchone()[0] > 0
    if email_exists:
        cursor.close()
        conn.close()
        return JsonResponse({"error": "Email already exists."}, status=400)

    try:
        cursor.execute(
            """
            INSERT INTO users (email, password, full_name, role, student_id, department_id, intake, section, designation, employee_id)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """,
            (email, password, full_name, account_type, student_id, department_id, intake, section, designation, employee_id),
        )
    except Exception as e:
        cursor.close()
        conn.close()
        return JsonResponse({"error": str(e)}, status=500)

    conn.commit()

    cursor.close()
    conn.close()

    return JsonResponse(
        {   
            "status": "success",
            "message": "Account created successfully.",
        },
        status=201,
    )

def me(request):
    user = request.session.get('user')
    if not user:
        return JsonResponse(
            {
                "status": "failed",
                "loggedIn": False,
            }
        )
    with get_db_connection() as conn:
        cursor = conn.cursor(dictionary=True)

        cursor.execute("SELECT role, is_active, is_verified, avatar FROM users WHERE id = %s", (user['id'],))
        user_verification = cursor.fetchone()

        if not user_verification:
            return JsonResponse(
                {
                    "status": "failed",
                    "loggedIn": False,
                    "message": "User not found.",
                }
            )

    
    
    if not user_verification['is_active']:
        return JsonResponse(
            {
                "status": "error",
                "loggedIn": False,
                "message": "Account is inactive. Please contact support.",
            },
            status=403,
        )

    if user_verification["role"] == "teacher" and not user_verification["is_verified"]:
        response_data = {
            "status": "error",
            "loggedIn": False,
            "message": "Account is not verified. You can login after admin verification.",
        }
        return JsonResponse(response_data, status=403)

    
    if user:
        user = dict(user)
        user["avatar_url"] = avatar_url(request, user["id"], user_verification["avatar"])
        request.session['user'] = user
        return JsonResponse(
            {
                "status": "success",
                "loggedIn": True,
                "user": user
            },
            status=200,
        )
    
    return JsonResponse(
        {
            "status": "failed",
            "loggedIn": False,
        }
    )

def login(request):
    
    data = json.loads(request.body)

    email = data.get("email")
    password = data.get("password")

    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

        query = "SELECT * FROM users WHERE email = %s AND password = %s"
        cursor.execute(query, (email, password))
        user = cursor.fetchone()

    except Exception as e:
        return JsonResponse(
            {
                "status": "error",
                "message": str(e),
            },
            status=401,
        )

    if not user:
        return JsonResponse(
            {
                "status": "error",
                "message": "Invalid email or password.",
            },
            status=401,
        )
    if not user['is_active']:
        return JsonResponse(
            {
                "status": "error",
                "message": "Account is inactive. Please contact support.",
            },
            status=403,
        )
    if user["role"] == "student":
        response_data = {
            "status": "success",
            "message": "Login successful.",
            "user": {
                "id": user['id'],
                "email": user['email'],
                "full_name": user['full_name'],
                "role": user['role'],
                "student_id": user['student_id'],
                "department_id": user['department_id'],
                "intake": user['intake'],
                "section": user['section'],
                "avatar_url": avatar_url(request, user['id'], user.get('avatar')),
            }
        }
    if user["role"] == "teacher" and user["is_verified"]:
        response_data = {
            "status": "success",
            "message": "Login successful.",
            "user": {
                "id": user['id'],
                "email": user['email'],
                "full_name": user['full_name'],
                "role": user['role'],
                "department_id": user["department_id"],
                "designation": user["designation"],
                "employee_id": user["employee_id"],
                "avatar_url": avatar_url(request, user['id'], user.get('avatar')),
            }
        }
    
    if user["role"] == "teacher" and not user["is_verified"]:
        response_data = {
            "status": "error",
            "message": "Account is not verified. You can login after admin verification.",
        }
        return JsonResponse(response_data, status=403)

    
    request.session['user'] = response_data["user"]
    print(response_data["user"])
    
    return JsonResponse(response_data, status=200)

def logout(request):
    request.session.flush()
    return JsonResponse({"status": "success", "message": "Logged out."})


def profile(request, user_id):
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    cursor.execute(
        """
        SELECT u.id, u.email, u.full_name, u.role, u.student_id,
               u.department_id, u.intake, u.section, u.designation,
               u.employee_id, u.avatar, d.name AS department_name
        FROM users u
        LEFT JOIN departments d ON d.id = u.department_id
        WHERE u.id = %s
        """,
        (user_id,),
    )
    user = cursor.fetchone()

    if not user:
        cursor.close()
        conn.close()
        return JsonResponse({"error": "User not found."}, status=404)

    cursor.execute(
        "SELECT COUNT(*) AS total FROM follows WHERE following_id = %s",
        (user_id,),
    )
    followers = cursor.fetchone()["total"]

    cursor.execute(
        "SELECT COUNT(*) AS total FROM follows WHERE follower_id = %s",
        (user_id,),
    )
    following = cursor.fetchone()["total"]

    courses = []
    if user["role"] == "teacher":
        cursor.execute(
            """
            SELECT c.code
            FROM teacher_courses tc
            JOIN courses c ON c.id = tc.course_id
            WHERE tc.teacher_id = %s
            ORDER BY c.code
            """,
            (user_id,),
        )
        courses = [row["code"] for row in cursor.fetchall()]

    cursor.execute(
        """
        SELECT ur.points, ur.rank_title, ur.rank_global, ur.rank_department
        FROM user_rankings ur
        WHERE ur.user_id = %s
        """,
        (user_id,),
    )
    ranking_row = cursor.fetchone()
    if ranking_row:
        ranking = {
            "points": ranking_row["points"],
            "rank_title": ranking_row["rank_title"],
            "global_rank": ranking_row["rank_global"],
            "department_rank": ranking_row["rank_department"],
        }
    else:
        cursor.execute(
            """
            SELECT title
            FROM rank_titles
            WHERE start_point = 0
            LIMIT 1
            """
        )
        default_title = cursor.fetchone()
        ranking = {
            "points": 0,
            "rank_title": default_title["title"] if default_title else "Newbie",
            "global_rank": None,
            "department_rank": None,
        }

    user["avatar_url"] = avatar_url(request, user["id"], user.pop("avatar", None))

    cursor.close()
    conn.close()

    session_user = request.session.get('user')
    is_owner = bool(session_user) and session_user.get("id") == user_id


    return JsonResponse(
        {
            "user": user,
            "followers": followers,
            "following": following,
            "courses": courses,
            "is_owner": is_owner,
            "ranking": ranking,
        },
        status=200,
    )


def upload_avatar(request):
    if request.method != "POST":
        return JsonResponse({"status": "failed", "error": "Invalid request method."}, status=405)

    session_user = request.session.get("user")
    if not session_user:
        return JsonResponse({"status": "failed", "error": "You need to login first."}, status=401)

    user_id = session_user.get("id")
    uploaded_file = request.FILES.get("avatar")
    if not uploaded_file:
        return JsonResponse({"status": "failed", "error": "Avatar image is required."}, status=400)

    try:
        data = process_avatar(uploaded_file)
    except ValueError as error:
        return JsonResponse({"status": "failed", "error": str(error)}, status=400)

    relative_path = avatar_relative_path(user_id)
    created_path = avatar_absolute_path(relative_path)
    existed_before = bool(created_path and os.path.exists(created_path))
    old_avatar = None
    conn = get_db_connection()
    try:
        with conn.cursor(dictionary=True) as cursor:
            cursor.execute("SELECT avatar FROM users WHERE id = %s", (user_id,))
            user_row = cursor.fetchone()
            if not user_row:
                return JsonResponse({"status": "failed", "error": "User not found."}, status=404)
            old_avatar = user_row["avatar"]
            write_avatar_file(relative_path, data)
            cursor.execute("UPDATE users SET avatar = %s WHERE id = %s", (relative_path, user_id))
        conn.commit()
    except Exception as error:
        conn.rollback()
        if created_path and not existed_before and os.path.exists(created_path):
            os.remove(created_path)
        return JsonResponse({"status": "error", "error": str(error)}, status=500)
    finally:
        conn.close()

    if old_avatar and old_avatar != relative_path:
        old_path = avatar_absolute_path(old_avatar)
        if old_path and os.path.exists(old_path):
            os.remove(old_path)

    url = avatar_url(request, user_id, relative_path)
    session_user = dict(session_user)
    session_user["avatar_url"] = url
    request.session["user"] = session_user
    return JsonResponse({"status": "success", "avatar_url": url})


def user_avatar(request, user_id):
    if request.method != "GET":
        return JsonResponse({"status": "failed", "error": "Invalid request method."}, status=405)

    conn = get_db_connection()
    try:
        with conn.cursor(dictionary=True) as cursor:
            cursor.execute("SELECT avatar FROM users WHERE id = %s", (user_id,))
            user_row = cursor.fetchone()
    finally:
        conn.close()

    if not user_row or not user_row["avatar"]:
        return JsonResponse({"status": "failed", "error": "Avatar not found."}, status=404)

    path = avatar_absolute_path(user_row["avatar"])
    if not path or not os.path.isfile(path):
        return JsonResponse({"status": "failed", "error": "Avatar not found."}, status=404)

    response = FileResponse(open(path, "rb"), content_type="image/webp")
    response["Cache-Control"] = "public, max-age=3600"
    response["X-Content-Type-Options"] = "nosniff"
    return response