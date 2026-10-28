import json
from django.shortcuts import render
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
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

    


def login(request):
    if not request.method == 'POST':
        return JsonResponse({"error": "Invalid request method."}, status=405)

    if request.session.get('user'):
        return JsonResponse(
            {
                "status": "redirect",
                "message": "User already logged in. Redirecting to dashboard.",
                "redirect_url": "/feed",  # Adjust this URL as needed
            },
            status=300,
        )

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