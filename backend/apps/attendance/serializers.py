from rest_framework import serializers
from .models import Attendance, Exam


class AttendanceSerializer(serializers.ModelSerializer):
    class Meta:
        model = Attendance
        fields = [
            "id",
            "student",
            "date",
            "class_type",
            "content",
            "is_late",
            "homework_completion",
            "homework_accuracy",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["created_at", "updated_at"]


class ExamSerializer(serializers.ModelSerializer):
    class_average = serializers.SerializerMethodField()

    class Meta:
        model = Exam
        fields = [
            "id",
            "name",
            "student",
            "score",
            "class_average",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["created_at", "updated_at"]

    def get_class_average(self, obj):
        return obj.class_average
