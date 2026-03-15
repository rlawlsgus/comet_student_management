from django.db.models.signals import post_migrate
from django.dispatch import receiver

@receiver(post_migrate)
def create_default_classes(sender, **kwargs):
    if sender.name == 'students':
        from .models import Class
        if not Class.objects.filter(name="퇴원").exists():
            Class.objects.create(
                name="퇴원",
                subject=None,
                day_of_week=None,
                start_time=None
            )
