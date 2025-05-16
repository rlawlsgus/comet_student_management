from django.db import models
from django.conf import settings


class Attendance(models.Model):
    CLASS_TYPE_CHOICES = [
        ("regular", "정규"),
        ("makeup", "대체"),
        ("extra", "보강"),
        ("additional", "추가"),
    ]

    student = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="attendances"
    )
    date = models.DateField()
    class_type = models.CharField(max_length=20, choices=CLASS_TYPE_CHOICES)
    content = models.TextField()
    is_late = models.BooleanField(default=False)
    homework_completion = models.IntegerField(default=0)  # 0-100%
    homework_accuracy = models.IntegerField(default=0)  # 0-100%
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-date"]
        unique_together = ["student", "date"]

    def __str__(self):
        return f"{self.student.username} - {self.date} ({self.class_type})"


class Exam(models.Model):
    name = models.CharField(max_length=100)
    student = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="exams"
    )
    score = models.DecimalField(max_digits=5, decimal_places=2)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        unique_together = ["name", "student"]

    def __str__(self):
        return f"{self.student.username} - {self.name} ({self.score})"

    @property
    def class_average(self):
        # 같은 반 학생들의 같은 시험 평균 점수 계산
        from apps.classes.models import Class

        student_class = Class.objects.filter(students=self.student).first()
        if student_class:
            same_class_students = student_class.students.all()
            same_exam_scores = Exam.objects.filter(
                name=self.name, student__in=same_class_students
            ).values_list("score", flat=True)
            if same_exam_scores:
                return sum(same_exam_scores) / len(same_exam_scores)
        return None
