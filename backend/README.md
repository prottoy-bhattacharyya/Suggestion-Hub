# Suggestion Hub Backend API Reference

This file documents the backend APIs that are actually implemented in `core/urls.py` and the app `views.py` files.

Base URL examples:

- Local: `http://127.0.0.1:8000`
- Docker/VPS: the public domain that proxies the Django backend

Most JSON endpoints use Django session cookies (`sessionid`) for authentication. State-changing requests normally require a CSRF token from `/accounts/csrf/`, sent as `X-CSRFToken`. The only exception in the current code is `/social/comments/`, which is decorated with `@csrf_exempt`.

In every endpoint below, **Request parameters** lists path variables, query-string parameters, and special request headers. Inputs sent as JSON or form fields are listed under **Request body**.

Common error body shapes used by this project:

```json
{ "status": "failed", "error": "You need to login first." }
```

```json
{ "status": "error", "error": "User not found." }
```

```json
{ "error": "Question is required." }
```

```json
{ "status": "error", "message": "Invalid request method." }
```

---

## Accounts

### 1. Get CSRF token

- **Url:** `/accounts/csrf/`
- **Request type:** `GET` (the view does not restrict the method)
- **Request parameters:** None
- **Request body:** None
- **Response body:**

```json
{
  "csrfToken": "<csrf-token>"
}
```

---

### 2. Sign up

- **Url:** `/accounts/signup/`
- **Request type:** `POST`
- **Request parameters:** None
- **Request body:** `application/json`

```json
{
  "email": "student@example.com",
  "password": "secret",
  "fullName": "Student Name",
  "accountType": "student",
  "studentId": "20240001",
  "departmentId": 1,
  "intake": "24",
  "section": "A"
}
```

Teacher signup uses teacher-specific fields:

```json
{
  "email": "teacher@example.com",
  "password": "secret",
  "fullName": "Teacher Name",
  "accountType": "teacher",
  "departmentId": 1,
  "designation": "Lecturer",
  "employeeId": "EMP001"
}
```

- **Response body:**

`201 Created`:

```json
{
  "status": "success",
  "message": "Account created successfully."
}
```

`400 Bad Request` when the email already exists:

```json
{
  "error": "Email already exists."
}
```

`405 Method Not Allowed` for non-POST requests:

```json
{
  "error": "Invalid request method."
}
```

`500 Internal Server Error` on database failure:

```json
{
  "error": "<database error message>"
}
```

---

### 3. Log in

- **Url:** `/accounts/login/`
- **Request type:** `POST` (the view does not explicitly check the method)
- **Request parameters:** None
- **Request body:** `application/json`

```json
{
  "email": "student@example.com",
  "password": "secret"
}
```

- **Response body:**

`200 OK` for a student:

```json
{
  "status": "success",
  "message": "Login successful.",
  "user": {
    "id": 1,
    "email": "student@example.com",
    "full_name": "Student Name",
    "role": "student",
    "student_id": "20240001",
    "department_id": 1,
    "intake": "24",
    "section": "A"
  }
}
```

`200 OK` for a verified teacher:

```json
{
  "status": "success",
  "message": "Login successful.",
  "user": {
    "id": 2,
    "email": "teacher@example.com",
    "full_name": "Teacher Name",
    "role": "teacher",
    "department_id": 1,
    "designation": "Lecturer",
    "employee_id": "EMP001"
  }
}
```

`401 Unauthorized`:

```json
{
  "status": "error",
  "message": "Invalid email or password."
}
```

`403 Forbidden` for inactive accounts:

```json
{
  "status": "error",
  "message": "Account is inactive. Please contact support."
}
```

`403 Forbidden` for an unverified teacher:

```json
{
  "status": "error",
  "message": "Account is not verified. You can login after admin verification."
}
```

On success, this endpoint stores the returned `user` object in `request.session["user"]`.

---

### 4. Current session / auth check

- **Url:** `/accounts/me/`
- **Request type:** `GET` (the view does not explicitly check the method)
- **Request parameters:** None
- **Request body:** None
- **Response body:**

`200 OK` when logged in:

