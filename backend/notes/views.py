# * ======================================================================
# * NOTES VIEWS: upload, download/stream, detail, views, ratings, reports
# * ======================================================================
#
# Better Comments legend used in this file:
#   # *      green   key idea / section header
#   # !      red     bug risk, security issue, or something that surprises
#   # ?      blue    something to double check (I could not see that code)
#   # TODO   orange  suggested improvement
#   # //     grey    redundant or debug code you can probably delete
#   #        plain   normal explanation, "e.g." lines are worked examples
#
# Endpoints in this file (URLs are examples; yours come from urls.py):
#
#   POST /notes/upload/             upload_note        add a PDF/video (one request or in chunks)
#   GET  /notes/<id>/file/          note_file          download / stream the file
#   GET  /notes/?user_id=7          get_notes          one user's notes (profile page)
#   GET  /notes/<id>/               note_detail        one note's details
#   POST /notes/<id>/view/          note_view          count a view
#   GET  /notes/<id>/views/?days=30 note_view_history  views per day for one note
#   GET  /notes/views/daily/        note_views_daily   my views per day across all my notes
#   POST /notes/<id>/rate/          note_rate          give 1-5 stars
#   POST /notes/<id>/report/        note_report        report a note to admins
#
# Every endpoint follows the same pattern:
#   1. check the HTTP method      -> 405 / 400 if wrong
#   2. check the session login    -> 401 if not logged in
#   3. validate the input         -> 400 if bad
#   4. check permissions          -> 403 if not allowed
#   5. do the database work       -> 500 if something unexpected breaks
#   6. return JSON

import json
import os
import re
import hashlib
import shutil
from datetime import date, timedelta
from pathlib import Path

from django.conf import settings
from django.http import FileResponse, HttpResponse, JsonResponse
from django.views.decorators.clickjacking import xframe_options_exempt

from .utils import getFileHash, save_file
from core.utils import avatar_url, get_db_connection, note_absolute_path
from rankings.service import (
    rebuild_rank_positions,
    recalculate_user_rank,
    recalculate_users_ranks,
)

# * ----------------------------------------------------------------------
# * Constants
# * ----------------------------------------------------------------------

# Size limits. 20 * 1024 * 1024 = 20 MB written in bytes.
MAX_PDF_BYTES = 20 * 1024 * 1024
MAX_VIDEO_BYTES = 500 * 1024 * 1024

# Allowed file extensions. Sets make "ext in PDF_EXTENSIONS" fast.
PDF_EXTENSIONS = {".pdf"}
VIDEO_EXTENSIONS = {".mp4", ".webm", ".mov"}

# Extension -> Content-Type header, so the browser's video player knows the format.
VIDEO_CONTENT_TYPES = {".mp4": "video/mp4", ".webm": "video/webm", ".mov": "video/quicktime"}

# Chunked uploads: the client slices a big file into 10 MB pieces.
# e.g. a 26,214,400 byte (25 MB) video becomes 3 chunks: 10 MB + 10 MB + 5 MB.
CHUNK_SIZE = 10 * 1024 * 1024


