"""
Feed endpoints
==============

Two endpoints return a paginated, filterable list of *approved* notes:

    GET /feeds/            -> every approved note
    GET /feeds/following/  -> approved notes from people the logged-in user follows

(The URLs above are examples; use whatever paths your urls.py maps to
``feeds`` and ``get_feeds_by_following``.)

Both accept the same query-string options:

    limit       how many notes per page             (default 5, min 1, max 20)
    offset      how many notes to skip              (default 0)
    sort        "oldest" for oldest first           (anything else = newest first)
    courses     comma separated course codes        e.g. courses=CSE101,CSE201
    types       comma separated note types          e.g. types=note,suggestion
    intakes     comma separated intakes             e.g. intakes=49,50
    sections    comma separated sections            e.g. sections=1,3
    file_types  comma separated file types          e.g. file_types=pdf,video
    min_rating  smallest average rating, 0 to 5     e.g. min_rating=4

Example request:

    GET /feeds/?limit=5&offset=5&courses=CSE101,CSE201&min_rating=4&sort=oldest

Example response (shortened):

    {
      "status": "success",
      "message": "Feeds fetched successfully",
      "notes": [ { "id": 12, "title": "DS Chapter 1", ... } ],
      "total": 12,                      # notes matching the filters, all pages
      "course_count": 2,                # distinct courses among those notes
      "filter_options": {               # values to fill the filter dropdowns
        "courses": ["CSE101", "CSE201", "CSE305"],
        "types": ["note", "suggestion"],
        ...
      },
      "limit": 5,
      "offset": 5,
      "next_offset": 10,                # use this as `offset` for the next page
      "has_more": true
    }

How the code is organised:

    _bounded_int      safely read a number from the URL
    _csv_values       read "a,b,c" from the URL into a clean list
    _min_rating       read the minimum rating from the URL
    _build_filters    turn URL filters into SQL conditions + values
    _serialize_note   turn one database row into the JSON the frontend expects
    _feed_response    the shared engine: runs the queries and builds the response
    feeds / get_feeds_by_following
                      the two public endpoints; they only decide WHICH notes are
                      allowed in the feed and then call _feed_response
"""

from django.http import JsonResponse

from core.utils import avatar_url, get_db_connection


def _bounded_int(value, default, minimum, maximum):
    """
    Read an integer from user input and keep it inside a safe range.

    Why: query-string values are always text and can be missing, garbage, or
    huge. Without this, `?limit=999999` could ask the database for every row.

    Examples (default=5, minimum=1, maximum=20):
        _bounded_int("10",  5, 1, 20)  -> 10    valid, used as-is
        _bounded_int("999", 5, 1, 20)  -> 20    too big, clamped to the maximum
        _bounded_int("-3",  5, 1, 20)  -> 1     too small, clamped to the minimum
        _bounded_int("abc", 5, 1, 20)  -> 5     not a number, fall back to default
        _bounded_int(None,  5, 1, 20)  -> 5     missing, fall back to default
        _bounded_int("3.5", 5, 1, 20)  -> 5     int("3.5") fails, so default
    """
    try:
        parsed = int(value)
    except (TypeError, ValueError):
        # TypeError: value was None (parameter missing)
        # ValueError: value was text that isn't a whole number
        return default

    # min(parsed, maximum) caps the top, max(minimum, ...) lifts the bottom.
    return max(minimum, min(parsed, maximum))


def _csv_values(request, key):
    """
    Read a comma separated query parameter into a clean list of strings.

    Examples:
        ?courses=CSE101,CSE201          -> ["CSE101", "CSE201"]
        ?courses= CSE101 , ,CSE201      -> ["CSE101", "CSE201"]   spaces and empty items dropped
        ?courses=                       -> []
        (parameter not present)         -> []

    Safety limits:
        - each value is cut to 100 characters
        - at most 50 values are kept
    This stops someone sending a 10,000 item list that would create a
    gigantic SQL "IN (...)" clause.

    Limitation: because commas separate the values, a value that itself
    contains a comma can't be filtered on.
    """
    raw = request.GET.get(key, "")  # "" when the parameter is missing

    return [
        value.strip()[:100]  # remove surrounding spaces, then cap the length
        for value in raw.split(",")
        if value.strip()  # skip blanks such as the gap in "a,,b"
    ][:50]  # keep only the first 50 items


