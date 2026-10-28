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

    if request.session.get('email'):
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


    request.session['email'] = email
    return JsonResponse(
        {
            "status": "success", 
            "message": "Login successful."
        }, 
    status=200)