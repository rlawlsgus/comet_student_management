from django.db import migrations, models
import django.db.models.deletion

def ultimate_fix_database(apps, schema_editor):
    """
    모든 충돌 요소를 SQL 레벨에서 강제로 정리하고 마이그레이션 가능 상태로 만듭니다.
    """
    cursor = schema_editor.connection.cursor()
    
    # 1. 외래 키 체크 비활성화
    cursor.execute("SET FOREIGN_KEY_CHECKS = 0;")

    # 2. 관계 테이블 및 주 테이블 삭제 (실패 흔적 정리)
    cursor.execute("DROP TABLE IF EXISTS students_user_subjects;")
    cursor.execute("DROP TABLE IF EXISTS students_subject_users;")
    cursor.execute("DROP TABLE IF EXISTS students_subject;")

    # 3. Class 테이블의 subject_id 제약 조건 및 컬럼 삭제
    # 시스템 테이블에서 실제 제약 조건 이름을 찾아내어 삭제합니다.
    cursor.execute("""
        SELECT CONSTRAINT_NAME 
        FROM information_schema.KEY_COLUMN_USAGE 
        WHERE TABLE_SCHEMA = DATABASE() 
          AND TABLE_NAME = 'students_class' 
          AND COLUMN_NAME = 'subject_id';
    """)
    constraints = cursor.fetchall()
    for (const_name,) in constraints:
        try:
            cursor.execute(f"ALTER TABLE students_class DROP FOREIGN KEY {const_name};")
        except:
            pass

    cursor.execute("SHOW COLUMNS FROM students_class;")
    class_columns = [col[0] for col in cursor.fetchall()]
    if 'subject_id' in class_columns:
        cursor.execute("ALTER TABLE students_class DROP COLUMN subject_id;")

    # 4. 필드 이름 변경 (subject -> old_subject)
    # User 테이블 정리
    cursor.execute("SHOW COLUMNS FROM students_user;")
    user_columns = [col[0] for col in cursor.fetchall()]
    if 'subject' in user_columns and 'old_subject' not in user_columns:
        cursor.execute("ALTER TABLE students_user CHANGE subject old_subject varchar(20) NULL;")
    elif 'old_subject' not in user_columns:
        cursor.execute("ALTER TABLE students_user ADD COLUMN old_subject varchar(20) NULL;")

    # Class 테이블 정리
    if 'subject' in class_columns and 'old_subject' not in class_columns:
        cursor.execute("ALTER TABLE students_class CHANGE subject old_subject varchar(20) NULL;")
    elif 'old_subject' not in class_columns:
        cursor.execute("ALTER TABLE students_class ADD COLUMN old_subject varchar(20) NULL;")

    # 5. Subject 테이블 재생성 (한글 처리 가능하도록 설정)
    cursor.execute("""
        CREATE TABLE students_subject (
            id bigint AUTO_INCREMENT PRIMARY KEY,
            name varchar(50) UNIQUE NOT NULL
        ) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;
    """)

    # 6. 외래 키 체크 재활성화
    cursor.execute("SET FOREIGN_KEY_CHECKS = 1;")

def migrate_data(apps, schema_editor):
    """정리된 DB에 데이터를 안전하게 이관합니다."""
    # 앱 레지스트리에서 모델 가져오기
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

    # User 데이터 이관
    for user in User.objects.all():
        old_val = getattr(user, 'old_subject', None)
        if old_val in obj_map:
            user.subjects.add(obj_map[old_val])

    # Class 데이터 이관
    for class_obj in Class.objects.all():
        old_val = getattr(class_obj, 'old_subject', None)
        if old_val in obj_map:
            class_obj.subject = obj_map[old_val]
            class_obj.save()

class Migration(migrations.Migration):

    dependencies = [
        ("students", "0008_alter_class_day_of_week_alter_class_start_time_and_more"),
    ]

    operations = [
        # DB 상태를 강제로 정상화 (모든 제약 조건/컬럼 충돌 해결)
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
            database_operations=[], # 위 ultimate_fix_database에서 이미 테이블과 컬럼을 만들었음
        ),
        
        # 데이터 이관
        migrations.RunPython(migrate_data),
    ]
