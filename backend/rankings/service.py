# * ======================================================================
# * RANKINGS SERVICE: points, titles and leaderboard positions
# * ======================================================================
#
# Better Comments legend used in this file:
#   # *      green   key idea / section header
#   # !      red     bug risk or something that surprises
#   # ?      blue    something to double check (I could not see that code)
#   # TODO   orange  suggested improvement
#   # //     grey    redundant code
#   #        plain   normal explanation, "e.g." lines are worked examples
#
# * THE BIG PICTURE
#   Every user has ONE row in the `user_rankings` table:
#
#       user_id | points | rank_title | approved_uploads | ... | is_ranked | rank_global | rank_department
#
#   Two separate jobs keep that table up to date:
#
#     1) recalculate_user_rank(user_id)
#          Re-counts ONE user's activity, turns it into points, picks a title
#          (Pupil, Expert ...) and saves it.
#
#     2) rebuild_rank_positions()
#          Looks at EVERYONE's points and assigns leaderboard positions
#          (1st, 2nd, 3rd ...). Positions depend on other users, so they can't
#          be calculated for one user alone.
#
#   Typical use (this is what your notes views do after an upload/view/rating):
#
#       recalculate_user_rank(uploader_id, cursor=cursor, rebuild=False)  # step 1
#       rebuild_rank_positions(cursor)                                    # step 2
#       conn.commit()
#
# * THE "cursor=None" PATTERN used by every function here
#   cursor given   -> "borrow" the caller's cursor. The work joins the caller's
#                     transaction, and the CALLER commits. This is how a view
#                     saves a note and updates ranks atomically: both succeed
#                     or both are undone.
#   cursor is None -> the function opens its OWN connection, does the work,
#                     and closes it again.
#   The variable `owns_connection` records which case we are in, so the
#   function only closes/commits what it opened itself.

from core.utils import get_db_connection

# * ----------------------------------------------------------------------
# * Fallback titles
# * ----------------------------------------------------------------------
# Used only if the `rank_titles` table has no matching row (empty table, gap
# in the ranges). Each tuple is (title, first point, last point).
#   e.g. 81 points  -> falls in (50, 149) -> "Pupil"
#        1500 points -> falls in (1200, 4294967295) -> "Legendary Grandmaster"
# 4294967295 is the largest value of an UNSIGNED INT, i.e. "no upper limit".
_FALLBACK_TITLES = [
    ("Legendary Grandmaster", 1200, 4294967295),
    ("Grandmaster", 700, 1199),
    ("Master", 350, 699),
    ("Expert", 150, 349),
    ("Pupil", 50, 149),
    ("Newbie", 0, 49),
]


# * ======================================================================
# * 1. _value  (small helper)
# * ======================================================================
# Reads one column from a database row, whether the row is a TUPLE or a DICT.
# The MySQL driver returns tuples by default and dicts when the cursor was
# created with dictionary=True. Other views in your project use both, so this
# function lets the ranking code work with either.
#
#   row     the database row (tuple, dict or None)
#   key     column name, used when the row is a dict
#   index   column position, used when the row is a tuple
#   default what to return when the value is missing or NULL
#
# Examples:
#   _value((7, "student", 1), "role", 1)             -> "student"   (tuple, index 1)
#   _value({"id": 7, "role": "student"}, "role", 1)  -> "student"   (dict, by name)
#   _value(None, "role", 1, "student")               -> "student"   (no row)
#   _value((7,), "role", 1, "student")               -> "student"   (tuple too short)
#   _value((7, None, 1), "role", 1, "student")       -> "student"   (NULL becomes default)
#   _value((7, 0, 1), "is_active", 1, 5)             -> 0           (0 is kept; only None is replaced)
def _value(row, key, index, default=None):
    if row is None:
        return default
    if isinstance(row, dict):
        value = row.get(key, default)
    elif len(row) > index:
        value = row[index]
    else:
        value = default
    return default if value is None else value


