from django.views import View
from django.http import HttpResponse


class ClassListView(View):
    def get(self, request, *args, **kwargs):
        return HttpResponse("ClassListView")


class ClassDetailView(View):
    def get(self, request, *args, **kwargs):
        return HttpResponse("ClassDetailView")


class ClassCreateView(View):
    def get(self, request, *args, **kwargs):
        return HttpResponse("ClassCreateView")


class ClassUpdateView(View):
    def get(self, request, *args, **kwargs):
        return HttpResponse("ClassUpdateView")


class ClassDeleteView(View):
    def get(self, request, *args, **kwargs):
        return HttpResponse("ClassDeleteView")
