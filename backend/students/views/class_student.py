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
            queryset = queryset.filter(subject=user.subject)

        subject = self.request.query_params.get("subject", None)
        if subject:
            queryset = queryset.filter(subject=subject)
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

        if request.user.role == User.Role.TEACHER:
            if request.data.get("subject") != request.user.subject:
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
        if request.user.role == User.Role.ASSISTANT:
            return Response(
                {"detail": "조교는 반을 수정할 수 없습니다."},
                status=status.HTTP_403_FORBIDDEN,
            )

        if request.user.role == User.Role.TEACHER:
            instance = self.get_object()
            if instance.subject != request.user.subject:
                return Response(
                    {"detail": "자신의 과목의 반만 수정할 수 있습니다."},
                    status=status.HTTP_403_FORBIDDEN,
                )

            if (
                request.data.get("subject")
                and request.data.get("subject") != request.user.subject
            ):
                return Response(
                    {"detail": "자신의 과목으로만 변경할 수 있습니다."},
                    status=status.HTTP_403_FORBIDDEN,
                )

        return super().update(request, *args, **kwargs)

    def partial_update(self, request, *args, **kwargs):
        if request.user.role == User.Role.ASSISTANT:
            return Response(
                {"detail": "조교는 반을 수정할 수 없습니다."},
                status=status.HTTP_403_FORBIDDEN,
            )

        if request.user.role == User.Role.TEACHER:
            instance = self.get_object()
            if instance.subject != request.user.subject:
                return Response(
                    {"detail": "자신의 과목의 반만 수정할 수 있습니다."},
                    status=status.HTTP_403_FORBIDDEN,
                )

            if (
                request.data.get("subject")
                and request.data.get("subject") != request.user.subject
            ):
                return Response(
                    {"detail": "자신의 과목으로만 변경할 수 있습니다."},
                    status=status.HTTP_403_FORBIDDEN,
                )

        return super().partial_update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        if request.user.role == User.Role.ASSISTANT:
            return Response(
                {"detail": "조교는 반을 삭제할 수 없습니다."},
                status=status.HTTP_403_FORBIDDEN,
            )

        if request.user.role == User.Role.TEACHER:
            instance = self.get_object()
            if instance.subject != request.user.subject:
                return Response(
                    {"detail": "자신의 과목의 반만 삭제할 수 있습니다."},
                    status=status.HTTP_403_FORBIDDEN,
                )

        instance = self.get_object()
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
            queryset = queryset.filter(
                Q(classes__subject=user.subject) | Q(classes__isnull=True)
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

        if request.user.role == User.Role.TEACHER:
            instance = self.get_object()
            is_assigned = instance.classes.exists()
            can_modify = not is_assigned or instance.classes.filter(subject=request.user.subject).exists()
            if not can_modify:
                return Response(
                    {"detail": "자신의 과목에 속하지 않은 학생은 수정할 수 없습니다."},
                    status=status.HTTP_403_FORBIDDEN,
                )

        return super().update(request, *args, **kwargs)

    def partial_update(self, request, *args, **kwargs):
        if request.user.role == User.Role.ASSISTANT:
            return Response(
                {"detail": "조교는 학생을 수정할 수 없습니다."},
                status=status.HTTP_403_FORBIDDEN,
            )

        if request.user.role == User.Role.TEACHER:
            instance = self.get_object()
            is_assigned = instance.classes.exists()
            can_modify = not is_assigned or instance.classes.filter(subject=request.user.subject).exists()
            if not can_modify:
                return Response(
                    {"detail": "자신의 과목에 속하지 않은 학생은 수정할 수 없습니다."},
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
            is_assigned = instance.classes.exists()
            can_delete = not is_assigned or instance.classes.filter(subject=request.user.subject).exists()
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
        if user.role in [User.Role.TEACHER, User.Role.ASSISTANT]:
            if not student.classes.filter(subject=user.subject).exists():
                return Response(
                    {"detail": "해당 학생의 출석 기록에 접근할 권한이 없습니다."},
                    status=status.HTTP_403_FORBIDDEN,
                )

        attendances = student.attendance_set.all().order_by("-date")
        serializer = AttendanceSerializer(attendances, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=["get"])
    def exam_records(self, request, pk=None):
        student = self.get_object()
        user = request.user
        if user.role in [User.Role.TEACHER, User.Role.ASSISTANT]:
            if not student.classes.filter(subject=user.subject).exists():
                return Response(
                    {"detail": "해당 학생의 시험 기록에 접근할 권한이 없습니다."},
                    status=status.HTTP_403_FORBIDDEN,
                )

        exams = Exam.objects.filter(attendance__student=student).order_by(
            "-attendance__date"
        )
        serializer = ExamSerializer(exams, many=True)
        return Response(serializer.data)
