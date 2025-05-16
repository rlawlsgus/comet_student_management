from django.views import View
from django.http import HttpResponse
from rest_framework import viewsets, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Avg
from .models import Attendance, Exam
from .serializers import AttendanceSerializer, ExamSerializer


class AttendanceListView(View):
    def get(self, request, *args, **kwargs):
        return HttpResponse("AttendanceListView")


class AttendanceDetailView(View):
    def get(self, request, *args, **kwargs):
        return HttpResponse("AttendanceDetailView")


class AttendanceCreateView(View):
    def get(self, request, *args, **kwargs):
        return HttpResponse("AttendanceCreateView")


class AttendanceUpdateView(View):
    def get(self, request, *args, **kwargs):
        return HttpResponse("AttendanceUpdateView")


class AttendanceDeleteView(View):
    def get(self, request, *args, **kwargs):
        return HttpResponse("AttendanceDeleteView")


class AttendanceViewSet(viewsets.ModelViewSet):
    queryset = Attendance.objects.all()
    serializer_class = AttendanceSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        queryset = Attendance.objects.all()
        student_id = self.request.query_params.get("student", None)
        if student_id:
            queryset = queryset.filter(student_id=student_id)
        return queryset


class ExamViewSet(viewsets.ModelViewSet):
    queryset = Exam.objects.all()
    serializer_class = ExamSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        queryset = Exam.objects.all()
        student_id = self.request.query_params.get("student", None)
        if student_id:
            queryset = queryset.filter(student_id=student_id)
        return queryset

    @action(detail=False, methods=["get"])
    def class_average(self, request):
        exam_name = request.query_params.get("name", None)
        student_id = request.query_params.get("student", None)

        if not exam_name or not student_id:
            return Response(
                {"error": "exam name and student id are required"}, status=400
            )

        # Get the student's class
        from apps.classes.models import Class

        student_class = Class.objects.filter(students__id=student_id).first()

        if not student_class:
            return Response({"error": "student not found in any class"}, status=404)

        # Calculate average for the exam in the class
        average = Exam.objects.filter(
            name=exam_name, student__in=student_class.students.all()
        ).aggregate(avg_score=Avg("score"))

        return Response({"average": average["avg_score"]})
