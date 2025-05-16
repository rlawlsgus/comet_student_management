from django.urls import path
from . import views

app_name = "students"

urlpatterns = [
    path("", views.StudentListView.as_view(), name="student-list"),
    path("<int:pk>/", views.StudentDetailView.as_view(), name="student-detail"),
    path("create/", views.StudentCreateView.as_view(), name="student-create"),
    path("<int:pk>/update/", views.StudentUpdateView.as_view(), name="student-update"),
    path("<int:pk>/delete/", views.StudentDeleteView.as_view(), name="student-delete"),
]
