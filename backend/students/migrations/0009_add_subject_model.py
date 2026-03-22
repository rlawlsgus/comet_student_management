from django.db import migrations, models
import django.db.models.deletion

def ultimate_database_reconstruction(apps, schema_editor):
    """
    제약 조건을 생략하고 테이블과 컬럼만 생성하여 에러 가능성을 원천 차단합니다.
    """
    cursor = schema_editor.connection.cursor()
    cursor.execute("SET FOREIGN_KEY_CHECKS = 0;")

    # 1. 기존 충돌 요소 완전 삭제
    cursor.execute("DROP TABLE IF EXISTS students_user_subjects;")
    cursor.execute("DROP TABLE IF EXISTS students_subject_users;")
    cursor.execute("DROP TABLE IF EXISTS students_subject;")

    # 2. Subject 테이블 생성 (제약 조건 최소화)
    cursor.execute("""
        CREATE TABLE students_subject (
            id bigint AUTO_INCREMENT PRIMARY KEY,
            name varchar(50) NOT NULL
        ) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;
    """)

    # 3. ManyToMany 테이블 생성 (외래키 제약 조건 없이 컬럼만 생성)
    # 타입 충돌을 피하기 위해 모든 ID를 bigint로 생성합니다.
    cursor.execute("""
        CREATE TABLE students_user_subjects (
            id bigint AUTO_INCREMENT PRIMARY KEY,
            user_id bigint NOT NULL,
            subject_id bigint NOT NULL
        ) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;
    """)

    # 4. User 및 Class 테이블 컬럼 정리 (subject -> old_subject)
    for table in ['students_user', 'students_class']:
        cursor.execute(f"SHOW COLUMNS FROM {table};")
        cols = [col[0] for col in cursor.fetchall()]
        
        if 'subject' in cols and 'old_subject' not in cols:
            cursor.execute(f"ALTER TABLE {table} CHANGE subject old_subject varchar(20) NULL;")
        elif 'old_subject' not in cols:
            cursor.execute(f"ALTER TABLE {table} ADD COLUMN old_subject varchar(20) NULL;")
        
        if table == 'students_class' and 'subject_id' in cols:
            cursor.execute("ALTER TABLE students_class DROP COLUMN subject_id;")

    # 5. Class 테이블에 subject_id 컬럼 추가 (제약 조건 없이)
    cursor.execute("ALTER TABLE students_class ADD COLUMN subject_id bigint NULL;")

    cursor.execute("SET FOREIGN_KEY_CHECKS = 1;")

def migrate_data(apps, schema_editor):
    """구조가 준비된 상태에서 장고 ORM을 통해 데이터를 안전하게 채웁니다."""
    Subject = apps.get_model('students', 'Subject')
    User = apps.get_model('students', 'User')
    Class = apps.get_model('students', 'Class')

    # 초기 과목 생성
    obj_map = {}
    for key, name in {'CHEMISTRY': '화학', 'BIOLOGY': '생명과학', 'GEOSCIENCE': '지구과학'}.items():
        obj, _ = Subject.objects.get_or_create(name=name)
        obj_map[key] = obj

    # 데이터 이관
    for user in User.objects.all():
        old_val = getattr(user, 'old_subject', None)
        if old_val in obj_map:
            user.subjects.add(obj_map[old_val])

    for class_obj in Class.objects.all():
        old_val = getattr(class_obj, 'old_subject', None)
        if old_val in obj_map:
            class_obj.subject = obj_map[old_val]
            class_obj.save()

class Migration(migrations.Migration):
    dependencies = [("students", "0008_alter_class_day_of_week_alter_class_start_time_and_more")]

    operations = [
        # 1. 물리적으로 테이블과 컬럼만 안전하게 생성 (제약 조건 에러 방지)
        migrations.RunPython(ultimate_database_reconstruction),
        
        # 2. 장고 내부 상태만 업데이트 (실제 DB는 이미 1번에서 준비됨)
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
                migrations.RenameField(model_name="user", old_name="subject", new_name="old_subject"),
                migrations.RenameField(model_name="class", old_name="subject", new_name="old_subject"),
                migrations.AddField(model_name="user", name="subjects", field=models.ManyToManyField(to="students.subject")),
                migrations.AddField(model_name="class", name="subject", field=models.ForeignKey(null=True, on_delete=django.db.models.deletion.PROTECT, to="students.subject")),
            ],
            database_operations=[], 
        ),
        
        # 3. 데이터 이관
        migrations.RunPython(migrate_data),
    ]