```json
{
  "status": "success",
  "loggedIn": true,
  "user": {
    "id": 1,
    "email": "student@example.com",
    "full_name": "Student Name",
    "role": "student",
    "student_id": "20240001",
    "department_id": 1,
    "intake": "24",
    "section": "A"
  }
}
```

The `user` object is the session copy created during login, not a fresh full database row.

`200 OK` when not logged in:

```json
{
  "status": "failed",
  "loggedIn": false
}
```

`200 OK` when the session user no longer exists:

```json
{
  "status": "failed",
  "loggedIn": false,
  "message": "User not found."
}
```

`403 Forbidden` for an inactive account:

```json
{
  "status": "error",
  "loggedIn": false,
  "message": "Account is inactive. Please contact support."
}
```

`403 Forbidden` for an unverified teacher:

```json
{
  "status": "error",
  "loggedIn": false,
  "message": "Account is not verified. You can login after admin verification."
}
```

---

### 5. Log out

- **Url:** `/accounts/logout/`
- **Request type:** `POST` (the view does not explicitly check the method)
- **Request parameters:** None
- **Request body:** None
- **Response body:**

```json
{
  "status": "success",
  "message": "Logged out."
}
```

This flushes the Django session.

---

### 6. Public user profile

- **Url:** `/accounts/profile/<user_id>/`
- **Request type:** `GET` (the view does not explicitly check the method)
- **Request parameters:** Path `user_id` (integer, required).
- **Request body:** None
- **Response body:**

`200 OK`:

```json
{
  "user": {
    "id": 1,
    "email": "student@example.com",
    "full_name": "Student Name",
    "role": "student",
    "student_id": "20240001",
    "department_id": 1,
    "intake": "24",
    "section": "A",
    "designation": null,
    "employee_id": null,
    "department_name": "Computer Science and Engineering"
  },
  "followers": 5,
  "following": 3,
  "courses": [],
  "is_owner": false
}
```

For a teacher, `courses` contains assigned course codes:

```json
{
  "courses": ["CSE220", "CSE311"]
}
```

`404 Not Found`:

```json
{
  "error": "User not found."
}
```

`is_owner` is `true` when the session user's `id` equals `<user_id>`.

---

### 7. Current user profile alias

- **Url:** `/accounts/profile/me`
- **Request type:** `GET`
- **Request parameters:** None
- **Request body:** None
- **Response body:** Same response body as `/accounts/me/`.

This URL is an alias that points to the same `me` view.

---

## Academics

### 8. List departments

- **Url:** `/academics/departments_list/`
- **Request type:** `GET` (the view does not explicitly check the method)
- **Request parameters:** None
- **Request body:** None
- **Response body:**

```json
{
  "departments": [
    {
      "id": 1,
      "name": "Computer Science and Engineering",
      "code": "CSE"
    }
  ]
}
```

---

### 9. List courses

- **Url:** `/academics/courses_list/?department_id=1`
- **Request type:** `GET` (the view does not explicitly check the method)
- **Request parameters:** Query `department_id` (integer, optional). If omitted, all courses are returned.
- **Request body:** None
- **Response body:**

```json
{
  "courses": [
    {
      "id": 1,
      "code": "CSE220",
      "title": "Data Structures",
      "department_id": 1
    }
  ]
}
```

---

## Feeds

### 10. Approved notes feed

- **Url:** `/feeds/get_feeds/`
- **Request type:** `GET` (the view does not explicitly check the method)
- **Request parameters:** None
- **Request body:** None
- **Response body:**

`200 OK`:

```json
{
  "status": "success",
  "message": "Feeds fetched successfully",
  "notes": [
    {
      "id": 10,
      "title": "Data Structures Midterm Notes",
      "description": "Chapter 1 to 5",
      "type": "note",
      "intake": "24",
      "section": "A",
      "rating_avg": 4.5,
      "rating_count": 2,
      "created_at": "2026-11-21T10:30:00",
      "review_status": "approved",
      "uploader_id": 3,
      "course_code": "CSE220",
      "uploader_name": "Student Name",
      "file_type": "pdf",
      "file_url": "http://127.0.0.1:8000/notes/10/file/"
    }
  ]
}
```

`401 Unauthorized`:

```json
{
  "status": "failed",
  "error": "You need to login first."
}
```

Only approved notes are returned.

---

