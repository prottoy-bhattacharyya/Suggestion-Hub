# Margin — Notes & Suggestions Sharing Platform

University-focused platform for sharing, reviewing, and discussing course
notes. Student/teacher accounts, note uploads, moderation, feeds, and more.

## Architecture

| Layer      | Tech                                        | Port |
| ---------- | ------------------------------------------- | ---- |
| Frontend   | React 19 + TanStack Start (Vite)            | 8081 |
| Backend    | Django 6.1 (JSON API, session auth)         | 8000 |
| App data   | MySQL (`suggestion_hub` database)           | 3306 |
| Django internals | SQLite (`backend/db.sqlite3`) — sessions/admin only | — |

The frontend and backend run as separate processes on different ports, so
every request is cross-origin. CORS/CSRF are configured in
`backend/core/settings.py` (`CORS_ALLOWED_ORIGINS`, `CSRF_TRUSTED_ORIGINS`
→ `http://localhost:8081`).

## Prerequisites

- Node.js (with npm)
- Python 3.13 + [uv](https://docs.astral.sh/uv/)
- MySQL server running locally

## Backend setup

```bash
cd backend

# 1. Install dependencies
uv sync

# 2. Create the database and load the schema (run once)
#    In a MySQL client:
#      CREATE DATABASE suggestion_hub;
#      USE suggestion_hub;
#      SOURCE schema.sql;

# 3. Create Django's built-in tables (sessions, admin, auth) — run once
uv run python manage.py migrate

# 4. Start the dev server on http://localhost:8000
uv run python manage.py runserver
```

### Database connection

App data connections are configured in `backend/core/utils.py`
(`get_db_connection()`): host `localhost`, port `3306`, user `root`,
database `suggestion_hub`. Edit that file if your MySQL credentials differ.

### Current API endpoints

| Method | Endpoint                            | Purpose                                    |
| ------ | ----------------------------------- | ------------------------------------------ |
| GET    | `/accounts/csrf/`                   | Sets the `csrftoken` cookie, returns token |
| POST   | `/accounts/signup/`                 | Create account (JSON body)                 |
| POST   | `/accounts/login/`                  | Validate credentials, create session       |
| GET    | `/academics/departments_list/`      | List departments (JSON)                    |
| GET    | `/academics/courses_list/<dep_id>/` | List courses for a department (JSON)       |

CSRF flow used by the frontend: `GET /accounts/csrf/` (with credentials)
→ `csrftoken` cookie is set → send its value as the `X-CSRFToken` header on
POST requests.

## Frontend setup

```bash
cd frontend

# 1. Install dependencies
npm install

# 2. Start the dev server on http://localhost:8081
npm run dev
```

Then open **http://localhost:8081** in your browser. Signup/login pages
talk to the Django API at `http://localhost:8000`.

## Running both

Open two terminals and keep both processes running:

```bash
# Terminal 1 — backend
cd backend && uv run python manage.py runserver

# Terminal 2 — frontend
cd frontend && npm run dev
```

## Troubleshooting

| Symptom                                             | Fix                                                                              |
| --------------------------------------------------- | -------------------------------------------------------------------------------- |
| `Forbidden (CSRF cookie not set.)`                  | Make sure the frontend calls `GET /accounts/csrf/` before POSTing, and that requests include credentials (`withCredentials: true` / `credentials: "include"`) |
| `no such table: django_session`                     | Run `uv run python manage.py migrate` in `backend/`                               |
| CORS error in browser console                       | Confirm both servers are running; confirm `CORS_ALLOWED_ORIGINS` in `backend/core/settings.py` includes the frontend origin; restart the Django server after editing settings |
| `TypeError: ... not JSON serializable` on login 500 | Don't store raw MySQL rows (with `datetime` columns) in the session; store only JSON-safe fields |
| MySQL connection errors                             | Verify MySQL is running and credentials in `backend/core/utils.py` are correct     |
