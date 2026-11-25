import tempfile
import uuid
from pathlib import Path
from unittest.mock import patch

from django.test import Client, TransactionTestCase, override_settings

from core.utils import get_db_connection


class NoteDeleteTests(TransactionTestCase):
    def setUp(self):
        self.client = Client()
        self.temp_dir = tempfile.TemporaryDirectory()
        self.settings_override = override_settings(BASE_DIR=self.temp_dir.name)
        self.settings_override.enable()
        self.upload_dir = Path(self.temp_dir.name) / "uploaded_notes"
        self.upload_dir.mkdir(parents=True, exist_ok=True)

        suffix = uuid.uuid4().hex[:10]
        self.filename = f"delete-test-{suffix}.pdf"
        self.file = f"uploaded_notes/{self.filename}"
        self.created_file = self.upload_dir / self.filename
        self.created_file.write_bytes(b"delete test file")

        connection = get_db_connection()
        try:
            with connection.cursor() as cursor:
                cursor.execute(
                    "INSERT INTO departments (name, code) VALUES (%s, %s)",
                    (f"Delete Dept {suffix}", f"DD{suffix}"[:20]),
                )
                department_id = cursor.lastrowid

                cursor.execute(
                    "INSERT INTO courses (code, title, department_id) VALUES (%s, %s, %s)",
                    (f"C{suffix}"[:20], "Delete Test Course", department_id),
                )
                self.course_id = cursor.lastrowid

                self.owner_id = self.create_user(cursor, suffix, "student", "owner")
                self.other_id = self.create_user(cursor, suffix, "student", "other")
                self.teacher_id = self.create_user(cursor, suffix, "teacher", "teacher")

                self.note_id = self.create_note(cursor, self.owner_id, self.file, suffix)
                cursor.execute(
                    """
                    INSERT INTO reviews (note_id, teacher_id, decision, comment)
                    VALUES (%s, %s, 'approved', 'Looks good')
                    """,
                    (self.note_id, self.teacher_id),
                )
                self.review_id = cursor.lastrowid
                cursor.execute(
                    """
                    INSERT INTO ratings (note_id, user_id, stars)
                    VALUES (%s, %s, 5)
                    """,
                    (self.note_id, self.other_id),
                )
                self.rating_id = cursor.lastrowid
            connection.commit()
        finally:
            connection.close()

    def tearDown(self):
        self.settings_override.disable()
        self.temp_dir.cleanup()
        super().tearDown()

    def create_user(self, cursor, suffix, role, label):
        cursor.execute(
            """
            INSERT INTO users (email, password, full_name, role, department_id)
            VALUES (%s, %s, %s, %s, %s)
            """,
            (
                f"{label}-{suffix}@example.test",
                "test-password",
                f"Delete Test {label}",
                role,
                None,
            ),
        )
        return cursor.lastrowid

    def create_note(self, cursor, uploader_id, file, hash_suffix, file_type="pdf"):
        cursor.execute(
            """
            INSERT INTO notes (
                uploader_id, course_id, title, description, type,
                intake, section, file, file_type, file_hash,
                review_status, processing_status
            )
            VALUES (%s, %s, %s, %s, 'note', %s, 'A', %s, %s, %s,
                    'approved', 'ready')
            """,
            (
                uploader_id,
                self.course_id,
                f"Delete Test Note {hash_suffix}",
                "Delete test fixture",
                uuid.uuid4().hex[:8],
                file,
                file_type,
                uuid.uuid4().hex,
            ),
        )
        return cursor.lastrowid

    def set_session_user(self, user_id):
        session = self.client.session
        session["user"] = {
            "id": user_id,
            "full_name": "Delete Test User",
            "role": "student",
        }
        session.save()

    def delete_note(self, note_id):
        with patch("notes.views.recalculate_users_ranks") as recalculate:
            response = self.client.post(f"/notes/{note_id}/delete/")
        return response, recalculate

    def count_rows(self, table, note_id):
        column = "id" if table == "notes" else "note_id"
        connection = get_db_connection()
        try:
            with connection.cursor() as cursor:
                cursor.execute(f"SELECT COUNT(*) FROM {table} WHERE {column} = %s", (note_id,))
                return cursor.fetchone()[0]
        finally:
            connection.close()

    def test_owner_can_hard_delete_note_cascade_and_remove_file(self):
        self.set_session_user(self.owner_id)

        response, recalculate = self.delete_note(self.note_id)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["status"], "success")
        self.assertTrue(response.json()["file_deleted"])
        self.assertFalse(self.created_file.exists())
        self.assertEqual(self.count_rows("notes", self.note_id), 0)
        self.assertEqual(self.count_rows("reviews", self.note_id), 0)
        self.assertEqual(self.count_rows("ratings", self.note_id), 0)

        args, kwargs = recalculate.call_args
        self.assertCountEqual(args[0], [self.owner_id, self.teacher_id])
        self.assertEqual(kwargs["rebuild"], True)

    def test_non_owner_cannot_delete(self):
        self.set_session_user(self.other_id)

        response, recalculate = self.delete_note(self.note_id)

        self.assertEqual(response.status_code, 403)
        self.assertEqual(self.count_rows("notes", self.note_id), 1)
        self.assertTrue(self.created_file.exists())
        recalculate.assert_not_called()

    def test_unauthenticated_delete_is_rejected(self):
        response, recalculate = self.delete_note(self.note_id)

        self.assertEqual(response.status_code, 401)
        self.assertEqual(self.count_rows("notes", self.note_id), 1)
        recalculate.assert_not_called()

    def test_missing_note_returns_404(self):
        self.set_session_user(self.owner_id)

        response, recalculate = self.delete_note(999999)

        self.assertEqual(response.status_code, 404)
        recalculate.assert_not_called()

    def test_wrong_method_returns_405(self):
        self.set_session_user(self.owner_id)

        response = self.client.get(f"/notes/{self.note_id}/delete/")

        self.assertEqual(response.status_code, 405)

    def test_shared_filename_is_kept_on_disk(self):
        self.set_session_user(self.owner_id)
        connection = get_db_connection()
        try:
            with connection.cursor() as cursor:
                second_note_id = self.create_note(
                    cursor,
                    self.other_id,
                    self.file,
                    uuid.uuid4().hex[:8],
                )
            connection.commit()
        finally:
            connection.close()

        response, _ = self.delete_note(self.note_id)

        self.assertEqual(response.status_code, 200)
        self.assertFalse(response.json()["file_deleted"])
        self.assertTrue(self.created_file.exists())
        self.assertEqual(self.count_rows("notes", self.note_id), 0)
        self.assertEqual(self.count_rows("notes", second_note_id), 1)

    def test_delete_video_note_uses_same_endpoint(self):
        self.set_session_user(self.owner_id)
        video_filename = f"delete-test-{uuid.uuid4().hex[:8]}.mp4"
        video_file = f"uploaded_notes/{video_filename}"
        (self.upload_dir / video_filename).write_bytes(b"video")
        connection = get_db_connection()
        try:
            with connection.cursor() as cursor:
                video_note_id = self.create_note(
                    cursor,
                    self.owner_id,
                    video_file,
                    uuid.uuid4().hex[:8],
                    file_type="video",
                )
            connection.commit()
        finally:
            connection.close()

        response, _ = self.delete_note(video_note_id)

        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.json()["file_deleted"])
        self.assertFalse((self.upload_dir / video_filename).exists())
        self.assertEqual(self.count_rows("notes", video_note_id), 0)