# Create your views here.
# * ======================================================================
# * 1. UPLOAD
# * ======================================================================
# upload_note handles TWO kinds of requests on the same URL:
#
#   A) CHUNKED upload   (the request contains `upload_id`)
#        One request per 10 MB piece. Only the last request finishes the job.
#        Use this for big videos so one request never has to carry 500 MB.
#
#   B) SINGLE upload    (no `upload_id`)
#        The whole file arrives in one request. Fine for PDFs (max 20 MB).
#
# Form fields common to both (multipart/form-data):
#   course_id, title, description, type ("note" | "suggestion"),
#   intake, section, media_type ("pdf" | "video", optional), file
def upload_note(request):
    # Only POST may upload. Note the status is 400 here; 405 would be the
    # more exact HTTP code (the other views in this file use 405).
    if not request.method == 'POST':
        return JsonResponse({'error': 'Invalid request method'}, status=400)

    # The login view stores the user in the session, e.g.
    #   request.session['user'] = {"id": 7, "role": "student", ...}
    session_user = request.session.get('user')
    if not session_user:
        return JsonResponse(
            {"status": "failed", "error": "You need to login first."},
            status=401,
        )

    # The uploader always comes from the session, never from the form, so a
    # user can't upload "as" someone else.
    uploader_id = session_user.get('id')
    course_id = request.POST.get('course_id')
    title = request.POST.get('title')
    description = request.POST.get('description')
    # ! `type` shadows Python's built-in type(). It works, but rename it
    # ! (e.g. note_type) so you don't trip over it later.
    type = request.POST.get('type')
    intake = request.POST.get('intake')
    section = request.POST.get('section')
    # ! None of these fields are validated here. A request with no title or an
    # ! unknown course_id goes straight to the INSERT and only fails if the
    # ! database rejects it (or worse, saves empty values).
    # TODO: reject empty title/course_id/intake/section with a 400, and check
    # TODO: that `type` is one of ("note", "suggestion").

    # -------------------------------------------------------------------
    # * A) CHUNKED UPLOAD
    # -------------------------------------------------------------------
    # e.g. chunk 0 of 3 for a 25 MB file:
    #   upload_id=Ab3dEf9hIj  chunk_index=0  total_chunks=3
    #   declared_size=26214400  original_name=lecture.mp4  file=<10 MB blob>
    upload_id = request.POST.get('upload_id')
    if upload_id:
        # Step 1: read the numbers. int() fails on text like "abc".
        try:
            chunk_index = int(request.POST.get('chunk_index', '-1'))
            total_chunks = int(request.POST.get('total_chunks', '0'))
            declared_size = int(request.POST.get('declared_size', '0'))
        except (TypeError, ValueError):
            return JsonResponse(
                {'status': 'error', 'error': 'Invalid chunk metadata'},
                status=400,
            )

        # basename() strips any folders: "../../etc/passwd" -> "passwd",
        # "C:\\Users\\me\\a.pdf" is NOT stripped on Linux (see the note below).
        original_name = os.path.basename(request.POST.get('original_name', ''))
        chunk = request.FILES.get('file')

        # Step 2: upload_id becomes a FOLDER NAME on disk, so it must be
        # strictly letters, digits, "_" or "-", 8 to 128 characters.
        # e.g. "Ab3dEf9hIj" passes, "../../x" and "a b" fail.
        # This blocks path traversal (writing outside the chunks folder).
        if not re.fullmatch(r'[A-Za-z0-9_-]{8,128}', upload_id):
            return JsonResponse(
                {'status': 'error', 'error': 'Invalid upload_id'},
                status=400,
            )

        if not original_name:
            return JsonResponse(
                {'status': 'error', 'error': 'Original filename is required'},
                status=400,
            )

        if not chunk:
            return JsonResponse(
                {'status': 'error', 'error': 'No chunk provided'},
                status=400,
            )

        # Step 3: the chunk number must be inside 0 .. total_chunks-1.
        # e.g. total_chunks=3 -> only 0, 1, 2 are valid.
        if chunk_index < 0 or chunk_index >= total_chunks:
            return JsonResponse(
                {'status': 'error', 'error': 'Invalid chunk index'},
                status=400,
            )

        if total_chunks < 1 or declared_size < 1:
            return JsonResponse(
                {'status': 'error', 'error': 'Invalid upload size'},
                status=400,
            )

        # Step 4: the client's chunk count must match the size it claims.
        # (a + b - 1) // b is "divide and round UP".
        # e.g. declared_size=26214400, CHUNK_SIZE=10485760
        #      (26214400 + 10485759) // 10485760 = 3
        # If the client says total_chunks=5 for that file -> "Chunk count mismatch".
        expected_chunks = (declared_size + CHUNK_SIZE - 1) // CHUNK_SIZE
        if total_chunks != expected_chunks:
            return JsonResponse(
                {'status': 'error', 'error': 'Chunk count mismatch'},
                status=400,
            )

        # Step 5: work out the file type from the extension.
        # e.g. "Lecture.MP4" -> ".mp4" -> "video"
        ext = os.path.splitext(original_name)[1].lower()
        if ext in PDF_EXTENSIONS:
            file_type = 'pdf'
        elif ext in VIDEO_EXTENSIONS:
            file_type = 'video'
        else:
            return JsonResponse(
                {'status': 'error', 'error': 'Unsupported file type'},
                status=400,
            )
        # ! Only the extension is checked. Renaming virus.exe to virus.pdf
        # ! passes. See the TODO at the end of the upload for content checks.

        # Step 6: the file must match what the user picked on the page.
        # e.g. the "PDF" tab is selected (media_type="pdf") but a .mp4 arrives
        # -> rejected. If media_type is empty this check is skipped.
        media_type = (request.POST.get('media_type') or '').lower()
        if media_type and media_type != file_type:
            return JsonResponse(
                {'status': 'error', 'error': 'File does not match the selected upload kind'},
                status=400,
            )

        # Step 7: size limits. declared_size is what the client CLAIMS; it is
        # checked again against the real bytes after assembly (Step 12).
        max_bytes = MAX_PDF_BYTES if file_type == 'pdf' else MAX_VIDEO_BYTES
        if declared_size > max_bytes:
            return JsonResponse(
                {'status': 'error', 'error': 'File exceeds the maximum size'},
                status=400,
            )

        # Step 8: size rules for THIS chunk.
        # e.g. declared 25 MB, 3 chunks:
        #   chunk 0 and 1 must be exactly 10 MB
        #   chunk 2 must be 26214400 - (2 * 10485760) = 5,242,880 bytes (5 MB)
        if chunk.size > CHUNK_SIZE:
            return JsonResponse(
                {'status': 'error', 'error': 'Chunk exceeds 10 MB'},
                status=400,
            )

        if chunk_index < total_chunks - 1:
            if chunk.size != CHUNK_SIZE:
                return JsonResponse(
                    {'status': 'error', 'error': 'Non-final chunk must be exactly 10 MB'},
                    status=400,
                )
        elif chunk.size != declared_size - (chunk_index * CHUNK_SIZE):
            return JsonResponse(
                {'status': 'error', 'error': 'Final chunk size mismatch'},
                status=400,
            )

        # Step 9: save this chunk to a temporary folder.
        #   uploaded_notes/.chunks/<upload_id>/0.part
        #   uploaded_notes/.chunks/<upload_id>/1.part  ...
        # parents=True creates missing parent folders, exist_ok=True means
        # "don't fail if the folder is already there" (chunk 1, 2 ...).
        chunks_dir = Path(settings.BASE_DIR) / 'uploaded_notes' / '.chunks'
        upload_dir = chunks_dir / upload_id
        upload_dir.mkdir(parents=True, exist_ok=True)
        chunk_path = upload_dir / f'{chunk_index}.part'
        # ! upload_id is not tied to a user. Anyone who guesses another user's
        # ! upload_id could write chunks into that folder. IDs are random so
        # ! this is unlikely, but you could prefix the folder with uploader_id.

        # Write in small pieces (chunk.chunks()) so a 10 MB chunk is never
        # held in memory all at once.
        with chunk_path.open('wb') as destination:
            for chunk_part in chunk.chunks():
                destination.write(chunk_part)

        # Step 10: not the last chunk yet -> tell the client to send the next.
        # e.g. after chunk 0 of 3:
        #   {"status": "pending", "received_chunks": 1, "total_chunks": 3}
        if chunk_index + 1 < total_chunks:
            return JsonResponse({
                'status': 'pending',
                'received_chunks': chunk_index + 1,
                'total_chunks': total_chunks,
            })

        # ---- Everything below runs ONLY for the final chunk ----

        # Step 11: confirm every part file exists (the client may have sent
        # them out of order or skipped one).
        # e.g. only 0.part and 2.part on disk -> missing_chunks = [1]
        missing_chunks = [
            index
            for index in range(total_chunks)
            if not (upload_dir / f'{index}.part').is_file()
        ]

        if missing_chunks:
            return JsonResponse(
                {
                    'status': 'error',
                    'error': 'Missing upload chunks',
                    'missing_chunks': missing_chunks,
                },
                status=400,
            )

        # Step 12: glue 0.part + 1.part + 2.part into assembled.part, in order.
        # copyfileobj streams the data, so memory use stays small.
        assembled_path = upload_dir / 'assembled.part'
        assembled_size = 0

        with assembled_path.open('wb') as assembled:
            for index in range(total_chunks):
                part_path = upload_dir / f'{index}.part'
                with part_path.open('rb') as part:
                    shutil.copyfileobj(part, assembled)
                assembled_size += part_path.stat().st_size

        # The real total must equal what the client declared at the start.
        if assembled_size != declared_size:
            shutil.rmtree(upload_dir, ignore_errors=True)
            return JsonResponse(
                {'status': 'error', 'error': 'Assembled file size mismatch'},
                status=400,
            )

        # Step 13: fingerprint the file (SHA-256) to detect duplicates.
        # Reading 1 MB at a time keeps memory low for 500 MB videos.
        # `iter(callable, b'')` keeps calling read() until it returns b'' (EOF).
        # Two identical files always give the same 64-character hex string.
        digest = hashlib.sha256()
        with assembled_path.open('rb') as assembled:
            for block in iter(lambda: assembled.read(1024 * 1024), b''):
                digest.update(block)
        file_hash = digest.hexdigest()

        conn = get_db_connection()
        try:
            # Step 14: duplicate check. Same hash already in `notes` = same file.
            with conn.cursor() as cursor:
                cursor.execute(
                    'SELECT COUNT(*) FROM notes WHERE file_hash = %s',
                    (file_hash,),
                )
                if cursor.fetchone()[0] > 0:
                    shutil.rmtree(upload_dir, ignore_errors=True)
                    return JsonResponse(
                        {'status': 'error', 'error': 'Duplicate file detected'},
                        status=400,
                    )
            # ! The duplicate check is a SELECT and the INSERT comes later, so
            # ! two simultaneous uploads of the same file can both pass.
            # TODO: add a UNIQUE index on notes.file_hash and catch the
            # TODO: duplicate-key error. That makes it race-proof.

            # Step 15: move the finished file to its final place.
            # e.g. original_name="lecture.mp4" -> uploaded_notes/lecture.mp4
            # os.replace is a fast rename within the same disk.
            os.makedirs(settings.BASE_DIR / 'uploaded_notes', exist_ok=True)
            file_path = os.path.join('uploaded_notes', original_name)
            final_path = settings.BASE_DIR / file_path
            # ! The stored name is the ORIGINAL filename. If two different
            # ! users upload different files both called "notes.pdf", the
            # ! second os.replace silently OVERWRITES the first file on disk
            # ! while the database still has two rows pointing at it.
            # TODO: store a unique name, e.g. f"{file_hash[:16]}{ext}" or a UUID,
            # TODO: and keep the original name in a separate column.
            os.replace(assembled_path, final_path)

            # Step 16: save the note row and update the uploader's ranking.
            # %s placeholders keep user text out of the SQL string (no SQL injection).
            with conn.cursor() as insert_cursor:
                insert_cursor.execute(
                    """
                    INSERT INTO notes (
                        uploader_id, course_id, title, description, type,
                        intake, section, file, file_type, file_hash
                    )
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    """,
                    (
                        uploader_id,
                        course_id,
                        title,
                        description,
                        type,
                        intake,
                        section,
                        file_path,
                        file_type,
                        file_hash,
                    ),
                )

                # ? recalculate_user_rank / rebuild_rank_positions come from
                # ? rankings/service.py (not shown). Presumably: recompute this
                # ? uploader's score, then recompute everyone's leaderboard
                # ? position. rebuild=False skips the rebuild inside the first
                # ? call because the second call does it.
                recalculate_user_rank(uploader_id, cursor=insert_cursor, rebuild=False)
                rebuild_rank_positions(insert_cursor)
                # commit() makes the INSERT and rank updates permanent together.
                conn.commit()
                shutil.rmtree(upload_dir, ignore_errors=True)
            return JsonResponse(
                {
                    'status': 'success',
                    'message': 'Note uploaded successfully',
                },
                status=201,
            )
        except Exception as error:
            # Any failure above: undo the database changes and delete temp files.
            conn.rollback()
            shutil.rmtree(upload_dir, ignore_errors=True)
            # ! str(error) can leak internal details (table names, paths) to
            # ! the browser. Log it on the server and return a generic message.
            return JsonResponse(
                {'status': 'error', 'error': str(error)},
                status=500,
            )
        finally:
            # Always give the connection back, success or failure.
            conn.close()
        # ! If the INSERT fails AFTER os.replace, the file stays on disk with
        # ! no database row (an orphan). Fine for now; a cleanup job can
        # ! remove files that no note points at.
        # TODO: scan the file's real content (e.g. PDF header "%PDF-", video
        # TODO: container) instead of trusting the extension.
        # TODO: delete stale folders in uploaded_notes/.chunks/ (abandoned
        # TODO: uploads) with a daily job.

    # -------------------------------------------------------------------
    # * B) SINGLE-REQUEST UPLOAD  (no upload_id)
    # -------------------------------------------------------------------
    file = request.FILES.get('file')

    if not file:
        return JsonResponse({'status': 'error', 'error': 'No file provided'}, status=400)

    media_type = (request.POST.get('media_type') or '').lower()

    # Same type detection as the chunked path.
    # e.g. "Chapter1.PDF" -> ".pdf" -> "pdf"
    ext = os.path.splitext(file.name)[1].lower()
    if ext in PDF_EXTENSIONS:
        file_type = 'pdf'
    elif ext in VIDEO_EXTENSIONS:
        file_type = 'video'
    else:
        return JsonResponse(
            {'status': 'error', 'error': 'Unsupported file type. Upload a PDF, MP4, WebM or MOV file.'},
            status=400,
        )

    # e.g. the video tab is chosen (media_type="video") but a .pdf is sent -> 400.
    if media_type and media_type != file_type:
        return JsonResponse(
            {'status': 'error', 'error': 'File does not match the selected upload kind.'},
            status=400,
        )

    # Here the real size is known (file.size), unlike the chunked path where
    # the size is only declared.
    # e.g. a 25 MB PDF -> limit_mb = 20 -> "File too large. Maximum size is 20 MB."
    max_bytes = MAX_PDF_BYTES if file_type == 'pdf' else MAX_VIDEO_BYTES
    if file.size > max_bytes:
        limit_mb = max_bytes // (1024 * 1024)
        return JsonResponse(
            {'status': 'error', 'error': f'File too large. Maximum size is {limit_mb} MB.'},
            status=400,
        )

    # e.g. "uploaded_notes/Chapter1.pdf"
    # ! Same filename-collision problem as the chunked path (see above).
    file_path = os.path.join("uploaded_notes", file.name)
    # ? getFileHash lives in notes/utils.py (not shown). It must rewind the
    # ? file (file.seek(0)) after reading, otherwise save_file below could
    # ? write an empty or partial file. Worth confirming.
    file_hash = getFileHash(file)



    conn = get_db_connection()

    try:
        with conn.cursor() as cursor:
            cursor.execute(
                "SELECT COUNT(*) FROM notes WHERE file_hash = %s",
                (file_hash,)
            )
            if cursor.fetchone()[0] > 0:
                return JsonResponse({'status': 'error', 'error': 'Duplicate file detected'}, status=400)

            # Duplicate check passed — now save the file.
            save_file(file, file_path)
            with conn.cursor() as insert_cursor:
                insert_cursor.execute(
                    """
                    INSERT INTO notes (uploader_id, course_id, title, description, type, intake, section, file, file_type, file_hash)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    """,
                    (uploader_id, course_id, title, description, type, intake, section, file_path, file_type, file_hash)
                )

            # ! BUG RISK: this line is OUTSIDE the `with ... as insert_cursor`
            # ! block above, so that cursor has already been closed. With most
            # ! MySQL drivers this raises an error ("cursor is closed"), which
            # ! jumps to `except` and ROLLS BACK the INSERT, so the upload
            # ! fails even though the file was already saved. The chunked path
            # ! does this correctly (calls inside the with-block).
            # ! Fix: indent these two calls one level so they sit inside
            # ! `with conn.cursor() as insert_cursor:`.
            recalculate_user_rank(uploader_id, cursor=insert_cursor, rebuild=False)
            rebuild_rank_positions(insert_cursor)
            conn.commit()
            return JsonResponse({'status': 'success', 'message': 'Note uploaded successfully'}, status=201)
    except Exception as e:
        conn.rollback()
        # ! The connection is never closed in this path (the chunked path has
        # ! a `finally: conn.close()`). Every upload leaks one connection.
        # TODO: add `finally: conn.close()` here.
        return JsonResponse({'status': 'error', 'error': str(e)}, status=500)


