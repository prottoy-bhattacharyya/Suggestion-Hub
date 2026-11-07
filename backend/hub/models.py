from django.db import models

class Department(models.Model):
    name = models.CharField(max_length=150)
    code = models.CharField(max_length=20)
    class Meta:
        managed = False
        db_table = "departments"

    def __str__(self):
        return f"{self.code}"

class Course(models.Model):
    code = models.CharField(max_length=20)
    title = models.CharField(max_length=200)
    department = models.ForeignKey(Department, models.DO_NOTHING, db_column="department_id")
    class Meta:
        managed = False
        db_table = "courses"

    def __str__(self):
        return f"{self.code} - {self.title}"

class HubUser(models.Model):
    email = models.CharField(max_length=254)
    password = models.CharField(max_length=255)   # REMINDER: currently plaintext (see caveats)
    full_name = models.CharField(max_length=150)
    role = models.CharField(max_length=10, choices=[("student","student"),("teacher","teacher"),("admin","admin")])
    student_id = models.CharField(max_length=30, null=True, blank=True)
    department = models.ForeignKey(Department, models.DO_NOTHING, null=True, db_column="department_id")
    intake = models.CharField(max_length=10, null=True, blank=True)
    section = models.CharField(max_length=10, null=True, blank=True)
    designation = models.CharField(max_length=100, null=True, blank=True)
    employee_id = models.CharField(max_length=30, null=True, blank=True)
    is_verified = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(default=models.functions.Now())
    class Meta:
        managed = False
        db_table = "users"
        verbose_name = "App user"          # avoids clashing with Django's "Users"
        verbose_name_plural = "App users"

    def __str__(self):
        return f"{self.full_name} ({self.email})"


class TeacherCourse(models.Model):
    teacher = models.ForeignKey(
        HubUser, models.DO_NOTHING, 
        db_column="teacher_id", related_name="+",
        limit_choices_to={"role": "teacher"}
    )
    course = models.ForeignKey(Course, models.DO_NOTHING, db_column="course_id", related_name="+")
    class Meta:
        managed = False
        db_table = "teacher_courses"

class Note(models.Model):
    uploader = models.ForeignKey(HubUser, models.DO_NOTHING, db_column="uploader_id", related_name="+")
    course = models.ForeignKey(Course, models.DO_NOTHING, db_column="course_id", related_name="+")
    title = models.CharField(max_length=200)
    description = models.TextField(null=True)
    type = models.CharField(max_length=10, choices=[("note","note"),("suggestion","suggestion")])
    intake = models.CharField(max_length=10)
    section = models.CharField(max_length=10, null=True)
    file = models.CharField(max_length=255)
    file_hash = models.CharField(max_length=64)
    page_count = models.PositiveIntegerField(null=True)
    ocr_used = models.BooleanField(default=False)
    review_status = models.CharField(max_length=10, choices=[("pending","pending"),("approved","approved"),("rejected","rejected")], default="pending")
    processing_status = models.CharField(max_length=10, choices=[("processing","processing"),("ready","ready"),("failed","failed")], default="processing")
    rating_avg = models.DecimalField(max_digits=3, decimal_places=2)
    rating_count = models.PositiveIntegerField()
    approved_at = models.DateTimeField(null=True)
    created_at = models.DateTimeField()
    class Meta:
        managed = False
        db_table = "notes"
        ordering = ["-created_at"]
        verbose_name_plural = "Notes"

    def __str__(self):
        return f"{self.title} ({self.course.code})"

class Review(models.Model):
    note = models.ForeignKey(Note, models.DO_NOTHING, db_column="note_id", related_name="+")
    teacher = models.ForeignKey(HubUser, models.DO_NOTHING, db_column="teacher_id", related_name="+")
    decision = models.CharField(max_length=10, choices=[("approved","approved"),("rejected","rejected")])
    comment = models.TextField(null=True)
    created_at = models.DateTimeField()
    class Meta:
        managed = False
        db_table = "reviews"

class Rating(models.Model):
    note = models.ForeignKey(Note, models.DO_NOTHING, db_column="note_id", related_name="+")
    user = models.ForeignKey(HubUser, models.DO_NOTHING, db_column="user_id", related_name="+")
    stars = models.PositiveSmallIntegerField()   # DB CHECK keeps 1..5
    created_at = models.DateTimeField()
    class Meta:
        managed = False
        db_table = "ratings"

class Follow(models.Model):
    follower = models.ForeignKey(HubUser, models.DO_NOTHING, db_column="follower_id", related_name="+")
    following = models.ForeignKey(HubUser, models.DO_NOTHING, db_column="following_id", related_name="+")
    created_at = models.DateTimeField()
    class Meta:
        managed = False
        db_table = "follows"

class Notification(models.Model):
    user = models.ForeignKey(HubUser, models.DO_NOTHING, db_column="user_id", related_name="+")
    type = models.CharField(max_length=30, choices=[("new_pending_note","new_pending_note"),("note_approved","note_approved"),("note_rejected","note_rejected"),("followed_user_upload","followed_user_upload")])
    note = models.ForeignKey(Note, models.DO_NOTHING, null=True, db_column="note_id", related_name="+")
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField()
    class Meta:
        managed = False
        db_table = "notifications"

class Report(models.Model):
    note = models.ForeignKey(Note, models.DO_NOTHING, db_column="note_id", related_name="+")
    reporter = models.ForeignKey(HubUser, models.DO_NOTHING, db_column="reporter_id", related_name="+")
    reason = models.TextField()
    status = models.CharField(max_length=10, choices=[("open","open"),("resolved","resolved")], default="open")
    created_at = models.DateTimeField()
    class Meta:
        managed = False
        db_table = "reports"