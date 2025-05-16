from django.db import models
from django.conf import settings


class Class(models.Model):
    name = models.CharField(max_length=100)
    teacher = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="teaching_classes",
    )
    students = models.ManyToManyField(
        settings.AUTH_USER_MODEL, related_name="enrolled_classes"
    )
    description = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name_plural = "Classes"

    def __str__(self):
        return self.name