# * ======================================================================
# * 2. DOWNLOAD / STREAM A FILE
# * ======================================================================
# Sends the PDF or video to the browser. Used as the <iframe>/<video> source:
#   <video src="http://localhost:8000/notes/12/file/">
#
# @xframe_options_exempt removes Django's default "X-Frame-Options: DENY"
# header for this view only, so your frontend (another origin, e.g. :5173)
# is allowed to show the PDF inside an <iframe>.
@xframe_options_exempt
def note_file(request, note_id):
    if not request.session.get('user'):
        return JsonResponse(
            {"status": "failed", "error": "You need to login first."},
            status=401,
        )

    # Look up the note's file path and who may see it.
    conn = get_db_connection()
    try:
        with conn.cursor() as cursor:
            cursor.execute(
                "SELECT file, file_type, title, review_status, uploader_id FROM notes WHERE id = %s",
                (note_id,)
            )
            row = cursor.fetchone()
    finally:
        conn.close()

    if row is None:
        return JsonResponse({'status': 'error', 'error': 'Note not found'}, status=404)

    file, file_type, title, review_status, uploader_id = row

    session_user = request.session.get('user')

    # Pending notes are only visible to their uploader, teachers and admins.
    # e.g. a pending note by user 7:
    #   user 7 (owner)          -> allowed
    #   a teacher               -> allowed
    #   user 9 (other student)  -> 403 "You cannot view this note yet."
    if review_status != 'approved':
        if session_user.get('id') != uploader_id and session_user.get('role') not in ('teacher', 'admin'):
            return JsonResponse(
                {'status': 'error', 'error': 'You cannot view this note yet.'},
                status=403,
            )
    # Build the absolute path from the relative one stored in the database.
    # e.g. file = "uploaded_notes/lecture.mp4"
    #      path = "/home/app/backend/uploaded_notes/lecture.mp4"
    # normpath also collapses "a/../b" to "b".
    path = os.path.normpath(os.path.join(settings.BASE_DIR, file))
    # // Debug prints: remove before production (they print real server paths
    # // to the console on every file request).
    print(f"Path: {path}")
    # normalize slashes for Windows and Linux, and check if the path is within the BASE_DIR and is a file
    path = path.replace("\\", "/")
    print(f"Normalized Path: {path}")
    if not os.path.isfile(path):
        return JsonResponse({'status': 'error', 'error': 'File missing'}, status=404)

    # Safety check: the file must live inside the project folder, so a bad
    # value like "../../etc/passwd" in the database can't expose system files.
    # ! startswith() is a string check, not a real path check:
    # ! "/app" also matches "/app-secrets/x". Use
    # ! os.path.commonpath([path, base]) == base for an exact test.
    # ! Also, this check runs AFTER isfile(), so a missing file inside
    # ! vs outside the project returns different errors (minor info leak).
    if not path.startswith(os.path.normpath(settings.BASE_DIR).replace("\\", "/")):
        return JsonResponse({'status': 'error', 'error': 'Invalid file path'}, status=400)

    # Pick the Content-Type so the browser knows how to display the file.
    # e.g. pdf -> "application/pdf", ".webm" -> "video/webm"
    if file_type == 'pdf':
        content_type = 'application/pdf'
    else:
        ext = os.path.splitext(path)[1].lower()
        content_type = VIDEO_CONTENT_TYPES.get(ext, 'video/mp4')

    file_size = os.path.getsize(path)

    # * HTTP Range support. Video players ask for pieces of the file so you
    # * can seek without downloading everything first.
    #
    # e.g. file_size = 5,000,000 bytes
    #   Range: bytes=0-1023     -> start=0,   end=1023            (first 1 KB)
    #   Range: bytes=1000-      -> start=1000, end=4999999        (to the end)
    #   Range: bytes=-500       -> start=4999500, end=4999999     (LAST 500 bytes)
    #   Range: bytes=9000000-   -> start >= file_size -> 416 error
    range_header = request.META.get('HTTP_RANGE')
    if range_header:
        # \d* means "zero or more digits", so start or end may be missing.
        match = re.match(r'bytes=(\d*)-(\d*)$', range_header.strip())
        if match:
            raw_start, raw_end = match.groups()
            if raw_start == '' and raw_end == '':
                # "bytes=-" -> whole file
                start, end = 0, file_size - 1
            elif raw_start == '':
                # "bytes=-500" -> the last 500 bytes
                start = max(0, file_size - int(raw_end))
                end = file_size - 1
            else:
                # "bytes=1000-" or "bytes=1000-2000"; end can't pass the file end
                start = int(raw_start)
                end = min(int(raw_end) if raw_end else file_size - 1, file_size - 1)

            # 416 = "Range Not Satisfiable". The Content-Range header tells the
            # client the real size: "bytes */5000000".
            if start >= file_size or start > end:
                error_response = JsonResponse(
                    {'status': 'error', 'error': 'Requested range not satisfiable'},
                    status=416,
                )
                error_response['Content-Range'] = f'bytes */{file_size}'
                return error_response

            # Never send more than 8 MB per request, even if the player asks
            # for "bytes=0-" on a 500 MB video. The player simply asks again.
            # e.g. start=0, end=4999999 -> length=5,000,000 (under 8 MB, fine)
            #      a 500 MB file with "bytes=0-" -> length=8,388,608, end=8388607
            length = min(end - start + 1, 8 * 1024 * 1024)
            end = start + length - 1

            with open(path, 'rb') as f:
                f.seek(start)
                data = f.read(length)

            # 206 = "Partial Content".
            # e.g. Content-Range: bytes 0-1023/5000000
            response = HttpResponse(data, status=206, content_type=content_type)
            response['Content-Range'] = f'bytes {start}-{end}/{file_size}'
            response['Accept-Ranges'] = 'bytes'
            # "inline" = show in the browser instead of forcing a download.
            response['Content-Disposition'] = f'inline; filename="{os.path.basename(path)}"'
            return response
        # If the header doesn't match the regex (e.g. multiple ranges
        # "bytes=0-10,20-30"), we fall through and send the whole file below.

    # No Range header: stream the whole file. FileResponse reads it in blocks
    # and closes the file for you when the response ends.
    response = FileResponse(open(path, 'rb'), content_type=content_type)
    response['Accept-Ranges'] = 'bytes'
    response['Content-Disposition'] = f'inline; filename="{os.path.basename(path)}"'
    return response