### 11. Following feed

- **Url:** `/feeds/get_feeds_by_following/`
- **Request type:** `GET` (the view does not explicitly check the method)
- **Request parameters:** None
- **Request body:** None
- **Response body:**

`200 OK`:

```json
{
  "status": "success",
  "notes": [
    {
      "id": 10,
      "title": "Data Structures Midterm Notes",
      "description": "Chapter 1 to 5",
      "type": "note",
      "intake": "24",
      "section": "A",
      "rating_avg": 4.5,
      "rating_count": 2,
      "created_at": "2026-11-21",
      "review_status": "approved",
      "uploader_name": "Student Name",
      "review_comment": "Good notes.",
      "file_type": "video",
      "file_url": "http://127.0.0.1:8000/notes/10/file/"
    }
  ]
}
```

`401 Unauthorized`:

```json
{
  "status": "failed",
  "error": "You need to login first."
}
```

Only approved notes uploaded by users that the session user follows are returned.

---

## Notes

### 12. Upload a note

- **Url:** `/notes/upload/`
- **Request type:** `POST`
- **Request parameters:** None
- **Request body:** `multipart/form-data`

Single-file upload fields:

| Field | Type | Required | Description |
|---|---|---|---|
| `file` | file | Yes | PDF, MP4, WebM, or MOV file |
| `media_type` | text | No | `pdf` or `video`; must match the file extension when provided |
| `course_id` | text | Yes | Course ID from `/academics/courses_list/` |
| `title` | text | Yes | Note title |
| `description` | text | No | Note description |
| `type` | text | Yes | `note` or `suggestion` |
| `intake` | text | Yes | Intake value |
| `section` | text | No | Section value |

Chunked upload fields:

| Field | Type | Required | Description |
|---|---|---|---|
| `upload_id` | text | Yes | Random ID matching `[A-Za-z0-9_-]{8,128}` |
| `chunk_index` | text | Yes | Zero-based chunk index |
| `total_chunks` | text | Yes | Total number of chunks |
| `declared_size` | text | Yes | Full file size in bytes |
| `original_name` | text | Yes | Original file name |
| `media_type` | text | No | `pdf` or `video`; must match the file extension |
| `file` | file | Yes | One chunk, maximum 10 MB |
| `course_id`, `title`, `description`, `type`, `intake`, `section` | text | Yes/No | Same metadata as single-file upload |

- **Response body:**

`201 Created` after a successful upload or final chunk assembly:

```json
{
  "status": "success",
  "message": "Note uploaded successfully"
}
```

`200 OK` after a non-final chunk:

```json
{
  "status": "pending",
  "received_chunks": 1,
  "total_chunks": 3
}
```

`400 Bad Request` examples:

```json
{
  "status": "error",
  "error": "Unsupported file type. Upload a PDF, MP4, WebM or MOV file."
}
```

```json
{
  "status": "error",
  "error": "File does not match the selected upload kind."
}
```

```json
{
  "status": "error",
  "error": "File too large. Maximum size is 500 MB."
}
```

```json
{
  "status": "error",
  "error": "Duplicate file detected"
}
```

```json
{
  "status": "error",
  "error": "Missing upload chunks",
  "missing_chunks": [1, 2]
}
```

`401 Unauthorized`:

```json
{
  "status": "failed",
  "error": "You need to login first."
}
```

`500 Internal Server Error`:

```json
{
  "status": "error",
  "error": "<database error message>"
}
```

Limits: PDF maximum is 20 MB; video maximum is 500 MB; chunk size is 10 MB. Supported extensions are `.pdf`, `.mp4`, `.webm`, and `.mov`.

---

### 13. Get notes by user

- **Url:** `/notes/get_notes/?user_id=3`
- **Request type:** `GET`
- **Request parameters:** Query `user_id` (integer, required).
- **Request body:** None
- **Response body:**

`200 OK`:

```json
{
  "status": "success",
  "notes": [
    {
      "id": 10,
      "title": "Data Structures Midterm Notes",
      "description": "Chapter 1 to 5",
      "type": "note",
      "intake": "24",
      "section": "A",
      "rating_avg": 4.5,
      "rating_count": 2,
      "created_at": "2026-11-21 10:30:00",
      "review_status": "approved",
      "uploader_name": "Student Name",
      "review_comment": "Looks good.",
      "file_type": "pdf",
      "file_url": "http://127.0.0.1:8000/notes/10/file/"
    }
  ]
}
```

