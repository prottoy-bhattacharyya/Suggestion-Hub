import json
import os
import urllib.request
import urllib.error

from django.conf import settings
from django.http import JsonResponse
from pypdf import PdfReader

try:
    from google import genai
except ImportError:
    genai = None


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

    gemini_error = None
    gemini_api_key = os.environ.get("GEMINI_API_KEY", "").strip()
    gemini_model = os.environ.get("GEMINI_MODEL", "gemini-2.5-flash").strip()

    if gemini_api_key and genai is not None:
        try:
            gemini_client = genai.Client(api_key=gemini_api_key)
            gemini_response = gemini_client.models.generate_content(
                model=gemini_model,
                contents=prompt,
            )
            gemini_answer = getattr(gemini_response, "text", None)

            if isinstance(gemini_answer, str) and gemini_answer.strip():
                return JsonResponse({
                    "status": "success",
                    "provider": "gemini",
                    "answer": gemini_answer.strip(),
                })

            gemini_error = "Gemini returned an empty response."
        except Exception as error:
            gemini_error = str(error)
    elif genai is None:
        gemini_error = "The google-genai package is not installed."
    elif not gemini_api_key:
        gemini_error = "GEMINI_API_KEY is not configured."

    openrouter_api_key = os.environ.get("OPENROUTER_API_KEY", "").strip()
    if not openrouter_api_key:
        return JsonResponse(
            {
                "error": "Gemini failed and OPENROUTER_API_KEY is not configured.",
                "gemini_error": gemini_error,
            },
            status=502,
        )

    openrouter_model = os.environ.get("OPENROUTER_MODEL", "openrouter/free").strip()
    payload = {
        "model": openrouter_model,
        "messages": [
            {
                "role": "system",
                "content": "You answer questions only from the supplied PDF context. If the PDF does not contain the answer, say that clearly.",
            },
            {
                "role": "user",
                "content": prompt,
            },
        ],
    }

    try:
        request_body = json.dumps(payload).encode("utf-8")
        openrouter_request = urllib.request.Request(
            "https://openrouter.ai/api/v1/chat/completions",
            data=request_body,
            headers={
                "Authorization": f"Bearer {openrouter_api_key}",
                "Content-Type": "application/json",
                "HTTP-Referer": os.environ.get("OPENROUTER_SITE_URL", ""),
                "X-Title": os.environ.get("OPENROUTER_APP_NAME", "Suggestion Hub"),
            },
            method="POST",
        )

        with urllib.request.urlopen(openrouter_request, timeout=60) as response:
            openrouter_response = json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as error:
        try:
            details = json.loads(error.read().decode("utf-8"))
        except (json.JSONDecodeError, UnicodeDecodeError):
            details = {}

        provider_message = (
            details.get("error", {}).get("message")
            if isinstance(details.get("error"), dict)
            else None
        ) or details.get("message") or str(error)
        return JsonResponse(
            {
                "error": provider_message,
                "gemini_error": gemini_error,
            },
            status=error.code,
        )
    except Exception as e:
        return JsonResponse(
            {
                "error": str(e),
                "gemini_error": gemini_error,
            },
            status=502,
        )

    try:
        answer = openrouter_response["choices"][0]["message"]["content"]
    except (KeyError, IndexError, TypeError):
        return JsonResponse(
            {
                "error": "OpenRouter returned an empty or invalid response.",
                "gemini_error": gemini_error,
            },
            status=502,
        )

    if not isinstance(answer, str) or not answer.strip():
        return JsonResponse(
            {
                "error": "OpenRouter returned an empty response.",
                "gemini_error": gemini_error,
            },
            status=502,
        )

    return JsonResponse({
        "status": "success",
        "provider": "openrouter",
        "gemini_error": gemini_error,
        "answer": answer.strip(),
    })