# * ======================================================================
# * 3. LIST ONE USER'S NOTES (profile page)
# * ======================================================================
# e.g. GET /notes/?user_id=7  -> every note uploaded by user 7
def get_notes(request):
    user_id = request.GET.get('user_id')
    if not user_id:
        return JsonResponse({'status': 'error', 'error': 'user_id parameter is required'}, status=400)

    logged_in_user = request.session.get('user')
    if not logged_in_user:
        return JsonResponse({'status': 'error', 'error': 'You need to login first.'}, status=401)
    logged_in_user_id = logged_in_user.get('id')


    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        # Column positions matter: below, note[0] is n.id, note[1] is n.title,
        # ... note[15] is n.uploader_id. If you add or reorder a column here,
        # every index below must change too.
        # ! `left join reviews r` returns ONE ROW PER REVIEW. A note reviewed
        # ! twice (e.g. rejected, then approved after a re-review) appears
        # ! twice in the list.
        # TODO: join only the latest review, or aggregate it (e.g. a subquery
        # TODO: selecting the newest review comment per note).
        cursor.execute(
            """
            select 
                n.id, n.title, n.description, n.type, n.intake, n.section,
                n.rating_avg, n.rating_count, n.created_at, n.review_status,
                u.full_name as uploader_name, u.avatar, r.comment as review_comment,
                n.file_type, n.view_count, n.uploader_id
            from notes n
            left join users u on n.uploader_id = u.id
            left join reviews r on n.id = r.note_id
            where u.id = %s
            order by n.created_at desc
            """,
            (user_id,),
        )
        notes = cursor.fetchall()

        # Viewing someone else's profile -> hide some notes.
        # e.g. logged in as 5, opening ?user_id=7:
        # ! int(user_id) raises ValueError for text like "abc", which lands in
        # ! the except below and returns a confusing 500. A 400 would be better.
        if logged_in_user_id != int(user_id):
            # Filter out notes that are not approved for other users
            # ! The comment says "not approved" are hidden, but the code keeps
            # ! 'approved' AND 'pending'. So pending notes of other users show
            # ! up in the list (their file is still blocked by note_file, but
            # ! the title and description are exposed). If pending notes should
            # ! be private, keep only note[9] == 'approved'.
            notes = [note for note in notes if note[9] == 'approved' or note[9] == 'pending']

        # Turn each tuple into a dict the frontend can use.
        # e.g. note = (12, "DS Ch1", "desc", "note", "49", "3", Decimal("4.50"),
        #              8, datetime(...), "approved", "Rahim", "7.png",
        #              None, "pdf", 214, 7)
        response_data = {
            'status': 'success',
            'notes': [
                {
                    'id': note[0],
                    'title': note[1],
                    'description': note[2],
                    'type': note[3],
                    'intake': note[4],
                    'section': note[5],
                    'rating_avg': note[6],
                    'rating_count': note[7],
                    # datetime -> "2026-11-20 09:30:00" (a plain string; JSON has no dates)
                    'created_at': note[8].strftime("%Y-%m-%d %H:%M:%S") if note[8] else None,
                    'review_status': note[9],
                    'uploader_name': note[10],
                    'uploader_avatar_url': avatar_url(request, note[15], note[11]),
                    'review_comment': note[12],
                    'file_type': note[13],
                    'view_count': note[14],
                    'file_url': request.build_absolute_uri(
                        f"/notes/{note[0]}/file/"
                    ),
                } for note in notes
            ]
        }
    except Exception as e:
        # ! cursor and conn are never closed on this path (leak).
        # TODO: use try/finally like the other views.
        return JsonResponse (
            {
                'status': 'error',
                'error': str(e)
            },
            status=500
        )

    cursor.close()
    conn.close()

    return JsonResponse(response_data, status=200)


