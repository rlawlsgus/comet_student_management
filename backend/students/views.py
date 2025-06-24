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
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


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
                return [permissions.IsAuthenticated]  # 기본 인증만 필요
        return super().get_permissions()

    def create(self, request, *args, **kwargs):
        """조교는 반 생성 불가"""
        if request.user.role == User.Role.ASSISTANT:
            return Response(
                {"detail": "조교는 반을 생성할 수 없습니다."},
                status=status.HTTP_403_FORBIDDEN,
            )
        return super().create(request, *args, **kwargs)

    def update(self, request, *args, **kwargs):
        """조교는 반 수정 불가"""
        if request.user.role == User.Role.ASSISTANT:
            return Response(
                {"detail": "조교는 반을 수정할 수 없습니다."},
                status=status.HTTP_403_FORBIDDEN,
            )
        return super().update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        """조교는 반 삭제 불가"""
        if request.user.role == User.Role.ASSISTANT:
            return Response(
                {"detail": "조교는 반을 삭제할 수 없습니다."},
                status=status.HTTP_403_FORBIDDEN,
            )
        return super().destroy(request, *args, **kwargs)


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
                return [permissions.IsAuthenticated]  # 기본 인증만 필요
        return super().get_permissions()

    def create(self, request, *args, **kwargs):
        """조교는 학생 생성 불가"""
        if request.user.role == User.Role.ASSISTANT:
            return Response(
                {"detail": "조교는 학생을 생성할 수 없습니다."},
                status=status.HTTP_403_FORBIDDEN,
            )
        return super().create(request, *args, **kwargs)

    def update(self, request, *args, **kwargs):
        """조교는 학생 수정 불가"""
        if request.user.role == User.Role.ASSISTANT:
            return Response(
                {"detail": "조교는 학생을 수정할 수 없습니다."},
                status=status.HTTP_403_FORBIDDEN,
            )
        return super().update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        """조교는 학생 삭제 불가"""
        if request.user.role == User.Role.ASSISTANT:
            return Response(
                {"detail": "조교는 학생을 삭제할 수 없습니다."},
                status=status.HTTP_403_FORBIDDEN,
            )
        return super().destroy(request, *args, **kwargs)

    @action(detail=True, methods=["get"])
    def attendance_records(self, request, pk=None):
        """학생의 출석 기록 조회"""
        student = self.get_object()
        attendances = student.attendance_set.all().order_by("-date")
        serializer = AttendanceSerializer(attendances, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=["get"])
    def exam_records(self, request, pk=None):
        """학생의 시험 기록 조회"""
        student = self.get_object()
        exams = Exam.objects.filter(attendance__student=student).order_by(
            "-attendance__date"
        )
        serializer = ExamSerializer(exams, many=True)
        return Response(serializer.data)


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

        # 출석 통계 (선택된 반이 있는 경우)
        attendance_stats = []
        if class_id:
            # 관리자는 모든 반의 통계를, 선생님과 조교는 해당 과목의 반만 볼 수 있음
            selected_class = Class.objects.filter(id=class_id).first()
            if selected_class and (
                user.role == User.Role.ADMIN or selected_class.subject == user.subject
            ):
                students = Student.objects.filter(class_info_id=class_id)
                dates = (
                    Attendance.objects.filter(student__class_info_id=class_id)
                    .values_list("date", flat=True)
                    .distinct()
                    .order_by("date")
                )

                for date in dates:
                    day_attendances = Attendance.objects.filter(
                        student__class_info_id=class_id, date=date
                    )
                    present = day_attendances.filter(is_late=False).count()
                    late = day_attendances.filter(is_late=True).count()
                    absent = students.count() - present - late

                    attendance_stats.append(
                        {
                            "date": date,
                            "present": present,
                            "absent": absent,
                            "late": late,
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
