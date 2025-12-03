from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from ..models import User
from ..serializers import (
    UserCreateSerializer,
    UserSerializer,
    UserUpdateSerializer,
)


class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_serializer_class(self):
        if self.action == "create":
            return UserCreateSerializer
        elif self.action in ["update", "partial_update"]:
            return UserUpdateSerializer
        return UserSerializer

    def get_queryset(self):
        user = self.request.user

        if user.role == User.Role.ASSISTANT:
            return User.objects.filter(id=user.id)

        return User.objects.all()

    def get_permissions(self):
        if self.action in ["create", "update", "partial_update", "destroy"]:
            if self.request.user.role == User.Role.ASSISTANT:
                return [permissions.IsAuthenticated()]
        return super().get_permissions()

    def create(self, request, *args, **kwargs):
        if request.user.role == User.Role.ASSISTANT:
            return Response(
                {"detail": "조교는 회원을 생성할 수 없습니다."},
                status=status.HTTP_403_FORBIDDEN,
            )

        if (
            request.data.get("role") == User.Role.ADMIN
            and request.user.role != User.Role.ADMIN
        ):
            return Response(
                {"detail": "관리자만 관리자 역할의 회원을 생성할 수 있습니다."},
                status=status.HTTP_403_FORBIDDEN,
            )

        serializer = self.get_serializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def update(self, request, *args, **kwargs):
        if request.user.role == User.Role.ASSISTANT:
            return Response(
                {"detail": "조교는 회원을 수정할 수 없습니다."},
                status=status.HTTP_403_FORBIDDEN,
            )

        instance = self.get_object()

        if instance.role == User.Role.ADMIN and request.user.role != User.Role.ADMIN:
            return Response(
                {"detail": "관리자만 관리자 역할의 회원을 수정할 수 있습니다."},
                status=status.HTTP_403_FORBIDDEN,
            )

        new_role = request.data.get("role")
        if (
            new_role
            and new_role == User.Role.ADMIN
            and request.user.role != User.Role.ADMIN
        ):
            return Response(
                {"detail": "관리자만 관리자 역할로 변경할 수 있습니다."},
                status=status.HTTP_403_FORBIDDEN,
            )
        
        data = request.data.copy()
        new_password = data.get("new_password") or data.get("password")
        if new_password:
            if request.user.role == User.Role.ADMIN or (
                request.user.role == User.Role.TEACHER
                and instance.role == User.Role.ASSISTANT
            ):
                if len(new_password) < 8:
                    return Response(
                        {"detail": "비밀번호는 최소 8자 이상이어야 합니다."},
                        status=status.HTTP_400_BAD_REQUEST,
                    )
                instance.set_password(new_password)
                instance.save()
                
                if "new_password" in data:
                    data.pop("new_password")
                if "password" in data:
                    data.pop("password")
            else:
                return Response(
                    {"detail": "해당 사용자의 비밀번호를 변경할 권한이 없습니다."},
                    status=status.HTTP_403_FORBIDDEN,
                )

        serializer = self.get_serializer(instance, data=data, partial=False)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def partial_update(self, request, *args, **kwargs):
        if request.user.role == User.Role.ASSISTANT:
            return Response(
                {"detail": "조교는 회원을 수정할 수 없습니다."},
                status=status.HTTP_403_FORBIDDEN,
            )

        instance = self.get_object()

        if instance.role == User.Role.ADMIN and request.user.role != User.Role.ADMIN:
            return Response(
                {"detail": "관리자만 관리자 역할의 회원을 수정할 수 있습니다."},
                status=status.HTTP_403_FORBIDDEN,
            )

        new_role = request.data.get("role")
        if (
            new_role
            and new_role == User.Role.ADMIN
            and request.user.role != User.Role.ADMIN
        ):
            return Response(
                {"detail": "관리자만 관리자 역할로 변경할 수 있습니다."},
                status=status.HTTP_403_FORBIDDEN,
            )

        data = request.data.copy()
        new_password = data.get("new_password") or data.get("password")
        if new_password:
            if request.user.role == User.Role.ADMIN or (
                request.user.role == User.Role.TEACHER
                and instance.role == User.Role.ASSISTANT
            ):
                if len(new_password) < 8:
                    return Response(
                        {"detail": "비밀번호는 최소 8자 이상이어야 합니다."},
                        status=status.HTTP_400_BAD_REQUEST,
                    )
                instance.set_password(new_password)
                instance.save()
                if "new_password" in data:
                    data.pop("new_password")
                if "password" in data:
                    data.pop("password")
            else:
                return Response(
                    {"detail": "해당 사용자의 비밀번호를 변경할 권한이 없습니다."},
                    status=status.HTTP_403_FORBIDDEN,
                )

        serializer = self.get_serializer(instance, data=data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def destroy(self, request, *args, **kwargs):
        if request.user.role == User.Role.ASSISTANT:
            return Response(
                {"detail": "조교는 회원을 삭제할 수 없습니다."},
                status=status.HTTP_403_FORBIDDEN,
            )

        instance = self.get_object()

        if instance.id == request.user.id:
            return Response(
                {"detail": "자신을 삭제할 수 없습니다."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if instance.role == User.Role.ADMIN and request.user.role != User.Role.ADMIN:
            return Response(
                {"detail": "관리자만 관리자 역할의 회원을 삭제할 수 있습니다."},
                status=status.HTTP_403_FORBIDDEN,
            )

        instance.delete()
        return Response(
            {"message": "회원이 성공적으로 삭제되었습니다."},
            status=status.HTTP_200_OK,
        )

    @action(detail=False, methods=["get"])
    def profile(self, request):
        serializer = UserSerializer(request.user)
        return Response(serializer.data)

    @action(detail=False, methods=["put", "patch"])
    def update_profile(self, request):
        user = request.user

        if user.role == User.Role.ASSISTANT:
            return Response(
                {"error": "조교는 프로필 정보를 수정할 수 없습니다."},
                status=status.HTTP_403_FORBIDDEN,
            )

        if user.role == User.Role.TEACHER and request.data.get("role"):
            return Response(
                {"error": "선생님은 자신의 역할을 수정할 수 없습니다."},
                status=status.HTTP_403_FORBIDDEN,
            )

        serializer = UserUpdateSerializer(request.user, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(UserSerializer(request.user).data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=["post"])
    def change_password(self, request):
        user = request.user
        old_password = request.data.get("old_password")
        new_password = request.data.get("new_password")
        confirm_password = request.data.get("confirm_password")

        if not old_password or not new_password or not confirm_password:
            return Response(
                {"error": "모든 필드를 입력해주세요."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not user.check_password(old_password):
            return Response(
                {"error": "현재 비밀번호가 올바르지 않습니다."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if new_password != confirm_password:
            return Response(
                {"error": "새 비밀번호가 일치하지 않습니다."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if len(new_password) < 8:
            return Response(
                {"error": "새 비밀번호는 최소 8자 이상이어야 합니다."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user.set_password(new_password)
        user.save()
        return Response({"message": "비밀번호가 변경되었습니다."})
