import React, { useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { CircularProgress, Box } from '@mui/material';
import { useAuth } from '../contexts/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: 'ADMIN' | 'TEACHER' | 'ASSISTANT';
  allowedRoles?: ('ADMIN' | 'TEACHER' | 'ASSISTANT')[];
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  requiredRole, 
  allowedRoles 
}) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!user) {
    // 로그인되지 않은 경우 로그인 페이지로 리다이렉트
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // 권한 검사
  if (requiredRole && user.role !== requiredRole) {
    // 권한이 없는 경우 대시보드로 리다이렉트
    console.warn(`권한 부족: ${user.role} 사용자가 ${requiredRole} 권한이 필요한 페이지에 접근 시도`);
    return <Navigate to="/" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role as any)) {
    // 허용된 역할이 아닌 경우 대시보드로 리다이렉트
    console.warn(`권한 부족: ${user.role} 사용자가 ${allowedRoles.join(', ')} 권한이 필요한 페이지에 접근 시도`);
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute; 