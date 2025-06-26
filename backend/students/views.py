from django.shortcuts import render
from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from django.contrib.auth import login, logout
from django.db.models import Count, Avg, Max, Min
from django.utils import timezone
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from datetime import datetime, timedelta
from .models import User, Class, Student, Attendance, Exam
from .serializers import (
    UserSerializer,
    UserCreateSerializer,
    UserUpdateSerializer,
    LoginSerializer,
    ClassSerializer,
    StudentSerializer,
    StudentDetailSerializer,
    AttendanceSerializer,
    ExamSerializer,
    DashboardStatsSerializer,
)


@method_decorator(csrf_exempt, name="dispatch")
class LoginView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.validated_data["user"]
            login(request, user)
            return Response(
                {"message": "로그인 성공", "user": UserSerializer(user).data}
            )

        # 오류 메시지 처리
        errors = serializer.errors
        if "non_field_errors" in errors:
            error_message = errors["non_field_errors"][0]
        elif "username" in errors:
            error_message = errors["username"][0]
        elif "password" in errors:
            error_message = errors["password"][0]
        else:
            error_message = "로그인에 실패했습니다."

        return Response({"detail": error_message}, status=status.HTTP_400_BAD_REQUEST)


class LogoutView(APIView):
    def post(self, request):
        logout(request)
        return Response({"message": "로그아웃 성공"})


