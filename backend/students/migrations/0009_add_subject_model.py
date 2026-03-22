from django.db import migrations, models
import django.db.models.deletion

def ultimate_fix_database(apps, schema_editor):
    """실제 DB 구조를 강제로 정리합니다."""
    cursor = schema_editor.connection.cursor()
    cursor.execute("SET FOREIGN_KEY_CHECKS = 0;")

    # 1. 이전 실패 흔적 제거
    cursor.execute("DROP TABLE IF EXISTS students_user_subjects;")
    cursor.execute("DROP TABLE IF EXISTS students_subject_users;")
    cursor.execute("DROP TABLE IF EXISTS students_subject;")

    # 2. Class 테이블의 subject_id 제약 조건 및 컬럼 제거
    cursor.execute("""
        SELECT CONSTRAINT_NAME FROM information_schema.KEY_COLUMN_USAGE 
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'students_class' AND COLUMN_NAME = 'subject_id';
    """)
    for (const_name,) in cursor.fetchall():
        try: cursor.execute(f"ALTER TABLE students_class DROP FOREIGN KEY {const_name};")
        except: pass

    cursor.execute("SHOW COLUMNS FROM students_class;")
    class_columns = [col[0] for col in cursor.fetchall()]
    if 'subject_id' in class_columns:
        cursor.execute("ALTER TABLE students_class DROP COLUMN subject_id;")

    # 3. 컬럼 이름 변경 (subject -> old_subject)
    # User 테이블
    cursor.execute("SHOW COLUMNS FROM students_user;")
    user_columns = [col[0] for col in cursor.fetchall()]
    if 'subject' in user_columns and 'old_subject' not in user_columns:
        cursor.execute("ALTER TABLE students_user CHANGE subject old_subject varchar(20) NULL;")
    elif 'old_subject' not in user_columns and 'subject' not in user_columns:
        # 둘 다 없으면 빈 컬럼이라도 생성 (장고 상태 일치를 위함)
        cursor.execute("ALTER TABLE students_user ADD COLUMN old_subject varchar(20) NULL;")

    # Class 테이블
    if 'subject' in class_columns and 'old_subject' not in class_columns:
        cursor.execute("ALTER TABLE students_class CHANGE subject old_subject varchar(20) NULL;")
    elif 'old_subject' not in class_columns and 'subject' not in class_columns:
        cursor.execute("ALTER TABLE students_class ADD COLUMN old_subject varchar(20) NULL;")

    # 4. Subject 테이블 생성 (한글 지원)
    cursor.execute("""
        CREATE TABLE students_subject (
            id bigint AUTO_INCREMENT PRIMARY KEY,
            name varchar(50) UNIQUE NOT NULL
        ) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;
    """)
    cursor.execute("SET FOREIGN_KEY_CHECKS = 1;")

def migrate_data(apps, schema_editor):
    """구조가 정렬된 상태에서 데이터를 이관합니다."""
    Subject = apps.get_model('students', 'Subject')
    User = apps.get_model('students', 'User')
    Class = apps.get_model('students', 'Class')

    subjects_map = {'CHEMISTRY': '화학', 'BIOLOGY': '생명과학', 'GEOSCIENCE': '지구과학'}
    obj_map = {}
    for key, name in subjects_map.items():
        obj, _ = Subject.objects.get_or_create(name=name)
        obj_map[key] = obj

    # 데이터 복사
    for user in User.objects.all():
        if hasattr(user, 'old_subject') and user.old_subject in obj_map:
            user.subjects.add(obj_map[user.old_subject])

    for class_obj in Class.objects.all():
        if hasattr(class_obj, 'old_subject') and class_obj.old_subject in obj_map:
            class_obj.subject = obj_map[class_obj.old_subject]
            class_obj.save()

class Migration(migrations.Migration):
    dependencies = [("students", "0008_alter_class_day_of_week_alter_class_start_time_and_more")]

    operations = [
        # 1. DB를 먼저 물리적으로 고칩니다.
        migrations.RunPython(ultimate_fix_database),
        
        # 2. 장고의 '지도(State)'를 DB와 똑같이 맞춥니다.
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
                # 중요: 장고에게 subject가 old_subject로 바뀌었다고 알려줌
                migrations.RenameField(model_name="user", old_name="subject", new_name="old_subject"),
                migrations.RenameField(model_name="class", old_name="subject", new_name="old_subject"),
                
                # 새 필드들 추가
                migrations.AddField(model_name="user", name="subjects", field=models.ManyToManyField(to="students.subject")),
                migrations.AddField(model_name="class", name="subject", field=models.ForeignKey(null=True, on_delete=django.db.models.deletion.PROTECT, to="students.subject")),
            ],
            database_operations=[], # 위 RunPython에서 이미 다 했으므로 비워둠
        ),
        
        # 3. 이제 장고가 old_subject를 인식하므로 데이터를 옮깁니다.
        migrations.RunPython(migrate_data),
    ]
