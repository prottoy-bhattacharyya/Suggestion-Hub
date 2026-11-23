from django.contrib import admin
from django.utils.html import format_html
from .models import *


@admin.register(Department)
class DepartmentAdmin(admin.ModelAdmin):
    def get_list_display(self, request):
        return [field.name for field in self.model._meta.fields]
    search_fields = ("name", "code")

@admin.register(Course)
class CourseAdmin(admin.ModelAdmin):
    def get_list_display(self, request):
        return [field.name for field in self.model._meta.fields]
    search_fields = ("code", "title")
    list_filter = ("department",)

@admin.register(HubUser)
class HubUserAdmin(admin.ModelAdmin):
    # list_display = ("id", "full_name", "email", "role", "student_id", "intake", "section", "designation", "is_active")

    search_fields = ("full_name", "email", "student_id", "employee_id")
    list_filter = ("role", "is_active", "is_verified", "department")

    readonly_fields = ("avatar_preview",)

    def avatar_preview(self, obj):
        if not obj.avatar:
            return "—"
        return format_html(
            '<img src="/accounts/avatar/{}/" style="height:48px;border-radius:50%;object-fit:cover" alt="{}">',
            obj.pk,
            obj.full_name,
        )

    avatar_preview.short_description = "Profile picture"

    def get_list_display(self, request):
        return ["avatar_preview"] + [f.name for f in self.model._meta.fields]


@admin.register(TeacherCourse)
class TeacherCourseAdmin(admin.ModelAdmin):
    def get_list_display(self, request):
        return [field.name for field in self.model._meta.fields]
    search_fields = ("teacher__full_name", "course__code")

@admin.register(Note)
class NoteAdmin(admin.ModelAdmin):
    def get_list_display(self, request):
        return [field.name for field in self.model._meta.fields]
    search_fields = ("title", "description")
    list_filter = ("review_status", "type", "course", "intake", "section", "file_type")
    # decision (b): only review_status + approved_at editable — approve from the admin!
    # fields = ("review_status", "approved_at")

@admin.register(Review)
class ReviewAdmin(admin.ModelAdmin):
    def get_list_display(self, request):
        return [field.name for field in self.model._meta.fields]
    list_filter = ("decision",)

@admin.register(Rating)
class RatingAdmin(admin.ModelAdmin):
    def get_list_display(self, request):
        return [field.name for field in self.model._meta.fields]

@admin.register(Comment)
class CommentAdmin(admin.ModelAdmin):
    def get_list_display(self, request):
        return [field.name for field in self.model._meta.fields]
    list_filter = ("note", "user")

@admin.register(Follow)
class FollowAdmin(admin.ModelAdmin):
    def get_list_display(self, request):
        return [field.name for field in self.model._meta.fields]

@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    def get_list_display(self, request):
        return [field.name for field in self.model._meta.fields]
    list_filter = ("type", "is_read")

@admin.register(Report)
class ReportAdmin(admin.ModelAdmin):
    def get_list_display(self, request):
        return [field.name for field in self.model._meta.fields]
    list_filter = ("status",)