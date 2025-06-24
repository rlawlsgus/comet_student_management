from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from students.models import Class, Student, Attendance, Exam
from datetime import date, timedelta
import random

User = get_user_model()


class Command(BaseCommand):
    help = "테스트 데이터를 생성합니다."

    def handle(self, *args, **options):
        self.stdout.write("테스트 데이터를 생성하는 중...")

        # 관리자 계정 생성
        admin_user, created = User.objects.get_or_create(
            username="admin",
            defaults={
                "name": "관리자",
                "role": User.Role.ADMIN,
                "subject": User.Subject.CHEMISTRY,
                "is_staff": True,
                "is_superuser": True,
            },
        )
        if created:
            admin_user.set_password("admin123")
            admin_user.save()
            self.stdout.write(
                self.style.SUCCESS(f"관리자 계정 생성: {admin_user.username}")
            )

        # 사용자 생성
        teacher, created = User.objects.get_or_create(
            username="teacher1",
            defaults={
                "name": "김선생",
                "role": "TEACHER",
                "subject": "CHEMISTRY",
                "is_staff": True,
            },
        )
        if created:
            teacher.set_password("password123")
            teacher.save()
            self.stdout.write(f"선생님 계정 생성: {teacher.username}")

        assistant, created = User.objects.get_or_create(
            username="assistant1",
            defaults={
                "name": "이조교",
                "role": "ASSISTANT",
                "subject": "BIOLOGY",
            },
        )
        if created:
            assistant.set_password("password123")
            assistant.save()
            self.stdout.write(f"조교 계정 생성: {assistant.username}")

        # 반 생성
        class1, created = Class.objects.get_or_create(
            name="화학 기초반",
            defaults={
                "subject": "CHEMISTRY",
                "start_time": "14:00",
                "day_of_week": "MONDAY",
            },
        )
        if created:
            self.stdout.write(f"반 생성: {class1.name}")

        class2, created = Class.objects.get_or_create(
            name="생명 심화반",
            defaults={
                "subject": "BIOLOGY",
                "start_time": "16:00",
                "day_of_week": "WEDNESDAY",
            },
        )
        if created:
            self.stdout.write(f"반 생성: {class2.name}")

        # 학생 생성
        students_data = [
            {"name": "홍길동", "class": class1, "parent_phone": "010-1234-5678"},
            {"name": "김철수", "class": class1, "parent_phone": "010-2345-6789"},
            {"name": "이영희", "class": class1, "parent_phone": "010-3456-7890"},
            {"name": "박민수", "class": class2, "parent_phone": "010-4567-8901"},
            {"name": "정수진", "class": class2, "parent_phone": "010-5678-9012"},
        ]

        students = []
        for student_data in students_data:
            student, created = Student.objects.get_or_create(
                name=student_data["name"],
                class_info=student_data["class"],
                defaults={
                    "parent_phone": student_data["parent_phone"],
                },
            )
            if created:
                self.stdout.write(f"학생 생성: {student.name}")
            students.append(student)

        # 출석 기록 생성
        start_date = date.today() - timedelta(days=30)
        class_types = ["REGULAR", "MAKEUP", "EXTRA", "ADDITIONAL"]

        for i in range(15):  # 15주간의 데이터 생성 (약 3개월)
            current_date = start_date + timedelta(days=i * 2)  # 2일마다 수업

            for student in students:
                attendance, created = Attendance.objects.get_or_create(
                    student=student,
                    date=current_date,
                    defaults={
                        "class_type": random.choice(class_types),
                        "content": f"{student.class_info.get_subject_display()} 수업 - {i+1}주차",
                        "is_late": random.choice([True, False]),
                        "homework_completion": random.randint(70, 100),
                        "homework_accuracy": random.randint(70, 100),
                    },
                )
                if created:
                    # 시험 기록 생성 (더 자주 시험)
                    if i % 2 == 0:  # 2주마다 시험
                        exam, created = Exam.objects.get_or_create(
                            attendance=attendance,
                            name=f"{student.class_info.get_subject_display()} {i//2 + 1}차 시험",
                            defaults={
                                "score": random.randint(60, 100),
                            },
                        )
                        if created:
                            self.stdout.write(
                                f"시험 기록 생성: {student.name} - {exam.name}"
                            )

        self.stdout.write(self.style.SUCCESS("테스트 데이터 생성 완료!"))
        self.stdout.write("로그인 정보:")
        self.stdout.write("  선생님: teacher1 / password123")
        self.stdout.write("  조교: assistant1 / password123")
