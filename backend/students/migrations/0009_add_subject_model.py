from django.db import migrations, models
import django.db.models.deletion

def migrate_data(apps, schema_editor):
    Subject = apps.get_model('students', 'Subject')
    User = apps.get_model('students', 'User')
    Class = apps.get_model('students', 'Class')

    # 1. 초기 과목 데이터 생성
    subjects_map = {
        'CHEMISTRY': '화학',
        'BIOLOGY': '생명과학',
        'GEOSCIENCE': '지구과학'
    }
    obj_map = {}
    for key, name in subjects_map.items():
        obj, _ = Subject.objects.get_or_create(name=name)
        obj_map[key] = obj

    # 2. User 데이터 이관 (old_subject -> subjects)
    for user in User.objects.all():
        if hasattr(user, 'old_subject') and user.old_subject in obj_map:
            user.subjects.add(obj_map[user.old_subject])

    # 3. Class 데이터 이관 (old_subject -> subject FK)
    for class_obj in Class.objects.all():
        if hasattr(class_obj, 'old_subject') and class_obj.old_subject in obj_map:
            class_obj.subject = obj_map[class_obj.old_subject]
            class_obj.save()

class Migration(migrations.Migration):

    dependencies = [
        ("students", "0008_alter_class_day_of_week_alter_class_start_time_and_more"),
    ]

    operations = [
        # 외래 키 체크 비활성화 및 이전 실패 흔적 강제 삭제
        migrations.RunSQL("SET FOREIGN_KEY_CHECKS = 0;"),
        migrations.RunSQL("DROP TABLE IF EXISTS students_user_subjects;"),
        migrations.RunSQL("DROP TABLE IF EXISTS students_subject_users;"),
        migrations.RunSQL("DROP TABLE IF EXISTS students_subject;"),
        migrations.RunSQL("SET FOREIGN_KEY_CHECKS = 1;"),
        
        # Subject 모델 생성
        migrations.CreateModel(
            name="Subject",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("name", models.CharField(max_length=50, unique=True, verbose_name="과목명")),
            ],
            options={"verbose_name": "과목", "verbose_name_plural": "과목"},
        ),
        
        # MySQL Collation 에러 해결을 위해 테이블 문자셋 변환 (데이터 생성 전에 실행)
        migrations.RunSQL(
            "ALTER TABLE students_subject CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;",
            reverse_sql=migrations.RunSQL.noop
        ),
        
        # 기존 필드 이름 변경 (데이터 보존)
        # 만약 이미 이전 시도에서 변경되었다면 이 단계에서 에러가 날 수 있으므로
        # SQL을 통해 컬럼 존재 여부를 확인하고 변경하는 것이 가장 안전하지만, 
        # DROP TABLE로 관계 테이블을 지웠으므로 RenameField가 정상 작동할 것입니다.
        migrations.RenameField(model_name="user", old_name="subject", new_name="old_subject"),
        migrations.RenameField(model_name="class", old_name="subject", new_name="old_subject"),
        
        # 새 관계 필드 추가
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
        # 데이터 이관 실행
        migrations.RunPython(migrate_data),
    ]
