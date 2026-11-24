import io
import uuid
from unittest.mock import patch

from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import Client, SimpleTestCase, TransactionTestCase
from PIL import Image

from core.utils import (
    AVATAR_INPUT_MAX_BYTES,
    AVATAR_MAX_BYTES,
    get_db_connection,
    process_avatar,
)


class AvatarProcessingTests(SimpleTestCase):
    def test_large_source_is_compressed_below_target(self):
        source = Image.effect_noise((1200, 1200), 100).convert("RGB")
        buffer = io.BytesIO()
        source.save(buffer, format="PNG")
        upload = SimpleUploadedFile("avatar.png", buffer.getvalue(), content_type="image/png")

        result = process_avatar(upload)

        self.assertGreater(upload.size, AVATAR_MAX_BYTES)
        self.assertLessEqual(len(result), AVATAR_MAX_BYTES)
        with Image.open(io.BytesIO(result)) as image:
            self.assertEqual(image.format, "WEBP")
            self.assertLessEqual(max(image.size), 2048)

    def test_source_above_input_limit_is_rejected(self):
        upload = SimpleUploadedFile(
            "avatar.png",
            b"0" * (AVATAR_INPUT_MAX_BYTES + 1),
            content_type="image/png",
        )

        with self.assertRaisesMessage(ValueError, "Image must be 12 MB or smaller."):
            process_avatar(upload)


class ProfileSettingsTests(TransactionTestCase):
    def setUp(self):
        self.client = Client()
        token = uuid.uuid4().hex[:8]
        self.email = f"settings-{token}@example.com"
        self.student_id = f"S{token}"
        self.new_email = f"updated-{token}@example.com"
        self.new_student_id = f"U{token}"

        connection = get_db_connection()
        try:
            with connection.cursor() as cursor:
                cursor.execute(
                    "INSERT INTO departments (name, code) VALUES (%s, %s)",
                    (f"Settings Dept {token}", f"SD{token}"),
                )
                self.department_id = cursor.lastrowid
                cursor.execute(
                    "INSERT INTO departments (name, code) VALUES (%s, %s)",
                    (f"Updated Dept {token}", f"UD{token}"),
                )
                self.other_department_id = cursor.lastrowid
                cursor.execute(
                    """
                    INSERT INTO users (
                        email, password, full_name, role, student_id,
                        department_id, intake, section, is_active, is_verified
                    )
                    VALUES (%s, %s, %s, 'student', %s, %s, '24', 'A', 1, 1)
                    """,
                    (
                        self.email,
                        "test-password",
                        "Settings Student",
                        self.student_id,
                        self.department_id,
                    ),
                )
                self.user_id = cursor.lastrowid
            connection.commit()
        finally:
            connection.close()

        session = self.client.session
        session["user"] = {
            "id": self.user_id,
            "email": self.email,
            "full_name": "Settings Student",
            "role": "student",
            "student_id": self.student_id,
            "department_id": self.department_id,
            "intake": "24",
            "section": "A",
        }
        session.save()

    def tearDown(self):
        connection = get_db_connection()
        try:
            with connection.cursor() as cursor:
                cursor.execute("DELETE FROM users WHERE id = %s", (self.user_id,))
                cursor.execute(
                    "DELETE FROM departments WHERE id IN (%s, %s)",
                    (self.department_id, self.other_department_id),
                )
            connection.commit()
        finally:
            connection.close()

        super().tearDown()

    def post_settings(self, **payload):
        return self.client.post(
            "/accounts/profile/update/",
            payload,
            content_type="application/json",
            HTTP_HOST="localhost",
        )

    def read_user_row(self):
        connection = get_db_connection()
        try:
            with connection.cursor(dictionary=True) as cursor:
                cursor.execute(
                    """
                    SELECT email, full_name, department_id, student_id, section
                    FROM users WHERE id = %s
                    """,
                    (self.user_id,),
                )
                return cursor.fetchone()
        finally:
            connection.close()

    def test_update_profile_fields_and_refresh_session(self):
        with patch("accounts.views.rebuild_rank_positions") as rebuild:
            response = self.post_settings(
                fullName="Updated Student",
                email=self.new_email,
                departmentId=self.other_department_id,
                studentId=self.new_student_id,
                section="B",
            )

        self.assertEqual(response.status_code, 200)
        rebuild.assert_called_once()

        data = response.json()
        self.assertEqual(data["status"], "success")
        self.assertEqual(data["user"]["full_name"], "Updated Student")
        self.assertEqual(data["user"]["email"], self.new_email)
        self.assertEqual(data["user"]["department_id"], self.other_department_id)
        self.assertEqual(data["user"]["student_id"], self.new_student_id)
        self.assertEqual(data["user"]["section"], "B")

        row = self.read_user_row()
        self.assertEqual(row["full_name"], "Updated Student")
        self.assertEqual(row["email"], self.new_email)
        self.assertEqual(row["department_id"], self.other_department_id)
        self.assertEqual(row["student_id"], self.new_student_id)
        self.assertEqual(row["section"], "B")

        me_response = self.client.get("/accounts/me/", HTTP_HOST="localhost")
        self.assertEqual(me_response.status_code, 200)
        me_user = me_response.json()["user"]
        self.assertEqual(me_user["full_name"], "Updated Student")
        self.assertEqual(me_user["email"], self.new_email)
        self.assertEqual(me_user["department_id"], self.other_department_id)

    def test_duplicate_email_is_rejected(self):
        connection = get_db_connection()
        try:
            with connection.cursor() as cursor:
                cursor.execute(
                    "SELECT email FROM users WHERE id <> %s ORDER BY id LIMIT 1",
                    (self.user_id,),
                )
                duplicate_email = cursor.fetchone()[0]
        finally:
            connection.close()

        response = self.post_settings(email=duplicate_email)

        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.json()["message"], "Email already exists.")
        self.assertEqual(self.read_user_row()["email"], self.email)

    def test_invalid_department_is_rejected(self):
        response = self.post_settings(departmentId=999999)

        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.json()["message"], "Select a valid department.")
        self.assertEqual(self.read_user_row()["department_id"], self.department_id)

    def test_student_fields_are_rejected_for_teachers(self):
        connection = get_db_connection()
        try:
            with connection.cursor() as cursor:
                cursor.execute(
                    "UPDATE users SET role = 'teacher' WHERE id = %s",
                    (self.user_id,),
                )
            connection.commit()
        finally:
            connection.close()

        response = self.post_settings(studentId=self.new_student_id, section="B")

        self.assertEqual(response.status_code, 400)
        self.assertEqual(
            response.json()["message"],
            "Student fields can only be changed by students.",
        )
        self.assertEqual(self.read_user_row()["student_id"], self.student_id)

    def test_blank_student_id_is_stored_as_null(self):
        response = self.post_settings(studentId="")

        self.assertEqual(response.status_code, 200)
        self.assertIsNone(self.read_user_row()["student_id"])
        self.assertIsNone(response.json()["user"]["student_id"])
