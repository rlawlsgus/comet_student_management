from django.urls import path
from . import views

app_name = "classes"

urlpatterns = [
    path("", views.ClassListView.as_view(), name="class-list"),
    path("<int:pk>/", views.ClassDetailView.as_view(), name="class-detail"),
    path("create/", views.ClassCreateView.as_view(), name="class-create"),
    path("<int:pk>/update/", views.ClassUpdateView.as_view(), name="class-update"),
    path("<int:pk>/delete/", views.ClassDeleteView.as_view(), name="class-delete"),
]