def _min_rating(request):
    """
    Read the `min_rating` filter. Returns a float from 0 to 5, or None if the
    filter should not be applied.

    Examples:
        (missing) or ""     -> None   no filter
        ?min_rating=4       -> 4.0
        ?min_rating=4.5     -> 4.5
        ?min_rating=6       -> None   outside 0-5, ignored
        ?min_rating=-1      -> None   outside 0-5, ignored
        ?min_rating=abc     -> None   not a number, ignored

    Note: notes nobody has rated have rating_avg = NULL, so they never pass a
    ">= 4" test and disappear once this filter is used.

    Edge case to be aware of: float("nan") parses successfully, and every
    comparison with NaN is False, so `?min_rating=nan` slips past the range
    check below. If you ever see an SQL error from this filter, add
    `math.isnan(value)` to the check.
    """
    raw = request.GET.get("min_rating", "")
    if not raw:
        return None

    try:
        value = float(raw)
    except (TypeError, ValueError):
        return None

    if value < 0 or value > 5:
        return None

    return value


def _build_filters(request):
    """
    Turn the filter options in the URL into SQL conditions plus their values.

    Returns two lists that must be used together:
        clauses -> pieces of SQL, each using %s placeholders
        params  -> the values for those placeholders, in the same order

    Example: ?courses=CSE101,CSE201&intakes=49&min_rating=4
        clauses = [
            "c.code IN (%s, %s)",
            "n.intake IN (%s)",
            "n.rating_avg >= %s",
        ]
        params  = ["CSE101", "CSE201", "49", 4.0]

    Meaning: course is CSE101 or CSE201, AND intake is 49, AND rating >= 4.
    Within one filter the values are OR'd (IN), between filters they are AND'd.

    Security note: the column names below come from this hard-coded list, never
    from the user, so putting them into the SQL with an f-string is safe. The
    user's *values* are never put into the string: they travel separately as
    `params`, and the database driver escapes them. That is what protects
    against SQL injection. (e.g. ?courses=x'; DROP TABLE notes;-- is just
    treated as the harmless text "x'; DROP TABLE notes;--".)
    """
    clauses = []
    params = []

    # (SQL column, query-string key). `n` = notes table, `c` = courses table;
    # the aliases are defined in the FROM clause passed to _feed_response.
    for column, key in (
        ("c.code", "courses"),
        ("n.type", "types"),
        ("n.intake", "intakes"),
        ("n.section", "sections"),
        ("n.file_type", "file_types"),
    ):
        values = _csv_values(request, key)
        if values:
            # One "%s" per value: 3 values -> "%s, %s, %s"
            placeholders = ", ".join(["%s"] * len(values))
            clauses.append(f"{column} IN ({placeholders})")
            params.extend(values)

    minimum_rating = _min_rating(request)
    if minimum_rating is not None:
        clauses.append("n.rating_avg >= %s")
        params.append(minimum_rating)

    return clauses, params