# * ======================================================================
# * 2. _title_for_points
# * ======================================================================
# Turns a points total into a rank title.
#
# e.g. rank_titles table:
#     title        start_point  end_point
#     Newbie            0          49
#     Pupil            50         149
#     Expert          150         349
#     Master          350         699
#
#     points = 81   -> "Pupil"
#     points = 350  -> "Master"   (BETWEEN includes both ends)
#     points = 0    -> "Newbie"
def _title_for_points(cursor, points):
    # `%s BETWEEN start_point AND end_point` reads: "is my points value inside
    # this row's range?". ORDER BY start_point DESC + LIMIT 1 picks the
    # highest-starting match if two ranges ever overlap by mistake.
    cursor.execute(
        """
        SELECT title
        FROM rank_titles
        WHERE %s BETWEEN start_point AND end_point
        ORDER BY start_point DESC
        LIMIT 1
        """,
        (points,),
    )
    row = cursor.fetchone()
    if row:
        # ? If a rank_titles row has a NULL title, _value returns None here and
        # ? the user gets no title. Unlikely, but make title NOT NULL to be safe.
        return _value(row, "title", 0)

    # No row in the table covered this number (table empty or a gap in the
    # ranges), so fall back to the hard-coded list above.
    for title, start, end in _FALLBACK_TITLES:
        if start <= points <= end:
            return title
    # Last resort (e.g. negative points, which should never happen).
    return "Newbie"


# * ======================================================================
# * 3. rebuild_rank_positions
# * ======================================================================
# Assigns leaderboard positions to everyone.
#
#   rank_global      position among users with the SAME ROLE
#                    (students are ranked against students, teachers against
#                    teachers; despite the name it is not one list for all)
#   rank_department  position among the same role AND the same department
#
# * Ties: RANK() gives equal points the same position and then SKIPS numbers.
#   e.g. students in one department:
#       points   100   90   90   80
#       rank       1    2    2    4      <- nobody gets 3
#   (DENSE_RANK() would give 1, 2, 2, 3 instead.)
#
# * Example: three students, two departments
#       user  department  points | rank_global  rank_department
#       Anik      CSE        120  |      1            1
#       Bina      CSE         90  |      2            2
#       Chitra    EEE         90  |      2            1
#
# ? RANK() OVER (...) is a "window function": it needs MySQL 8.0 or newer.
#
# Parameters:
#   cursor  borrow the caller's cursor (then the CALLER commits)
#   commit  only matters when this function opens its own connection
def rebuild_rank_positions(cursor=None, commit=False):
    owns_connection = cursor is None
    if owns_connection:
        connection = get_db_connection()
        cursor = connection.cursor()

    try:
        # Step 1: anyone who is NOT ranked (inactive, unverified teacher,
        # admin ...) gets their positions cleared, so a user who stops
        # qualifying disappears from the leaderboard.
        cursor.execute(
            """
            UPDATE user_rankings
            SET rank_global = NULL,
                rank_department = NULL
            WHERE is_ranked = 0
            """
        )
        # Step 2: compute positions for everyone who IS ranked and write them
        # back. How the query reads, inside out:
        #   - the inner SELECT (named `ranked`) lists every ranked student and
        #     teacher with two window-function columns
        #   - PARTITION BY = "start a separate ranking for each group"
        #   - ORDER BY points DESC = "highest points gets position 1"
        #   - the outer UPDATE joins that result to user_rankings and copies
        #     the numbers in; rank_updated_at records when.
        cursor.execute(
            """
            UPDATE user_rankings ur
            JOIN users u ON u.id = ur.user_id
            JOIN (
                SELECT ur2.user_id,
                       RANK() OVER (
                         PARTITION BY u2.role
                         ORDER BY ur2.points DESC
                       ) AS global_rank,
                       RANK() OVER (
                         PARTITION BY u2.role, u2.department_id
                         ORDER BY ur2.points DESC
                       ) AS department_rank
                FROM user_rankings ur2
                JOIN users u2 ON u2.id = ur2.user_id
                WHERE ur2.is_ranked = 1
                  AND u2.role IN ('student', 'teacher')
            ) ranked ON ranked.user_id = ur.user_id
            SET ur.rank_global = ranked.global_rank,
                ur.rank_department = ranked.department_rank,
                ur.rank_updated_at = NOW()
            """
        )
        # ! Called as rebuild_rank_positions() with NO arguments, this opens its
        # ! own connection and only commits when commit=True. Without it the
        # ! changes are thrown away when the connection closes, so a bare call
        # ! does nothing permanent. Use rebuild_rank_positions(commit=True),
        # ! or pass your own cursor and commit yourself.
        if owns_connection and commit:
            connection.commit()
    finally:
        if owns_connection:
            connection.close()
    # ! Performance: step 2 rewrites the row of EVERY ranked user each time,
    # ! and your notes views call this after every upload, rating and counted
    # ! view. With thousands of users each click locks and rewrites thousands
    # ! of rows, and two simultaneous rebuilds can deadlock.
    # TODO: run this from a scheduled job (e.g. every 1-5 minutes) instead of
    # TODO: on every request, and/or only update rows whose rank changed.


