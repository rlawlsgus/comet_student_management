from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import User, Class, Student, Attendance, Exam


@admin.register(User)
class CustomUserAdmin(UserAdmin):
    list_display = ["username", "name", "role", "subject", "is_active", "date_joined"]
    list_filter = ["role", "subject", "is_active", "date_joined"]
    search_fields = ["username", "name"]
    ordering = ["-date_joined"]

    fieldsets = UserAdmin.fieldsets + (("추가 정보", {"fields": ("role", "subject")}),)
    add_fieldsets = UserAdmin.add_fieldsets + (
        ("추가 정보", {"fields": ("role", "subject")}),
    )


@admin.register(Class)
class ClassAdmin(admin.ModelAdmin):
    list_display = [
        "name",
        "subject",
        "start_time",
        "day_of_week",
        "student_count",
        "created_at",
    ]
    list_filter = ["subject", "day_of_week", "created_at"]
    search_fields = ["name"]
    ordering = ["-created_at"]

    def student_count(self, obj):
        return obj.student_set.count()

    student_count.short_description = "학생 수"


@admin.register(Student)
class StudentAdmin(admin.ModelAdmin):
    list_display = ["name", "class_info", "parent_phone", "student_phone", "created_at"]
    list_filter = ["class_info__subject", "class_info", "created_at"]
    search_fields = ["name", "parent_phone", "student_phone"]
    ordering = ["-created_at"]


@admin.register(Attendance)
class AttendanceAdmin(admin.ModelAdmin):
    list_display = [
        "student",
        "date",
        "class_type",
        "content",
        "is_late",
        "homework_completion",
        "homework_accuracy",
    ]
    list_filter = ["class_type", "is_late", "date", "student__class_info__subject"]
    search_fields = ["student__name", "content"]
    ordering = ["-date"]
    date_hierarchy = "date"


@admin.register(Exam)
class ExamAdmin(admin.ModelAdmin):
    list_display = ["name", "attendance", "score", "created_at"]
    list_filter = ["score", "created_at", "attendance__student__class_info__subject"]
    search_fields = ["name", "attendance__student__name"]
    ordering = ["-created_at"]
