import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, CssBaseline } from '@mui/material';
import theme from './styles/theme';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Register from './pages/Register';
import Profile from './pages/Profile';
import UserList from './pages/UserList';
import UserEdit from './pages/UserEdit';
import ClassList from './pages/ClassList';
import ClassForm from './pages/ClassForm';
import StudentList from './pages/StudentList';
import StudentForm from './pages/StudentForm';
import StudentManagement from './pages/StudentManagement';
import './styles/App.css';

const App: React.FC = () => {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthProvider>
        <Router>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }>
              <Route index element={<Dashboard />} />
              {/* 관리자만 접근 가능한 페이지들 */}
              <Route path="users" element={
                <ProtectedRoute allowedRoles={['ADMIN', 'TEACHER']}>
                  <UserList />
                </ProtectedRoute>
              } />
              <Route path="users/:id/edit" element={
                <ProtectedRoute allowedRoles={['ADMIN', 'TEACHER']}>
                  <UserEdit />
                </ProtectedRoute>
              } />
              <Route path="register" element={
                <ProtectedRoute allowedRoles={['ADMIN', 'TEACHER']}>
                  <Register />
                </ProtectedRoute>
              } />
              {/* 모든 인증된 사용자가 접근 가능한 페이지들 */}
              <Route path="profile" element={<Profile />} />
              <Route path="classes" element={<ClassList />} />
              <Route path="classes/new" element={
                <ProtectedRoute allowedRoles={['ADMIN', 'TEACHER']}>
                  <ClassForm />
                </ProtectedRoute>
              } />
              <Route path="classes/:id/edit" element={
                <ProtectedRoute allowedRoles={['ADMIN', 'TEACHER']}>
                  <ClassForm />
                </ProtectedRoute>
              } />
              <Route path="students" element={<StudentList />} />
              <Route path="students/new" element={
                <ProtectedRoute allowedRoles={['ADMIN', 'TEACHER']}>
                  <StudentForm />
                </ProtectedRoute>
              } />
              <Route path="students/:id/edit" element={
                <ProtectedRoute allowedRoles={['ADMIN', 'TEACHER']}>
                  <StudentForm />
                </ProtectedRoute>
              } />
              <Route path="students/:id/management" element={
                <ProtectedRoute allowedRoles={['ADMIN', 'TEACHER', 'ASSISTANT']}>
                  <StudentManagement />
                </ProtectedRoute>
              } />
            </Route>
            {/* 기본 경로를 로그인으로 리다이렉트 */}
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
};

export default App;
