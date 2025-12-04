import random
from datetime import date, time, timedelta
from django.core.management.base import BaseCommand
from django.db import transaction
from students.models import User, Class, Student, Attendance, Exam

class Command(BaseCommand):
    help = "Generates test data for the student management system."

    @transaction.atomic
    def handle(self, *args, **kwargs):
        self.stdout.write("Deleting old data...")
        self._clean_db()

        self.stdout.write("Creating new data...")
        
        # 1. Create Users
        users = self._create_users()

        # 2. Create Classes
        classes = self._create_classes()

        # 3. Create Students
        students = self._create_students()

        # 4. Enroll students in classes
        self._enroll_students(classes, students)

        # 5. Create Attendance and Exam records
        self._create_records(classes)

        self.stdout.write(self.style.SUCCESS("Successfully created test data."))

    def _clean_db(self):
        """Deletes all data from the relevant models."""
        Exam.objects.all().delete()
        Attendance.objects.all().delete()
        Student.objects.all().delete()
        Class.objects.all().delete()
        User.objects.filter(is_superuser=False).delete()

    def _create_users(self):
        """Creates Admin, Teacher, and Assistant users."""
        users = {}
        users['admin'] = User.objects.create_superuser(
            username="admin", password="password", email="admin@test.com", name="관리자"
        )
        users['teacher_chem'] = User.objects.create_user(
            username="teacher_chem", password="password", name="김화학", role=User.Role.TEACHER, subject=User.Subject.CHEMISTRY
        )
        users['teacher_bio'] = User.objects.create_user(
            username="teacher_bio", password="password", name="박생명", role=User.Role.TEACHER, subject=User.Subject.BIOLOGY
        )
        users['teacher_geo'] = User.objects.create_user(
            username="teacher_geo", password="password", name="이과학", role=User.Role.TEACHER, subject=User.Subject.GEOSCIENCE
        )
        self.stdout.write(f"  - Created {len(users)} users.")
        return users

    def _create_classes(self):
        """Creates classes for each subject."""
        classes_to_create = [
            {'name': '화학1 심화반', 'subject': User.Subject.CHEMISTRY, 'day_of_week': Class.DayOfWeek.MONDAY, 'start_time': time(18, 0)},
            {'name': '화학2 기본반', 'subject': User.Subject.CHEMISTRY, 'day_of_week': Class.DayOfWeek.WEDNESDAY, 'start_time': time(19, 30)},
            {'name': '생명1 심화반', 'subject': User.Subject.BIOLOGY, 'day_of_week': Class.DayOfWeek.TUESDAY, 'start_time': time(18, 0)},
            {'name': '생명2 기본반', 'subject': User.Subject.BIOLOGY, 'day_of_week': Class.DayOfWeek.FRIDAY, 'start_time': time(19, 0)},
            {'name': '지구과학1', 'subject': User.Subject.GEOSCIENCE, 'day_of_week': Class.DayOfWeek.SATURDAY, 'start_time': time(14, 0)},
        ]
        classes = [Class.objects.create(**data) for data in classes_to_create]
        self.stdout.write(f"  - Created {len(classes)} classes.")
        return classes

    def _create_students(self):
        """Creates a pool of students."""
        first_names = ["김", "이", "박", "최", "정", "강", "조", "윤", "장", "임"]
        last_names = ["민준", "서준", "도윤", "예준", "시우", "하준", "지호", "서연", "서윤", "지우"]
        
        students_to_create = []
        for i in range(30):
            name = f"{random.choice(first_names)}{random.choice(last_names)}"
            parent_phone = f"010-{random.randint(1000, 9999)}-{random.randint(1000, 9999)}"
            student_phone = f"010-{random.randint(1000, 9999)}-{random.randint(1000, 9999)}"
            students_to_create.append({'name': name, 'parent_phone': parent_phone, 'student_phone': student_phone})

        students = [Student.objects.create(**data) for data in students_to_create]
        self.stdout.write(f"  - Created {len(students)} students.")
        return students

    def _enroll_students(self, classes, students):
        """Randomly enrolls students in classes."""
        for class_obj in classes:
            num_students_to_enroll = random.randint(10, 15)
            enrolled_students = random.sample(students, num_students_to_enroll)
            class_obj.students.set(enrolled_students)
        self.stdout.write("  - Enrolled students in classes.")

    def _create_records(self, classes):
        """Creates attendance and exam records for the past 3 months."""
        today = date.today()
        
        for class_obj in classes:
            class_day_map = {
                "MONDAY": 0, "TUESDAY": 1, "WEDNESDAY": 2, "THURSDAY": 3, 
                "FRIDAY": 4, "SATURDAY": 5, "SUNDAY": 6
            }
            class_weekday = class_day_map[class_obj.day_of_week]

            for student in class_obj.students.all():
                for i in range(12): # For the last 12 weeks
                    # Go back week by week
                    current_date = today - timedelta(weeks=i)
                    # Adjust to the correct day of the week
                    days_ago = (current_date.weekday() - class_weekday + 7) % 7
                    attendance_date = current_date - timedelta(days=days_ago)
                    
                    if attendance_date > today:
                        continue

                    # Create Attendance
                    attendance = Attendance.objects.create(
                        student=student,
                        class_info=class_obj,
                        date=attendance_date,
                        class_type=random.choices(
                            [c[0] for c in Attendance.ClassType.choices], [0.8, 0.05, 0.1, 0.05]
                        )[0],
                        content=f"Week {12-i} recap",
                        is_late=random.random() < 0.1, # 10% chance of being late
                        homework_completion=random.choice([80, 90, 100, 100, 100]),
                        homework_accuracy=random.randint(70, 100),
                    )

                    # Create Exam for this attendance (50% chance)
                    if random.random() < 0.5:
                        category = random.choice([c[0] for c in Exam.Category.choices])
                        exam_data = {
                            "attendance": attendance,
                            "name": f"{12-i}주차 {Exam.Category(category).label} 테스트",
                            "category": category,
                        }

                        if category in [Exam.Category.REVIEW, Exam.Category.MOCK, Exam.Category.SCHOOL]:
                            max_score = 100 if category != Exam.Category.MOCK else 50
                            exam_data["max_score"] = max_score
                            exam_data["score"] = random.randint(int(max_score * 0.4), max_score)
                        else: # ESSAY or ORAL
                            exam_data["grade"] = random.choice([g[0] for g in Exam.Grade.choices])
                        
                        Exam.objects.create(**exam_data)
        
        self.stdout.write("  - Created attendance and exam records.")