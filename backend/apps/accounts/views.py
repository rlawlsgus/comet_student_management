from django.views import View
from django.http import HttpResponse


class LoginView(View):
    def get(self, request, *args, **kwargs):
        return HttpResponse("LoginView")


class LogoutView(View):
    def get(self, request, *args, **kwargs):
        return HttpResponse("LogoutView")


class RegisterView(View):
    def get(self, request, *args, **kwargs):
        return HttpResponse("RegisterView")


class ProfileView(View):
    def get(self, request, *args, **kwargs):
        return HttpResponse("ProfileView")
