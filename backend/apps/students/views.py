from django.views import View
from django.http import HttpResponse


class StudentListView(View):
    def get(self, request, *args, **kwargs):
        return HttpResponse("StudentListView")


class StudentDetailView(View):
    def get(self, request, *args, **kwargs):
        return HttpResponse("StudentDetailView")


class StudentCreateView(View):
    def get(self, request, *args, **kwargs):
        return HttpResponse("StudentCreateView")


class StudentUpdateView(View):
    def get(self, request, *args, **kwargs):
        return HttpResponse("StudentUpdateView")


class StudentDeleteView(View):
    def get(self, request, *args, **kwargs):
        return HttpResponse("StudentDeleteView")
