from django.db import migrations, models
import django.db.models.deletion

def ultimate_database_reconstruction(apps, schema_editor):
    """
    장고의 기능을 쓰지 않고 직접 SQL을 실행하여 DB를 물리적으로 완벽하게 재구축합니다.
    """
    cursor = schema_editor.connection.cursor()
    cursor.execute("SET FOREIGN_KEY_CHECKS = 0;")

    # 1. 찌꺼기 테이블 삭제
    cursor.execute("DROP TABLE IF EXISTS students_user_subjects;")
    cursor.execute("DROP TABLE IF EXISTS students_subject_users;")
    cursor.execute("DROP TABLE IF EXISTS students_subject;")

    # 2. Subject 테이블 물리적 생성 (한글 설정 포함)
    cursor.execute("""
        CREATE TABLE students_subject (
            id bigint AUTO_INCREMENT PRIMARY KEY,
            name varchar(50) UNIQUE NOT NULL
        ) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;
    """)

    # 3. ManyToMany 관계 테이블(students_user_subjects) 물리적 생성
    # 유저 ID 타입(int)과 과목 ID 타입(bigint)을 맞춰서 생성합니다.
    cursor.execute("""
        CREATE TABLE students_user_subjects (
            id bigint AUTO_INCREMENT PRIMARY KEY,
            user_id int NOT NULL,
            subject_id bigint NOT NULL,
            UNIQUE (user_id, subject_id),
            CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES students_user(id) ON DELETE CASCADE,
            CONSTRAINT fk_subject FOREIGN KEY (subject_id) REFERENCES students_subject(id) ON DELETE CASCADE
        ) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;
    """)

    # 4. User 및 Class 테이블의 컬럼 상태 강제 정리
    def fix_table_columns(table_name):
        cursor.execute(f"SHOW COLUMNS FROM {table_name};")
        cols = [col[0] for col in cursor.fetchall()]
        
        # subject 컬럼이 있으면 old_subject로 변경
        if 'subject' in cols and 'old_subject' not in cols:
            cursor.execute(f"ALTER TABLE {table_name} CHANGE subject old_subject varchar(20) NULL;")
        # 둘 다 없으면 생성 (데이터 이관 시 에러 방지)
        elif 'subject' not in cols and 'old_subject' not in cols:
            cursor.execute(f"ALTER TABLE {table_name} ADD COLUMN old_subject varchar(20) NULL;")
        
        # Class 테이블의 경우 subject_id 찌꺼기 제거
        if table_name == 'students_class' and 'subject_id' in cols:
            cursor.execute("ALTER TABLE students_class DROP COLUMN subject_id;")

    fix_table_columns('students_user')
    fix_table_columns('students_class')

    # 5. Class 테이블에 subject_id (ForeignKey) 컬럼 추가
    cursor.execute("ALTER TABLE students_class ADD COLUMN subject_id bigint NULL;")
    cursor.execute("ALTER TABLE students_class ADD CONSTRAINT fk_class_subject FOREIGN KEY (subject_id) REFERENCES students_subject(id) ON DELETE SET NULL;")

    cursor.execute("SET FOREIGN_KEY_CHECKS = 1;")

def migrate_data(apps, schema_editor):
    """물리적으로 완벽해진 DB에 데이터를 채웁니다."""
    Subject = apps.get_model('students', 'Subject')
    User = apps.get_model('students', 'User')
    Class = apps.get_model('students', 'Class')

    # 초기 데이터
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
        # 1단계: DB를 물리적으로 완벽하게 재구축
        migrations.RunPython(ultimate_database_reconstruction),
        
        # 2단계: 장고의 내부 상태(State)를 위 구축된 DB와 일치시킴
        # database_operations를 비움으로써 "이미 존재한다"는 에러를 원천 차단함
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
            database_operations=[], # 실제 DB 작업은 1단계 SQL에서 이미 완료됨
        ),
        
        # 3단계: 안전해진 상태에서 데이터 이관
        migrations.RunPython(migrate_data),
    ]