# Small helper used by the views below. Returns the logged-in user dict, or
# None. e.g. {"id": 7, "role": "student"}
def _get_session_user(request):
    return request.session.get('user')


# * ======================================================================
# * 4. NOTE DETAIL
# * ======================================================================
# e.g. GET /notes/12/  -> everything the note page needs, including
# "my_rating" (how many stars THIS viewer gave) and "is_owner".
def note_detail(request, note_id):
    session_user = _get_session_user(request)
    if not session_user:
        return JsonResponse(
            {"status": "failed", "error": "You need to login first."},
            status=401,
        )

    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute(
            """
            SELECT n.id, n.title, n.description, n.type, n.intake, n.section,
                    n.rating_avg, n.rating_count, n.created_at, n.review_status,
                    n.uploader_id, u.full_name AS uploader_name, u.avatar,
                    c.code AS course_code, n.file_type, n.view_count
            FROM notes n
            LEFT JOIN users u ON n.uploader_id = u.id
            LEFT JOIN courses c ON n.course_id = c.id
            WHERE n.id = %s
            """,
            (note_id,),
        )
        row = cursor.fetchone()
    finally:
        cursor.close()
        conn.close()

    if row is None:
        return JsonResponse({'status': 'error', 'error': 'Note not found'}, status=404)

    # "Tuple unpacking": names each column of the row in order, so the code
    # below can use `title` instead of `row[1]`. The order MUST match the
    # SELECT above. (id_ and type_ have a trailing "_" to avoid shadowing
    # Python's id() and type().)
    (
        id_, title, description, type_, intake, section,
        rating_avg, rating_count, created_at, review_status,
        uploader_id, uploader_name, uploader_avatar, course_code, file_type, view_count,
    ) = row

    # Pending notes are only visible to their uploader, teachers and admins.
    if review_status != 'approved':
        can_view = (
            session_user.get('id') == uploader_id
            or session_user.get('role') in ('teacher', 'admin')
        )
        if not can_view:
            return JsonResponse(
                {'status': 'error', 'error': 'You cannot view this note yet.'},
                status=403,
            )

    viewer_id = session_user.get('id')

    # Two small extra lookups on a second connection:
    #   my_rating   the viewer's own stars (0 if they haven't rated)
    #   views_today how many unique-viewer rows exist for today
    # e.g. user 5 rated this note 4 stars -> my_rating = 4
    my_rating = 0
    views_today = 0
    my_rating_conn = get_db_connection()
    try:
        with my_rating_conn.cursor() as c2:
            c2.execute(
                "SELECT stars FROM ratings WHERE note_id = %s AND user_id = %s",
                (note_id, viewer_id),
            )
            stars_row = c2.fetchone()
            my_rating = int(stars_row[0]) if stars_row else 0

            c2.execute(
                """
                SELECT COUNT(*) FROM note_daily_views
                WHERE note_id = %s AND view_date = CURDATE()
                """,
                (note_id,),
            )
            views_today = int(c2.fetchone()[0] or 0)
    finally:
        my_rating_conn.close()
    # TODO: reuse the first connection for these two queries instead of
    # TODO: opening a second one.

    return JsonResponse(
        {
            'status': 'success',
            'note': {
                'id': id_,
                'title': title,
                'description': description,
                'type': type_,
                'intake': intake,
                'section': section,
                # ! str(None) is the text "None". If rating_avg is NULL in the
                # ! database the frontend receives "None". Safer:
                # ! str(rating_avg) if rating_avg is not None else "0.00"
                'rating_avg': str(rating_avg),
                'rating_count': rating_count,
                'view_count': int(view_count or 0),
                'views_today': views_today,
                'created_at': created_at.isoformat() if created_at else None,
                'review_status': review_status,
                'uploader_id': uploader_id,
                'uploader_name': uploader_name,
                'uploader_avatar_url': avatar_url(request, uploader_id, uploader_avatar),
                'course_code': course_code,
                # The frontend uses this to hide the "rate" button on your own notes.
                'is_owner': session_user.get('id') == uploader_id,
                'my_rating': my_rating,
                'file_type': file_type,
                'file_url': request.build_absolute_uri(f"/notes/{id_}/file/"),
            },
        },
        status=200,
    )


