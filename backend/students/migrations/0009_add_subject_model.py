from django.db import migrations, models
import django.db.models.deletion

def ultimate_fix_database(apps, schema_editor):
    """
    모든 충돌 가능성을 체크하고 DB 구조를 마이그레이션 가능 상태로 강제 조정합니다.
    """
    cursor = schema_editor.connection.cursor()
    
    # 1. 외래 키 체크 비활성화 (강제 삭제 및 수정을 위함)
    cursor.execute("SET FOREIGN_KEY_CHECKS = 0;")

    # 2. 실패한 시도로 생성된 관계 테이블들 삭제
    cursor.execute("DROP TABLE IF EXISTS students_user_subjects;")
    cursor.execute("DROP TABLE IF EXISTS students_subject_users;")

    # 3. Subject 테이블 초기화 (Collation 문제 해결을 위해 삭제 후 재생성)
    cursor.execute("DROP TABLE IF EXISTS students_subject;")
    cursor.execute("""
        CREATE TABLE students_subject (
            id bigint AUTO_INCREMENT PRIMARY KEY,
            name varchar(50) UNIQUE NOT NULL
        ) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;
    """)

    # 4. User 테이블 상태 정리
    cursor.execute("SHOW COLUMNS FROM students_user;")
    user_columns = [col[0] for col in cursor.fetchall()]
    
    # subject가 있고 old_subject가 없으면 이름 변경
    if 'subject' in user_columns and 'old_subject' not in user_columns:
        cursor.execute("ALTER TABLE students_user CHANGE subject old_subject varchar(20) NULL;")
    # 만약 둘 다 없는데 장고가 필드를 요구할 경우를 대비해 old_subject 생성
    elif 'old_subject' not in user_columns:
        cursor.execute("ALTER TABLE students_user ADD COLUMN old_subject varchar(20) NULL;")

    # 5. Class 테이블 상태 정리
    cursor.execute("SHOW COLUMNS FROM students_class;")
    class_columns = [col[0] for col in cursor.fetchall()]
    
    # 중복 에러의 원인인 subject_id 컬럼이 이미 있으면 삭제 (장고가 다시 만들게 함)
    if 'subject_id' in class_columns:
        cursor.execute("ALTER TABLE students_class DROP COLUMN subject_id;")
    
    # subject가 있고 old_subject가 없으면 이름 변경
    if 'subject' in class_columns and 'old_subject' not in class_columns:
        cursor.execute("ALTER TABLE students_class CHANGE subject old_subject varchar(20) NULL;")
    elif 'old_subject' not in class_columns:
        cursor.execute("ALTER TABLE students_class ADD COLUMN old_subject varchar(20) NULL;")

    # 6. 외래 키 체크 재활성화
    cursor.execute("SET FOREIGN_KEY_CHECKS = 1;")

def migrate_data(apps, schema_editor):
    """정리된 DB에 데이터를 안전하게 이관합니다."""
    Subject = apps.get_model('students', 'Subject')
    User = apps.get_model('students', 'User')
    Class = apps.get_model('students', 'Class')

    subjects_map = {
        'CHEMISTRY': '화학',
        'BIOLOGY': '생명과학',
        'GEOSCIENCE': '지구과학'
    }
    obj_map = {}
    for key, name in subjects_map.items():
        obj, _ = Subject.objects.get_or_create(name=name)
        obj_map[key] = obj

    for user in User.objects.all():
        if hasattr(user, 'old_subject') and user.old_subject in obj_map:
            user.subjects.add(obj_map[user.old_subject])

    for class_obj in Class.objects.all():
        if hasattr(class_obj, 'old_subject') and class_obj.old_subject in obj_map:
            class_obj.subject = obj_map[class_obj.old_subject]
            class_obj.save()

class Migration(migrations.Migration):

    dependencies = [
        ("students", "0008_alter_class_day_of_week_alter_class_start_time_and_more"),
    ]

    operations = [
        # DB 상태를 강제로 정상화 (모든 중복/누락 컬럼 문제 해결)
        migrations.RunPython(ultimate_fix_database),
        
        # 장고의 상태와 실제 DB를 동기화
        migrations.SeparateDatabaseAndState(
            state_operations=[
                migrations.CreateModel(
                    name="Subject",
                    fields=[
                        ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                        ("name", models.CharField(max_length=50, unique=True, verbose_name="과목명")),
                    ],
                    options={"verbose_name": "과목", "verbose_name_plural": "과목"},
                ),
                migrations.AddField(
                    model_name="user",
                    name="old_subject",
                    field=models.CharField(max_length=20, null=True, blank=True),
                ),
                migrations.AddField(
                    model_name="class",
                    name="old_subject",
                    field=models.CharField(max_length=20, null=True, blank=True),
                ),
                migrations.AddField(
                    model_name="user",
                    name="subjects",
                    field=models.ManyToManyField(blank=True, related_name="users", to="students.subject", verbose_name="권한 과목"),
                ),
                migrations.AddField(
                    model_name="class",
                    name="subject",
                    field=models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.PROTECT,
                        to="students.subject",
                        verbose_name="과목",
                    ),
                ),
            ],
            database_operations=[], # 위 ultimate_fix_database에서 이미 처리함
        ),
        
        # 데이터 이관
        migrations.RunPython(migrate_data),
    ]
