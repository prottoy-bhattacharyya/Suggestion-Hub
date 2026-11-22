# Suggestion Hub — Feature Guide

A plain-language tour of what the platform does and how its pieces fit together.
For setup instructions, see [README.md](README.md).

Live site: [https://suggestion-hub.prottoy.qzz.io/](https://suggestion-hub.prottoy.qzz.io/)

---

## 1. The big picture

Suggestion Hub is a university notes-sharing site. Students upload class notes and
exam suggestions; teachers review them before they become visible to everyone;
other students browse, rate, comment on, and discuss them — and can even ask an AI
questions about a PDF.

The stack:

| Layer      | Technology                                      | Role                                                                      |
| ---------- | ----------------------------------------------- | ------------------------------------------------------------------------- |
| Frontend   | React + TanStack Start, Tailwind CSS            | All pages the user sees (port 8081)                                       |
| Backend    | Django 6 (session auth, hand-written SQL views) | Business rules and JSON APIs (port 8000)                                  |
| Database   | MySQL 8.4                                       | Users, notes, reviews, ratings, follows, comments, reports, notifications |
| Storage    | Local disk (`backend/uploaded_notes/`)          | Actual PDF and video files                                                |
| Deployment | Docker Compose + host Nginx + Cloudflare        | Three containers behind a public HTTPS domain                             |

A notable design choice: the Django app does **not** use the ORM for app logic.
Views use `mysql.connector` directly against the schema in `backend/schema.sql`.
The `hub` app contains `managed=False` models whose only job is to show those
tables in Django admin. Sessions are hand-managed as `request.session["user"]`
rather than via Django's built-in auth system.

---

## 2. Accounts and identity

**Sign up** (`/signup`). Choose student or teacher, pick a department, and enter
your details. Teachers also provide a designation. The frontend fetches the
department list from the backend so you cannot invent a department.

**Log in** (`/login`). Email + password; the backend checks the account is active
and that teachers are verified, then stores a session. The header updates
immediately after login/logout, and the login page redirects you to the feed if
you are already signed in.

**Session check** (`/accounts/me/`). Used by the feed page and header to re-check
your status against the database (e.g., if a teacher's verification was revoked).

**Profiles** (`/profile/$id`, with `/profile/me` for yourself). Shows your role,
department, courses, follower/following counts, and your uploads split into
Approved / Pending / Rejected tabs. Visitors only see your approved uploads.

**Not implemented**: email verification, password reset, and editing your profile
are on the roadmap — the signup route for verification is commented out.

---

## 3. Uploading notes and videos

The `/upload` page is the heart of the platform:

- **Two media kinds**: PDF (up to 20 MB) or video (MP4/WebM/MOV, up to 500 MB).
  MKV is intentionally rejected — browser playback is unreliable.
- **Metadata**: title, course, type ("note" or "suggestion"), intake, section,
  and an optional description.
- **Chunked upload**: large files are split into 10 MB chunks with an upload ID,
  sent with a progress bar, then assembled server-side. This is why 500 MB
  videos work even though Django's default single-request upload limit is small.
- **Duplicate protection**: the file's SHA-256 hash is checked against every
  existing note; uploading the same bytes twice is refused, enforced both in
  code and by a unique database key.
- **Basketball gate**: as a playful twist, the file is only committed after you
  score a basket in the small mini-game on the page.
- **Result**: a new note with status `pending`, waiting for a teacher.

Files live on disk under `backend/uploaded_notes/` (bind-mounted into the backend
container at `/app/uploaded_notes`). The database stores the relative path and
file type, not the bytes.

> **Note for older data**: notes uploaded while the backend ran on Windows have
> backslash paths (`uploaded_notes\file.pdf`) stored in the database; those need a
> one-time `REPLACE(file, '\\', '/')` repair to work under Linux/Docker.

---

## 4. Teacher review workflow

Uploaded notes do not appear in feeds until a teacher approves them.

- **Teacher queue** (`/teacher`): notes are restricted to courses the teacher is
  assigned to (`teacher_courses` table). Filters by course, type, intake, and
  section; a second tab shows review history.
- **Decisions**: Approve, Reject, or Keep pending, with a comment explaining why.
  Submissions are teacher-only and CSRF-protected.
- **Audit log**: reviews are insert-only records. Database triggers copy the
  latest decision into `notes.review_status`, set `approved_at` on approval, and
  recompute the status if a review is deleted. Approval automatically makes the
  note appear in feeds; rejection gives the uploader a visible reason on their
  profile.
- **Django admin** (`/admin/` on the backend domain) is where teachers are
  verified, reports are resolved, and raw table data is managed. It is a
  separate login system from the app.

---

## 5. Browsing, feeds, and discovery

**Feeds** (`/feeds`): two modes — all approved notes (newest first) and a
"following" feed showing approved notes from people you follow. Filter by
course, type, intake, section, and PDF vs video; sort newest/oldest. Login is
required, with a friendly login prompt instead of a hard error.

**Shared note cards** show the title, course code, uploader, date, rating,
review status, and either a Play icon ("View video") or a document icon
("View PDF").

**Keyword search** (`/search`): searches approved notes by title/description,
ranking title matches above description matches.

**People search**: find students/teachers by name, email, or department, see
follower counts, and follow/unfollow directly from the results.

---

## 6. Viewing a note (`/pdf/$id`)

Despite the route name, this page handles **both** PDFs and videos:

- PDFs render in an embedded iframe; videos render in an HTML5 `<video>`
  player with seeking support (the backend serves HTTP Range requests).
- Download and full-screen links; the file viewer itself is session-gated —
  pending/rejected notes are visible only to their uploader and to
  teachers/admins.
- **Rating**: 1–5 stars for approved notes you did not upload yourself; one
  rating per person, changeable at any time, with cached averages shown.
- **Comments**: an approved note has a comment section with names, timestamps,
  and a text box; your own comments are marked "You".
- **Report**: choose a reason (wrong content, copyright, inappropriate,
  corrupted, duplicate), add details, and send it to admins.
- **Ask AI**: for PDFs, a chat panel sends your question plus extracted PDF text
  to Gemini (or OpenRouter as fallback) and shows the answer with suggested
  starter questions. Hidden for videos.

---

## 7. Social features

- **Follow / unfollow** users; self-following is blocked both in code and by a
  database trigger.
- **Follower/following lists** on profiles, with unfollow buttons in dialogs.
- **Following feed** as described above.
- **Ratings and comments** as described above.
- **Notifications table** exists (four types: new pending note, approved,
  rejected, followed-user upload) and is visible in Django admin, but there is
  no API or UI for it yet — that feature is still a stub.

---

## 8. AI question answering

- The backend AI view requires login, accepts `note_id` + `question`, and only
  works for approved PDF notes.
- It extracts up to 15,000 characters of PDF text with `pypdf`, then asks Gemini
  using `GEMINI_API_KEY`/`GEMINI_MODEL`. If Gemini is unavailable, it falls back
  to OpenRouter (`OPENROUTER_API_KEY`/`OPENROUTER_MODEL`). Keys live in the
  backend `.env` file, never in source code.
- The front end shows a chat-style panel with suggested questions, an error
  message when you are logged out, and hides the feature for videos.
- The README specification mentions source citations, but the current response
  contains only the answer.

---

## 9. Administration and moderation

- Django admin at `/admin/` exposes all 11 database tables: departments,
  courses, users, teacher assignments, notes, reviews, ratings, comments,
  follows, notifications, and reports.
- Admins resolve reports by editing the report's status, verify teachers by
  toggling `is_verified`, and can adjust note status if needed.
- The **frontend `/admin` page** is still an early mock: its report actions,
  teacher approvals, and course assignments only change local state and do not
  call the backend. It is not linked from the header.

---

## 10. Database model (11 tables)

| Table                                       | Purpose                                                                     |
| ------------------------------------------- | --------------------------------------------------------------------------- |
| `departments`, `courses`, `teacher_courses` | Academic structure and teacher assignments                                  |
| `users`                                     | Accounts, roles (`student`/`teacher`/`admin`), verification flags           |
| `notes`                                     | Uploads: metadata, file path, hash, review/processing status, cached rating |
| `reviews`                                   | Teacher decision audit log                                                  |
| `ratings`                                   | One 1–5 star rating per user per note                                       |
| `comments`                                  | Discussion on notes                                                         |
| `follows`                                   | Social graph                                                                |
| `notifications`                             | Notification records (not yet surfaced in the UI)                           |
| `reports`                                   | User-submitted flags on notes                                               |

Five database triggers enforce rules regardless of which code path writes: no
self-follow, no self-rating, and three triggers that keep `notes.review_status`
in sync with the review log (including rollback to the previous decision when a
review is deleted).

---

## 11. Deployment

- `docker-compose.yml` runs three containers: MySQL (data in the `db-data`
  volume), Django backend (hot-reloaded source bind mount + `.venv` volume), and
  the Vite frontend (hot-reloaded source bind mount + `node_modules` volume).
- `.env` files supply DB credentials, superuser credentials, and AI API keys.
- Host Nginx proxies `suggestion-hub.prottoy.qzz.io` to port 8081 and
  `admin.prottoy.qzz.io` to port 8000; `setup_domain.sh` automates new domains
  with Certbot. Cloudflare sits in front with HTTPS.
- `robots.txt` disallows the private app routes and advertises `sitemap.xml`,
  which currently lists only the public landing page — all content pages need a
  session, so there is nothing else to index yet.

---

## 12. Known gaps and rough edges

This is a student project under active development. The main unfinished or
risky areas:

- Passwords are stored in plaintext, and signup trusts the requested role —
  both need fixing before the site is treated as production-grade.
- `DEBUG=True` and a committed insecure secret key in Django settings.
- The frontend `/admin` page is mock-only; the AI/semantic search code in
  `/search` is dead code with a hardcoded fake answer.
- Notes with Windows-style backslash paths need the one-time DB repair noted in
  section 3 to display under Docker/Linux.
- No automated tests yet; the `tests.py` files are scaffolds.
- Notifications, password reset, note edit/delete, and pagination exist in the
  design but are not implemented.

---

_This document describes the state of the project as of the feature review.
See `backend/README.md` for the original API specification and `README.md` for
setup instructions._
