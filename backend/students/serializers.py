from rest_framework import serializers
from django.contrib.auth import authenticate
from .models import User, Class, Student, Attendance, Exam, Subject


class SubjectSerializer(serializers.ModelSerializer):
    class Meta:
        model = Subject
        fields = ["id", "name"]


class UserSerializer(serializers.ModelSerializer):
    subjects = SubjectSerializer(many=True, read_only=True)
    subject_ids = serializers.PrimaryKeyRelatedField(
        many=True, write_only=True, queryset=Subject.objects.all(), source="subjects"
    )

    class Meta:
        model = User
        fields = ["id", "username", "name", "role", "subjects", "subject_ids", "date_joined"]
        read_only_fields = ["id", "date_joined"]


class UserCreateSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)
    confirm_password = serializers.CharField(write_only=True)
    subjects = serializers.PrimaryKeyRelatedField(
        many=True, queryset=Subject.objects.all(), required=False
    )

    class Meta:
        model = User
        fields = ["username", "password", "confirm_password", "name", "role", "subjects"]

    def validate_username(self, value):
        """아이디 검증"""
        if not value or not value.strip():
            raise serializers.ValidationError("아이디는 필수 입력 항목입니다.")

        if len(value.strip()) < 2:
            raise serializers.ValidationError("아이디는 최소 2자 이상이어야 합니다.")

        if len(value.strip()) > 30:
            raise serializers.ValidationError("아이디는 최대 30자까지 입력 가능합니다.")

        # 아이디 중복 확인
        if User.objects.filter(username=value.strip()).exists():
            raise serializers.ValidationError("이미 사용 중인 아이디입니다.")

        return value.strip()

    def validate_password(self, value):
        """비밀번호 검증"""
        if not value:
            raise serializers.ValidationError("비밀번호는 필수 입력 항목입니다.")

        if len(value) < 8:
            raise serializers.ValidationError("비밀번호는 최소 8자 이상이어야 합니다.")

        return value

    def validate_name(self, value):
        """이름 검증"""
        if not value or not value.strip():
            raise serializers.ValidationError("이름은 필수 입력 항목입니다.")

        if len(value.strip()) < 2:
            raise serializers.ValidationError("이름은 최소 2자 이상이어야 합니다.")

        if len(value.strip()) > 50:
            raise serializers.ValidationError("이름은 최대 50자까지 입력 가능합니다.")

        return value.strip()

    def validate_role(self, value):
        """역할 검증"""
        valid_roles = ["ADMIN", "TEACHER", "ASSISTANT"]
        if value not in valid_roles:
            raise serializers.ValidationError("유효하지 않은 역할입니다.")
        return value

    def validate(self, attrs):
        if attrs["password"] != attrs["confirm_password"]:
            raise serializers.ValidationError("비밀번호가 일치하지 않습니다.")
        return attrs

    def create(self, validated_data):
        validated_data.pop("confirm_password")
        subjects = validated_data.pop("subjects", [])
        user = User.objects.create_user(**validated_data)
        user.subjects.set(subjects)
        return user


