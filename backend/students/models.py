from django.db import models
from django.contrib.auth.models import AbstractUser
from django.utils.translation import gettext_lazy as _


class User(AbstractUser):
    class Role(models.TextChoices):
        ADMIN = "ADMIN", _("관리자")
        TEACHER = "TEACHER", _("선생님")
        ASSISTANT = "ASSISTANT", _("조교")

    class Subject(models.TextChoices):
        CHEMISTRY = "CHEMISTRY", _("화학")
        BIOLOGY = "BIOLOGY", _("생명")
        EARTH_SCIENCE = "EARTH_SCIENCE", _("지학")

    name = models.CharField(max_length=100, verbose_name="이름", default="")
    role = models.CharField(max_length=10, choices=Role.choices, verbose_name="권한")
    subject = models.CharField(
        max_length=20, choices=Subject.choices, verbose_name="과목"
    )

    class Meta:
        verbose_name = "사용자"
        verbose_name_plural = "사용자"

    def __str__(self):
        return f"{self.username} ({self.get_role_display()})"


class Class(models.Model):
    class DayOfWeek(models.TextChoices):
        MONDAY = "MONDAY", _("월요일")
        TUESDAY = "TUESDAY", _("화요일")
        WEDNESDAY = "WEDNESDAY", _("수요일")
        THURSDAY = "THURSDAY", _("목요일")
        FRIDAY = "FRIDAY", _("금요일")
        SATURDAY = "SATURDAY", _("토요일")
        SUNDAY = "SUNDAY", _("일요일")

    name = models.CharField(max_length=100, verbose_name="반이름")
    subject = models.CharField(
        max_length=20, choices=User.Subject.choices, verbose_name="과목"
    )
    start_time = models.TimeField(verbose_name="수업 시작시간")
    day_of_week = models.CharField(
        max_length=10, choices=DayOfWeek.choices, verbose_name="요일"
    )
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="생성일")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="수정일")

    class Meta:
        verbose_name = "반"
        verbose_name_plural = "반"

    def __str__(self):
        return f"{self.name} ({self.get_subject_display()})"


class Student(models.Model):
    name = models.CharField(max_length=100, verbose_name="이름")
    class_info = models.ForeignKey(Class, on_delete=models.CASCADE, verbose_name="반")
    parent_phone = models.CharField(max_length=15, verbose_name="부모님 전화번호")
    student_phone = models.CharField(
        max_length=15, null=True, blank=True, verbose_name="학생 전화번호"
    )
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="생성일")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="수정일")

    class Meta:
        verbose_name = "학생"
        verbose_name_plural = "학생"

    def __str__(self):
        return f"{self.name} ({self.class_info.name})"


class Attendance(models.Model):
    class ClassType(models.TextChoices):
        REGULAR = "REGULAR", _("정규")
        MAKEUP = "MAKEUP", _("대체")
        EXTRA = "EXTRA", _("보강")
        ADDITIONAL = "ADDITIONAL", _("추가")

    student = models.ForeignKey(Student, on_delete=models.CASCADE, verbose_name="학생")
    date = models.DateField(verbose_name="출석일")
    class_type = models.CharField(
        max_length=10, choices=ClassType.choices, verbose_name="수업종류"
    )
    content = models.TextField(verbose_name="수업내용")
    is_late = models.BooleanField(default=False, verbose_name="지각여부")
    homework_completion = models.PositiveIntegerField(verbose_name="숙제이행도")
    homework_accuracy = models.PositiveIntegerField(verbose_name="숙제정답률")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="생성일")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="수정일")

    class Meta:
        verbose_name = "출석"
        verbose_name_plural = "출석"

    def __str__(self):
        return f"{self.student.name} - {self.date} ({self.get_class_type_display()})"


class Exam(models.Model):
    attendance = models.ForeignKey(
        Attendance, on_delete=models.CASCADE, verbose_name="출석"
    )
    name = models.CharField(max_length=100, verbose_name="시험이름")
    score = models.PositiveIntegerField(verbose_name="점수")
    max_score = models.PositiveIntegerField(verbose_name="만점", default=100)
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="생성일")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="수정일")

    class Meta:
        verbose_name = "시험"
        verbose_name_plural = "시험"

    def __str__(self):
        return f"{self.attendance.student.name} - {self.name} ({self.score}점)"
