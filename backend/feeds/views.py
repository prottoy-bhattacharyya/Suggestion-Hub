from django.shortcuts import render
from core.utils import get_db_connection
from django.http import JsonResponse

# Create your views here.
def feeds(request):
    if not request.session.get("user"):
        return JsonResponse({
            "status": "failed",
            "message": "You need to login First"
        })
    
    conn =  get_db_connection()
    
    try:
        with conn.cursor() as cursor:
            cursor.execute
            ("""
                SELECT 
                    id,
                    title,
                    description,
                    type,
                    intake,
                    section,
                    file,
                    rating_avg,
                    rating_count,
                    review_status,
                    approved_at
                FROM notes
                ORDER BY approved_at DESC
            """)
            rows = cursor.fetchall()
            notes = [
                {
                    "id": row[0],
                    "title": row[1],
                    "description": row[2],
                    "type": row[3],
                    "intake": row[4],
                    "section": row[5],
                    "file": row[6],
                    "rating_avg": row[7],
                    "rating_count": row[8],
                    "review_status": row[9],
                    "approved_at": row[10],
                }
                for row in rows
            ]
            return JsonResponse(notes, safe=False)
    finally:
        conn.close()

    

        