class UserUpdateSerializer(serializers.ModelSerializer):
    subjects = serializers.PrimaryKeyRelatedField(
        many=True, queryset=Subject.objects.all(), required=False
    )

    class Meta:
        model = User
        fields = ["name", "role", "subjects"]

    def validate_name(self, value):
        """이름 검증"""
        if not value or not value.strip():
            raise serializers.ValidationError("이름은 필수 입력 항목입니다.")

        if len(value.strip()) < 2:
            raise serializers.ValidationError("이름은 최소 2자 이상이어야 합니다.")

        if len(value.strip()) > 50:
            raise serializers.ValidationError("이름은 최대 50자까지 입력 가능합니다.")

        return value.strip()

    def validate_role(self, value):
        """역할 검증"""
        valid_roles = ["ADMIN", "TEACHER", "ASSISTANT"]
        if value not in valid_roles:
            raise serializers.ValidationError("유효하지 않은 역할입니다.")
        return value


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
    students = serializers.PrimaryKeyRelatedField(
        many=True, queryset=Student.objects.all(), required=False
    )
    # Read-only field for display
    subject_detail = SubjectSerializer(source="subject", read_only=True)
    # Field for writing (inputting ID)
    subject = serializers.PrimaryKeyRelatedField(
        queryset=Subject.objects.all(), required=False, allow_null=True
    )

    class Meta:
        model = Class
        fields = [
            "id",
            "name",
            "subject",
            "subject_detail",
            "start_time",
            "day_of_week",
            "student_count",
            "students",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def get_student_count(self, obj):
        return obj.students.count()

    def validate_name(self, value):
        """반 이름 검증"""
        if not value or not value.strip():
            raise serializers.ValidationError("반 이름은 필수 입력 항목입니다.")

        if len(value.strip()) < 2:
            raise serializers.ValidationError("반 이름은 최소 2자 이상이어야 합니다.")

        if len(value.strip()) > 100:
            raise serializers.ValidationError(
                "반 이름은 최대 100자까지 입력 가능합니다."
            )

        return value.strip()

    def validate_subject(self, value):
        """과목 검증"""
        # "퇴원" 반일 경우 null 허용
        if self.initial_data.get("name") == "퇴원":
            return value
        
        if value is None:
            raise serializers.ValidationError("과목은 필수 입력 항목입니다.")
        return value

    def validate_day_of_week(self, value):
        """요일 검증"""
        # "퇴원" 반일 경우 null 허용
        if self.initial_data.get("name") == "퇴원":
            return value

        valid_days = [
            "MONDAY",
            "TUESDAY",
            "WEDNESDAY",
            "THURSDAY",
            "FRIDAY",
            "SATURDAY",
            "SUNDAY",
        ]
        if value not in valid_days:
            raise serializers.ValidationError("유효하지 않은 요일입니다.")
        return value

    def validate_start_time(self, value):
        """시작 시간 검증"""
        # "퇴원" 반일 경우 null 허용
        if self.initial_data.get("name") == "퇴원":
            return value

        if not value:
            raise serializers.ValidationError("시작 시간은 필수 입력 항목입니다.")
        return value

    def validate(self, attrs):
        """전체 데이터 검증"""
        name = attrs.get("name")
        subject = attrs.get("subject")
        day_of_week = attrs.get("day_of_week")
        start_time = attrs.get("start_time")

        if name == "퇴원":
            # "퇴원" 반은 중복 검사 생략 (이미 create 뷰에서 처리함)
            return attrs

        # 같은 과목, 같은 요일, 같은 시간에 중복된 반이 있는지 확인
        if all([name, subject, day_of_week, start_time]):
            # 수정 시에는 자기 자신을 제외하고 중복 확인
            instance = getattr(self, "instance", None)
            queryset = Class.objects.filter(
                subject=subject, day_of_week=day_of_week, start_time=start_time
            )

            if instance:
                queryset = queryset.exclude(id=instance.id)

            if queryset.exists():
                raise serializers.ValidationError(
                    "같은 과목, 같은 요일, 같은 시간에 이미 반이 존재합니다."
                )

        return attrs


class StudentSerializer(serializers.ModelSerializer):
    classes = serializers.PrimaryKeyRelatedField(
        many=True, queryset=Class.objects.all(), required=False
    )
    attendance_stats = serializers.SerializerMethodField()
    exam_stats = serializers.SerializerMethodField()

    class Meta:
        model = Student
        fields = [
            "id",
            "name",
            "classes",
            "parent_phone",
            "student_phone",
            "school",
            "attendance_stats",
            "exam_stats",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def get_attendance_stats(self, obj):
        request = self.context.get("request")
        user = request.user if request else None

        attendances = obj.attendance_set.all()
        if user and user.role in [User.Role.TEACHER, User.Role.ASSISTANT]:
            attendances = attendances.filter(class_info__subject__in=user.subjects.all())

        total_classes = attendances.count()
        attended_classes = attendances.filter(is_late=False).count()
        late_count = attendances.filter(is_late=True).count()

        return {
            "total_classes": total_classes,
            "attended_classes": attended_classes,
            "late_count": late_count,
        }

    def get_exam_stats(self, obj):
        request = self.context.get("request")
        user = request.user if request else None

        exams = Exam.objects.filter(attendance__student=obj)
        if user and user.role in [User.Role.TEACHER, User.Role.ASSISTANT]:
            exams = exams.filter(attendance__class_info__subject__in=user.subjects.all())

        if not exams.exists():
            return {"average_score": 0, "highest_score": 0, "lowest_score": 0}

        scores = [s for s in exams.values_list("score", flat=True) if s is not None]
        if not scores:
            return {"average_score": 0, "highest_score": 0, "lowest_score": 0}

        return {
            "average_score": sum(scores) // len(scores),
            "highest_score": max(scores),
            "lowest_score": min(scores),
        }

    def to_representation(self, instance):
        ret = super().to_representation(instance)
        request = self.context.get("request")
        user = request.user if request else None

        if user and user.role in [User.Role.TEACHER, User.Role.ASSISTANT]:
            class_ids = ret.get("classes", [])
            from django.db.models import Q
            filtered_class_ids = list(
                Class.objects.filter(
                    Q(id__in=class_ids) & (Q(subject__in=user.subjects.all()) | Q(name="퇴원"))
                ).values_list("id", flat=True)
            )
            ret["classes"] = filtered_class_ids
        return ret

    def validate_name(self, value):
        """학생 이름 검증"""
        if not value or not value.strip():
            raise serializers.ValidationError("학생 이름은 필수 입력 항목입니다.")

        if len(value.strip()) < 2:
            raise serializers.ValidationError("학생 이름은 최소 2자 이상이어야 합니다.")

        if len(value.strip()) > 100:
            raise serializers.ValidationError(
                "학생 이름은 최대 100자까지 입력 가능합니다."
            )

        return value.strip()

    def validate_parent_phone(self, value):
        """부모님 전화번호 검증"""
        if not value or not value.strip():
            raise serializers.ValidationError("부모님 전화번호는 필수 입력 항목입니다.")

        # 숫자만 추출
        digits = "".join(filter(str.isdigit, value))
        
        if not digits.startswith("010") or len(digits) != 11:
            raise serializers.ValidationError(
                "올바른 휴대전화 번호 형식이 아닙니다. (예: 010-0000-0000)"
            )

        # 표준 형식으로 변환하여 저장
        return f"{digits[:3]}-{digits[3:7]}-{digits[7:]}"

    def validate_student_phone(self, value):
        """학생 전화번호 검증 (선택사항)"""
        if not value or not value.strip():
            return ""

        # 숫자만 추출
        digits = "".join(filter(str.isdigit, value))
        
        if not digits.startswith("010") or len(digits) != 11:
            raise serializers.ValidationError(
                "올바른 휴대전화 번호 형식이 아닙니다. (예: 010-0000-0000)"
            )

        # 표준 형식으로 변환하여 저장
        return f"{digits[:3]}-{digits[3:7]}-{digits[7:]}"

    def validate(self, attrs):
        """전체 데이터 검증 (중복 등록 방지)"""
        name = attrs.get("name")
        parent_phone = attrs.get("parent_phone")

        if name and parent_phone:
            # 수정 시에는 자기 자신을 제외하고 중복 확인
            instance = getattr(self, "instance", None)
            queryset = Student.objects.filter(name=name, parent_phone=parent_phone)

            if instance:
                queryset = queryset.exclude(id=instance.id)

            if queryset.exists():
                raise serializers.ValidationError(
                    "이미 동일한 이름과 학부모 전화번호로 등록된 학생이 존재합니다."
                )

        return attrs


class AttendanceSerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(source="student.name", read_only=True)
    class_info_name = serializers.CharField(
        source="class_info.name", read_only=True, allow_null=True
    )
    class_type_display = serializers.SerializerMethodField()

    class Meta:
        model = Attendance
        fields = [
            "id",
            "student",
            "student_name",
            "class_info",
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
    category_display = serializers.CharField(
        source="get_category_display", read_only=True
    )
    class_info = serializers.IntegerField(
        source="attendance.class_info.id", read_only=True, allow_null=True
    )

    class Meta:
        model = Exam
        fields = [
            "id",
            "attendance",
            "student_name",
            "exam_date",
            "name",
            "category",
            "category_display",
            "score",
            "max_score",
            "grade",
            "class_info",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def validate(self, data):
        category = data.get("category")
        score = data.get("score")
        max_score = data.get("max_score")
        grade = data.get("grade")

        if category in [Exam.Category.REVIEW, Exam.Category.SCHOOL]:
            if score is None or max_score is None:
                raise serializers.ValidationError(
                    "복습/학교기출 테스트에는 점수와 만점이 모두 필요합니다."
                )
            if grade is not None:
                raise serializers.ValidationError(
                    "점수 기반 시험에는 등급을 입력할 수 없습니다."
                )
            if score > max_score:
                raise serializers.ValidationError("점수는 만점을 초과할 수 없습니다.")

        elif category in [Exam.Category.ESSAY, Exam.Category.ORAL]:
            if grade is None:
                raise serializers.ValidationError(
                    "서술/구술 테스트에는 등급이 필요합니다."
                )
            if score is not None or max_score is not None:
                raise serializers.ValidationError(
                    "등급 기반 시험에는 점수나 만점을 입력할 수 없습니다."
                )
            # Clear score and max_score for grade-based exams
            data["score"] = None
            data["max_score"] = None

        elif category == Exam.Category.MOCK:
            if score is None:
                raise serializers.ValidationError("모의고사에는 점수가 필요합니다.")
            if grade is not None:
                raise serializers.ValidationError(
                    "모의고사에는 등급을 입력할 수 없습니다."
                )
            data["max_score"] = 50  # 모의고사는 만점 50점으로 고정
            if score > data["max_score"]:
                raise serializers.ValidationError("점수는 만점을 초과할 수 없습니다.")

        return data


class ClassForStudentDetailSerializer(serializers.ModelSerializer):
    class Meta:
        model = Class
        fields = ("id", "name", "subject", "day_of_week", "start_time")


class StudentDetailSerializer(StudentSerializer):
    classes = ClassForStudentDetailSerializer(many=True, read_only=True)
    attendance_records = serializers.SerializerMethodField()
    exam_records = serializers.SerializerMethodField()

    class Meta(StudentSerializer.Meta):
        fields = StudentSerializer.Meta.fields + ["attendance_records", "exam_records"]

    def get_attendance_records(self, obj):
        request = self.context.get("request")
        user = request.user if request else None

        attendances = obj.attendance_set.all().order_by("-date")
        if user and user.role in [User.Role.TEACHER, User.Role.ASSISTANT]:
            attendances = attendances.filter(class_info__subject__in=user.subjects.all())

        return AttendanceSerializer(attendances, many=True, context=self.context).data

    def get_exam_records(self, obj):
        request = self.context.get("request")
        user = request.user if request else None

        exams = Exam.objects.filter(attendance__student=obj).order_by(
            "-attendance__date"
        )
        if user and user.role in [User.Role.TEACHER, User.Role.ASSISTANT]:
            exams = exams.filter(attendance__class_info__subject__in=user.subjects.all())

        return ExamSerializer(exams, many=True, context=self.context).data

    def to_representation(self, instance):
        # Call the grandparent's to_representation to avoid parent's logic
        ret = super(StudentSerializer, self).to_representation(instance)

        request = self.context.get("request")
        user = request.user if request else None

        # Filter the classes queryset based on the user's role
        classes_queryset = instance.classes.all()
        if user and user.role in [User.Role.TEACHER, User.Role.ASSISTANT]:
            from django.db.models import Q
            classes_queryset = classes_queryset.filter(Q(subject__in=user.subjects.all()) | Q(name="퇴원"))

        # Serialize the filtered classes and assign to the 'classes' field
        ret["classes"] = ClassForStudentDetailSerializer(
            classes_queryset, many=True
        ).data

        return ret
