import json
from django.shortcuts import render
from django.http import JsonResponse
from django.middleware.csrf import get_token
from core.utils import get_db_connection

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
            "message": "Account created successfully.",
            # "user_id": user.id,
        },
        status=201,
    )

def me(request):
    user = request.session.get('user')
    if user:
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
            }
        }
    if user["role"] == "teacher":
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
            }
        }

    
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
               u.employee_id, d.name AS department_name
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

    cursor.close()
    conn.close()

    # Hide other users' email; only the session owner sees their own.
    session_user = request.session.get('user')
    is_owner = bool(session_user) and session_user.get("id") == user_id
    if not is_owner:
        user.pop("email")

    return JsonResponse(
        {
            "user": user,
            "followers": followers,
            "following": following,
            "courses": courses,
            "is_owner": is_owner,
        },
        status=200,
    )


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
            cursor.execute("SELECT id FROM users WHERE id = %s", (user_id,))
            if cursor.fetchone() is None:
                return JsonResponse(
                    {"status": "failed", "error": "User not found."},
                    status=404,
                )

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

            cursor.execute(
                "SELECT COUNT(*) FROM follows WHERE following_id = %s",
                (user_id,),
            )
            follower_count = cursor.fetchone()[0]

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
