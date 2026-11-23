from core.utils import get_db_connection

_FALLBACK_TITLES = [
    ("Legendary Grandmaster", 1200, 4294967295),
    ("Grandmaster", 700, 1199),
    ("Master", 350, 699),
    ("Expert", 150, 349),
    ("Pupil", 50, 149),
    ("Newbie", 0, 49),
]


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


def _title_for_points(cursor, points):
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
        return _value(row, "title", 0)

    for title, start, end in _FALLBACK_TITLES:
        if start <= points <= end:
            return title
    return "Newbie"


def rebuild_rank_positions(cursor=None, commit=False):
    owns_connection = cursor is None
    if owns_connection:
        connection = get_db_connection()
        cursor = connection.cursor()

    try:
        cursor.execute(
            """
            UPDATE user_rankings
            SET rank_global = NULL,
                rank_department = NULL
            WHERE is_ranked = 0
            """
        )
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
        if owns_connection and commit:
            connection.commit()
    finally:
        if owns_connection:
            connection.close()


def recalculate_user_rank(user_id, cursor=None, rebuild=True):
    if user_id is None:
        return None

    owns_connection = cursor is None
    if owns_connection:
        connection = get_db_connection()
        cursor = connection.cursor()

    try:
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

        role = _value(user, "role", 1, "student")
        is_active = bool(_value(user, "is_active", 2, 0))
        is_verified = bool(_value(user, "is_verified", 3, 0))

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
        stats = {
            "approved_uploads": int(_value(stats_row, "approved_uploads", 0, 0)),
            "ratings_received": int(_value(stats_row, "ratings_received", 1, 0)),
            "views_received": int(_value(stats_row, "views_received", 2, 0)),
            "followers": int(_value(stats_row, "followers", 3, 0)),
            "comments_received": int(_value(stats_row, "comments_received", 4, 0)),
            "completed_reviews": int(_value(stats_row, "completed_reviews", 5, 0)),
        }

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

        title = _title_for_points(cursor, points)
        is_ranked = int(
            is_active
            and role in ("student", "teacher")
            and (role != "teacher" or is_verified)
        )

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

        if rebuild:
            rebuild_rank_positions(cursor)

        if owns_connection:
            connection.commit()

        return {
            "user_id": user_id,
            "role": role,
            "points": points,
            "rank_title": title,
            "is_ranked": bool(is_ranked),
            **stats,
        }
    except Exception:
        if owns_connection:
            connection.rollback()
        raise
    finally:
        if owns_connection:
            connection.close()


def recalculate_users_ranks(user_ids, cursor=None, rebuild=True):
    user_ids = [user_id for user_id in dict.fromkeys(user_ids) if user_id]
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
