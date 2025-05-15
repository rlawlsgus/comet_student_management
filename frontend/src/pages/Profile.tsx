import React, { useState } from 'react';
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
  Grid as MuiGrid,
  Divider,
} from '@mui/material';
// import { useNavigate } from 'react-router-dom';

interface ProfileData {
  username: string;
  name: string;
  role: 'TEACHER' | 'ASSISTANT';
  currentPassword: string;
  newPassword: string;
  confirmNewPassword: string;
  subject: 'CHEMISTRY' | 'BIOLOGY' | 'EARTH_SCIENCE';
}

const Grid = MuiGrid as any;

const Profile: React.FC = () => {
  // const navigate = useNavigate();
  const [profileData, setProfileData] = useState<ProfileData>({
    username: 'teacher1', // TODO: 실제 사용자 데이터로 대체
    name: '김선생',
    role: 'TEACHER',
    currentPassword: '',
    newPassword: '',
    confirmNewPassword: '',
    subject: 'CHEMISTRY',
  });
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');

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

    try {
      // TODO: API 연동
      // const response = await updateProfile(profileData);
      console.log('프로필 업데이트 데이터:', profileData);
      setSuccess('프로필이 성공적으로 업데이트되었습니다.');
    } catch (err) {
      setError('프로필 업데이트 중 오류가 발생했습니다.');
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

    try {
      // TODO: API 연동
      // const response = await changePassword(profileData);
      console.log('비밀번호 변경 데이터:', profileData);
      setSuccess('비밀번호가 성공적으로 변경되었습니다.');
      setProfileData(prev => ({
        ...prev,
        currentPassword: '',
        newPassword: '',
        confirmNewPassword: '',
      }));
    } catch (err) {
      setError('비밀번호 변경 중 오류가 발생했습니다.');
    }
  };

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

        <Grid container spacing={3}>
          {/* 프로필 정보 */}
          <Grid item xs={12} component="div">
            <Box component="form" onSubmit={handleProfileUpdate}>
              <Typography variant="h6" gutterBottom>
                기본 정보
              </Typography>
              
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
              />
              
              <FormControl fullWidth margin="normal">
                <InputLabel>역할</InputLabel>
                <Select
                  name="role"
                  value={profileData.role}
                  onChange={handleChange}
                  label="역할"
                >
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
                >
                  <MenuItem value="CHEMISTRY">화학</MenuItem>
                  <MenuItem value="BIOLOGY">생명</MenuItem>
                  <MenuItem value="EARTH_SCIENCE">지학</MenuItem>
                </Select>
              </FormControl>

              <Button
                type="submit"
                variant="contained"
                sx={{ mt: 2 }}
              >
                프로필 업데이트
              </Button>
            </Box>
          </Grid>

          <Grid item xs={12} component="div">
            <Divider sx={{ my: 2 }} />
          </Grid>

          {/* 비밀번호 변경 */}
          <Grid item xs={12} component="div">
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
          </Grid>
        </Grid>
      </Paper>
    </Container>
  );
};

export default Profile; 