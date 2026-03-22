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
  OutlinedInput,
  Chip,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { userAPI, subjectAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

interface Subject {
  id: number;
  name: string;
}

interface ProfileData {
  username: string;
  name: string;
  role: 'ADMIN' | 'TEACHER' | 'ASSISTANT';
  currentPassword: string;
  newPassword: string;
  confirmNewPassword: string;
  subjects: number[];
}

const Profile: React.FC = () => {
  const { user, updateUser, logout } = useAuth();
  const [loading, setLoading] = useState(true);
  const [availableSubjects, setAvailableSubjects] = useState<Subject[]>([]);
  const [profileData, setProfileData] = useState<ProfileData>({
    username: '',
    name: '',
    role: 'TEACHER',
    currentPassword: '',
    newPassword: '',
    confirmNewPassword: '',
    subjects: [],
  });
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');
  const navigate = useNavigate();
  const mountedRef = useRef(false);

  // 조교인지 확인
  const isAssistant = user?.role === 'ASSISTANT';

  // 컴포넌트 마운트 시 데이터 가져오기
  useEffect(() => {
    if (!mountedRef.current) {
      mountedRef.current = true;
      const init = async () => {
        try {
          const [profile, subjectsData] = await Promise.all([
            userAPI.getProfile(),
            subjectAPI.getSubjects()
          ]);
          
          setAvailableSubjects(subjectsData);
          
          // profile.subjects가 [{id, name}, ...] 형태일 수 있으므로 id만 추출
          const subjectIds = Array.isArray(profile.subjects)
            ? profile.subjects.map((s: any) => typeof s === 'object' ? s.id : s)
            : [];

          setProfileData(prev => ({
            ...prev,
            username: profile.username,
            name: profile.name,
            role: profile.role,
            subjects: subjectIds,
          }));
        } catch (err) {
          setError('정보를 불러오는 중 오류가 발생했습니다.');
        } finally {
          setLoading(false);
        }
      };

      init();
    }
  }, []);

  const handleChange = (e: any) => {
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

    if (isAssistant) {
      setError('조교는 프로필 정보를 수정할 수 없습니다.');
      return;
    }

    try {
      const updateData = {
        name: profileData.name,
        role: profileData.role,
        subjects: profileData.subjects,
      };

      const updatedProfile = await userAPI.updateProfile(updateData);
      
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
      setError('비밀번호가 일치하지 않습니다.');
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
      
      setProfileData(prev => ({
        ...prev,
        currentPassword: '',
        newPassword: '',
        confirmNewPassword: '',
      }));

      setTimeout(async () => {
        try {
          await logout();
          navigate('/login');
        } catch (err) {
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
                <InputLabel>과목 (다중 선택 가능)</InputLabel>
                <Select
                  multiple
                  name="subjects"
                  value={profileData.subjects}
                  onChange={handleChange}
                  input={<OutlinedInput label="과목 (다중 선택 가능)" />}
                  renderValue={(selected) => (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {(selected as number[]).map((value) => (
                        <Chip key={value} label={availableSubjects.find(s => s.id === value)?.name || value} />
                      ))}
                    </Box>
                  )}
                  disabled={isAssistant}
                >
                  {availableSubjects.map((subject) => (
                    <MenuItem key={subject.id} value={subject.id}>
                      {subject.name}
                    </MenuItem>
                  ))}
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