def _serialize_note(request, row):
    """
    Convert one database row (a dict) into the JSON shape the frontend uses.

    Why this exists: database rows contain things JSON can't carry directly
    (datetimes, NULLs) and the frontend wants a few extra computed fields
    (full file URL, avatar URL).

    Example input row:
        {"id": 12, "title": "DS Chapter 1", "description": None,
         "type": "note", "intake": "49", "section": "3",
         "rating_avg": Decimal("4.50"), "rating_count": 8,
         "created_at": datetime(2026, 11, 20, 9, 30),
         "review_status": "approved", "uploader_id": 7,
         "course_code": "CSE101", "uploader_name": "Rahim",
         "avatar": "7.png", "file_type": "pdf"}

    Example output (shortened):
        {"id": 12, "title": "DS Chapter 1", "description": "",
         "created_at": "2026-11-20T09:30:00",
         "course_code": "CSE101", "uploader_name": "Rahim",
         "avatar_url": "http://localhost:8000/...",
         "file_url": "http://localhost:8000/notes/12/file/", ...}

    Notes:
        - row["id"] and row["uploader_id"] use [] because they must exist;
          everything else uses .get() so a missing/NULL column doesn't crash.
        - `or ""` turns NULL into an empty string (description, section,
          course_code) so the frontend never has to handle null for text.
        - created_at becomes an ISO string, or None if the date is NULL.
        - rating_avg may be a Decimal from MySQL. Django's JsonResponse sends
          Decimals as strings (e.g. "4.50"), so convert with Number() or
          parseFloat() in the frontend before doing maths or comparisons.
        - avatar_url and uploader_avatar_url hold the same value; both keys
          are kept so older frontend code that uses either name keeps working.
    """
    image_url = avatar_url(request, row["uploader_id"], row.get("avatar"))
    created_at = row.get("created_at")

    return {
        "id": row["id"],
        "title": row["title"],
        "description": row.get("description") or "",
        "type": row.get("type"),
        "intake": row.get("intake"),
        "section": row.get("section") or "",
        "rating_avg": row.get("rating_avg"),
        "rating_count": row.get("rating_count"),
        # datetime -> "2026-11-20T09:30:00"; JSON has no datetime type
        "created_at": created_at.isoformat() if created_at else None,
        "review_status": row.get("review_status"),
        "uploader_id": row["uploader_id"],
        "course_code": row.get("course_code") or "",
        "uploader_name": row.get("uploader_name"),
        "avatar_url": image_url,
        "uploader_avatar_url": image_url,
        "file_type": row.get("file_type"),
        # build_absolute_uri adds scheme + host, e.g.
        # "/notes/12/file/" -> "http://localhost:8000/notes/12/file/"
        "file_url": request.build_absolute_uri(f"/notes/{row['id']}/file/"),
    }