# * ======================================================================
# * 5. VIEW COUNTING
# * ======================================================================
# Reads ?days= and keeps it between 1 and 365.
# e.g. ?days=30  -> 30      ?days=9999 -> 365      ?days=0 -> 1
#      ?days=abc -> None  (the caller turns this into a 400 error)
#      (missing) -> 30    (the default in request.GET.get("days", 30))
def _parse_days(request):
    try:
        days = int(request.GET.get("days", 30))
    except (TypeError, ValueError):
        return None
    return max(1, min(days, 365))


# Called by the frontend after a note has been open for a few seconds.
# e.g. POST /notes/12/view/  ->
#   {"status": "success", "counted": true, "view_count": 215, "views_today": 9}
def note_view(request, note_id):
    if request.method != "POST":
        return JsonResponse({'status': 'error', 'error': 'Invalid request method'}, status=405)

    session_user = _get_session_user(request)
    if not session_user:
        return JsonResponse(
            {"status": "failed", "error": "You need to login first."},
            status=401,
        )

    viewer_id = session_user.get("id")
    conn = get_db_connection()
    try:
        with conn.cursor() as cursor:
            cursor.execute(
                "SELECT uploader_id, review_status, view_count FROM notes WHERE id = %s",
                (note_id,),
            )
            row = cursor.fetchone()
            if row is None:
                return JsonResponse({'status': 'error', 'error': 'Note not found'}, status=404)

            uploader_id, review_status, view_count = row
            is_owner = viewer_id == uploader_id
            is_staff = session_user.get("role") in ("teacher", "admin")
            counted = False
            reason = None

            # Who may open this note at all (same rule as note_file).
            if review_status != "approved" and not is_owner and not is_staff:
                return JsonResponse(
                    {'status': 'error', 'error': 'You cannot view this note yet.'},
                    status=403,
                )

            # * Decide whether this view COUNTS. Rules, in order:
            #   1. Your own note        -> not counted  (reason "owner")
            #   2. Note not approved    -> not counted  (reason "not_approved")
            #      (teachers reviewing a pending note don't inflate the numbers)
            #   3. Already viewed today -> not counted  (reason "duplicate")
            #   4. Otherwise            -> counted
            if is_owner:
                reason = "owner"
            elif review_status != "approved":
                reason = "not_approved"
            else:
                # INSERT IGNORE silently skips the insert if the row already
                # exists. This relies on a UNIQUE key on
                # (note_id, viewer_id, view_date) in note_daily_views.
                # e.g. user 5 opens note 12 three times today:
                #   1st open -> rowcount 1 -> counted
                #   2nd open -> rowcount 0 -> duplicate
                #   3rd open -> rowcount 0 -> duplicate
                # Tomorrow user 5's first open counts again (a new view_date).
                # ? Confirm the UNIQUE key exists, otherwise every open counts.
                cursor.execute(
                    """
                    INSERT IGNORE INTO note_daily_views (note_id, viewer_id, view_date)
                    VALUES (%s, %s, CURDATE())
                    """,
                    (note_id, viewer_id),
                )
                counted = cursor.rowcount == 1
                if counted:
                    # view_count = number of (user, day) rows, NOT the number
                    # of different people. 1 person viewing on 3 days = 3.
                    # Recounting from the table (instead of +1) keeps the
                    # number correct even if two requests arrive together.
                    cursor.execute(
                        "SELECT COUNT(*) FROM note_daily_views WHERE note_id = %s",
                        (note_id,),
                    )
                    view_count = int(cursor.fetchone()[0] or 0)
                    cursor.execute(
                        "UPDATE notes SET view_count = %s WHERE id = %s",
                        (view_count, note_id),
                    )
                    # ! Performance: every counted view recalculates the
                    # ! uploader's rank AND rebuilds ALL rank positions. With
                    # ! many users this is the heaviest thing on the page.
                    # TODO: update ranks in a scheduled job (e.g. every few
                    # TODO: minutes) instead of on every view.
                    recalculate_user_rank(uploader_id, cursor=cursor, rebuild=False)
                    rebuild_rank_positions(cursor)
                    conn.commit()
                else:
                    reason = "duplicate"

            # Today's total, for the "views today" badge.
            cursor.execute(
                """
                SELECT COUNT(*) FROM note_daily_views
                WHERE note_id = %s AND view_date = CURDATE()
                """,
                (note_id,),
            )
            views_today = int(cursor.fetchone()[0] or 0)
    except Exception as e:
        conn.rollback()
        return JsonResponse({'status': 'error', 'error': str(e)}, status=500)
    finally:
        conn.close()

    response = {
        'status': 'success',
        'counted': counted,
        'view_count': int(view_count or 0),
        'views_today': views_today,
    }
    # e.g. owner opens their own note:
    #   {"status": "success", "counted": false, "view_count": 214,
    #    "views_today": 8, "reason": "owner"}
    if reason:
        response['reason'] = reason
    return JsonResponse(response, status=200)