# * ======================================================================
# * 4. recalculate_user_rank
# * ======================================================================
# Re-counts one user's activity, converts it to points, picks a title and
# saves everything into `user_rankings`.
#
#   user_id  the user to recalculate
#   cursor   borrow the caller's cursor (see "cursor=None pattern" above)
#   rebuild  True  -> also rebuild everyone's positions at the end
#            False -> skip it (use this when you will call
#                     rebuild_rank_positions yourself, as your views do)
#
# Returns a dict summary, e.g.
#   {"user_id": 7, "role": "student", "points": 81, "rank_title": "Pupil",
#    "is_ranked": True, "approved_uploads": 3, "ratings_received": 8, ...}
# or None if user_id is None or the user doesn't exist.
def recalculate_user_rank(user_id, cursor=None, rebuild=True):
    # e.g. a note whose uploader_id is NULL -> nothing to do.
    if user_id is None:
        return None

    owns_connection = cursor is None
    if owns_connection:
        connection = get_db_connection()
        cursor = connection.cursor()

    try:
        # ---- Step 1: who is this user? ----------------------------------
        # Role decides which points formula applies. is_active / is_verified
        # decide whether the user appears on the leaderboard.
        cursor.execute(
            """
            SELECT id, role, is_active, is_verified, department_id
            FROM users
            WHERE id = %s
            """,
            (user_id,),
        )
        user = cursor.fetchone()
        if not user:
            return None

        # e.g. user row (7, "student", 1, 0, 3):
        #   role = "student"   is_active = True   is_verified = False
        # The defaults ("student", 0, 0) apply if a column is NULL.
        role = _value(user, "role", 1, "student")
        is_active = bool(_value(user, "is_active", 2, 0))
        is_verified = bool(_value(user, "is_verified", 3, 0))

        # ---- Step 2: count the user's activity ---------------------------
        # One query with six small sub-queries, so it costs one round trip.
        # Each %s is the same user_id (six of them, hence six values below).
        #
        #   approved_uploads   their notes that a teacher approved
        #   ratings_received   how many star ratings others gave their approved notes
        #                      (a COUNT of ratings, not the stars themselves)
        #   views_received     rows in note_daily_views for their approved notes
        #                      = unique (viewer, day) pairs, same as notes.view_count
        #   followers          people following them
        #   comments_received  comments on their approved notes
        #   completed_reviews  DISTINCT notes they reviewed as a teacher with a
        #                      final decision. DISTINCT means re-reviewing the
        #                      same note doesn't earn points twice.
        #
        # Only APPROVED notes count, so rejected or pending uploads earn nothing.
        # ? `decision IN ('approved', 'rejected')`: your teacher review page
        # ? also handles the spellings "approval"/"rejection" in review logs.
        # ? Make sure the `reviews` table really stores 'approved'/'rejected',
        # ? otherwise teachers' completed_reviews will stay 0.
        cursor.execute(
            """
            SELECT
              (SELECT COUNT(*) FROM notes
               WHERE uploader_id = %s AND review_status = 'approved') AS approved_uploads,
              (SELECT COUNT(*) FROM ratings r
               JOIN notes n ON n.id = r.note_id
               WHERE n.uploader_id = %s AND n.review_status = 'approved') AS ratings_received,
              (SELECT COUNT(*) FROM note_daily_views v
               JOIN notes n ON n.id = v.note_id
               WHERE n.uploader_id = %s AND n.review_status = 'approved') AS views_received,
              (SELECT COUNT(*) FROM follows WHERE following_id = %s) AS followers,
              (SELECT COUNT(*) FROM comments c
               JOIN notes n ON n.id = c.note_id
               WHERE n.uploader_id = %s AND n.review_status = 'approved') AS comments_received,
              (SELECT COUNT(DISTINCT note_id) FROM reviews
               WHERE teacher_id = %s AND decision IN ('approved', 'rejected')) AS completed_reviews
            """,
            (user_id, user_id, user_id, user_id, user_id, user_id),
        )
        stats_row = cursor.fetchone()
        # Convert to plain ints. The second number in each _value call is the
        # column position in the SELECT above (0 = approved_uploads, 1 = ...).
        # e.g. stats_row = (3, 8, 214, 5, 4, 0) ->
        #   {"approved_uploads": 3, "ratings_received": 8, "views_received": 214,
        #    "followers": 5, "comments_received": 4, "completed_reviews": 0}
        stats = {
            "approved_uploads": int(_value(stats_row, "approved_uploads", 0, 0)),
            "ratings_received": int(_value(stats_row, "ratings_received", 1, 0)),
            "views_received": int(_value(stats_row, "views_received", 2, 0)),
            "followers": int(_value(stats_row, "followers", 3, 0)),
            "comments_received": int(_value(stats_row, "comments_received", 4, 0)),
            "completed_reviews": int(_value(stats_row, "completed_reviews", 5, 0)),
        }

        # ---- Step 3: turn activity into points ---------------------------
        # * Student formula:
        #     10 per approved upload
        #   +  2 per rating received
        #   +  1 per 10 views            (// is whole-number division)
        #   +  2 per follower
        #   +  1 per comment received
        #
        #   e.g. 3 uploads, 8 ratings, 214 views, 5 followers, 4 comments:
        #     3*10 + 8*2 + 214//10 + 5*2 + 4
        #   = 30   + 16  + 21      + 10  + 4  = 81 points  -> "Pupil"
        #
        # * Teacher formula (reviewing is what earns points):
        #     15 per completed review + 2 per follower + 1 per comment
        #   e.g. 12 reviews, 6 followers, 3 comments:
        #     12*15 + 6*2 + 3 = 195 points -> "Expert"
        #
        # * Anyone else (e.g. admin) gets 0 and is not ranked.
        # ? Ratings count the same whether they are 1 star or 5 stars, so a
        # ? note that people dislike still earns points. Consider weighting by
        # ? the note's average rating if quality should matter.
        # TODO: guard against farming: fake accounts following each other
        # TODO: (2 points per follower) is the cheapest way to climb.
        if role == "student":
            points = (
                stats["approved_uploads"] * 10
                + stats["ratings_received"] * 2
                + stats["views_received"] // 10
                + stats["followers"] * 2
                + stats["comments_received"]
            )
        elif role == "teacher":
            points = (
                stats["completed_reviews"] * 15
                + stats["followers"] * 2
                + stats["comments_received"]
            )
        else:
            points = 0

        # ---- Step 4: title and "is this user on the leaderboard?" -------
        title = _title_for_points(cursor, points)
        # A user is ranked only if ALL of these hold:
        #   - the account is active
        #   - the role is student or teacher
        #   - if a teacher: the teacher is verified by an admin
        #
        # e.g. active student                  -> 1  (ranked)
        #      active teacher, not verified    -> 0  (hidden until verified)
        #      active + verified teacher       -> 1
        #      inactive student                -> 0
        #      admin                           -> 0
        # int(True) is 1 and int(False) is 0, which is what the column stores.
        is_ranked = int(
            is_active
            and role in ("student", "teacher")
            and (role != "teacher" or is_verified)
        )

        # ---- Step 5: save ------------------------------------------------
        # "Upsert": INSERT a new row for a first-time user, or if a row for
        # this user_id already exists (user_id must be the PRIMARY KEY or
        # UNIQUE), update it instead. So you never have to check first.
        # VALUES(col) means "the value I tried to insert for this column".
        # ? VALUES() is deprecated in MySQL 8.0.20+ but still works. The newer
        # ? form is `INSERT ... AS new ... SET points = new.points`.
        cursor.execute(
            """
            INSERT INTO user_rankings (
                user_id, points, rank_title, approved_uploads,
                ratings_received, views_received, followers,
                comments_received, completed_reviews, is_ranked,
                stats_updated_at
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, NOW())
            ON DUPLICATE KEY UPDATE
                points = VALUES(points),
                rank_title = VALUES(rank_title),
                approved_uploads = VALUES(approved_uploads),
                ratings_received = VALUES(ratings_received),
                views_received = VALUES(views_received),
                followers = VALUES(followers),
                comments_received = VALUES(comments_received),
                completed_reviews = VALUES(completed_reviews),
                is_ranked = VALUES(is_ranked),
                stats_updated_at = NOW()
            """,
            (
                user_id,
                points,
                title,
                stats["approved_uploads"],
                stats["ratings_received"],
                stats["views_received"],
                stats["followers"],
                stats["comments_received"],
                stats["completed_reviews"],
                is_ranked,
            ),
        )

        # Positions are only rebuilt when asked. With rebuild=False a user who
        # just stopped qualifying keeps a stale rank_global until the next
        # rebuild, so always follow up with rebuild_rank_positions().
        if rebuild:
            rebuild_rank_positions(cursor)

        # Commit ONLY if we opened the connection ourselves. When the caller
        # passed a cursor, the caller decides when to commit.
        if owns_connection:
            connection.commit()

        # `**stats` spreads the six counters into the dict.
        return {
            "user_id": user_id,
            "role": role,
            "points": points,
            "rank_title": title,
            "is_ranked": bool(is_ranked),
            **stats,
        }
    except Exception:
        # Undo our own half-finished work, then re-raise so the caller still
        # sees the error. (If we borrowed a cursor, the caller rolls back.)
        if owns_connection:
            connection.rollback()
        raise
    finally:
        # Close only what we opened.
        if owns_connection:
            connection.close()