`400 Bad Request`:

```json
{
  "status": "error",
  "error": "user_id parameter is required"
}
```

`401 Unauthorized`:

```json
{
  "status": "error",
  "error": "You need to login first."
}
```

The note owner sees all of their notes. Other logged-in users currently receive notes whose status is `approved` or `pending`.

---

### 14. Serve note file

- **Url:** `/notes/<note_id>/file/`
- **Request type:** `GET`
- **Request parameters:** Path `note_id` (integer, required). Optional header `Range` (for example `bytes=0-99`).
- **Request body:** None
- **Response body:** Binary file content, not JSON.

`200 OK` full file response headers:

```text
Content-Type: application/pdf
Accept-Ranges: bytes
Content-Disposition: inline; filename="notes.pdf"
```

For video files, `Content-Type` is based on extension:

| Extension | Content-Type |
|---|---|
| `.mp4` | `video/mp4` |
| `.webm` | `video/webm` |
| `.mov` | `video/quicktime` |

`206 Partial Content` range response headers:

```text
Content-Type: video/mp4
Accept-Ranges: bytes
Content-Range: bytes 0-99/100000
Content-Disposition: inline; filename="lecture.mp4"
```

Range responses are capped at 8 MB per request by this view.

`401 Unauthorized`:

```json
{
  "status": "failed",
  "error": "You need to login first."
}
```

`403 Forbidden` for non-approved notes viewed by someone other than the uploader, a teacher, or an admin:

```json
{
  "status": "error",
  "error": "You cannot view this note yet."
}
```

`404 Not Found`:

```json
{
  "status": "error",
  "error": "Note not found"
}
```

or:

```json
{
  "status": "error",
  "error": "File missing"
}
```

`416 Range Not Satisfiable`:

```json
{
  "status": "error",
  "error": "Requested range not satisfiable"
}
```

with header:

```text
Content-Range: bytes */<file-size>
```

---

### 15. Note detail

- **Url:** `/notes/<note_id>/detail/`
- **Request type:** `GET` (the view does not explicitly check the method)
- **Request parameters:** Path `note_id` (integer, required).
- **Request body:** None
- **Response body:**

`200 OK`:

```json
{
  "status": "success",
  "note": {
    "id": 10,
    "title": "Data Structures Midterm Notes",
    "description": "Chapter 1 to 5",
    "type": "note",
    "intake": "24",
    "section": "A",
    "rating_avg": "4.50",
    "rating_count": 2,
    "view_count": 42,
    "views_today": 3,
    "created_at": "2026-11-21T10:30:00",
    "review_status": "approved",
    "uploader_id": 3,
    "uploader_name": "Student Name",
    "course_code": "CSE220",
    "is_owner": false,
    "my_rating": 4,
    "file_type": "pdf",
    "file_url": "http://127.0.0.1:8000/notes/10/file/"
  }
}
```

`401 Unauthorized`:

```json
{
  "status": "failed",
  "error": "You need to login first."
}
```

`403 Forbidden` for non-approved notes viewed by an unauthorized user:

```json
{
  "status": "error",
  "error": "You cannot view this note yet."
}
```

`404 Not Found`:

```json
{
  "status": "error",
  "error": "Note not found"
}
```

---

### 16. Rate a note

- **Url:** `/notes/<note_id>/rate/`
- **Request type:** `POST`
- **Request parameters:** Path `note_id` (integer, required).
- **Request body:** `application/json`

```json
{
  "stars": 5
}
```

- **Response body:**

`200 OK`:

```json
{
  "status": "success",
  "rating_avg": "4.67",
  "rating_count": 3,
  "my_rating": 5
}
```

`400 Bad Request` examples:

```json
{
  "status": "error",
  "error": "stars must be 1-5"
}
```

```json
{
  "status": "error",
  "error": "You can't rate your own upload."
}
```

```json
{
  "status": "error",
  "error": "You can only rate approved notes."
}
```

`401 Unauthorized`:

```json
{
  "status": "failed",
  "error": "You need to login first."
}
```

