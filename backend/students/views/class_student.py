from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Q

from ..models import User, Class, Student, Exam
from ..serializers import (
    ClassSerializer,
    StudentSerializer,
    StudentDetailSerializer,
    AttendanceSerializer,
    ExamSerializer,
)


class ClassViewSet(viewsets.ModelViewSet):
    queryset = Class.objects.all()
    serializer_class = ClassSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        queryset = Class.objects.all()
        user = self.request.user

        if user.role in [User.Role.TEACHER, User.Role.ASSISTANT]:
            # 사용자의 과목에 해당하는 반 또는 "퇴원" 반을 가져옴
            queryset = queryset.filter(Q(subject__in=user.subjects.all()) | Q(name="퇴원"))

        subject = self.request.query_params.get("subject", None)
        if subject:
            # 특정 과목 필터링 시에도 "퇴원" 반은 포함될 수 있도록 할지 고민 필요
            # 일단은 특정 과목 요청 시에는 해당 과목만 보여주되, "퇴원" 반은 예외로 할 수도 있음
            queryset = queryset.filter(Q(subject=subject) | Q(name="퇴원"))
        return queryset

    def get_permissions(self):
        if self.action in ["create", "update", "partial_update", "destroy"]:
            if self.request.user.role == User.Role.ASSISTANT:
                return [permissions.IsAuthenticated()]
        return super().get_permissions()

    def create(self, request, *args, **kwargs):
        if request.user.role == User.Role.ASSISTANT:
            return Response(
                {"detail": "조교는 반을 생성할 수 없습니다."},
                status=status.HTTP_403_FORBIDDEN,
            )

        name = request.data.get("name")
        if name == "퇴원":
            # "퇴원" 반은 이미 존재할 가능성이 높으므로 체크
            if Class.objects.filter(name="퇴원").exists():
                return Response(
                    {"detail": '"퇴원" 반은 이미 존재합니다.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            # "퇴원" 반은 누구나 생성 가능 (관리자나 선생님)
        elif request.user.role == User.Role.TEACHER:
            subject_id = request.data.get("subject")
            if subject_id and not request.user.subjects.filter(id=subject_id).exists():
                return Response(
                    {"detail": "자신의 과목의 반만 생성할 수 있습니다."},
                    status=status.HTTP_403_FORBIDDEN,
                )

        serializer = self.get_serializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def update(self, request, *args, **kwargs):
        instance = self.get_object()
        
        if request.user.role == User.Role.ASSISTANT:
            return Response(
                {"detail": "조교는 반을 수정할 수 없습니다."},
                status=status.HTTP_403_FORBIDDEN,
            )

        if instance.name == "퇴원" and request.data.get("name") != "퇴원":
             return Response(
                {"detail": '"퇴원" 반의 이름은 변경할 수 없습니다.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if request.user.role == User.Role.TEACHER:
            if instance.name != "퇴원" and instance.subject not in request.user.subjects.all():
                return Response(
                    {"detail": "자신의 과목의 반만 수정할 수 있습니다."},
                    status=status.HTTP_403_FORBIDDEN,
                )

            subject_id = request.data.get("subject")
            if (
                subject_id
                and not request.user.subjects.filter(id=subject_id).exists()
                and request.data.get("name") != "퇴원"
            ):
                return Response(
                    {"detail": "자신의 과목으로만 변경할 수 있습니다."},
                    status=status.HTTP_403_FORBIDDEN,
                )

        return super().update(request, *args, **kwargs)

    def partial_update(self, request, *args, **kwargs):
        instance = self.get_object()

        if request.user.role == User.Role.ASSISTANT:
            return Response(
                {"detail": "조교는 반을 수정할 수 없습니다."},
                status=status.HTTP_403_FORBIDDEN,
            )

        if instance.name == "퇴원" and request.data.get("name") and request.data.get("name") != "퇴원":
             return Response(
                {"detail": '"퇴원" 반의 이름은 변경할 수 없습니다.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if request.user.role == User.Role.TEACHER:
            if instance.name != "퇴원" and instance.subject not in request.user.subjects.all():
                return Response(
                    {"detail": "자신의 과목의 반만 수정할 수 있습니다."},
                    status=status.HTTP_403_FORBIDDEN,
                )

            subject_id = request.data.get("subject")
            if (
                subject_id
                and not request.user.subjects.filter(id=subject_id).exists()
                and (request.data.get("name") or instance.name) != "퇴원"
            ):
                return Response(
                    {"detail": "자신의 과목으로만 변경할 수 있습니다."},
                    status=status.HTTP_403_FORBIDDEN,
                )

        return super().partial_update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        
        if instance.name == "퇴원":
            return Response(
                {"detail": '"퇴원" 반은 삭제할 수 없습니다.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if request.user.role == User.Role.ASSISTANT:
            return Response(
                {"detail": "조교는 반을 삭제할 수 없습니다."},
                status=status.HTTP_403_FORBIDDEN,
            )

        if request.user.role == User.Role.TEACHER:
            if instance.subject not in request.user.subjects.all():
                return Response(
                    {"detail": "자신의 과목의 반만 삭제할 수 있습니다."},
                    status=status.HTTP_403_FORBIDDEN,
                )

        instance.delete()
        return Response(
            {"message": "반이 성공적으로 삭제되었습니다."},
            status=status.HTTP_200_OK,
        )


class StudentViewSet(viewsets.ModelViewSet):
    queryset = Student.objects.all()
    serializer_class = StudentSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_serializer_class(self):
        if self.action == "retrieve":
            return StudentDetailSerializer
        return StudentSerializer

    def get_queryset(self):
        queryset = Student.objects.all()
        user = self.request.user

        if user.role in [User.Role.TEACHER, User.Role.ASSISTANT]:
            # 사용자의 과목에 속한 반의 학생이거나, "퇴원" 반 학생이거나, 반이 없는 학생
            user_subjects = user.subjects.all()
            queryset = queryset.filter(
                Q(classes__subject__in=user_subjects) | 
                Q(classes__name="퇴원") |
                Q(classes__isnull=True)
            ).distinct()

        class_id = self.request.query_params.get("class_id", None)
        if class_id:
            queryset = queryset.filter(classes__id=class_id)
        return queryset

    def get_permissions(self):
        if self.action in ["create", "update", "partial_update", "destroy"]:
            if self.request.user.role == User.Role.ASSISTANT:
                return [permissions.IsAuthenticated()]
        return super().get_permissions()

    def create(self, request, *args, **kwargs):
        if request.user.role == User.Role.ASSISTANT:
            return Response(
                {"detail": "조교는 학생을 생성할 수 없습니다."},
                status=status.HTTP_403_FORBIDDEN,
            )

        serializer = self.get_serializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def update(self, request, *args, **kwargs):
        if request.user.role == User.Role.ASSISTANT:
            return Response(
                {"detail": "조교는 학생을 수정할 수 없습니다."},
                status=status.HTTP_403_FORBIDDEN,
            )

        return super().update(request, *args, **kwargs)

    def partial_update(self, request, *args, **kwargs):
        if request.user.role == User.Role.ASSISTANT:
            return Response(
                {"detail": "조교는 학생을 수정할 수 없습니다."},
                status=status.HTTP_403_FORBIDDEN,
            )

        return super().partial_update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        if request.user.role == User.Role.ASSISTANT:
            return Response(
                {"detail": "조교는 학생을 삭제할 수 없습니다."},
                status=status.HTTP_403_FORBIDDEN,
            )

        if request.user.role == User.Role.TEACHER:
            instance = self.get_object()
            user_subjects = request.user.subjects.all()
            is_assigned = instance.classes.exists()
            # 반이 없거나, 자신의 과목 반에 속해있거나, "퇴원" 반에 속해있으면 삭제 가능
            can_delete = not is_assigned or instance.classes.filter(
                Q(subject__in=user_subjects) | Q(name="퇴원")
            ).exists()
            if not can_delete:
                return Response(
                    {"detail": "자신의 과목에 속하지 않은 학생은 삭제할 수 없습니다."},
                    status=status.HTTP_403_FORBIDDEN,
                )

        instance = self.get_object()

        if instance.attendance_set.exists():
            exam_count = Exam.objects.filter(attendance__student=instance).count()
            Exam.objects.filter(attendance__student=instance).delete()

            attendance_count = instance.attendance_set.count()
            instance.attendance_set.all().delete()

            instance.delete()

            return Response(
                {
                    "message": f"학생과 함께 {attendance_count}개의 출석 기록, {exam_count}개의 시험 기록이 성공적으로 삭제되었습니다."
                },
                status=status.HTTP_200_OK,
            )
        else:
            instance.delete()
            return Response(
                {"message": "학생이 성공적으로 삭제되었습니다."},
                status=status.HTTP_200_OK,
            )

    @action(detail=True, methods=["get"])
    def attendance_records(self, request, pk=None):
        student = self.get_object()
        user = request.user
        
        attendances = student.attendance_set.all().order_by("-date")
        if user.role in [User.Role.TEACHER, User.Role.ASSISTANT]:
            user_subjects = user.subjects.all()
            # 자신의 과목 반 학생이거나 "퇴원" 반 학생이거나 반이 없는 경우 접근 허용
            if not student.classes.filter(Q(subject__in=user_subjects) | Q(name="퇴원")).exists() and student.classes.exists():
                return Response(
                    {"detail": "해당 학생의 출석 기록에 접근할 권한이 없습니다."},
                    status=status.HTTP_403_FORBIDDEN,
                )
            # 출석 기록 필터링: 자신의 과목 또는 "퇴원" 반 기록
            attendances = attendances.filter(Q(class_info__subject__in=user_subjects) | Q(class_info__name="퇴원"))

        serializer = AttendanceSerializer(attendances, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=["get"])
    def exam_records(self, request, pk=None):
        student = self.get_object()
        user = request.user

        exams = Exam.objects.filter(attendance__student=student).order_by(
            "-attendance__date"
        )
        if user.role in [User.Role.TEACHER, User.Role.ASSISTANT]:
            user_subjects = user.subjects.all()
            if not student.classes.filter(Q(subject__in=user_subjects) | Q(name="퇴원")).exists() and student.classes.exists():
                return Response(
                    {"detail": "해당 학생의 시험 기록에 접근할 권한이 없습니다."},
                    status=status.HTTP_403_FORBIDDEN,
                )
            # 시험 기록 필터링: 자신의 과목 또는 "퇴원" 반 기록
            exams = exams.filter(Q(attendance__class_info__subject__in=user_subjects) | Q(attendance__class_info__name="퇴원"))

        serializer = ExamSerializer(exams, many=True)
        return Response(serializer.data)
