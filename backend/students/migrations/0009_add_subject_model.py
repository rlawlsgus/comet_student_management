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
        if user.old_subject in obj_map:
            user.subjects.add(obj_map[user.old_subject])

    # 3. Class 데이터 이관 (old_subject -> subject FK)
    for class_obj in Class.objects.all():
        if class_obj.old_subject in obj_map:
            class_obj.subject = obj_map[class_obj.old_subject]
            class_obj.save()

class Migration(migrations.Migration):

    dependencies = [
        ("students", "0008_alter_class_day_of_week_alter_class_start_time_and_more"),
    ]

    operations = [
        # Subject 모델 생성
        migrations.CreateModel(
            name="Subject",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("name", models.CharField(max_length=50, unique=True, verbose_name="과목명")),
            ],
            options={"verbose_name": "과목", "verbose_name_plural": "과목"},
        ),
        # 기존 필드 이름 변경 (데이터 보존)
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
