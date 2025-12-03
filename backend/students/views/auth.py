from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from django.contrib.auth import login, logout
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_exempt

from ..serializers import LoginSerializer, UserSerializer


@method_decorator(csrf_exempt, name="dispatch")
class LoginView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.validated_data["user"]
            login(request, user)
            return Response(
                {"message": "로그인 성공", "user": UserSerializer(user).data}
            )

        # 오류 메시지 처리
        errors = serializer.errors
        if "non_field_errors" in errors:
            error_message = errors["non_field_errors"][0]
        elif "username" in errors:
            error_message = errors["username"][0]
        elif "password" in errors:
            error_message = errors["password"][0]
        else:
            error_message = "로그인에 실패했습니다."

        return Response({"detail": error_message}, status=status.HTTP_400_BAD_REQUEST)


class LogoutView(APIView):
    def post(self, request):
        logout(request)
        return Response({"message": "로그아웃 성공"})
