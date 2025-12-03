from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from django.db.models import Avg, Max, Min, Count
from datetime import date
import requests

from ..models import User, Class, Student, Attendance, Exam


class DashboardView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        class_id = request.query_params.get("class_id", None)
        month_param = request.query_params.get("month", None)

        if month_param:
            try:
                year, month = map(int, month_param.split("-"))
                target_month = date(year, month, 1)
            except (ValueError, TypeError):
                target_month = date.today()
        else:
            target_month = date.today()

        classes = Class.objects.all()
        if user.role in [User.Role.TEACHER, User.Role.ASSISTANT]:
            classes = classes.filter(subject=user.subject)

        class_stats = []
        for class_obj in classes:
            student_count = class_obj.students.count()
            class_stats.append(
                {
                    "id": class_obj.id,
                    "name": class_obj.name,
                    "subject": class_obj.subject,
                    "student_count": student_count,
                }
            )

        attendance_stats = []
        if class_id:
            selected_class = Class.objects.filter(id=class_id).first()
            if selected_class and (
                user.role == User.Role.ADMIN or selected_class.subject == user.subject
            ):
                students = Student.objects.filter(classes__id=class_id)
                import calendar
                first_day = date(target_month.year, target_month.month, 1)
                last_day = date(
                    target_month.year,
                    target_month.month,
                    calendar.monthrange(target_month.year, target_month.month)[1],
                )

                monthly_attendances = Attendance.objects.filter(
                    class_info_id=class_id,
                    date__gte=first_day,
                    date__lte=last_day,
                ).order_by("date")

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

                total_students = students.count()
                for date_str in attendance_by_date:
                    attendance_by_date[date_str]["absent"] = (
                        total_students
                        - attendance_by_date[date_str]["present"]
                        - attendance_by_date[date_str]["late"]
                    )

                for date_str in sorted(attendance_by_date.keys()):
                    attendance_stats.append(
                        {
                            "date": date_str,
                            "present": attendance_by_date[date_str]["present"],
                            "absent": attendance_by_date[date_str]["absent"],
                            "late": attendance_by_date[date_str]["late"],
                        }
                    )

        grade_stats = []
        if class_id:
            selected_class = Class.objects.filter(id=class_id).first()
            if selected_class and (
                user.role == User.Role.ADMIN or selected_class.subject == user.subject
            ):
                import calendar
                first_day = date(target_month.year, target_month.month, 1)
                last_day = date(
                    target_month.year,
                    target_month.month,
                    calendar.monthrange(target_month.year, target_month.month)[1],
                )

                recent_exams = Exam.objects.filter(
                    attendance__class_info_id=class_id,
                    attendance__date__gte=first_day,
                    attendance__date__lte=last_day,
                ).order_by("-attendance__date", "-id")

                if recent_exams.exists():
                    exam_stats = {}
                    for exam in recent_exams:
                        exam_name = exam.name
                        if exam_name not in exam_stats:
                            exam_stats[exam_name] = []
                        exam_stats[exam_name].append(exam.score)

                    for exam_name, scores in exam_stats.items():
                        grade_stats.append(
                            {
                                "exam_name": exam_name,
                                "average": sum(scores) // len(scores) if scores else 0,
                                "highest": max(scores) if scores else 0,
                                "lowest": min(scores) if scores else 0,
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


class KakaoNotificationView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        user = request.user
        notification_type = request.data.get("type")

        if notification_type == "single":
            return self._send_single_notification(request, user)
        elif notification_type == "bulk":
            return self._send_bulk_notification(request, user)
        else:
            return Response(
                {"detail": "잘못된 전송 타입입니다."},
                status=status.HTTP_400_BAD_REQUEST,
            )

    def _send_single_notification(self, request, user):
        student_id = request.data.get("student_id")
        attendance_id = request.data.get("attendance_id")

        if not student_id or not attendance_id:
            return Response(
                {"detail": "학생 ID와 출석 기록 ID가 필요합니다."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            student = Student.objects.get(id=student_id)
            attendance = Attendance.objects.get(id=attendance_id, student=student)

            if user.role in [User.Role.TEACHER, User.Role.ASSISTANT]:
                if not attendance.class_info or attendance.class_info.subject != user.subject:
                    return Response(
                        {"detail": "해당 학생의 알림톡을 전송할 권한이 없습니다."},
                        status=status.HTTP_403_FORBIDDEN,
                    )

            related_exams = Exam.objects.filter(attendance=attendance)

            exam_averages = (
                Exam.objects.filter(
                    attendance__class_info=attendance.class_info,
                    name__in=related_exams.values_list("name", flat=True),
                )
                .values("name")
                .annotate(
                    average_score=Avg("score"),
                    max_score=Max("score"),
                    min_score=Min("score"),
                    count=Count("id"),
                )
            )

            notification_data = {
                "student_name": student.name,
                "parent_phone": student.parent_phone,
                "attendance_date": attendance.date.strftime("%Y-%m-%d"),
                "class_type": attendance.get_class_type_display(),
                "content": attendance.content,
                "is_late": attendance.is_late,
                "homework_completion": attendance.homework_completion,
                "homework_accuracy": attendance.homework_accuracy,
                "related_exams": [],
                "sender_role": user.get_role_display(),
                "sender_name": user.name,
            }

            for exam in related_exams:
                exam_average = next(
                    (avg for avg in exam_averages if avg["name"] == exam.name), None
                )
                notification_data["related_exams"].append(
                    {
                        "name": exam.name,
                        "score": exam.score,
                        "max_score": exam.max_score,
                        "exam_date": exam.attendance.date.strftime("%Y-%m-%d"),
                        "average_score": exam_average["average_score"] if exam_average else 0,
                        "class_average": exam_average["average_score"] if exam_average else 0,
                        "class_max_score": exam_average["max_score"] if exam_average else 0,
                        "class_min_score": exam_average["min_score"] if exam_average else 0,
                        "class_count": exam_average["count"] if exam_average else 0,
                    }
                )

            success = self._send_bizM_notification(notification_data)

            if success:
                return Response(
                    {"message": f"{student.name} 학생의 알림톡이 성공적으로 전송되었습니다.", "notification_data": notification_data},
                    status=status.HTTP_200_OK,
                )
            else:
                return Response({"detail": "알림톡 전송에 실패했습니다."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        except Student.DoesNotExist:
            return Response({"detail": "존재하지 않는 학생입니다."}, status=status.HTTP_404_NOT_FOUND)
        except Attendance.DoesNotExist:
            return Response({"detail": "존재하지 않는 출석 기록입니다."}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({"detail": f"알림톡 전송 중 오류가 발생했습니다: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def _send_bulk_notification(self, request, user):
        student_ids = request.data.get("student_ids", [])
        target_date = request.data.get("target_date")

        if not student_ids or not target_date:
            return Response({"detail": "학생 ID 목록과 대상 날짜가 필요합니다."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            students = Student.objects.filter(id__in=student_ids)
            if user.role in [User.Role.TEACHER, User.Role.ASSISTANT]:
                students = students.filter(classes__subject=user.subject).distinct()

            if not students.exists():
                return Response({"detail": "전송할 학생이 없습니다."}, status=status.HTTP_400_BAD_REQUEST)

            bulk_notifications = []
            for student in students:
                attendance = Attendance.objects.filter(student=student, date=target_date).first()
                if attendance:
                    related_exams = Exam.objects.filter(attendance=attendance)
                    exam_averages = (
                        Exam.objects.filter(
                            attendance__class_info=attendance.class_info,
                            name__in=related_exams.values_list("name", flat=True),
                        )
                        .values("name")
                        .annotate(average_score=Avg("score"), max_score=Max("score"), min_score=Min("score"), count=Count("id"))
                    )
                    notification_data = {
                        "student_name": student.name,
                        "parent_phone": student.parent_phone,
                        "attendance_date": attendance.date.strftime("%Y-%m-%d"),
                        "class_type": attendance.get_class_type_display(),
                        "content": attendance.content,
                        "is_late": attendance.is_late,
                        "homework_completion": attendance.homework_completion,
                        "homework_accuracy": attendance.homework_accuracy,
                        "related_exams": [],
                        "sender_role": user.get_role_display(),
                        "sender_name": user.name,
                    }
                    for exam in related_exams:
                        exam_average = next((avg for avg in exam_averages if avg["name"] == exam.name), None)
                        notification_data["related_exams"].append({
                            "name": exam.name,
                            "score": exam.score,
                            "max_score": exam.max_score,
                            "exam_date": exam.attendance.date.strftime("%Y-%m-%d"),
                            "average_score": exam_average["average_score"] if exam_average else 0,
                            "class_average": exam_average["average_score"] if exam_average else 0,
                            "class_max_score": exam_average["max_score"] if exam_average else 0,
                            "class_min_score": exam_average["min_score"] if exam_average else 0,
                            "class_count": exam_average["count"] if exam_average else 0,
                        })
                    bulk_notifications.append(notification_data)

            if not bulk_notifications:
                return Response({"detail": "전송할 출석 기록이 없습니다."}, status=status.HTTP_400_BAD_REQUEST)

            success_count = self._send_bizM_bulk_notification(bulk_notifications)
            return Response(
                {"message": f"{success_count}명의 학생에게 알림톡이 성공적으로 전송되었습니다.", "total_count": len(bulk_notifications), "success_count": success_count},
                status=status.HTTP_200_OK,
            )
        except Exception as e:
            return Response({"detail": f"일괄 알림톡 전송 중 오류가 발생했습니다: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def _send_bizM_notification(self, notification_data):
        # Placeholder for actual API call
        print(f"BizM 알림톡 전송: {notification_data['student_name']} -> {notification_data['parent_phone']}")
        return True

    def _send_bizM_bulk_notification(self, bulk_notifications):
        # Placeholder for actual API call
        print(f"BizM 일괄 알림톡 전송: {len(bulk_notifications)}건")
        return len(bulk_notifications)

    def _format_exam_info(self, related_exams):
        if not related_exams:
            return "관련 시험 기록이 없습니다."
        exam_info = []
        for exam in related_exams:
            exam_info.append(f"{exam['name']}: {exam['score']}/{exam['max_score']}점 (반평균: {int(exam.get('class_average') or 0)}/{exam['max_score']}점)")
        return "\n".join(exam_info)