def _feed_response(request, base_from, base_where, base_params, message):
    """
    The shared engine behind both feeds. It builds the SQL, runs it, and
    returns the JSON response.

    Parameters (these are what make the two feeds different):
        base_from    the FROM/JOIN part of the SQL. Must define the aliases
                     n (notes), u (users) and c (courses).
        base_where   the rule for which notes are *allowed* in this feed,
                     independent of what the user filtered.
                       all feed:       "n.review_status = 'approved'"
                       following feed: "u.id IN (SELECT ...) AND n.review_status = 'approved'"
        base_params  values for any %s placeholders inside base_where.
                       all feed:       []
                       following feed: [current_user_id]
        message      text returned in the "message" field.

    Think of it as two layers of conditions:
        base_where  = what this feed is   (decided by the endpoint)
        filters     = what the user picked (from the query string)
    The final WHERE is: base_where AND filter1 AND filter2 ...
    """

    # ---- 1. Pagination and sorting -------------------------------------
    # ?limit=5&offset=10 means "give me 5 notes, skipping the first 10",
    # which is page 3 when the page size is 5.
    limit = _bounded_int(request.GET.get("limit"), 5, 1, 20)
    offset = _bounded_int(request.GET.get("offset"), 0, 0, 1000000)

    # `id` is added as a tie-breaker. Without it, two notes created in the same
    # second could swap places between pages and appear twice or be skipped.
    # This string is chosen from two fixed options, never from user text, so it
    # is safe to place in the SQL.
    order_sql = (
        "n.created_at ASC, n.id ASC"
        if request.GET.get("sort") == "oldest"
        else "n.created_at DESC, n.id DESC"
    )

    # ---- 2. Combine the feed rule with the user's filters ---------------
    filter_clauses, filter_params = _build_filters(request)

    # Example for ?courses=CSE101 on the "following" feed:
    #   base_where  = "u.id IN (SELECT following_id FROM follows WHERE follower_id = %s)
    #                  AND n.review_status = 'approved'"
    #   where_sql   = base_where + " AND c.code IN (%s)"
    #   where_params = [current_user_id, "CSE101"]
    #
    # ORDER MATTERS: placeholders are filled left to right, so base_params must
    # come first because base_where comes first in the SQL.
    where_sql = base_where + "".join(f" AND {clause}" for clause in filter_clauses)
    where_params = list(base_params) + filter_params

    conn = get_db_connection()
    try:
        # dictionary=True makes each row a dict ({"id": 12, ...}) instead of a
        # tuple, which is why the code can write row["title"].
        with conn.cursor(dictionary=True) as cursor:

            # ---- 3. Query 1: how many notes match? ----------------------
            # Same WHERE as the page query but with no LIMIT, so it counts
            # across ALL pages. This number drives "has_more" and lets the
            # frontend show "12 notes in 2 courses".
            # COUNT(DISTINCT c.code) counts each course once, even if it has
            # many matching notes.
            cursor.execute(
                f"""
                SELECT COUNT(*) AS total, COUNT(DISTINCT c.code) AS course_count
                {base_from}
                WHERE {where_sql}
                """,
                where_params,
            )
            # fetchone() returns None if nothing came back; fall back to zeros.
            counts = cursor.fetchone() or {"total": 0, "course_count": 0}

            # ---- 4. Query 2: the notes for this page --------------------
            # LIMIT/OFFSET also use %s placeholders, so they are appended to
            # the end of the parameter list in the order they appear.
            # Example: limit=5, offset=10 -> "... ORDER BY ... LIMIT 5 OFFSET 10"
            # COALESCE(x, '') turns NULL into '' directly in SQL.
            cursor.execute(
                f"""
                SELECT
                    n.id, n.title, COALESCE(n.description, '') AS description,
                    n.type, n.intake, COALESCE(n.section, '') AS section,
                    n.rating_avg, n.rating_count, n.created_at, n.review_status,
                    n.uploader_id, c.code AS course_code, u.full_name AS uploader_name,
                    u.avatar, n.file_type
                {base_from}
                WHERE {where_sql}
                ORDER BY {order_sql}
                LIMIT %s OFFSET %s
                """,
                where_params + [limit, offset],
            )
            notes = [_serialize_note(request, row) for row in cursor.fetchall()]

            # ---- 5. Queries 3-7: values for the filter dropdowns --------
            # For each filterable column, list its distinct values so the
            # frontend can draw the checkboxes, e.g.
            #   {"courses": ["CSE101", "CSE201"], "types": ["note", "suggestion"], ...}
            #
            # IMPORTANT: these use base_where only, NOT the user's filters.
            # So choosing "CSE101" does not make the other courses vanish from
            # the course list; the user can still tick more of them.
            # The trade-off: options never narrow, so a combination like
            # "CSE101 + intake 52" can legitimately return zero notes.
            #
            # Performance note: this is 5 extra queries on every page load,
            # including "load more". If it becomes slow, fetch the options only
            # when offset == 0, or cache them.
            filter_options = {}
            for key, expression in (
                ("courses", "c.code AS value"),
                ("types", "n.type AS value"),
                ("intakes", "n.intake AS value"),
                ("sections", "n.section AS value"),
                ("file_types", "n.file_type AS value"),
            ):
                cursor.execute(
                    f"""
                    SELECT DISTINCT {expression}
                    {base_from}
                    WHERE {base_where}
                    ORDER BY value
                    """,
                    base_params,
                )
                # `if row.get("value")` drops NULL and empty-string values
                # (e.g. notes with no section) so they don't show up as a
                # blank checkbox.
                filter_options[key] = [
                    row["value"] for row in cursor.fetchall() if row.get("value")
                ]

        # ---- 6. Work out the next page -----------------------------------
        # COUNT() can come back as Decimal/None, so normalise to plain ints.
        total = int(counts.get("total") or 0)
        course_count = int(counts.get("course_count") or 0)

        # next_offset = where the next page should start.
        # Worked example with total = 12 and limit = 5:
        #   offset 0  -> 5 notes returned  -> next_offset 5   -> 5 < 12  -> has_more True
        #   offset 5  -> 5 notes returned  -> next_offset 10  -> 10 < 12 -> has_more True
        #   offset 10 -> 2 notes returned  -> next_offset 12  -> 12 < 12 -> has_more False
        # On the last page `next_offset` is sent as None (null) so the
        # frontend knows to stop asking for more.
        next_offset = offset + len(notes)
        has_more = next_offset < total

        return JsonResponse(
            {
                "status": "success",
                "message": message,
                "notes": notes,
                "total": total,
                "course_count": course_count,
                "filter_options": filter_options,
                "limit": limit,
                "offset": offset,
                "next_offset": next_offset if has_more else None,
                "has_more": has_more,
            }
        )
    finally:
        # Always give the connection back, even if a query above raised an
        # error. Without `finally`, a failed request would leak a connection.
        conn.close()


