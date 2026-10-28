from django.shortcuts import render
from core import utils
from django.http import JsonResponse

# Create your views here.
def department_list(request):
    conn = utils.get_db_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute("SELECT * FROM departments")
    departments = cursor.fetchall()
    response_data = {
        "departments": departments
    }
    cursor.close()
    conn.close()
    return JsonResponse(response_data)


def course_list(request, department_id):
    conn = utils.get_db_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute("SELECT * FROM courses WHERE department_id = %s", (department_id,))
    courses = cursor.fetchall()
    response_data = {
        "courses": courses
    }
    cursor.close()
    conn.close()
    return JsonResponse(response_data)