# Views per day for ONE note (the chart on the note's analytics panel).
# Only the uploader, teachers and admins may see it.
# e.g. GET /notes/12/views/?days=7 ->
#   {"status": "success", "note_id": 12, "file_type": "pdf", "total_views": 215,
#    "daily": [{"date": "2026-11-18", "views": 4}, ... , {"date": "2026-11-24", "views": 9}]}
def note_view_history(request, note_id):
    if request.method != "GET":
        return JsonResponse({'status': 'error', 'error': 'Invalid request method'}, status=405)

    session_user = _get_session_user(request)
    if not session_user:
        return JsonResponse(
            {"status": "failed", "error": "You need to login first."},
            status=401,
        )

    days = _parse_days(request)
    if days is None:
        return JsonResponse({'status': 'error', 'error': 'days must be an integer'}, status=400)

    viewer_id = session_user.get("id")
    conn = get_db_connection()
    try:
        with conn.cursor() as cursor:
            cursor.execute(
                "SELECT uploader_id, file_type, view_count FROM notes WHERE id = %s",
                (note_id,),
            )
            row = cursor.fetchone()
            if row is None:
                return JsonResponse({'status': 'error', 'error': 'Note not found'}, status=404)

            uploader_id, file_type, view_count = row
            if viewer_id != uploader_id and session_user.get("role") not in ("teacher", "admin"):
                return JsonResponse(
                    {'status': 'error', 'error': 'You cannot view this history.'},
                    status=403,
                )

            # First day of the window. "days" includes today, so subtract
            # days - 1. e.g. today = 2026-11-24, days = 7 -> start = 2026-11-18.
            start_date = (date.today() - timedelta(days=days - 1)).isoformat()
            # Only days that HAVE views come back from SQL.
            # e.g. rows: (2026-11-18, 4), (2026-11-22, 6), (2026-11-24, 9)
            cursor.execute(
                """
                SELECT view_date, COUNT(*) FROM note_daily_views
                WHERE note_id = %s AND view_date >= %s
                GROUP BY view_date ORDER BY view_date
                """,
                (note_id, start_date),
            )
            # -> {date(2026,11,18): 4, date(2026,11,22): 6, date(2026,11,24): 9}
            counts = {view_date: int(total or 0) for view_date, total in cursor.fetchall()}
    finally:
        conn.close()

    # Fill the gaps with zeros so the chart always has one point per day.
    # range(days - 1, -1, -1) counts DOWN from days-1 to 0, so the list runs
    # oldest -> newest. e.g. days=3: offsets 2, 1, 0 -> the day before
    # yesterday, yesterday, today.
    # ? counts.get(day, 0) works because MySQL returns view_date as a Python
    # ? date object, the same type as `day`. (If your driver returned strings,
    # ? every value would show as 0.)
    daily = []
    for offset in range(days - 1, -1, -1):
        day = date.today() - timedelta(days=offset)
        daily.append({'date': day.isoformat(), 'views': counts.get(day, 0)})

    return JsonResponse(
        {
            'status': 'success',
            'note_id': note_id,
            'file_type': file_type,
            'total_views': int(view_count or 0),
            'daily': daily,
        },
        status=200,
    )


# Views per day across ALL of the logged-in user's own notes, split by PDF
# and video (the dashboard chart).
# e.g. GET /notes/views/daily/?days=30 ->
#   {"status": "success", "total_views": 1280,
#    "daily": [{"date": "2026-10-26", "pdf": 12, "video": 3, "total": 15}, ...]}
def note_views_daily(request):
    if request.method != "GET":
        return JsonResponse({'status': 'error', 'error': 'Invalid request method'}, status=405)

    session_user = _get_session_user(request)
    if not session_user:
        return JsonResponse(
            {"status": "failed", "error": "You need to login first."},
            status=401,
        )

    days = _parse_days(request)
    if days is None:
        return JsonResponse({'status': 'error', 'error': 'days must be an integer'}, status=400)

    # `viewer_id` is really "the current user", whose uploads we summarise.
    viewer_id = session_user.get("id")
    conn = get_db_connection()
    try:
        with conn.cursor() as cursor:
            start_date = (date.today() - timedelta(days=days - 1)).isoformat()
            # SUM(CASE WHEN ... THEN 1 ELSE 0 END) is "count only the rows
            # where this is true". One query gives both the PDF and video counts.
            # e.g. a row: (2026-11-24, 6, 2) = 6 PDF views and 2 video views.
            cursor.execute(
                """
                SELECT v.view_date,
                       SUM(CASE WHEN n.file_type = 'pdf' THEN 1 ELSE 0 END),
                       SUM(CASE WHEN n.file_type = 'video' THEN 1 ELSE 0 END)
                FROM note_daily_views v
                JOIN notes n ON n.id = v.note_id
                WHERE n.uploader_id = %s AND v.view_date >= %s
                GROUP BY v.view_date ORDER BY v.view_date
                """,
                (viewer_id, start_date),
            )
            # -> {date(2026,11,24): {"pdf": 6, "video": 2}, ...}
            counts = {}
            for view_date, pdf_views, video_views in cursor.fetchall():
                counts[view_date] = {
                    'pdf': int(pdf_views or 0),
                    'video': int(video_views or 0),
                }

            # Lifetime total across all my notes (not limited to `days`).
            cursor.execute(
                "SELECT COALESCE(SUM(view_count), 0) FROM notes WHERE uploader_id = %s",
                (viewer_id,),
            )
            total_views = int(cursor.fetchone()[0] or 0)
    finally:
        conn.close()

    # Same zero-filling as note_view_history, oldest -> newest.
    daily = []
    for offset in range(days - 1, -1, -1):
        day = date.today() - timedelta(days=offset)
        pdf_views = counts.get(day, {}).get('pdf', 0)
        video_views = counts.get(day, {}).get('video', 0)
        daily.append(
            {
                'date': day.isoformat(),
                'pdf': pdf_views,
                'video': video_views,
                'total': pdf_views + video_views,
            }
        )

    return JsonResponse(
        {'status': 'success', 'total_views': total_views, 'daily': daily},
        status=200,
    )


# * ======================================================================
# * 6. RATINGS
# * ======================================================================
# e.g. POST /notes/12/rate/   body: {"stars": 4}  ->
#   {"status": "success", "rating_avg": "4.25", "rating_count": 8, "my_rating": 4}
def note_rate(request, note_id):
    if request.method != 'POST':
        return JsonResponse({'status': 'error', 'error': 'Invalid request method'}, status=405)

    session_user = _get_session_user(request)
    if not session_user:
        return JsonResponse(
            {"status": "failed", "error": "You need to login first."},
            status=401,
        )

    # The body is JSON text, not form data (so request.POST would be empty).
    # `request.body or "{}"` means an empty body is treated as an empty object.
    try:
        body = json.loads(request.body or "{}")
    except json.JSONDecodeError:
        return JsonResponse({'status': 'error', 'error': 'Invalid JSON body'}, status=400)

    # e.g. {"stars": 4} -> 4      {"stars": "5"} -> 5 (text is converted)
    #      {"stars": 4.9} -> 4 (decimals are cut, not rounded)
    #      {} -> int(None) fails -> 400      {"stars": 9} -> fails the range test
    try:
        stars = int(body.get("stars"))
    except (TypeError, ValueError):
        return JsonResponse({'status': 'error', 'error': 'stars must be 1-5'}, status=400)

    if not 1 <= stars <= 5:
        return JsonResponse({'status': 'error', 'error': 'stars must be 1-5'}, status=400)

    viewer_id = session_user.get('id')

    conn = get_db_connection()
    try:
        with conn.cursor() as cursor:
            cursor.execute(
                "SELECT uploader_id, review_status FROM notes WHERE id = %s",
                (note_id,),
            )
            row = cursor.fetchone()
            if row is None:
                return JsonResponse({'status': 'error', 'error': 'Note not found'}, status=404)

            uploader_id, review_status = row

            # Business rules: no self-rating, and only approved notes.
            if uploader_id == viewer_id:
                return JsonResponse(
                    {'status': 'error', 'error': "You can't rate your own upload."},
                    status=400,
                )

            if review_status != 'approved':
                return JsonResponse(
                    {'status': 'error', 'error': 'You can only rate approved notes.'},
                    status=400,
                )

            # "Upsert": insert a new rating, or if this user already rated this
            # note, just change the stars. Needs a UNIQUE key on
            # (note_id, user_id) in `ratings`.
            # e.g. user 5 rates 3 stars, later rates 5 -> still ONE row, now 5.
            # ? Confirm that UNIQUE key exists, otherwise users can add many ratings.
            cursor.execute(
                """
                INSERT INTO ratings (note_id, user_id, stars)
                VALUES (%s, %s, %s)
                ON DUPLICATE KEY UPDATE stars = VALUES(stars)
                """,
                (note_id, viewer_id, stars),
            )

            # Recompute the note's average from scratch (always correct, no
            # drift). e.g. ratings 5, 4, 4, 4 -> avg 4.25, count 4.
            cursor.execute(
                "SELECT AVG(stars), COUNT(*) FROM ratings WHERE note_id = %s",
                (note_id,),
            )
            avg, count = cursor.fetchone()

            # Store the result on the note so the feed doesn't have to
            # recalculate it for every note on every page load.
            cursor.execute(
                "UPDATE notes SET rating_avg = %s, rating_count = %s WHERE id = %s",
                (avg or 0, count, note_id),
            )
            recalculate_user_rank(uploader_id, cursor=cursor, rebuild=False)
            rebuild_rank_positions(cursor)
            conn.commit()
    except Exception as e:
        conn.rollback()
        return JsonResponse({'status': 'error', 'error': str(e)}, status=500)
    finally:
        conn.close()

    # avg is a Decimal such as Decimal("4.2500"); the f-string rounds it to
    # two decimals -> "4.25". Sent as text so no float rounding surprises.
    return JsonResponse(
        {
            'status': 'success',
            'rating_avg': f"{avg:.2f}" if avg is not None else "0.00",
            'rating_count': count,
            'my_rating': stars,
        },
        status=200,
    )