# * ======================================================================
# * 5. recalculate_users_ranks  (several users at once)
# * ======================================================================
# Use when ONE event affects MORE THAN ONE user, so the expensive position
# rebuild happens once instead of once per user.
#
#   e.g. a teacher approves a note:
#     the uploader gets +10 (approved upload), the teacher gets +15 (review)
#       recalculate_users_ranks([uploader_id, teacher_id], cursor=cursor)
#
# Steps:
#   1. dict.fromkeys(...) removes duplicates and keeps the original order,
#      and the `if user_id` filter drops None and 0.
#        e.g. [7, 9, 7, None] -> [7, 9]
#   2. recalculate each user with rebuild=False (cheap)
#   3. rebuild positions ONE time at the end
#
# Returns a list of results, one per user (an item is None if that user
# doesn't exist).
def recalculate_users_ranks(user_ids, cursor=None, rebuild=True):
    user_ids = [user_id for user_id in dict.fromkeys(user_ids) if user_id]
    # Nothing to do -> return early (and don't open a connection for nothing).
    if not user_ids:
        return []

    owns_connection = cursor is None
    if owns_connection:
        connection = get_db_connection()
        cursor = connection.cursor()

    try:
        results = [
            recalculate_user_rank(user_id, cursor=cursor, rebuild=False)
            for user_id in user_ids
        ]
        if rebuild:
            rebuild_rank_positions(cursor)
        if owns_connection:
            connection.commit()
        return results
    except Exception:
        if owns_connection:
            connection.rollback()
        raise
    finally:
        if owns_connection:
            connection.close()


# * ======================================================================
# * 6. get_note_uploader
# * ======================================================================
# Small helper: "who uploaded note 12?". Handy when an event only knows the
# note (a rating, a review) but ranking needs the uploader's id.
#
#   e.g. get_note_uploader(12) -> 7
#        get_note_uploader(9999) -> None   (no such note)
#
# It only reads, so nothing needs committing. If it opened its own
# connection it closes it again in `finally`.
def get_note_uploader(note_id, cursor=None):
    owns_connection = cursor is None
    if owns_connection:
        connection = get_db_connection()
        cursor = connection.cursor()

    try:
        cursor.execute("SELECT uploader_id FROM notes WHERE id = %s", (note_id,))
        row = cursor.fetchone()
        if not row:
            return None
        return _value(row, "uploader_id", 0)
    finally:
        if owns_connection:
            connection.close()