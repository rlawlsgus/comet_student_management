from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Avg, Max, Min, Count

from ..models import User, Attendance, Exam, Class
from ..serializers import AttendanceSerializer, ExamSerializer


class AttendanceViewSet(viewsets.ModelViewSet):
    queryset = Attendance.objects.all()
    serializer_class = AttendanceSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        queryset = Attendance.objects.all()
        user = self.request.user

        if user.role in [User.Role.TEACHER, User.Role.ASSISTANT]:
            queryset = queryset.filter(class_info__subject=user.subject)

        student_id = self.request.query_params.get("student_id", None)
        class_id = self.request.query_params.get("class_id", None)
        date = self.request.query_params.get("date", None)

        if student_id:
            queryset = queryset.filter(student_id=student_id)
        if class_id:
            queryset = queryset.filter(class_info_id=class_id)
        if date:
            queryset = queryset.filter(date=date)

        return queryset.order_by("-date")

    def get_permissions(self):
        return super().get_permissions()

    def create(self, request, *args, **kwargs):
        if request.user.role in [User.Role.TEACHER, User.Role.ASSISTANT]:
            class_id = request.data.get("class_info")
            if class_id:
                try:
                    class_obj = Class.objects.get(id=class_id)
                    if class_obj.subject != request.user.subject:
                        return Response(
                            {"detail": "자신의 과목의 반에 대한 출석 기록만 생성할 수 있습니다."},
                            status=status.HTTP_403_FORBIDDEN,
                        )
                except Class.DoesNotExist:
                    return Response(
                        {"detail": "존재하지 않는 반입니다."},
                        status=status.HTTP_400_BAD_REQUEST,
                    )

        serializer = self.get_serializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def update(self, request, *args, **kwargs):
        if request.user.role in [User.Role.TEACHER, User.Role.ASSISTANT]:
            instance = self.get_object()
            if instance.class_info and instance.class_info.subject != request.user.subject:
                return Response(
                    {"detail": "자신의 과목의 학생의 출석 기록만 수정할 수 있습니다."},
                    status=status.HTTP_403_FORBIDDEN,
                )

        return super().update(request, *args, **kwargs)

    def partial_update(self, request, *args, **kwargs):
        if request.user.role in [User.Role.TEACHER, User.Role.ASSISTANT]:
            instance = self.get_object()
            if instance.class_info and instance.class_info.subject != request.user.subject:
                return Response(
                    {"detail": "자신의 과목의 학생의 출석 기록만 수정할 수 있습니다."},
                    status=status.HTTP_403_FORBIDDEN,
                )

        return super().partial_update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        if request.user.role in [User.Role.TEACHER, User.Role.ASSISTANT]:
            instance = self.get_object()
            if instance.class_info and instance.class_info.subject != request.user.subject:
                return Response(
                    {"detail": "자신의 과목의 학생의 출석 기록만 삭제할 수 있습니다."},
                    status=status.HTTP_403_FORBIDDEN,
                )

        instance = self.get_object()
        exam_count = instance.exam_set.count()
        instance.exam_set.all().delete()
        instance.delete()

        return Response(
            {
                "message": f"출석 기록과 함께 {exam_count}개의 시험 기록이 성공적으로 삭제되었습니다."
            },
            status=status.HTTP_200_OK,
        )


class ExamViewSet(viewsets.ModelViewSet):
    queryset = Exam.objects.all()
    serializer_class = ExamSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        queryset = Exam.objects.all()
        user = self.request.user

        if user.role in [User.Role.TEACHER, User.Role.ASSISTANT]:
            queryset = queryset.filter(
                attendance__class_info__subject=user.subject
            )

        student_id = self.request.query_params.get("student_id", None)
        class_id = self.request.query_params.get("class_id", None)

        if student_id:
            queryset = queryset.filter(attendance__student_id=student_id)
        if class_id:
            queryset = queryset.filter(attendance__class_info_id=class_id)

        return queryset.order_by("-attendance__date")

    def get_permissions(self):
        return super().get_permissions()

    @action(detail=False, methods=["get"])
    def exam_averages(self, request):
        user = request.user
        class_id = request.query_params.get("class_id", None)

        queryset = Exam.objects.all()

        if user.role in [User.Role.TEACHER, User.Role.ASSISTANT]:
            queryset = queryset.filter(
                attendance__class_info__subject=user.subject
            )

        if class_id:
            queryset = queryset.filter(attendance__class_info_id=class_id)

        exam_stats = (
            queryset.values("name")
            .annotate(
                average_score=Avg("score"),
                max_score=Max("score"),
                min_score=Min("score"),
                count=Count("id"),
            )
            .order_by("name")
        )

        return Response(exam_stats)

    def create(self, request, *args, **kwargs):
        if request.user.role in [User.Role.TEACHER, User.Role.ASSISTANT]:
            attendance_id = request.data.get("attendance")
            if attendance_id:
                try:
                    attendance = Attendance.objects.get(id=attendance_id)
                    if attendance.class_info and attendance.class_info.subject != request.user.subject:
                        return Response(
                            {
                                "detail": "자신의 과목의 학생의 시험 기록만 생성할 수 있습니다."
                            },
                            status=status.HTTP_403_FORBIDDEN,
                        )
                except Attendance.DoesNotExist:
                    return Response(
                        {"detail": "존재하지 않는 출석 기록입니다."},
                        status=status.HTTP_400_BAD_REQUEST,
                    )

        serializer = self.get_serializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def update(self, request, *args, **kwargs):
        if request.user.role in [User.Role.TEACHER, User.Role.ASSISTANT]:
            instance = self.get_object()
            if instance.attendance.class_info and instance.attendance.class_info.subject != request.user.subject:
                return Response(
                    {"detail": "자신의 과목의 학생의 시험 기록만 수정할 수 있습니다."},
                    status=status.HTTP_403_FORBIDDEN,
                )

        return super().update(request, *args, **kwargs)

    def partial_update(self, request, *args, **kwargs):
        if request.user.role in [User.Role.TEACHER, User.Role.ASSISTANT]:
            instance = self.get_object()
            if instance.attendance.class_info and instance.attendance.class_info.subject != request.user.subject:
                return Response(
                    {"detail": "자신의 과목의 학생의 시험 기록만 수정할 수 있습니다."},
                    status=status.HTTP_403_FORBIDDEN,
                )

        return super().partial_update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        if request.user.role in [User.Role.TEACHER, User.Role.ASSISTANT]:
            instance = self.get_object()
            if instance.attendance.class_info and instance.attendance.class_info.subject != request.user.subject:
                return Response(
                    {"detail": "자신의 과목의 학생의 시험 기록만 삭제할 수 있습니다."},
                    status=status.HTTP_403_FORBIDDEN,
                )
        
        instance = self.get_object()
        instance.delete()
        return Response(
            {"message": "시험 기록이 성공적으로 삭제되었습니다."},
            status=status.HTTP_200_OK,
        )