def feeds(request):
    """
    The main feed: every approved note, newest first (unless ?sort=oldest).

    Requires a logged-in user. Login is stored in the Django session under
    the key "user" (set by your login view).

    Examples:
        Not logged in:
            GET /feeds/
            -> 401 {"status": "failed", "error": "You need to login first."}

        Logged in:
            GET /feeds/?limit=5&courses=CSE101
            -> approved CSE101 notes, 5 per page
    """
    if not request.session.get("user"):
        return JsonResponse(
            {"status": "failed", "error": "You need to login first."},
            status=401,
        )

    return _feed_response(
        request,
        # FROM: notes joined to their uploader and course. LEFT JOIN keeps a
        # note in the feed even if its uploader or course row is missing; the
        # missing parts just come back as NULL.
        """
        FROM notes n
        LEFT JOIN users u ON n.uploader_id = u.id
        LEFT JOIN courses c ON n.course_id = c.id
        """,
        # Only notes a teacher has approved are public. Pending and rejected
        # notes never appear in any feed.
        "n.review_status = 'approved'",
        [],  # no placeholders in the line above, so no values
        "Feeds fetched successfully",
    )


def get_feeds_by_following(request):
    """
    The "Following" feed: approved notes from people the current user follows.

    Example: user 5 follows users 7 and 9.
        GET /feeds/following/?limit=5
        -> only approved notes whose uploader_id is 7 or 9

    If the user follows nobody, the result is simply an empty list
    ({"notes": [], "total": 0, "has_more": false}), not an error.

    The subquery
        u.id IN (SELECT following_id FROM follows WHERE follower_id = %s)
    reads: "the uploader's id is in the list of people this user follows".
    The %s is filled with the logged-in user's id via base_params, so it is
    never built from URL input.
    """
    # Unlike feeds(), the user object is needed here (for its id), so it is
    # stored in a variable instead of only being checked for existence.
    session_user = request.session.get("user")
    if not session_user:
        return JsonResponse(
            {"status": "failed", "error": "You need to login first."},
            status=401,
        )

    return _feed_response(
        request,
        # Plain JOIN (not LEFT JOIN) on users: this feed is *about* uploaders,
        # so a note without a matching uploader should not appear.
        # Courses stay a LEFT JOIN so a note without a course isn't dropped.
        """
        FROM notes n
        JOIN users u ON n.uploader_id = u.id
        LEFT JOIN courses c ON n.course_id = c.id
        """,
        """
        u.id IN (SELECT following_id FROM follows WHERE follower_id = %s)
        AND n.review_status = 'approved'
        """,
        # Fills the single %s above. A list because _feed_response expects one
        # even when there is only one value. .get("id") returns None instead of
        # raising if the session user has no "id" key.
        [session_user.get("id")],
        "Following feeds fetched successfully",
    )