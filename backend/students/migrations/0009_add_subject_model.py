from django.db import migrations, models
import django.db.models.deletion

def safe_rename_fields(apps, schema_editor):
    """컬럼 존재 여부를 확인하고 안전하게 이름을 변경합니다."""
    with schema_editor.connection.cursor() as cursor:
        # students_user 테이블 확인: 'subject' 컬럼이 있으면 'old_subject'로 변경
        cursor.execute("SHOW COLUMNS FROM students_user LIKE 'subject'")
        if cursor.fetchone():
            cursor.execute("ALTER TABLE students_user CHANGE subject old_subject varchar(20)")
        
        # students_class 테이블 확인: 'subject' 컬럼이 있으면 'old_subject'로 변경
        cursor.execute("SHOW COLUMNS FROM students_class LIKE 'subject'")
        if cursor.fetchone():
            cursor.execute("ALTER TABLE students_class CHANGE subject old_subject varchar(20)")

def migrate_data(apps, schema_editor):
    """old_subject 필드의 텍스트 데이터를 Subject 모델 객체로 이관합니다."""
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
        # 1. 외래 키 체크 비활성화 및 이전 실패 흔적(테이블) 강제 삭제
        migrations.RunSQL("SET FOREIGN_KEY_CHECKS = 0;"),
        migrations.RunSQL("DROP TABLE IF EXISTS students_user_subjects;"),
        migrations.RunSQL("DROP TABLE IF EXISTS students_subject;"),
        migrations.RunSQL("SET FOREIGN_KEY_CHECKS = 1;"),
        
        # 2. Subject 모델 생성
        migrations.CreateModel(
            name="Subject",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("name", models.CharField(max_length=50, unique=True, verbose_name="과목명")),
            ],
            options={"verbose_name": "과목", "verbose_name_plural": "과목"},
        ),
        
        # 3. Collation 변환 (MySQL 한글 정렬 에러 방지)
        migrations.RunSQL(
            "ALTER TABLE students_subject CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;"
        ),
        
        # 4. 안전한 필드 이름 변경 (이미 변경된 경우 에러 없이 통과)
        migrations.RunPython(safe_rename_fields),
        
        # 5. 새 관계 필드 추가 (장고 상태 반영용)
        # RenameField 대신 AddField를 사용하여 이미 바뀐 DB 구조와 장고 모델의 싱크를 맞춥니다.
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
        
        # 6. 데이터 이관 실행
        migrations.RunPython(migrate_data),
    ]