class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_serializer_class(self):
        if self.action == "create":
            return UserCreateSerializer
        elif self.action in ["update", "partial_update"]:
            return UserUpdateSerializer
        return UserSerializer

    def get_queryset(self):
        user = self.request.user

        # 관리자는 모든 사용자를, 조교는 자신의 정보만 볼 수 있음
        if user.role == User.Role.ASSISTANT:
            return User.objects.filter(id=user.id)

        # 관리자와 선생님은 모든 사용자를 볼 수 있음
        return User.objects.all()

    def get_permissions(self):
        """권한 설정"""
        if self.action in ["create", "update", "partial_update", "destroy"]:
            # 조교는 생성, 수정, 삭제 불가
            if self.request.user.role == User.Role.ASSISTANT:
                return [permissions.IsAuthenticated()]  # 기본 인증만 필요
        return super().get_permissions()

    def create(self, request, *args, **kwargs):
        """회원 생성"""
        # 조교는 회원 생성 불가
        if request.user.role == User.Role.ASSISTANT:
            return Response(
                {"detail": "조교는 회원을 생성할 수 없습니다."},
                status=status.HTTP_403_FORBIDDEN,
            )

        # 관리자만 ADMIN 역할의 회원 생성 가능
        if (
            request.data.get("role") == User.Role.ADMIN
            and request.user.role != User.Role.ADMIN
        ):
            return Response(
                {"detail": "관리자만 관리자 역할의 회원을 생성할 수 있습니다."},
                status=status.HTTP_403_FORBIDDEN,
            )

        serializer = self.get_serializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def update(self, request, *args, **kwargs):
        """회원 수정"""
        # 조교는 회원 수정 불가
        if request.user.role == User.Role.ASSISTANT:
            return Response(
                {"detail": "조교는 회원을 수정할 수 없습니다."},
                status=status.HTTP_403_FORBIDDEN,
            )

        instance = self.get_object()

        # 관리자만 ADMIN 역할의 회원 수정 가능
        if instance.role == User.Role.ADMIN and request.user.role != User.Role.ADMIN:
            return Response(
                {"detail": "관리자만 관리자 역할의 회원을 수정할 수 있습니다."},
                status=status.HTTP_403_FORBIDDEN,
            )

        # 역할 변경 시 권한 검증
        new_role = request.data.get("role")
        if (
            new_role
            and new_role == User.Role.ADMIN
            and request.user.role != User.Role.ADMIN
        ):
            return Response(
                {"detail": "관리자만 관리자 역할로 변경할 수 있습니다."},
                status=status.HTTP_403_FORBIDDEN,
            )

        return super().update(request, *args, **kwargs)

    def partial_update(self, request, *args, **kwargs):
        """회원 수정"""
        # 조교는 회원 수정 불가
        if request.user.role == User.Role.ASSISTANT:
            return Response(
                {"detail": "조교는 회원을 수정할 수 없습니다."},
                status=status.HTTP_403_FORBIDDEN,
            )

        instance = self.get_object()

        # 관리자만 ADMIN 역할의 회원 수정 가능
        if instance.role == User.Role.ADMIN and request.user.role != User.Role.ADMIN:
            return Response(
                {"detail": "관리자만 관리자 역할의 회원을 수정할 수 있습니다."},
                status=status.HTTP_403_FORBIDDEN,
            )

        # 역할 변경 시 권한 검증
        new_role = request.data.get("role")
        if (
            new_role
            and new_role == User.Role.ADMIN
            and request.user.role != User.Role.ADMIN
        ):
            return Response(
                {"detail": "관리자만 관리자 역할로 변경할 수 있습니다."},
                status=status.HTTP_403_FORBIDDEN,
            )

        return super().partial_update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        """회원 삭제"""
        # 조교는 회원 삭제 불가
        if request.user.role == User.Role.ASSISTANT:
            return Response(
                {"detail": "조교는 회원을 삭제할 수 없습니다."},
                status=status.HTTP_403_FORBIDDEN,
            )

        instance = self.get_object()

        # 자신을 삭제할 수 없음
        if instance.id == request.user.id:
            return Response(
                {"detail": "자신을 삭제할 수 없습니다."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # 관리자만 ADMIN 역할의 회원 삭제 가능
        if instance.role == User.Role.ADMIN and request.user.role != User.Role.ADMIN:
            return Response(
                {"detail": "관리자만 관리자 역할의 회원을 삭제할 수 있습니다."},
                status=status.HTTP_403_FORBIDDEN,
            )

        # 회원 삭제
        instance.delete()
        return Response(
            {"message": "회원이 성공적으로 삭제되었습니다."},
            status=status.HTTP_200_OK,
        )

    @action(detail=False, methods=["get"])
    def profile(self, request):
        """현재 로그인한 사용자의 프로필 정보"""
        serializer = UserSerializer(request.user)
        return Response(serializer.data)

    @action(detail=False, methods=["put", "patch"])
    def update_profile(self, request):
        """현재 로그인한 사용자의 프로필 정보 수정"""
        user = request.user

        # 조교는 자신의 이름, 역할, 과목을 수정할 수 없음
        if user.role == User.Role.ASSISTANT:
            return Response(
                {"error": "조교는 프로필 정보를 수정할 수 없습니다."},
                status=status.HTTP_403_FORBIDDEN,
            )

        # 선생님은 자신의 역할을 수정할 수 없음
        if user.role == User.Role.TEACHER and request.data.get("role"):
            return Response(
                {"error": "선생님은 자신의 역할을 수정할 수 없습니다."},
                status=status.HTTP_403_FORBIDDEN,
            )

        serializer = UserUpdateSerializer(request.user, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(UserSerializer(request.user).data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=["post"])
    def change_password(self, request):
        """비밀번호 변경"""
        user = request.user
        old_password = request.data.get("old_password")
        new_password = request.data.get("new_password")
        confirm_password = request.data.get("confirm_password")

        if not old_password or not new_password or not confirm_password:
            return Response(
                {"error": "모든 필드를 입력해주세요."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not user.check_password(old_password):
            return Response(
                {"error": "현재 비밀번호가 올바르지 않습니다."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if new_password != confirm_password:
            return Response(
                {"error": "새 비밀번호가 일치하지 않습니다."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if len(new_password) < 8:
            return Response(
                {"error": "새 비밀번호는 최소 8자 이상이어야 합니다."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user.set_password(new_password)
        user.save()
        return Response({"message": "비밀번호가 변경되었습니다."})


class ClassViewSet(viewsets.ModelViewSet):
    queryset = Class.objects.all()
    serializer_class = ClassSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        queryset = Class.objects.all()
        user = self.request.user

        # 관리자는 모든 반을, 선생님과 조교는 해당 과목의 반만 볼 수 있음
        if user.role in [User.Role.TEACHER, User.Role.ASSISTANT]:
            queryset = queryset.filter(subject=user.subject)

        # 추가 필터링
        subject = self.request.query_params.get("subject", None)
        if subject:
            queryset = queryset.filter(subject=subject)
        return queryset

    def get_permissions(self):
        """조교는 조회만 가능하도록 권한 설정"""
        if self.action in ["create", "update", "partial_update", "destroy"]:
            # 조교는 생성, 수정, 삭제 불가
            if self.request.user.role == User.Role.ASSISTANT:
                return [permissions.IsAuthenticated()]  # 기본 인증만 필요
        return super().get_permissions()

    def create(self, request, *args, **kwargs):
        """조교는 반 생성 불가"""
        if request.user.role == User.Role.ASSISTANT:
            return Response(
                {"detail": "조교는 반을 생성할 수 없습니다."},
                status=status.HTTP_403_FORBIDDEN,
            )

        # 선생님은 자신의 과목의 반만 생성 가능
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
        """조교는 반 수정 불가"""
        if request.user.role == User.Role.ASSISTANT:
            return Response(
                {"detail": "조교는 반을 수정할 수 없습니다."},
                status=status.HTTP_403_FORBIDDEN,
            )

        # 선생님은 자신의 과목의 반만 수정 가능
        if request.user.role == User.Role.TEACHER:
            instance = self.get_object()
            if instance.subject != request.user.subject:
                return Response(
                    {"detail": "자신의 과목의 반만 수정할 수 있습니다."},
                    status=status.HTTP_403_FORBIDDEN,
                )

            # 과목 변경 시에도 자신의 과목으로만 변경 가능
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
        """조교는 반 수정 불가"""
        if request.user.role == User.Role.ASSISTANT:
            return Response(
                {"detail": "조교는 반을 수정할 수 없습니다."},
                status=status.HTTP_403_FORBIDDEN,
            )

        # 선생님은 자신의 과목의 반만 수정 가능
        if request.user.role == User.Role.TEACHER:
            instance = self.get_object()
            if instance.subject != request.user.subject:
                return Response(
                    {"detail": "자신의 과목의 반만 수정할 수 있습니다."},
                    status=status.HTTP_403_FORBIDDEN,
                )

            # 과목 변경 시에도 자신의 과목으로만 변경 가능
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
        """조교는 반 삭제 불가"""
        if request.user.role == User.Role.ASSISTANT:
            return Response(
                {"detail": "조교는 반을 삭제할 수 없습니다."},
                status=status.HTTP_403_FORBIDDEN,
            )

        # 선생님은 자신의 과목의 반만 삭제 가능
        if request.user.role == User.Role.TEACHER:
            instance = self.get_object()
            if instance.subject != request.user.subject:
                return Response(
                    {"detail": "자신의 과목의 반만 삭제할 수 있습니다."},
                    status=status.HTTP_403_FORBIDDEN,
                )

        # 학생이 있는 반은 삭제 불가
        instance = self.get_object()
        if instance.student_set.exists():
            return Response(
                {"detail": "학생이 등록된 반은 삭제할 수 없습니다."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # 삭제 실행
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

        # 관리자는 모든 학생을, 선생님과 조교는 해당 과목의 학생만 볼 수 있음
        if user.role in [User.Role.TEACHER, User.Role.ASSISTANT]:
            queryset = queryset.filter(class_info__subject=user.subject)

        # 추가 필터링
        class_id = self.request.query_params.get("class_id", None)
        if class_id:
            queryset = queryset.filter(class_info_id=class_id)
        return queryset

    def get_permissions(self):
        """조교는 조회만 가능하도록 권한 설정"""
        if self.action in ["create", "update", "partial_update", "destroy"]:
            # 조교는 생성, 수정, 삭제 불가
            if self.request.user.role == User.Role.ASSISTANT:
                return [permissions.IsAuthenticated()]  # 기본 인증만 필요
        return super().get_permissions()

    def create(self, request, *args, **kwargs):
        """조교는 학생 생성 불가"""
        if request.user.role == User.Role.ASSISTANT:
            return Response(
                {"detail": "조교는 학생을 생성할 수 없습니다."},
                status=status.HTTP_403_FORBIDDEN,
            )

        # 선생님은 자신의 과목의 반에만 학생 추가 가능
        if request.user.role == User.Role.TEACHER:
            class_id = request.data.get("class_info")
            if class_id:
                try:
                    class_obj = Class.objects.get(id=class_id)
                    if class_obj.subject != request.user.subject:
                        return Response(
                            {
                                "detail": "자신의 과목의 반에만 학생을 추가할 수 있습니다."
                            },
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
        """조교는 학생 수정 불가"""
        if request.user.role == User.Role.ASSISTANT:
            return Response(
                {"detail": "조교는 학생을 수정할 수 없습니다."},
                status=status.HTTP_403_FORBIDDEN,
            )

        # 선생님은 자신의 과목의 학생만 수정 가능
        if request.user.role == User.Role.TEACHER:
            instance = self.get_object()
            if instance.class_info.subject != request.user.subject:
                return Response(
                    {"detail": "자신의 과목의 학생만 수정할 수 있습니다."},
                    status=status.HTTP_403_FORBIDDEN,
                )

            # 반 변경 시에도 자신의 과목의 반으로만 변경 가능
            class_id = request.data.get("class_info")
            if class_id:
                try:
                    class_obj = Class.objects.get(id=class_id)
                    if class_obj.subject != request.user.subject:
                        return Response(
                            {"detail": "자신의 과목의 반으로만 변경할 수 있습니다."},
                            status=status.HTTP_403_FORBIDDEN,
                        )
                except Class.DoesNotExist:
                    return Response(
                        {"detail": "존재하지 않는 반입니다."},
                        status=status.HTTP_400_BAD_REQUEST,
                    )

        return super().update(request, *args, **kwargs)

    def partial_update(self, request, *args, **kwargs):
        """조교는 학생 수정 불가"""
        if request.user.role == User.Role.ASSISTANT:
            return Response(
                {"detail": "조교는 학생을 수정할 수 없습니다."},
                status=status.HTTP_403_FORBIDDEN,
            )

        # 선생님은 자신의 과목의 학생만 수정 가능
        if request.user.role == User.Role.TEACHER:
            instance = self.get_object()
            if instance.class_info.subject != request.user.subject:
                return Response(
                    {"detail": "자신의 과목의 학생만 수정할 수 있습니다."},
                    status=status.HTTP_403_FORBIDDEN,
                )

            # 반 변경 시에도 자신의 과목의 반으로만 변경 가능
            class_id = request.data.get("class_info")
            if class_id:
                try:
                    class_obj = Class.objects.get(id=class_id)
                    if class_obj.subject != request.user.subject:
                        return Response(
                            {"detail": "자신의 과목의 반으로만 변경할 수 있습니다."},
                            status=status.HTTP_403_FORBIDDEN,
                        )
                except Class.DoesNotExist:
                    return Response(
                        {"detail": "존재하지 않는 반입니다."},
                        status=status.HTTP_400_BAD_REQUEST,
                    )

        return super().partial_update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        """조교는 학생 삭제 불가"""
        if request.user.role == User.Role.ASSISTANT:
            return Response(
                {"detail": "조교는 학생을 삭제할 수 없습니다."},
                status=status.HTTP_403_FORBIDDEN,
            )

        # 선생님은 자신의 과목의 학생만 삭제 가능
        if request.user.role == User.Role.TEACHER:
            instance = self.get_object()
            if instance.class_info.subject != request.user.subject:
                return Response(
                    {"detail": "자신의 과목의 학생만 삭제할 수 있습니다."},
                    status=status.HTTP_403_FORBIDDEN,
                )

        # 학생 삭제 처리
        instance = self.get_object()

        # 출석 기록이 있는 경우 연관된 모든 데이터 삭제
        if instance.attendance_set.exists():
            # 시험 기록 먼저 삭제 (출석 기록에 의존적)
            exam_count = Exam.objects.filter(attendance__student=instance).count()
            Exam.objects.filter(attendance__student=instance).delete()

            # 출석 기록 삭제
            attendance_count = instance.attendance_set.count()
            instance.attendance_set.all().delete()

            # 학생 삭제
            instance.delete()

            return Response(
                {
                    "message": f"학생과 함께 {attendance_count}개의 출석 기록, {exam_count}개의 시험 기록이 성공적으로 삭제되었습니다."
                },
                status=status.HTTP_200_OK,
            )
        else:
            # 출석 기록이 없는 경우 일반 삭제
            instance.delete()
            return Response(
                {"message": "학생이 성공적으로 삭제되었습니다."},
                status=status.HTTP_200_OK,
            )

    @action(detail=True, methods=["get"])
    def attendance_records(self, request, pk=None):
        """학생의 출석 기록 조회"""
        student = self.get_object()

        # 권한 검증
        user = request.user
        if user.role in [User.Role.TEACHER, User.Role.ASSISTANT]:
            if student.class_info.subject != user.subject:
                return Response(
                    {"detail": "해당 학생의 출석 기록에 접근할 권한이 없습니다."},
                    status=status.HTTP_403_FORBIDDEN,
                )

        attendances = student.attendance_set.all().order_by("-date")
        serializer = AttendanceSerializer(attendances, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=["get"])
    def exam_records(self, request, pk=None):
        """학생의 시험 기록 조회"""
        student = self.get_object()

        # 권한 검증
        user = request.user
        if user.role in [User.Role.TEACHER, User.Role.ASSISTANT]:
            if student.class_info.subject != user.subject:
                return Response(
                    {"detail": "해당 학생의 시험 기록에 접근할 권한이 없습니다."},
                    status=status.HTTP_403_FORBIDDEN,
                )

        exams = Exam.objects.filter(attendance__student=student).order_by(
            "-attendance__date"
        )
        serializer = ExamSerializer(exams, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=["post"])
    def add_attendance(self, request, pk=None):
        """학생의 출석 기록 추가"""
        student = self.get_object()

        # 조교는 출석 기록 추가 불가
        if request.user.role == User.Role.ASSISTANT:
            return Response(
                {"detail": "조교는 출석 기록을 추가할 수 없습니다."},
                status=status.HTTP_403_FORBIDDEN,
            )

        # 권한 검증
        user = request.user
        if user.role == User.Role.TEACHER:
            if student.class_info.subject != user.subject:
                return Response(
                    {"detail": "해당 학생의 출석 기록을 추가할 권한이 없습니다."},
                    status=status.HTTP_403_FORBIDDEN,
                )

        # 출석 기록 데이터에 학생 ID 추가
        attendance_data = request.data.copy()
        attendance_data["student"] = student.id

        serializer = AttendanceSerializer(data=attendance_data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=["post"])
    def add_exam(self, request, pk=None):
        """학생의 시험 기록 추가"""
        student = self.get_object()

        # 조교는 시험 기록 추가 불가
        if request.user.role == User.Role.ASSISTANT:
            return Response(
                {"detail": "조교는 시험 기록을 추가할 수 없습니다."},
                status=status.HTTP_403_FORBIDDEN,
            )

        # 권한 검증
        user = request.user
        if user.role == User.Role.TEACHER:
            if student.class_info.subject != user.subject:
                return Response(
                    {"detail": "해당 학생의 시험 기록을 추가할 권한이 없습니다."},
                    status=status.HTTP_403_FORBIDDEN,
                )

        # 시험 기록 데이터에 출석 기록 ID 추가
        exam_data = request.data.copy()

        # 출석 기록이 필요하므로 먼저 생성하거나 기존 출석 기록을 사용
        attendance_id = exam_data.get("attendance")
        if not attendance_id:
            return Response(
                {"detail": "시험 기록을 추가하려면 출석 기록이 필요합니다."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # 출석 기록이 해당 학생의 것인지 확인
        try:
            attendance = Attendance.objects.get(id=attendance_id, student=student)
        except Attendance.DoesNotExist:
            return Response(
                {"detail": "해당 학생의 출석 기록을 찾을 수 없습니다."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        serializer = ExamSerializer(data=exam_data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class AttendanceViewSet(viewsets.ModelViewSet):
    queryset = Attendance.objects.all()
    serializer_class = AttendanceSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        queryset = Attendance.objects.all()
        user = self.request.user

        # 관리자는 모든 출석 기록을, 선생님과 조교는 해당 과목의 출석 기록만 볼 수 있음
        if user.role in [User.Role.TEACHER, User.Role.ASSISTANT]:
            queryset = queryset.filter(student__class_info__subject=user.subject)

        # 추가 필터링
        student_id = self.request.query_params.get("student_id", None)
        class_id = self.request.query_params.get("class_id", None)
        date = self.request.query_params.get("date", None)

        if student_id:
            queryset = queryset.filter(student_id=student_id)
        if class_id:
            queryset = queryset.filter(student__class_info_id=class_id)
        if date:
            queryset = queryset.filter(date=date)

        return queryset.order_by("-date")

    def get_permissions(self):
        """권한 설정"""
        return super().get_permissions()

    def create(self, request, *args, **kwargs):
        """출석 기록 생성"""
        # 조교와 선생님은 자신의 과목의 학생의 출석 기록만 생성 가능
        if request.user.role in [User.Role.TEACHER, User.Role.ASSISTANT]:
            student_id = request.data.get("student")
            if student_id:
                try:
                    student = Student.objects.get(id=student_id)
                    if student.class_info.subject != request.user.subject:
                        return Response(
                            {
                                "detail": "자신의 과목의 학생의 출석 기록만 생성할 수 있습니다."
                            },
                            status=status.HTTP_403_FORBIDDEN,
                        )
                except Student.DoesNotExist:
                    return Response(
                        {"detail": "존재하지 않는 학생입니다."},
                        status=status.HTTP_400_BAD_REQUEST,
                    )

        serializer = self.get_serializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def update(self, request, *args, **kwargs):
        """출석 기록 수정"""
        # 조교와 선생님은 자신의 과목의 학생의 출석 기록만 수정 가능
        if request.user.role in [User.Role.TEACHER, User.Role.ASSISTANT]:
            instance = self.get_object()
            if instance.student.class_info.subject != request.user.subject:
                return Response(
                    {"detail": "자신의 과목의 학생의 출석 기록만 수정할 수 있습니다."},
                    status=status.HTTP_403_FORBIDDEN,
                )

        return super().update(request, *args, **kwargs)

    def partial_update(self, request, *args, **kwargs):
        """출석 기록 수정"""
        # 조교와 선생님은 자신의 과목의 학생의 출석 기록만 수정 가능
        if request.user.role in [User.Role.TEACHER, User.Role.ASSISTANT]:
            instance = self.get_object()
            if instance.student.class_info.subject != request.user.subject:
                return Response(
                    {"detail": "자신의 과목의 학생의 출석 기록만 수정할 수 있습니다."},
                    status=status.HTTP_403_FORBIDDEN,
                )

        return super().partial_update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        """출석 기록 삭제"""
        # 조교와 선생님은 자신의 과목의 학생의 출석 기록만 삭제 가능
        if request.user.role in [User.Role.TEACHER, User.Role.ASSISTANT]:
            instance = self.get_object()
            if instance.student.class_info.subject != request.user.subject:
                return Response(
                    {"detail": "자신의 과목의 학생의 출석 기록만 삭제할 수 있습니다."},
                    status=status.HTTP_403_FORBIDDEN,
                )

        # 출석 기록 삭제 시 연관된 시험 기록도 함께 삭제
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

        # 관리자는 모든 시험 기록을, 선생님과 조교는 해당 과목의 시험 기록만 볼 수 있음
        if user.role in [User.Role.TEACHER, User.Role.ASSISTANT]:
            queryset = queryset.filter(
                attendance__student__class_info__subject=user.subject
            )

        # 추가 필터링
        student_id = self.request.query_params.get("student_id", None)
        class_id = self.request.query_params.get("class_id", None)

        if student_id:
            queryset = queryset.filter(attendance__student_id=student_id)
        if class_id:
            queryset = queryset.filter(attendance__student__class_info_id=class_id)

        return queryset.order_by("-attendance__date")

    def get_permissions(self):
        """권한 설정"""
        return super().get_permissions()

    @action(detail=False, methods=["get"])
    def exam_averages(self, request):
        """시험별 평균 점수 조회"""
        user = request.user

        # 기본 쿼리셋
        queryset = Exam.objects.all()

        # 권한에 따른 필터링
        if user.role in [User.Role.TEACHER, User.Role.ASSISTANT]:
            queryset = queryset.filter(
                attendance__student__class_info__subject=user.subject
            )

        # 추가 필터링
        student_id = request.query_params.get("student_id", None)
        class_id = request.query_params.get("class_id", None)

        if student_id:
            queryset = queryset.filter(attendance__student_id=student_id)
        if class_id:
            queryset = queryset.filter(attendance__student__class_info_id=class_id)

        # 시험별 통계 계산
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
        """시험 기록 생성"""
        # 조교와 선생님은 자신의 과목의 학생의 시험 기록만 생성 가능
        if request.user.role in [User.Role.TEACHER, User.Role.ASSISTANT]:
            attendance_id = request.data.get("attendance")
            if attendance_id:
                try:
                    attendance = Attendance.objects.get(id=attendance_id)
                    if attendance.student.class_info.subject != request.user.subject:
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
        """시험 기록 수정"""
        # 조교와 선생님은 자신의 과목의 학생의 시험 기록만 수정 가능
        if request.user.role in [User.Role.TEACHER, User.Role.ASSISTANT]:
            instance = self.get_object()
            if instance.attendance.student.class_info.subject != request.user.subject:
                return Response(
                    {"detail": "자신의 과목의 학생의 시험 기록만 수정할 수 있습니다."},
                    status=status.HTTP_403_FORBIDDEN,
                )

        return super().update(request, *args, **kwargs)

    def partial_update(self, request, *args, **kwargs):
        """시험 기록 수정"""
        # 조교와 선생님은 자신의 과목의 학생의 시험 기록만 수정 가능
        if request.user.role in [User.Role.TEACHER, User.Role.ASSISTANT]:
            instance = self.get_object()
            if instance.attendance.student.class_info.subject != request.user.subject:
                return Response(
                    {"detail": "자신의 과목의 학생의 시험 기록만 수정할 수 있습니다."},
                    status=status.HTTP_403_FORBIDDEN,
                )

        return super().partial_update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        """시험 기록 삭제"""
        # 조교와 선생님은 자신의 과목의 학생의 시험 기록만 삭제 가능
        if request.user.role in [User.Role.TEACHER, User.Role.ASSISTANT]:
            instance = self.get_object()
            if instance.attendance.student.class_info.subject != request.user.subject:
                return Response(
                    {"detail": "자신의 과목의 학생의 시험 기록만 삭제할 수 있습니다."},
                    status=status.HTTP_403_FORBIDDEN,
                )

        # 시험 기록 삭제
        instance = self.get_object()
        instance.delete()
        return Response(
            {"message": "시험 기록이 성공적으로 삭제되었습니다."},
            status=status.HTTP_200_OK,
        )


class DashboardView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        """대시보드 통계 데이터"""
        user = request.user
        class_id = request.query_params.get("class_id", None)

        # 반 목록 - 관리자는 모든 반을, 선생님과 조교는 해당 과목의 반만 볼 수 있음
        classes = Class.objects.all()
        if user.role in [User.Role.TEACHER, User.Role.ASSISTANT]:
            classes = classes.filter(subject=user.subject)

        class_stats = []
        for class_obj in classes:
            student_count = class_obj.student_set.count()
            class_stats.append(
                {
                    "id": class_obj.id,
                    "name": class_obj.name,
                    "subject": class_obj.subject,
                    "student_count": student_count,
                }
            )

        # 출석 통계 (선택된 반이 있는 경우) - 매달 한달간의 통계
        attendance_stats = []
        if class_id:
            # 관리자는 모든 반의 통계를, 선생님과 조교는 해당 과목의 반만 볼 수 있음
            selected_class = Class.objects.filter(id=class_id).first()
            if selected_class and (
                user.role == User.Role.ADMIN or selected_class.subject == user.subject
            ):
                students = Student.objects.filter(class_info_id=class_id)

                # 현재 월의 첫날과 마지막날 계산
                from datetime import date, timedelta
                import calendar

                today = date.today()
                first_day = date(today.year, today.month, 1)
                last_day = date(
                    today.year,
                    today.month,
                    calendar.monthrange(today.year, today.month)[1],
                )

                # 현재 월의 출석 데이터 가져오기
                monthly_attendances = Attendance.objects.filter(
                    student__class_info_id=class_id,
                    date__gte=first_day,
                    date__lte=last_day,
                ).order_by("date")

                # 날짜별로 출석 통계 계산
                attendance_by_date = {}
                for attendance in monthly_attendances:
                    date_str = attendance.date.strftime("%Y-%m-%d")
                    if date_str not in attendance_by_date:
                        attendance_by_date[date_str] = {
                            "present": 0,
                            "late": 0,
                            "absent": 0,
                        }

                    if attendance.is_late:
                        attendance_by_date[date_str]["late"] += 1
                    else:
                        attendance_by_date[date_str]["present"] += 1

                # 결석자 수 계산 (전체 학생 수에서 출석자와 지각자 제외)
                total_students = students.count()
                for date_str in attendance_by_date:
                    attendance_by_date[date_str]["absent"] = (
                        total_students
                        - attendance_by_date[date_str]["present"]
                        - attendance_by_date[date_str]["late"]
                    )

                # 날짜 순으로 정렬하여 리스트로 변환
                for date_str in sorted(attendance_by_date.keys()):
                    attendance_stats.append(
                        {
                            "date": date_str,
                            "present": attendance_by_date[date_str]["present"],
                            "absent": attendance_by_date[date_str]["absent"],
                            "late": attendance_by_date[date_str]["late"],
                        }
                    )

        # 성적 통계 (선택된 반이 있는 경우) - 최근 한달간의 모든 시험
        grade_stats = []
        if class_id:
            # 관리자는 모든 반의 통계를, 선생님과 조교는 해당 과목의 반만 볼 수 있음
            selected_class = Class.objects.filter(id=class_id).first()
            if selected_class and (
                user.role == User.Role.ADMIN or selected_class.subject == user.subject
            ):
                # 최근 한달간의 시험 가져오기
                from datetime import date, timedelta

                one_month_ago = date.today() - timedelta(days=30)

                recent_exams = Exam.objects.filter(
                    attendance__student__class_info_id=class_id,
                    attendance__date__gte=one_month_ago,
                ).order_by("-attendance__date", "-id")

                if recent_exams.exists():
                    # 시험별로 통계 계산
                    exam_stats = {}
                    for exam in recent_exams:
                        exam_name = exam.name
                        if exam_name not in exam_stats:
                            exam_stats[exam_name] = []
                        exam_stats[exam_name].append(exam.score)

                    # 각 시험의 통계 계산
                    for exam_name, scores in exam_stats.items():
                        grade_stats.append(
                            {
                                "exam_name": exam_name,
                                "average": sum(scores) // len(scores),
                                "highest": max(scores),
                                "lowest": min(scores),
                                "count": len(scores),
                            }
                        )

        return Response(
            {
                "class_stats": class_stats,
                "attendance_stats": attendance_stats,
                "grade_stats": grade_stats,
            }
        )
