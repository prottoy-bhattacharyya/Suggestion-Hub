import json
import os

from django.conf import settings
from django.http import JsonResponse
from pypdf import PdfReader
from google import genai


def ask(request):
    session_user = request.session.get("user")
    if not session_user:
        return JsonResponse(
            {"error": "You need to login first."},
            status=401,
        )

    if request.method == "GET":
        note_id = request.GET.get("note_id")
        question = (request.GET.get("question") or "").strip()
    elif request.method == "POST":
        try:
            body = json.loads(request.body)
        except json.JSONDecodeError:
            return JsonResponse({"error": "Invalid JSON."}, status=400)

        note_id = body.get("note_id")
        question = (body.get("question") or "").strip()
    else:
        return JsonResponse(
            {"error": "Only GET and POST requests are supported."},
            status=405,
        )

    if not note_id:
        return JsonResponse({"error": "PDF ID is required."}, status=400)

    if not question:
        return JsonResponse({"error": "Question is required."}, status=400)

    # Replace this with the project's existing database helper.
    from core.utils import get_db_connection

    conn = get_db_connection()

    try:
        with conn.cursor() as cursor:
            cursor.execute(
                """
                SELECT file, file_type, review_status
                FROM notes
                WHERE id = %s
                """,
                (note_id,),
            )
            row = cursor.fetchone()
    finally:
        conn.close()

    if not row:
        return JsonResponse({"error": "PDF not found."}, status=404)

    file_name, file_type, review_status = row

    if file_type != "pdf":
        return JsonResponse({"error": "This feature only supports PDFs."}, status=400)

    if review_status != "approved":
        return JsonResponse({"error": "This PDF is not approved."}, status=403)

    pdf_path = os.path.normpath(
        os.path.join(settings.BASE_DIR, file_name)
    )

    if not os.path.isfile(pdf_path):
        return JsonResponse({"error": "PDF file is missing."}, status=404)

    reader = PdfReader(pdf_path)
    pdf_text = "\n".join(
        (page.extract_text() or "")
        for page in reader.pages
    )

    if not pdf_text.strip():
        return JsonResponse(
            {"error": "No readable text was found in this PDF."},
            status=422,
        )

    # Limit context to avoid sending an enormous prompt.
    context = pdf_text[:15000]

    prompt = f"""
                Answer the question using only the PDF content below.

                PDF CONTENT:
                {context}

                QUESTION:
                {question}

                If the answer is not in the PDF, say that it is not mentioned.
            """
    try:
        client = genai.Client()
        response = client.models.generate_content(
            model="gemini-3.8-flash",
            contents=prompt,
        )
    except Exception as e:
        return JsonResponse(
            {"error":  str(e)},
            status=500,
        )

    return JsonResponse({
        "status": "success",
        "answer": response.text,
    })