`404 Not Found`:

```json
{
  "status": "error",
  "error": "Note not found"
}
```

---

### 17. Report a note

- **Url:** `/notes/<note_id>/report/`
- **Request type:** `POST`
- **Request parameters:** Path `note_id` (integer, required).
- **Request body:** `application/json`

```json
{
  "reason": "Wrong course",
  "detail": "This note belongs to CSE221."
}
```

`detail` is optional. If provided, the stored reason becomes `reason — detail`.

- **Response body:**

`201 Created`:

```json
{
  "status": "success",
  "message": "Report sent to admins.",
  "report_id": 12
}
```

`400 Bad Request` examples:

```json
{
  "status": "error",
  "error": "A reason is required."
}
```

```json
{
  "status": "error",
  "error": "Invalid JSON body"
}
```

`401 Unauthorized`:

```json
{
  "status": "failed",
  "error": "You need to login first."
}
```

`404 Not Found`:

```json
{
  "status": "error",
  "error": "Note not found"
}
```

---

### 17a. Record a view

- **Url:** `/notes/<note_id>/view/`
- **Request type:** `POST`
- **Request parameters:** Path `note_id` (integer, required).
- **Request body:** `application/json`; an empty object `{}` is fine.
- **Auth:** login session plus `X-CSRFToken` header.
- **Behavior:** Counts one unique view per logged-in viewer per note per server day. Owner self-views and non-approved notes are not counted. Repeating the request on the same day is idempotent.

`200 OK`:

```json
{
  "status": "success",
  "counted": true,
  "view_count": 42,
  "views_today": 3
}
```

When nothing is counted, `counted` is `false` and `reason` is `owner`, `not_approved`, or `duplicate`.

`401 Unauthorized`, `403 Forbidden`, `404 Not Found`, and `405 Method Not Allowed` follow the same shapes as the rate endpoint.

---

### 17b. Note view history

- **Url:** `/notes/<note_id>/views/daily/`
- **Request type:** `GET`
- **Request parameters:** Path `note_id`; query `days` (integer, 1-365, default `30`).
- **Request body:** None
- **Auth:** note uploader, teacher, or admin only.

`200 OK`:

```json
{
  "status": "success",
  "note_id": 10,
  "file_type": "pdf",
  "total_views": 42,
  "daily": [{ "date": "2026-11-23", "views": 3 }]
}
```

---

### 17c. Daily views for your uploads

- **Url:** `/notes/views/daily/`
- **Request type:** `GET`
- **Request parameters:** Query `days` (integer, 1-365, default `30`).
- **Request body:** None
- **Auth:** login session; only the logged-in uploader's own aggregates are returned.

`200 OK`:

```json
{
  "status": "success",
  "total_views": 123,
  "daily": [
    { "date": "2026-11-23", "pdf": 5, "video": 2, "total": 7 }
  ]
}
```

---

## Reviews / Teacher moderation

### 18. Submit a review decision

- **Url:** `/review/submit_review/`
- **Request type:** `POST`
- **Request parameters:** None
- **Request body:** `application/json`

```json
{
  "note_id": 10,
  "decision": "approved",
  "comment": "Good coverage of the topic."
}
```

Valid `decision` values: `approved`, `rejected`, `pending`.

- **Response body:**

`200 OK`:

```json
{
  "status": "success",
  "message": "Review submitted successfully."
}
```

`400 Bad Request` examples:

```json
{
  "status": "error",
  "message": "Invalid JSON body."
}
```

```json
{
  "status": "error",
  "message": "Invalid decision value."
}
```

`401 Unauthorized`:

```json
{
  "status": "error",
  "message": "User not logged in."
}
```

`403 Forbidden`:

```json
{
  "status": "error",
  "message": "Only teachers can submit reviews."
}
```

`404 Not Found`:

```json
{
  "status": "error",
  "message": "User not found."
}
```

Submitting a review inserts a row into `reviews`; database triggers update `notes.review_status` and `notes.approved_at`.

---

### 19. Teacher review queue notes

- **Url:** `/review/get_notes/`
- **Request type:** `GET`
- **Request parameters:** None
- **Request body:** None
- **Response body:**

`200 OK`:

```json
{
  "status": "success",
  "notes": [
    {
      "id": 10,
      "title": "Data Structures Midterm Notes",
      "description": "Chapter 1 to 5",
      "course_id": 1,
      "type": "note",
      "course_code": "CSE220",
      "intake": "24",
      "section": "A",
      "review_status": "pending",
      "created_at": "2026-11-21T10:30:00",
      "uploader_name": "Student Name"
    }
  ]
}
```

`401 Unauthorized`:

```json
{
  "status": "error",
  "message": "User not logged in."
}
```

`403 Forbidden`:

```json
{
  "status": "error",
  "message": "Only teachers can view notes."
}
```

This returns all notes whose course is assigned to the logged-in teacher through `teacher_courses`.

---

### 20. Teacher review history

- **Url:** `/review/get_review_logs/`
- **Request type:** `GET`
- **Request parameters:** None
- **Request body:** None
- **Response body:**

`200 OK`:

```json
{
  "status": "success",
  "review_logs": [
    {
      "id": 5,
      "note_id": 10,
      "decision": "approved",
      "comment": "Good notes.",
      "created_at": "2026-11-21T11:00:00",
      "note_title": "Data Structures Midterm Notes",
      "course_id": 1,
      "course_code": "CSE220"
    }
  ]
}
```

`401 Unauthorized`:

```json
{
  "status": "error",
  "message": "User not logged in."
}
```

`403 Forbidden`:

```json
{
  "status": "error",
  "message": "Only teachers can view review logs."
}
```

---

## Social

### 21. Follow or unfollow a user

- **Url:** `/social/follow/<user_id>/`
- **Request type:** `POST`
- **Request parameters:** Path `user_id` (integer, required).
- **Request body:** `application/json`, optional

```json
{
  "action": "follow"
}
```

or:

```json
{
  "action": "unfollow"
}
```

If the body is omitted or has no `action`, the default action is `follow`.

- **Response body:**

`200 OK`:

```json
{
  "status": "success",
  "action": "follow",
  "is_following": true,
  "follower_count": 6
}
```

`400 Bad Request`:

```json
{
  "status": "failed",
  "error": "You cannot follow yourself."
}
```

or:

```json
{
  "status": "failed",
  "error": "Invalid action."
}
```

`401 Unauthorized`:

```json
{
  "status": "failed",
  "error": "You need to login first."
}
```

`404 Not Found`:

```json
{
  "status": "failed",
  "error": "User not found."
}
```

---

### 22. Unfollow a user

- **Url:** `/social/unfollow/<user_id>/`
- **Request type:** `POST` (the view does not explicitly check the method)
- **Request parameters:** Path `user_id` (integer, required).
- **Request body:** None
- **Response body:**

```json
{
  "status": "success",
  "message": "Unfollowed."
}
```

`401 Unauthorized`:

```json
{
  "status": "failed",
  "error": "You need to login first."
}
```

This endpoint is separate from `/social/follow/<user_id>/` and always performs an unfollow.

---

### 23. Check follow state

- **Url:** `/social/is_following/?user_id=4`
- **Request type:** `GET` (the view does not explicitly check the method)
- **Request parameters:** Query `user_id` (integer, required).
- **Request body:** None
- **Response body:**

```json
{
  "status": "success",
  "is_following": true
}
```

`400 Bad Request`:

```json
{
  "status": "failed",
  "error": "user_id is required."
}
```

`401 Unauthorized`:

```json
{
  "status": "failed",
  "error": "You need to login first."
}
```

---

### 24. Get comments for a note

- **Url:** `/social/comments/?note_id=10`
- **Request type:** `GET`
- **Request parameters:** Query `note_id` (integer, required).
- **Request body:** None
- **Response body:**

```json
{
  "status": "success",
  "comments": [
    {
      "id": 3,
      "user_id": 1,
      "commenter_name": "You",
      "comment": "This helped a lot.",
      "created_at": "2026-11-21 12:00:00"
    },
    {
      "id": 2,
      "user_id": 5,
      "commenter_name": "Another Student",
      "comment": "Thanks for sharing.",
      "created_at": "2026-11-21 11:45:00"
    }
  ]
}
```

Comments by the logged-in user are returned with `commenter_name` set to `"You"`.

