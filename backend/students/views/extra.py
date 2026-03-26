from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from django.db.models import Avg, Max, Min, Count
from django.conf import settings
from datetime import date
import requests
import calendar

from ..models import User, Class, Student, Attendance, Exam, Subject


from rest_framework import permissions, status, viewsets
from ..serializers import SubjectSerializer


class SubjectViewSet(viewsets.ModelViewSet):
    queryset = Subject.objects.all()
    serializer_class = SubjectSerializer
    permission_classes = [permissions.IsAuthenticated]

    def create(self, request, *args, **kwargs):
        if request.user.role != User.Role.ADMIN and not request.user.is_superuser:
            return Response(
                {"detail": "관리자만 과목을 생성할 수 있습니다."},
                status=status.HTTP_403_FORBIDDEN,
            )
        return super().create(request, *args, **kwargs)

    def update(self, request, *args, **kwargs):
        if request.user.role != User.Role.ADMIN and not request.user.is_superuser:
            return Response(
                {"detail": "관리자만 과목을 수정할 수 있습니다."},
                status=status.HTTP_403_FORBIDDEN,
            )
        return super().update(request, *args, **kwargs)

    def partial_update(self, request, *args, **kwargs):
        if request.user.role != User.Role.ADMIN and not request.user.is_superuser:
            return Response(
                {"detail": "관리자만 과목을 수정할 수 있습니다."},
                status=status.HTTP_403_FORBIDDEN,
            )
        return super().partial_update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        if request.user.role != User.Role.ADMIN and not request.user.is_superuser:
            return Response(
                {"detail": "관리자만 과목을 삭제할 수 있습니다."},
                status=status.HTTP_403_FORBIDDEN,
            )

        instance = self.get_object()
        if instance.class_set.exists():
            return Response(
                {
                    "detail": "해당 과목으로 등록된 반이 존재하여 삭제할 수 없습니다. 반을 먼저 삭제하거나 변경해주세요."
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        return super().destroy(request, *args, **kwargs)


class DashboardView(APIView):
    """
    학원 대시보드 통계 뷰
    """

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        class_id = request.query_params.get("class_id")
        month_param = request.query_params.get("month")

        target_month = self._parse_target_month(month_param)
        classes = self._get_accessible_classes(user)

        response_data = {
            "class_stats": self._get_class_list_stats(classes),
            "attendance_stats": [],
            "grade_stats": [],
        }

        if class_id:
            selected_class = classes.filter(id=class_id).first()
            if selected_class:
                first_day, last_day = self._get_month_range(target_month)
                response_data["attendance_stats"] = self._get_attendance_stats(
                    selected_class, first_day, last_day
                )
                response_data["grade_stats"] = self._get_grade_stats(
                    selected_class, first_day, last_day
                )

        return Response(response_data)

    def _parse_target_month(self, month_param):
        if month_param:
            try:
                year, month = map(int, month_param.split("-"))
                return date(year, month, 1)
            except (ValueError, TypeError):
                pass
        return date.today().replace(day=1)

    def _get_accessible_classes(self, user):
        classes = Class.objects.all()
        if user.role in [User.Role.TEACHER, User.Role.ASSISTANT]:
            from django.db.models import Q

            return classes.filter(Q(subject__in=user.subjects.all()) | Q(name="퇴원"))
        return classes

    def _get_class_list_stats(self, classes):
        return [
            {
                "id": c.id,
                "name": c.name,
                "subject": c.subject.name if c.subject else "과목없음",
                "student_count": c.students.count(),
            }
            for c in classes
        ]

    def _get_month_range(self, target_month):
        first_day = target_month.replace(day=1)
        last_day = target_month.replace(
            day=calendar.monthrange(target_month.year, target_month.month)[1]
        )
        return first_day, last_day

    def _get_attendance_stats(self, selected_class, first_day, last_day):
        attendances = Attendance.objects.filter(
            class_info=selected_class, date__range=(first_day, last_day)
        ).order_by("date")

        total_students = selected_class.students.count()
        stats_by_date = {}

        for att in attendances:
            d_str = att.date.strftime("%Y-%m-%d")
            if d_str not in stats_by_date:
                stats_by_date[d_str] = {"present": 0, "late": 0, "absent": 0}

            if att.is_late:
                stats_by_date[d_str]["late"] += 1
            else:
                stats_by_date[d_str]["present"] += 1

        result = []
        for d_str, counts in sorted(stats_by_date.items()):
            counts["absent"] = total_students - (counts["present"] + counts["late"])
            result.append({"date": d_str, **counts})
        return result

    def _get_grade_stats(self, selected_class, first_day, last_day):
        recent_exams = Exam.objects.filter(
            attendance__class_info=selected_class,
            attendance__date__range=(first_day, last_day),
        ).exclude(score__isnull=True)

        exam_groups = {}
        for exam in recent_exams:
            if exam.name not in exam_groups:
                exam_groups[exam.name] = []
            exam_groups[exam.name].append(exam.score)

        return [
            {
                "exam_name": name,
                "average": sum(scores) // len(scores) if scores else 0,
                "highest": max(scores) if scores else 0,
                "lowest": min(scores) if scores else 0,
                "count": len(scores),
            }
            for name, scores in exam_groups.items()
        ]


class AlimtalkService:
    """
    비즈엠 알림톡 발송 서비스 엔진
    """

    def __init__(self):
        self.api_url = settings.BIZM_API_URL
        self.user_id = settings.BIZM_USER_ID
        self.profile_key = settings.BIZM_PROFILE_KEY
        self.template_id = settings.BIZM_TEMPLATE_ID
        self.headers = {"Content-type": "application/json", "userid": self.user_id}

    def send(self, notification_data, retry=True):
        payload = self._build_payload(notification_data)
        if not payload:
            return False

        try:
            res = requests.post(self.api_url, headers=self.headers, json=[payload])
            res.raise_for_status()

            result = res.json()
            if (
                result
                and isinstance(result, list)
                and result[0].get("code") == "success"
            ):
                return True

            if retry:
                return self.send(notification_data, retry=False)
        except:
            if retry:
                return self.send(notification_data, retry=False)
        return False

    def send_bulk(self, bulk_data):
        valid_items = []
        for idx, item in enumerate(bulk_data):
            p = self._build_payload(item)
            if p:
                valid_items.append({"idx": idx, "payload": p, "data": item})

        success_count = 0
        failed_items = []
        temp_failed_indices = []

        # 1차 전송 (100건 단위)
        for i in range(0, len(valid_items), 100):
            chunk = valid_items[i : i + 100]
            success_count += self._post_chunk(chunk, temp_failed_indices)

        # 실패 건 재시도
        if temp_failed_indices:
            retry_items = [
                {
                    "idx": idx,
                    "payload": self._build_payload(bulk_data[idx]),
                    "data": bulk_data[idx],
                }
                for idx in temp_failed_indices
            ]

            final_failed_indices = []
            for i in range(0, len(retry_items), 100):
                success_count += self._post_chunk(
                    retry_items[i : i + 100], final_failed_indices
                )

            # 최종 실패 항목 정리
            for idx in final_failed_indices:
                failed_items.append(bulk_data[idx])

        return success_count, failed_items

    def _post_chunk(self, chunk, failed_log):
        payload_chunk = [c["payload"] for c in chunk]

        try:
            res = requests.post(self.api_url, headers=self.headers, json=payload_chunk)
            res.raise_for_status()

            chunk_success = 0
            for r, c in zip(res.json(), chunk):
                if r.get("code") == "success":
                    chunk_success += 1
                else:
                    failed_log.append(c["idx"])
            return chunk_success
        except:
            failed_log.extend([c["idx"] for c in chunk])
            return 0

    def _build_payload(self, data):
        phone = self._format_phone(data["student"]["parent_phone"])
        if not phone:
            return None

        msg = self._generate_msg(data)
        return {
            "message_type": "AT",
            "phn": phone,
            "profile": self.profile_key,
            "tmplId": self.template_id,
            "msg": msg,
            "smsKind": "N",
        }

    def _format_phone(self, phone):
        if not phone:
            return ""
        cleaned = phone.replace("-", "").replace(" ", "")
        return "82" + cleaned[1:] if cleaned.startswith("010") else cleaned

    def _generate_msg(self, data):
        st_name = data["student"]["name"]
        att = data["attendance"]

        # 과목명 - 수업종류 (예: 화학 - 정규)
        subject_name = att.get("subject_display", "미지정")
        class_type_info = f"{subject_name} - {att['class_type_display']}"

        exam_lines = []
        for e in data["exams"]:
            if e["score"] is not None:
                avg = round(e["class_average"], 1) if e.get("class_average") else "-"
                high = e["class_max_score"] if e.get("class_max_score") else "-"
                exam_lines.append(
                    f"- {e['name']}: {e['score']}점 / {e['max_score']}점\n  (반 평균: {avg}점 / 최고: {high}점)"
                )
            elif e["grade"]:
                exam_lines.append(f"- {e['name']}: {e['grade']} 등급")
            else:
                exam_lines.append(f"- {e['name']}: 평가 완료")

        exam_details = (
            "\n".join(exam_lines) if exam_lines else "진행된 테스트가 없습니다."
        )

        return f"""{st_name} 학생 수업 결과 보고서

■ 수업 일시: {att['date']}
■ 수업 종류: {class_type_info}
■ 출석 상태: {'지각' if att['is_late'] else '출석'}
■ 숙제 이행도: {att['homework_completion']}%
■ 숙제 정확도: {att['homework_accuracy']}%

■ 수업 내용:
{att['content'] or '내용 없음'}

■ 테스트 상세 결과:
{exam_details}"""


class KakaoNotificationView(APIView):
    """
    카카오 알림톡 발송 뷰 (단건/일괄)
    """

    permission_classes = [permissions.IsAuthenticated]

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.alimtalk = AlimtalkService()

    def post(self, request):
        mode = request.data.get("type")
        try:
            if mode == "single":
                return self._handle_single(request)
            if mode == "bulk":
                return self._handle_bulk(request)
            return Response({"detail": "유효하지 않은 유형입니다."}, status=400)
        except Exception as e:
            return Response({"detail": str(e)}, status=500)

    def _handle_single(self, request):
        s_id, a_id = request.data.get("student_id"), request.data.get("attendance_id")
        if not s_id or not a_id:
            return Response({"detail": "필수 ID가 누락되었습니다."}, status=400)

        try:
            student = Student.objects.get(id=s_id)
            attendance = Attendance.objects.get(id=a_id, student=student)
        except (Student.DoesNotExist, Attendance.DoesNotExist):
            return Response({"detail": "데이터를 찾을 수 없습니다."}, status=404)

        # 권한 체크
        if request.user.role in [User.Role.TEACHER, User.Role.ASSISTANT]:
            if attendance.class_info:
                if not request.user.subjects.filter(
                    id=attendance.class_info.subject_id
                ).exists():
                    return Response({"detail": "권한이 없습니다."}, status=403)
            elif attendance.class_info and attendance.class_info.name != "퇴원":
                return Response({"detail": "권한이 없습니다."}, status=403)

        data = self._prepare_notification_data(student, attendance)
        if self.alimtalk.send(data):
            return Response({"message": f"{student.name} 학생 전송 성공", "data": data})
        return Response({"detail": "발송 실패"}, status=500)

    def _handle_bulk(self, request):
        student_ids = request.data.get("student_ids", [])
        target_date = request.data.get("target_date")
        if not student_ids or not target_date:
            return Response({"detail": "데이터가 누락되었습니다."}, status=400)

        students = Student.objects.filter(id__in=student_ids)
        if request.user.role in [User.Role.TEACHER, User.Role.ASSISTANT]:
            from django.db.models import Q

            students = students.filter(
                Q(classes__subject__in=request.user.subjects.all())
                | Q(classes__name="퇴원")
            ).distinct()

        bulk_data = []
        for st in students:
            # 해당 날짜의 출석 기록 찾기
            att = Attendance.objects.filter(student=st, date=target_date).first()
            # 만약 여러 반에 속해있다면, 선생님이 권한을 가진 반의 기록만 가져오도록 필터링 추가 필요할 수 있음
            if att and request.user.role in [User.Role.TEACHER, User.Role.ASSISTANT]:
                if (
                    att.class_info
                    and not request.user.subjects.filter(
                        id=att.class_info.subject_id
                    ).exists()
                    and att.class_info.name != "퇴원"
                ):
                    continue

            if att:
                bulk_data.append(self._prepare_notification_data(st, att))

        if not bulk_data:
            return Response({"detail": "전송할 출석 기록이 없습니다."}, status=400)

        if request.data.get("preview"):
            return Response(bulk_data)

        success_count, failed_items = self.alimtalk.send_bulk(bulk_data)
        return Response(
            {
                "message": f"{success_count}명 전송 성공",
                "total": len(bulk_data),
                "success": success_count,
                "failed_items": failed_items,
            }
        )

    def _prepare_notification_data(self, student, attendance):
        related_exams = Exam.objects.filter(attendance=attendance)

        # 반 평균 및 최고점 계산
        stats = []
        if attendance.class_info:
            stats = (
                Exam.objects.filter(
                    attendance__class_info=attendance.class_info,
                    name__in=related_exams.values_list("name", flat=True),
                )
                .values("name")
                .annotate(avg=Avg("score"), high=Max("score"))
            )

        exams = []
        for e in related_exams:
            s = next((x for x in stats if x["name"] == e.name), {})
            exams.append(
                {
                    "name": e.name,
                    "score": e.score,
                    "max_score": e.max_score,
                    "grade": e.grade,
                    "class_average": s.get("avg", 0),
                    "class_max_score": s.get("high", 0),
                }
            )

        return {
            "student": {
                "id": student.id,
                "name": student.name,
                "parent_phone": student.parent_phone,
            },
            "attendance": {
                "id": attendance.id,
                "date": attendance.date.strftime("%Y-%m-%d"),
                "class_type_display": attendance.get_class_type_display(),
                "subject_display": (
                    attendance.class_info.subject.name
                    if attendance.class_info and attendance.class_info.subject
                    else "미지정"
                ),
                "content": attendance.content,
                "is_late": attendance.is_late,
                "homework_completion": attendance.homework_completion,
                "homework_accuracy": attendance.homework_accuracy,
            },
            "exams": exams,
        }
