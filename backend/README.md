# Margin

Margin is a university-focused platform for sharing, reviewing,
discovering, and discussing course notes. It includes student and
teacher accounts, note uploads and moderation, course-based browsing,
social features, notifications, and AI-assisted question answering.

> **Note:** This README documents the application routes and intended
> behavior provided in the project route specification. Actual
> availability depends on the corresponding Django views and URL
> patterns being implemented.

## Features

-   University-email registration and email verification
-   Student and teacher profiles
-   Course and department management
-   PDF note uploads, previews, downloads, and moderation
-   Teacher review queues for assigned courses
-   Note ratings, following, and social feeds
-   Keyword and semantic search with filters
-   AI question answering with source references
-   Notifications and report moderation

## Route Reference

### `accounts` --- Authentication and profiles

  -----------------------------------------------------------------------
  Path                                Purpose
  ----------------------------------- -----------------------------------
  `/accounts/register/`               Sign up using a university email

  `/accounts/verify/<token>/`         Verify an email address using a
                                      verification code

  `/accounts/login/`                  Log in create session

  `/accounts/logout/`                 Log out delete session

  `/accounts/password-reset/`         Start or complete the
                                      password-reset flow

  `/accounts/profile/`                Edit the signed-in user's own
                                      profile

  `/accounts/u/<id>/`                 View a public profile, uploads,
                                      follower counts, and follow
                                      controls
  -----------------------------------------------------------------------

### `academics` --- Departments and courses

  -----------------------------------------------------------------------
  Path                                Purpose
  ----------------------------------- -----------------------------------
  `/courses/`                         List courses

  `/courses/<code>/`                  View approved notes for a course

  `/courses/api/?department=<id>`     Return a JSON list of courses for
                                      the upload-form dropdown
  -----------------------------------------------------------------------

**Administration:** Departments, courses, and teacher assignments are
managed through Django admin. Separate management pages are not required
initially.

### `notes` --- Uploads and note management

  -----------------------------------------------------------------------
  Path                                Purpose
  ----------------------------------- -----------------------------------
  `/notes/upload/`                    Display the note-upload form

  `/notes/<id>/`                      Show note details, description,
                                      rating, PDF preview, and report
                                      button

  `/notes/<id>/download/`             Download a note after checking
                                      access permissions

  `/notes/mine/`                      List the signed-in user's uploads
                                      and their statuses: pending,
                                      approved, or rejected

  `/notes/<id>/edit/`                 Edit note metadata or replace its
                                      file; edited notes are resubmitted
                                      for review

  `/notes/<id>/delete/`               Delete a note, its file, and its
                                      associated vectors
  -----------------------------------------------------------------------

### `reviews` --- Teacher moderation

These routes are intended for teachers reviewing notes for their own
assigned courses.

  -----------------------------------------------------------------------
  Path                                Purpose
  ----------------------------------- -----------------------------------
  `/review/queue/`                    List pending notes for the
                                      teacher's courses

  `/review/<note_id>/`                Preview a note PDF and decide
                                      whether to approve it

  `/review/<note_id>/claim/`          Claim a note for review (**POST**)

  `/review/<note_id>/decide/`         Approve or reject a note and
                                      include a comment (**POST**)

  `/review/history/`                  View previous review decisions
  -----------------------------------------------------------------------

### `social` --- Ratings and following

  -----------------------------------------------------------------------
  Path                                Purpose
  ----------------------------------- -----------------------------------
  `/social/rate/<note_id>/`           Submit or change a star rating
                                      (**POST**)

  `/social/follow/<user_id>/`         Follow a user (**POST**)

  `/social/unfollow/<user_id>/`       Unfollow a user (**POST**)

  `/social/following/`                List accounts the current user
                                      follows

  `/social/followers/`                List the current user's followers
  -----------------------------------------------------------------------

### `feed` --- Home feed

  Path         Purpose
  ------------ ---------------------------------------
  `/`          Display the home feed; login required
  `/?page=2`   Display a later page of feed results

### `search` --- Search notes

  -------------------------------------------------------------------------------------------------
  Path                                                          Purpose
  ------------------------------------------------------------- -----------------------------------
  `/search/?q=...&course=...&intake=...&section=...&type=...`   Search by keyword and semantic
                                                                similarity, with optional filters

  -------------------------------------------------------------------------------------------------

Available query parameters:

-   `q`: search query
-   `course`: course filter
-   `intake`: intake filter
-   `section`: section filter
-   `type`: content/type filter

### `ai` --- AI question answering

  -----------------------------------------------------------------------
  Path                                Purpose
  ----------------------------------- -----------------------------------
  `/ask/`                             Display the question-and-answer
                                      page

  `/ask/query/`                       Accept a question and optional
                                      course filter; return an answer and
                                      sources as JSON (**POST**)
  -----------------------------------------------------------------------

### `notifications` --- Notifications

  -----------------------------------------------------------------------
  Path                                Purpose
  ----------------------------------- -----------------------------------
  `/notifications/`                   Display notifications

  `/notifications/<id>/read/`         Mark one notification as read
                                      (**POST**)

  `/notifications/unread-count/`      Return the unread-notification
                                      count as JSON for the navbar badge
  -----------------------------------------------------------------------

### `moderation` --- Reports

  Path                        Purpose
  --------------------------- ------------------------------------------
  `/reports/new/<note_id>/`   Submit a report about a note (**POST**)
  `/reports/queue/`           Display the administrator's report queue
  `/reports/<id>/resolve/`    Resolve a report (**admin**)

## Access and Permissions

The route specification identifies these intended access rules:

-   **Signed-in users:** The home feed and personal profile editing
    require authentication.
-   **Students:** Can register, manage their own profile and uploads,
    and use the platform's available social and learning features,
    subject to implementation-specific permissions.
-   **Teachers:** Can review notes belonging to their assigned courses.
-   **Administrators:** Manage departments, courses, teacher
    assignments, and report resolution through Django admin or the
    moderation queue.
-   **Protected downloads:** Note downloads must check whether the
    requesting user is allowed to access the file.
-   **POST actions:** Rating, following, review decisions,
    notification-read actions, AI queries, and report submissions should
    use the methods specified above. State-changing requests should also
    use Django's normal CSRF protections where applicable.

## Django Implementation Checklist

-   [ ] Register the application's URL patterns for each documented
    route.
-   [ ] Add authentication and authorization checks to protected views.
-   [ ] Validate all submitted data on the server.
-   [ ] Enforce university-email requirements during registration.
-   [ ] Verify permissions before serving note downloads.
-   [ ] Restrict teachers' review queues to their assigned courses.
-   [ ] Store review decisions and comments.
-   [ ] Return the documented JSON responses from API endpoints.
-   [ ] Configure file storage and clean up note files and related
    vectors when notes are deleted.
-   [ ] Configure email delivery for verification and password-reset
    messages.
-   [ ] Add tests for access control, uploads, review workflows, and API
    responses.

## Route Conventions

-   Paths are written as Django URL paths relative to the site's root.
-   Values in angle brackets, such as `<id>`, `<token>`, `<code>`,
    `<note_id>`, and `<user_id>`, are dynamic path parameters.
-   Query parameters follow `?` in a URL.
-   `POST` indicates an endpoint that expects a POST request.
-   This route reference does not specify every request field, response
    schema, or status code. Those details should be documented alongside
    the implemented views or API serializers.
