from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r"users", views.UserViewSet)
router.register(r"classes", views.ClassViewSet)
router.register(r"students", views.StudentViewSet)
router.register(r"attendances", views.AttendanceViewSet)
router.register(r"exams", views.ExamViewSet)

urlpatterns = [
    path("", include(router.urls)),
    path("login/", views.LoginView.as_view(), name="login"),
    path("logout/", views.LogoutView.as_view(), name="logout"),
    path("dashboard/", views.DashboardView.as_view(), name="dashboard"),
    path("notifications/", views.KakaoNotificationView.as_view(), name="notifications"),
]
