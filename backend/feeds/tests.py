import uuid

from django.test import Client, TransactionTestCase

from core.utils import get_db_connection


class FeedPaginationTests(TransactionTestCase):
    def setUp(self):
        self.client = Client()
        self.intake = f"T{uuid.uuid4().hex[:8]}"
        self.note_ids = []
        self.follow_id = None

        connection = get_db_connection()
        try:
            with connection.cursor() as cursor:
                cursor.execute("SELECT id FROM users ORDER BY id LIMIT 2")
                users = [row[0] for row in cursor.fetchall()]
                self.viewer_id, self.uploader_id = users

                cursor.execute("SELECT id FROM courses ORDER BY id LIMIT 1")
                self.course_id = cursor.fetchone()[0]

                for index in range(7):
                    file_type = "video" if index % 2 else "pdf"
                    cursor.execute(
                        """
                        INSERT INTO notes (
                            uploader_id, course_id, title, description, type,
                            intake, section, file, file_type, file_hash,
                            page_count, ocr_used, review_status,
                            processing_status, rating_avg, rating_count,
                            view_count, created_at
                        )
                        VALUES (
                            %s, %s, %s, %s, 'note', %s, 'A', %s, %s, %s,
                            NULL, 0, 'approved', 'ready', 4.50, 2, 7,
                            DATE_SUB(NOW(), INTERVAL %s DAY)
                        )
                        """,
                        (
                            self.uploader_id,
                            self.course_id,
                            f"Feed test note {index}",
                            "Pagination fixture",
                            self.intake,
                            f"feed-test-{self.intake}-{index}.pdf",
                            file_type,
                            uuid.uuid4().hex,
                            index,
                        ),
                    )
                    self.note_ids.append(cursor.lastrowid)

                cursor.execute(
                    """
                    SELECT id FROM follows
                    WHERE follower_id = %s AND following_id = %s
                    """,
                    (self.viewer_id, self.uploader_id),
                )
                existing_follow = cursor.fetchone()
                if existing_follow is None:
                    cursor.execute(
                        """
                        INSERT INTO follows (follower_id, following_id)
                        VALUES (%s, %s)
                        """,
                        (self.viewer_id, self.uploader_id),
                    )
                    self.follow_id = cursor.lastrowid
            connection.commit()
        finally:
            connection.close()

        session = self.client.session
        session["user"] = {
            "id": self.viewer_id,
            "full_name": "Feed Test User",
        }
        session.save()

    def tearDown(self):
        connection = get_db_connection()
        try:
            with connection.cursor() as cursor:
                if self.follow_id is not None:
                    cursor.execute(
                        "DELETE FROM follows WHERE id = %s",
                        (self.follow_id,),
                    )
                if self.note_ids:
                    placeholders = ",".join(["%s"] * len(self.note_ids))
                    cursor.execute(
                        f"DELETE FROM notes WHERE id IN ({placeholders})",
                        self.note_ids,
                    )
            connection.commit()
        finally:
            connection.close()

        super().tearDown()

    def get_feed(self, path="/feeds/get_feeds/", **params):
        return self.client.get(path, params, HTTP_HOST="localhost")

    def test_first_page_returns_five_notes_and_true_total(self):
        response = self.get_feed(intakes=self.intake)

        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["status"], "success")
        self.assertEqual(len(data["notes"]), 5)
        self.assertEqual(data["total"], 7)
        self.assertEqual(data["course_count"], 1)
        self.assertEqual(data["limit"], 5)
        self.assertEqual(data["offset"], 0)
        self.assertEqual(data["next_offset"], 5)
        self.assertTrue(data["has_more"])
        self.assertEqual(
            [note["id"] for note in data["notes"]],
            self.note_ids[:5],
        )
        self.assertIn("uploader_avatar_url", data["notes"][0])

    def test_offset_returns_next_page(self):
        response = self.get_feed(intakes=self.intake, offset=5)

        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(len(data["notes"]), 2)
        self.assertEqual(data["offset"], 5)
        self.assertIsNone(data["next_offset"])
        self.assertFalse(data["has_more"])
        self.assertEqual(
            [note["id"] for note in data["notes"]],
            self.note_ids[5:],
        )

    def test_file_type_filter_and_oldest_sort(self):
        response = self.get_feed(
            intakes=self.intake,
            file_types="video",
            sort="oldest",
        )

        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["total"], 3)
        self.assertEqual(
            [note["id"] for note in data["notes"]],
            [self.note_ids[5], self.note_ids[3], self.note_ids[1]],
        )

    def test_following_feed_uses_same_pagination_contract(self):
        response = self.get_feed(
            "/feeds/get_feeds_by_following/",
            intakes=self.intake,
        )

        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["status"], "success")
        self.assertEqual(len(data["notes"]), 5)
        self.assertEqual(data["total"], 7)
        self.assertEqual(data["next_offset"], 5)
        self.assertTrue(data["has_more"])
        self.assertEqual(
            [note["id"] for note in data["notes"]],
            self.note_ids[:5],
        )