`400 Bad Request`:

```json
{
  "status": "failed",
  "error": "Note ID is required."
}
```

`401 Unauthorized`:

```json
{
  "status": "failed",
  "error": "You need to login first."
}
```

---

### 25. Add a comment

- **Url:** `/social/comments/`
- **Request type:** `POST`
- **Request parameters:** None
- **Request body:** `application/x-www-form-urlencoded` or `multipart/form-data`

```text
note_id=10
comment_text=This+helped+a+lot.
```

- **Response body:**

```json
{
  "status": "success",
  "message": "Comment added."
}
```

`400 Bad Request` examples:

```json
{
  "status": "failed",
  "error": "Note ID is required."
}
```

```json
{
  "status": "failed",
  "error": "Comment text is required."
}
```

`401 Unauthorized`:

```json
{
  "status": "failed",
  "error": "You need to login first."
}
```

There is no comment delete/update endpoint in the current backend.

---

### 26. My followers

- **Url:** `/social/my_followers/`
- **Request type:** `GET` (the view does not explicitly check the method)
- **Request parameters:** None
- **Request body:** None
- **Response body:**

```json
{
  "status": "success",
  "followers": [
    {
      "id": 4,
      "full_name": "Follower Name",
      "role": "student"
    }
  ]
}
```

`401 Unauthorized`:

```json
{
  "status": "failed",
  "error": "You need to login first."
}
```

---

### 27. My following list

- **Url:** `/social/my_following/`
- **Request type:** `GET` (the view does not explicitly check the method)
- **Request parameters:** None
- **Request body:** None
- **Response body:**

```json
{
  "status": "success",
  "following": [
    {
      "id": 5,
      "full_name": "Followed User",
      "role": "teacher"
    }
  ]
}
```

`401 Unauthorized`:

```json
{
  "status": "failed",
  "error": "You need to login first."
}
```

---

### 28. Followers of a user

- **Url:** `/social/followers/<user_id>/`
- **Request type:** `GET`
- **Request parameters:** Path `user_id` (integer, required).
- **Request body:** None
- **Response body:**

```json
{
  "status": "success",
  "followers": [
    {
      "id": 4,
      "full_name": "Follower Name",
      "role": "student"
    }
  ]
}
```

`405 Method Not Allowed`:

```json
{
  "status": "failed",
  "error": "Invalid request method."
}
```

This endpoint does not require login in the current code.

---

### 29. Following list of a user

- **Url:** `/social/following/<user_id>/`
- **Request type:** `GET`
- **Request parameters:** Path `user_id` (integer, required).
- **Request body:** None
- **Response body:**

```json
{
  "status": "success",
  "following": [
    {
      "id": 5,
      "full_name": "Followed User",
      "role": "teacher"
    }
  ]
}
```

`405 Method Not Allowed`:

```json
{
  "status": "failed",
  "error": "Invalid request method."
}
```

This endpoint does not require login in the current code.

---

## Search

### 30. Search people

- **Url:** `/search/people/?q=mahin`
- **Request type:** `GET` (the view does not explicitly check the method)
- **Request parameters:** Query `q` (string, required, minimum 2 characters).
- **Request body:** None
- **Response body:**

```json
{
  "users": [
    {
      "id": 5,
      "full_name": "Mahin Ahmed",
      "email": "mahin@example.com",
      "role": "teacher",
      "designation": "Lecturer",
      "department_name": "Computer Science and Engineering",
      "follower_count": 12,
      "is_following": false
    }
  ]
}
```

For a query shorter than 2 characters:

```json
{
  "users": []
}
```

The endpoint excludes the current session user when logged in, returns only active users, and limits results to 20.

---

### 31. Search notes by keyword

- **Url:** `/search/keywords/?q=array`
- **Request type:** `GET` (the view does not explicitly check the method)
- **Request parameters:** Query `q` (string, required, minimum 2 characters).
- **Request body:** None
- **Response body:**

```json
{
  "notes": [
    {
      "id": 10,
      "title": "Array Notes",
      "description": "Array operations and complexity",
      "type": "note",
      "intake": "24",
      "section": "A",
      "course_code": "CSE220",
      "rating_avg": 4.5,
      "rating_count": 2,
      "approved_at": "2026-11-21T10:30:00",
      "author_id": 3,
      "author_name": "Student Name",
      "file_type": "pdf",
      "file_url": "http://127.0.0.1:8000/notes/10/file/"
    }
  ]
}
```

