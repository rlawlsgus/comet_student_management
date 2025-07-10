import React, { useState, useEffect, useRef } from 'react';
import {
  Container,
  Paper,
  Typography,
  TextField,
  Button,
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  Divider,
  CircularProgress,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { userAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

interface ProfileData {
  username: string;
  name: string;
  role: 'ADMIN' | 'TEACHER' | 'ASSISTANT';
  currentPassword: string;
  newPassword: string;
  confirmNewPassword: string;
  subject: 'CHEMISTRY' | 'BIOLOGY' | 'GEOSCIENCE';
}

const Profile: React.FC = () => {
  const { user, updateUser, logout } = useAuth();
  const [loading, setLoading] = useState(true);
  const [profileData, setProfileData] = useState<ProfileData>({
    username: '',
    name: '',
    role: 'TEACHER',
    currentPassword: '',
    newPassword: '',
    confirmNewPassword: '',
    subject: 'CHEMISTRY',
  });
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');
  const navigate = useNavigate();
  const mountedRef = useRef(false);

  // 조교인지 확인
  const isAssistant = user?.role === 'ASSISTANT';

  // 컴포넌트 마운트 시 현재 사용자 정보 가져오기
  useEffect(() => {
    // 컴포넌트가 마운트되었는지 확인
    if (!mountedRef.current) {
      mountedRef.current = true;
      const fetchProfile = async () => {
        try {
          const profile = await userAPI.getProfile();
          setProfileData(prev => ({
            ...prev,
            username: profile.username,
            name: profile.name,
            role: profile.role,
            subject: profile.subject,
          }));
        } catch (err) {
          setError('프로필 정보를 불러오는 중 오류가 발생했습니다.');
        } finally {
          setLoading(false);
        }
      };

      fetchProfile();
    }
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | { name?: string; value: unknown }> | any) => {
    const { name, value } = e.target;
    setProfileData(prev => ({
      ...prev,
      [name as string]: value,
    }));
  };

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // 조교는 프로필 업데이트 불가
    if (isAssistant) {
      setError('조교는 프로필 정보를 수정할 수 없습니다.');
      return;
    }

    try {
      const updateData = {
        name: profileData.name,
        role: profileData.role,
        subject: profileData.subject,
      };

      const updatedProfile = await userAPI.updateProfile(updateData);
      
      // AuthContext의 사용자 정보도 업데이트
      if (updateUser) {
        updateUser(updatedProfile);
      }

      setSuccess('프로필이 성공적으로 업데이트되었습니다.');
    } catch (err: any) {
      setError(err.message || '프로필 업데이트 중 오류가 발생했습니다.');
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (profileData.newPassword !== profileData.confirmNewPassword) {
      setError('새 비밀번호가 일치하지 않습니다.');
      return;
    }

    if (profileData.newPassword.length < 8) {
      setError('새 비밀번호는 최소 8자 이상이어야 합니다.');
      return;
    }

    try {
      const passwordData = {
        old_password: profileData.currentPassword,
        new_password: profileData.newPassword,
        confirm_password: profileData.confirmNewPassword,
      };

      await userAPI.changePassword(passwordData);
      setSuccess('비밀번호가 성공적으로 변경되었습니다. 로그인 페이지로 이동합니다.');
      
      // 비밀번호 필드 초기화
      setProfileData(prev => ({
        ...prev,
        currentPassword: '',
        newPassword: '',
        confirmNewPassword: '',
      }));

      // 2초 후 로그아웃 및 로그인 페이지로 이동
      setTimeout(async () => {
        try {
          await logout();
          navigate('/login');
        } catch (err) {
          console.error('로그아웃 중 오류:', err);
          navigate('/login');
        }
      }, 2000);

    } catch (err: any) {
      setError(err.message || '비밀번호 변경 중 오류가 발생했습니다.');
    }
  };

  if (loading) {
    return (
      <Container maxWidth="md" sx={{ mt: 4, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress />
      </Container>
    );
  }

  return (
    <Container maxWidth="md" sx={{ mt: 4 }}>
      <Paper sx={{ p: 4 }}>
        <Typography variant="h5" component="h1" gutterBottom align="center">
          프로필 관리
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {success && (
          <Alert severity="success" sx={{ mb: 2 }}>
            {success}
          </Alert>
        )}

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {/* 프로필 정보 */}
          <Box>
            <Box component="form" onSubmit={handleProfileUpdate}>
              <Typography variant="h6" gutterBottom>
                기본 정보
              </Typography>
              
              {isAssistant && (
                <Alert severity="info" sx={{ mb: 2 }}>
                  조교는 프로필 정보를 수정할 수 없습니다.
                </Alert>
              )}
              
              <TextField
                fullWidth
                label="아이디"
                name="username"
                value={profileData.username}
                disabled
                margin="normal"
              />
              
              <TextField
                fullWidth
                label="이름"
                name="name"
                value={profileData.name}
                onChange={handleChange}
                margin="normal"
                required
                disabled={isAssistant}
              />
              
              <FormControl fullWidth margin="normal">
                <InputLabel>역할</InputLabel>
                <Select
                  name="role"
                  value={profileData.role}
                  onChange={handleChange}
                  label="역할"
                  disabled={isAssistant || user?.role === 'TEACHER'}
                >
                  <MenuItem value="ADMIN">관리자</MenuItem>
                  <MenuItem value="TEACHER">선생님</MenuItem>
                  <MenuItem value="ASSISTANT">조교</MenuItem>
                </Select>
              </FormControl>

              <FormControl fullWidth margin="normal">
                <InputLabel>과목</InputLabel>
                <Select
                  name="subject"
                  value={profileData.subject}
                  onChange={handleChange}
                  label="과목"
                  disabled={isAssistant}
                >
                  <MenuItem value="CHEMISTRY">화학</MenuItem>
                  <MenuItem value="BIOLOGY">생명</MenuItem>
                  <MenuItem value="GEOSCIENCE">지학</MenuItem>
                </Select>
              </FormControl>

              {!isAssistant && (
                <Button
                  type="submit"
                  variant="contained"
                  sx={{ mt: 2 }}
                >
                  프로필 업데이트
                </Button>
              )}
            </Box>
          </Box>

          <Divider sx={{ my: 2 }} />

          {/* 비밀번호 변경 */}
          <Box>
            <Box component="form" onSubmit={handlePasswordChange}>
              <Typography variant="h6" gutterBottom>
                비밀번호 변경
              </Typography>
              
              <TextField
                fullWidth
                label="현재 비밀번호"
                name="currentPassword"
                type="password"
                value={profileData.currentPassword}
                onChange={handleChange}
                margin="normal"
                required
              />
              
              <TextField
                fullWidth
                label="새 비밀번호"
                name="newPassword"
                type="password"
                value={profileData.newPassword}
                onChange={handleChange}
                margin="normal"
                required
                helperText="최소 8자 이상 입력해주세요"
              />
              
              <TextField
                fullWidth
                label="새 비밀번호 확인"
                name="confirmNewPassword"
                type="password"
                value={profileData.confirmNewPassword}
                onChange={handleChange}
                margin="normal"
                required
              />

              <Button
                type="submit"
                variant="contained"
                sx={{ mt: 2 }}
              >
                비밀번호 변경
              </Button>
            </Box>
          </Box>
        </Box>
      </Paper>
    </Container>
  );
};

export default Profile; 