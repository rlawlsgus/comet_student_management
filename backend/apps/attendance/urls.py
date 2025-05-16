from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r"attendance", views.AttendanceViewSet)
router.register(r"exams", views.ExamViewSet)

app_name = "attendance"

urlpatterns = [
    path("", include(router.urls)),
]