For a query shorter than 2 characters:

```json
{
  "notes": []
}
```

`500 Internal Server Error`:

```json
{
  "error": "<database error message>"
}
```

Only approved notes are searched. Results are ordered by title match strength, then approval time.

---

## AI

### 32. Ask a question about a PDF (GET)

- **Url:** `/ai/ask/?note_id=10&question=What+is+Big+O+notation%3F`
- **Request type:** `GET`
- **Request parameters:** Query `note_id` (integer, required) and `question` (string, required).
- **Request body:** None
- **Response body:**

`200 OK` using Gemini:

```json
{
  "status": "success",
  "provider": "gemini",
  "answer": "Big O notation describes the upper bound of an algorithm's growth rate."
}
```

`200 OK` using OpenRouter fallback:

```json
{
  "status": "success",
  "provider": "openrouter",
  "gemini_error": "GEMINI_API_KEY is not configured.",
  "answer": "Big O notation describes the upper bound of an algorithm's growth rate."
}
```

`401 Unauthorized`:

```json
{
  "error": "You need to login first."
}
```

`400 Bad Request` examples:

```json
{
  "error": "PDF ID is required."
}
```

```json
{
  "error": "Question is required."
}
```

```json
{
  "error": "This feature only supports PDFs."
}
```

`404 Not Found` examples:

```json
{
  "error": "PDF not found."
}
```

```json
{
  "error": "PDF file is missing."
}
```

`422 Unprocessable Entity`:

```json
{
  "error": "No readable text was found in this PDF."
}
```

`502 Bad Gateway` when no provider succeeds:

```json
{
  "error": "Gemini failed and OPENROUTER_API_KEY is not configured.",
  "gemini_error": "GEMINI_API_KEY is not configured."
}
```

---

### 33. Ask a question about a PDF (POST)

- **Url:** `/ai/ask/`
- **Request type:** `POST`
- **Request parameters:** None
- **Request body:** `application/json`

```json
{
  "note_id": 10,
  "question": "What is Big O notation?"
}
```

- **Response body:** Same response bodies as the GET variant above.

`400 Bad Request` for malformed JSON:

```json
{
  "error": "Invalid JSON."
}
```

The backend extracts text from the PDF with `pypdf`, limits the prompt context to 15,000 characters, tries Gemini first, and falls back to OpenRouter.

---

## Non-JSON Django route

### 34. Django admin

- **Url:** `/admin/`
- **Request type:** `GET` / `POST`
- **Request parameters:** None
- **Request body:** HTML form data
- **Response body:** Django admin HTML

This is not a JSON API. It is backed by Django's built-in admin and the unmanaged models in the `hub` app. Departments, courses, teacher assignments, reports, and other tables are managed here.

---

## Routes referenced in comments but not implemented

These are commented out in `core/urls.py`, so they have no backend API response:

- `/notifications/`
- `/reports/`

Report submission is implemented at `/notes/<note_id>/report/`.

---

## Important implementation notes

- Authentication is session-based and manually stored as `request.session["user"]`; it does not use Django's built-in auth user model.
- Signup currently stores the supplied `password` value directly and uses the supplied `accountType` directly as `users.role`.
- Login only defines successful response bodies for `student` and verified `teacher`; an `admin` role currently has no success branch in `accounts/views.py`.
- `/notes/get_notes/` includes `pending` notes for non-owners; file and detail endpoints still block unauthorized access to pending files.
- `/notes/<note_id>/file/` normalizes `\` to `/` before checking the filesystem path, which helps with Windows-origin paths stored in MySQL.
- `/social/comments/` supports `GET` and `POST` only; it does not support `DELETE` or `PUT`.
- `/feeds/get_feeds_by_following/`, `/notes/get_notes/`, and the review list endpoints use joins that can produce duplicate note rows when multiple review rows exist for the same note.
- `/ai/ask/` requires `GEMINI_API_KEY` or `OPENROUTER_API_KEY` in the backend environment.
