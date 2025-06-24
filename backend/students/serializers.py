from rest_framework import serializers
from django.contrib.auth import authenticate
from .models import User, Class, Student, Attendance, Exam


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["id", "username", "name", "role", "subject", "date_joined"]
        read_only_fields = ["id", "date_joined"]


class UserCreateSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)
    confirm_password = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = ["username", "password", "confirm_password", "name", "role", "subject"]

    def validate(self, attrs):
        if attrs["password"] != attrs["confirm_password"]:
            raise serializers.ValidationError("비밀번호가 일치하지 않습니다.")
        return attrs

    def create(self, validated_data):
        validated_data.pop("confirm_password")
        user = User.objects.create_user(**validated_data)
        return user


class UserUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["name", "role", "subject"]


class LoginSerializer(serializers.Serializer):
    username = serializers.CharField()
    password = serializers.CharField()

    def validate(self, attrs):
        username = attrs.get("username")
        password = attrs.get("password")

        if username and password:
            user = authenticate(username=username, password=password)
            if not user:
                raise serializers.ValidationError(
                    "아이디 또는 비밀번호가 올바르지 않습니다."
                )
            attrs["user"] = user
        else:
            raise serializers.ValidationError("아이디와 비밀번호를 입력해주세요.")

        return attrs


class ClassSerializer(serializers.ModelSerializer):
    student_count = serializers.SerializerMethodField()

    class Meta:
        model = Class
        fields = [
            "id",
            "name",
            "subject",
            "start_time",
            "day_of_week",
            "student_count",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def get_student_count(self, obj):
        return obj.student_set.count()


class StudentSerializer(serializers.ModelSerializer):
    class_info_name = serializers.CharField(source="class_info.name", read_only=True)
    attendance_stats = serializers.SerializerMethodField()
    exam_stats = serializers.SerializerMethodField()

    class Meta:
        model = Student
        fields = [
            "id",
            "name",
            "class_info",
            "class_info_name",
            "parent_phone",
            "student_phone",
            "attendance_stats",
            "exam_stats",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def get_attendance_stats(self, obj):
        attendances = obj.attendance_set.all()
        total_classes = attendances.count()
        attended_classes = attendances.filter(is_late=False).count()
        late_count = attendances.filter(is_late=True).count()

        return {
            "total_classes": total_classes,
            "attended_classes": attended_classes,
            "late_count": late_count,
        }

    def get_exam_stats(self, obj):
        exams = Exam.objects.filter(attendance__student=obj)
        if not exams.exists():
            return {"average_score": 0, "highest_score": 0, "lowest_score": 0}

        scores = list(exams.values_list("score", flat=True))
        return {
            "average_score": sum(scores) // len(scores),
            "highest_score": max(scores),
            "lowest_score": min(scores),
        }


class AttendanceSerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(source="student.name", read_only=True)
    class_info_name = serializers.CharField(
        source="student.class_info.name", read_only=True
    )
    class_type_display = serializers.SerializerMethodField()

    class Meta:
        model = Attendance
        fields = [
            "id",
            "student",
            "student_name",
            "class_info_name",
            "date",
            "class_type",
            "class_type_display",
            "content",
            "is_late",
            "homework_completion",
            "homework_accuracy",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def get_class_type_display(self, obj):
        class_types = {
            "REGULAR": "정규",
            "MAKEUP": "대체",
            "EXTRA": "보강",
            "ADDITIONAL": "추가",
        }
        return class_types.get(obj.class_type, obj.class_type)


class ExamSerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(
        source="attendance.student.name", read_only=True
    )
    exam_date = serializers.DateField(source="attendance.date", read_only=True)

    class Meta:
        model = Exam
        fields = [
            "id",
            "attendance",
            "student_name",
            "exam_date",
            "name",
            "score",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]


class StudentDetailSerializer(StudentSerializer):
    attendance_records = serializers.SerializerMethodField()
    exam_records = serializers.SerializerMethodField()

    class Meta(StudentSerializer.Meta):
        fields = StudentSerializer.Meta.fields + ["attendance_records", "exam_records"]

    def get_attendance_records(self, obj):
        attendances = obj.attendance_set.all().order_by("-date")
        return AttendanceSerializer(attendances, many=True).data

    def get_exam_records(self, obj):
        exams = Exam.objects.filter(attendance__student=obj).order_by(
            "-attendance__date"
        )
        return ExamSerializer(exams, many=True).data


class DashboardStatsSerializer(serializers.Serializer):
    class_stats = serializers.ListField(child=serializers.DictField())
    attendance_stats = serializers.ListField(child=serializers.DictField())
    grade_stats = serializers.ListField(child=serializers.DictField())
