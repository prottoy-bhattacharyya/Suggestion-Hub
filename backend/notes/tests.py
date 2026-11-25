import hashlib
import tempfile
import uuid
from pathlib import Path
from unittest.mock import patch

from django.core.files.uploadedfile import SimpleUploadedFile
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


class NoteUpdateTests(TransactionTestCase):
    def setUp(self):
        self.client = Client()
        self.temp_dir = tempfile.TemporaryDirectory()
        self.settings_override = override_settings(BASE_DIR=self.temp_dir.name)
        self.settings_override.enable()
        self.upload_dir = Path(self.temp_dir.name) / "uploaded_notes"
        self.upload_dir.mkdir(parents=True, exist_ok=True)

        suffix = uuid.uuid4().hex[:10]
        self.filename = f"update-test-{suffix}.pdf"
        self.file = f"uploaded_notes/{self.filename}"
        self.created_file = self.upload_dir / self.filename
        self.original_content = f"%PDF-1.4 original update test {uuid.uuid4().hex}\n".encode()
        self.original_hash = hashlib.sha256(self.original_content).hexdigest()
        self.created_file.write_bytes(self.original_content)

        connection = get_db_connection()
        try:
            with connection.cursor() as cursor:
                cursor.execute(
                    "INSERT INTO departments (name, code) VALUES (%s, %s)",
                    (f"Update Dept {suffix}", f"UD{suffix}"[:20]),
                )
                department_id = cursor.lastrowid

                cursor.execute(
                    "INSERT INTO courses (code, title, department_id) VALUES (%s, %s, %s)",
                    (f"C{suffix}"[:20], "Update Test Course", department_id),
                )
                self.course_id = cursor.lastrowid

                cursor.execute(
                    "INSERT INTO courses (code, title, department_id) VALUES (%s, %s, %s)",
                    (f"D{suffix}"[:20], "Second Update Test Course", department_id),
                )
                self.second_course_id = cursor.lastrowid

                self.owner_id = self.create_user(cursor, suffix, "student", "owner")
                self.other_id = self.create_user(cursor, suffix, "student", "other")

                self.note_id = self.create_note(
                    cursor,
                    self.owner_id,
                    self.file,
                    self.original_hash,
                    f"Update Test Note {suffix}",
                )
                cursor.execute(
                    """
                    INSERT INTO ratings (note_id, user_id, stars)
                    VALUES (%s, %s, 5)
                    """,
                    (self.note_id, self.other_id),
                )
                self.rating_id = cursor.lastrowid
                cursor.execute(
                    """
                    INSERT INTO comments (note_id, user_id, body)
                    VALUES (%s, %s, 'Keep this discussion.')
                    """,
                    (self.note_id, self.other_id),
                )
                self.comment_id = cursor.lastrowid
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
                f"{label}-update-{suffix}@example.test",
                "test-password",
                f"Update Test {label}",
                role,
                None,
            ),
        )
        return cursor.lastrowid

    def create_note(self, cursor, uploader_id, file, file_hash, title, file_type="pdf"):
        cursor.execute(
            """
            INSERT INTO notes (
                uploader_id, course_id, title, description, type,
                intake, section, file, file_type, file_hash,
                review_status, processing_status, approved_at
            )
            VALUES (%s, %s, %s, %s, 'note', %s, 'A', %s, %s, %s,
                    'approved', 'ready', NOW())
            """,
            (
                uploader_id,
                self.course_id,
                title,
                "Update test fixture",
                uuid.uuid4().hex[:8],
                file,
                file_type,
                file_hash,
            ),
        )
        return cursor.lastrowid

    def set_session_user(self, user_id):
        session = self.client.session
        session["user"] = {
            "id": user_id,
            "full_name": "Update Test User",
            "role": "student",
        }
        session.save()

    def valid_payload(self):
        return {
            "title": "Updated Title",
            "description": "Updated description",
            "type": "suggestion",
            "intake": "5",
            "section": "B",
            "course_id": str(self.course_id),
        }

    def post_update(self, note_id, changes=None, uploaded_file=None):
        payload = self.valid_payload()
        if changes:
            payload.update(changes)
        if uploaded_file is not None:
            payload["file"] = uploaded_file
        return self.client.post(f"/notes/{note_id}/update/", payload)

    def note_values(self, note_id):
        connection = get_db_connection()
        try:
            with connection.cursor() as cursor:
                cursor.execute(
                    """
                    SELECT title, description, type, intake, section, course_id,
                           file, file_type, file_hash, review_status, approved_at
                    FROM notes WHERE id = %s
                    """,
                    (note_id,),
                )
                return cursor.fetchone()
        finally:
            connection.close()

    def count_rows(self, table, note_id):
        column = "id" if table == "notes" else "note_id"
        connection = get_db_connection()
        try:
            with connection.cursor() as cursor:
                cursor.execute(f"SELECT COUNT(*) FROM {table} WHERE {column} = %s", (note_id,))
                return cursor.fetchone()[0]
        finally:
            connection.close()

    def test_metadata_update_resets_status_and_keeps_file_and_discussion(self):
        self.set_session_user(self.owner_id)

        with patch("notes.views.recalculate_users_ranks") as recalculate:
            response = self.post_update(
                self.note_id,
                {"title": "New Title", "course_id": str(self.second_course_id)},
            )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["status"], "success")
        self.assertFalse(response.json()["file_replaced"])

        values = self.note_values(self.note_id)
        self.assertEqual(values[0], "New Title")
        self.assertEqual(values[1], "Updated description")
        self.assertEqual(values[2], "suggestion")
        self.assertEqual(values[3], "5")
        self.assertEqual(values[4], "B")
        self.assertEqual(values[5], self.second_course_id)
        self.assertEqual(values[6], self.file)
        self.assertEqual(values[7], "pdf")
        self.assertEqual(values[8], self.original_hash)
        self.assertEqual(values[9], "pending")
        self.assertIsNone(values[10])
        self.assertTrue(self.created_file.exists())
        self.assertEqual(self.count_rows("ratings", self.note_id), 1)
        self.assertEqual(self.count_rows("comments", self.note_id), 1)

        self.assertEqual(recalculate.call_args[0][0], [self.owner_id])
        self.assertTrue(recalculate.call_args.kwargs["rebuild"])

    def test_protected_fields_from_payload_are_ignored(self):
        self.set_session_user(self.owner_id)

        response = self.post_update(
            self.note_id,
            {
                "review_status": "approved",
                "approved_at": "2099-01-01 00:00:00",
                "uploader_id": str(self.other_id),
                "file_type": "video",
                "file_hash": "protected",
                "rating_count": "99",
            },
        )

        self.assertEqual(response.status_code, 200)
        values = self.note_values(self.note_id)
        self.assertEqual(values[2], "suggestion")
        self.assertEqual(values[7], "pdf")
        self.assertEqual(values[8], self.original_hash)
        self.assertEqual(values[9], "pending")
        self.assertIsNone(values[10])

    def test_file_replacement_keeps_note_id_and_removes_old_file(self):
        self.set_session_user(self.owner_id)
        content = f"%PDF-1.4 replacement update test {uuid.uuid4().hex}\n".encode()
        new_hash = hashlib.sha256(content).hexdigest()

        response = self.post_update(
            self.note_id,
            uploaded_file=SimpleUploadedFile(
                "replacement.pdf", content, content_type="application/pdf"
            ),
        )

        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.json()["file_replaced"])

        expected_file = f"uploaded_notes/{self.note_id}-{new_hash[:16]}.pdf"
        values = self.note_values(self.note_id)
        self.assertEqual(values[6], expected_file)
        self.assertEqual(values[7], "pdf")
        self.assertEqual(values[8], new_hash)
        self.assertEqual(values[9], "pending")
        self.assertTrue((self.upload_dir / f"{self.note_id}-{new_hash[:16]}.pdf").exists())
        self.assertFalse(self.created_file.exists())
        self.assertEqual(self.count_rows("ratings", self.note_id), 1)
        self.assertEqual(self.count_rows("comments", self.note_id), 1)

    def test_file_replacement_can_change_pdf_to_video(self):
        self.set_session_user(self.owner_id)
        content = f"fake video bytes for update test {uuid.uuid4().hex}".encode()
        new_hash = hashlib.sha256(content).hexdigest()

        response = self.post_update(
            self.note_id,
            uploaded_file=SimpleUploadedFile(
                "replacement.mp4", content, content_type="video/mp4"
            ),
        )

        self.assertEqual(response.status_code, 200)
        values = self.note_values(self.note_id)
        self.assertEqual(values[6], f"uploaded_notes/{self.note_id}-{new_hash[:16]}.mp4")
        self.assertEqual(values[7], "video")
        self.assertEqual(values[8], new_hash)

    def test_same_file_hash_keeps_existing_file(self):
        self.set_session_user(self.owner_id)

        response = self.post_update(
            self.note_id,
            uploaded_file=SimpleUploadedFile(
                "same.pdf", self.original_content, content_type="application/pdf"
            ),
        )

        self.assertEqual(response.status_code, 200)
        self.assertFalse(response.json()["file_replaced"])
        values = self.note_values(self.note_id)
        self.assertEqual(values[6], self.file)
        self.assertEqual(values[8], self.original_hash)
        self.assertTrue(self.created_file.exists())

    def test_duplicate_hash_from_another_note_is_rejected(self):
        self.set_session_user(self.owner_id)
        content = f"%PDF-1.4 duplicate update test {uuid.uuid4().hex}\n".encode()
        duplicate_hash = hashlib.sha256(content).hexdigest()
        connection = get_db_connection()
        try:
            with connection.cursor() as cursor:
                other_file = f"uploaded_notes/duplicate-{uuid.uuid4().hex[:8]}.pdf"
                self.create_note(
                    cursor,
                    self.other_id,
                    other_file,
                    duplicate_hash,
                    f"Duplicate Holder {uuid.uuid4().hex[:8]}",
                )
            connection.commit()
        finally:
            connection.close()

        response = self.post_update(
            self.note_id,
            uploaded_file=SimpleUploadedFile(
                "duplicate.pdf", content, content_type="application/pdf"
            ),
        )

        self.assertEqual(response.status_code, 400)
        values = self.note_values(self.note_id)
        self.assertEqual(values[6], self.file)
        self.assertEqual(values[8], self.original_hash)
        self.assertEqual(values[9], "approved")
        self.assertTrue(self.created_file.exists())

    def test_invalid_metadata_is_rejected(self):
        self.set_session_user(self.owner_id)

        response = self.post_update(self.note_id, {"type": "pdf"})

        self.assertEqual(response.status_code, 400)
        values = self.note_values(self.note_id)
        self.assertEqual(values[0], f"Update Test Note {self.filename.split('-')[-1][:-4]}")
        self.assertEqual(values[2], "note")
        self.assertEqual(values[9], "approved")

    def test_non_owner_cannot_update(self):
        self.set_session_user(self.other_id)

        response = self.post_update(self.note_id)

        self.assertEqual(response.status_code, 403)
        values = self.note_values(self.note_id)
        self.assertEqual(values[0], f"Update Test Note {self.filename.split('-')[-1][:-4]}")
        self.assertEqual(values[9], "approved")

    def test_unauthenticated_update_is_rejected(self):
        response = self.post_update(self.note_id)

        self.assertEqual(response.status_code, 401)
        values = self.note_values(self.note_id)
        self.assertEqual(values[9], "approved")

    def test_wrong_method_returns_405(self):
        self.set_session_user(self.owner_id)

        response = self.client.get(f"/notes/{self.note_id}/update/")

        self.assertEqual(response.status_code, 405)

    def test_detail_includes_course_id_for_owner(self):
        self.set_session_user(self.owner_id)

        response = self.client.get(f"/notes/{self.note_id}/detail/")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["note"]["course_id"], self.course_id)