# * ======================================================================
# * 7. REPORTS
# * ======================================================================
# Lets a user flag a note (wrong content, copyright, spam...) for admins.
# e.g. POST /notes/12/report/
#      body: {"reason": "Incorrect content", "detail": "Page 4 has wrong formulas"}
#      saved reason: "Incorrect content — Page 4 has wrong formulas"
def note_report(request, note_id):
    if request.method != 'POST':
        return JsonResponse({'status': 'error', 'error': 'Invalid request method'}, status=405)

    session_user = _get_session_user(request)
    if not session_user:
        return JsonResponse(
            {"status": "failed", "error": "You need to login first."},
            status=401,
        )

    try:
        body = json.loads(request.body or "{}")
    except json.JSONDecodeError:
        return JsonResponse({'status': 'error', 'error': 'Invalid JSON body'}, status=400)

    # `(x or "")` protects against null; .strip() removes surrounding spaces.
    # e.g. {"reason": "  Spam  "} -> "Spam"      {"reason": null} -> ""
    reason = (body.get("reason") or "").strip()
    detail = (body.get("detail") or "").strip()

    if not reason:
        return JsonResponse({'status': 'error', 'error': 'A reason is required.'}, status=400)

    # Join the two parts into the single `reason` column.
    # e.g. reason only        -> "Spam"
    #      reason + detail    -> "Spam — links to a shop"
    full_reason = reason if not detail else f"{reason} — {detail}"
    # ! No length limit on reason/detail, and no limit on how many times one
    # ! user can report the same note. A single user can flood the admin queue.
    # TODO: cap the text (e.g. 500 chars), and allow one open report per
    # TODO: (user, note) with a UNIQUE key.

    conn = get_db_connection()
    try:
        with conn.cursor() as cursor:
            cursor.execute("SELECT id FROM notes WHERE id = %s", (note_id,))
            if cursor.fetchone() is None:
                return JsonResponse({'status': 'error', 'error': 'Note not found'}, status=404)

            cursor.execute(
                "INSERT INTO reports (note_id, reporter_id, reason) VALUES (%s, %s, %s)",
                (note_id, session_user.get('id'), full_reason),
            )
            conn.commit()
            # lastrowid = the auto-generated id of the row we just inserted.
            report_id = cursor.lastrowid
    except Exception as e:
        conn.rollback()
        return JsonResponse({'status': 'error', 'error': str(e)}, status=500)
    finally:
        conn.close()

    # 201 = "Created" (a new report now exists).
    return JsonResponse(
        {'status': 'success', 'message': 'Report sent to admins.', 'report_id': report_id},
        status=201,
    )


def note_delete(request, note_id):
    if request.method != 'POST':
        return JsonResponse({'status': 'error', 'error': 'Invalid request method'}, status=405)

    session_user = _get_session_user(request)
    if not session_user:
        return JsonResponse(
            {"status": "failed", "error": "You need to login first."},
            status=401,
        )

    conn = get_db_connection()
    file_to_delete = None
    try:
        with conn.cursor() as cursor:
            cursor.execute(
                """
                SELECT n.uploader_id, n.file,
                       (SELECT GROUP_CONCAT(DISTINCT r.teacher_id)
                        FROM reviews r WHERE r.note_id = n.id)
                FROM notes n
                WHERE n.id = %s
                """,
                (note_id,),
            )
            row = cursor.fetchone()
            if row is None:
                return JsonResponse({'status': 'error', 'error': 'Note not found'}, status=404)

            uploader_id, file, teacher_ids_raw = row
            if session_user.get('id') != uploader_id:
                return JsonResponse(
                    {'status': 'error', 'error': 'You can only delete your own notes.'},
                    status=403,
                )

            teacher_ids = [
                int(value)
                for value in (teacher_ids_raw or '').split(',')
                if value
            ]
            cursor.execute("DELETE FROM notes WHERE id = %s", (note_id,))
            if cursor.rowcount != 1:
                conn.rollback()
                return JsonResponse({'status': 'error', 'error': 'Note not found'}, status=404)

            recalculate_users_ranks(
                [uploader_id] + teacher_ids,
                cursor=cursor,
                rebuild=True,
            )
            conn.commit()
            file_to_delete = file
    except Exception as e:
        conn.rollback()
        return JsonResponse({'status': 'error', 'error': str(e)}, status=500)
    finally:
        conn.close()

    file_deleted = False
    if file_to_delete:
        absolute_path = note_absolute_path(file_to_delete)
        if absolute_path and os.path.isfile(absolute_path):
            share_conn = get_db_connection()
            try:
                with share_conn.cursor() as cursor:
                    cursor.execute(
                        "SELECT COUNT(*) FROM notes WHERE file = %s",
                        (file_to_delete,),
                    )
                    if cursor.fetchone()[0] == 0:
                        try:
                            os.remove(absolute_path)
                            file_deleted = True
                        except OSError:
                            file_deleted = False
            finally:
                share_conn.close()

    return JsonResponse(
        {
            'status': 'success',
            'message': 'Note deleted.',
            'note_id': note_id,
            'file_deleted': file_deleted,
        },
        status=200,
    )
