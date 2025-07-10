import React, { useState, useEffect } from 'react';
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
  CircularProgress,
} from '@mui/material';
import { useNavigate, useParams } from 'react-router-dom';
import { userAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

interface User {
  id: number;
  username: string;
  name: string;
  role: 'ADMIN' | 'TEACHER' | 'ASSISTANT';
  subject: 'CHEMISTRY' | 'BIOLOGY' | 'GEOSCIENCE';
}

const UserEdit: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { user: currentUser } = useAuth();
  const [user, setUser] = useState<User>({
    id: 0,
    username: '',
    name: '',
    role: 'TEACHER',
    subject: 'CHEMISTRY',
  });
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [initialLoading, setInitialLoading] = useState<boolean>(true);

  useEffect(() => {
    if (id) {
      loadUserData(Number(id));
    }
  }, [id]);

  const loadUserData = async (userId: number) => {
    try {
      setInitialLoading(true);
      const userData = await userAPI.getUser(userId);
      setUser({
        id: userData.id,
        username: userData.username,
        name: userData.name,
        role: userData.role,
        subject: userData.subject,
      });
    } catch (err) {
      setError('사용자 정보를 불러오는 중 오류가 발생했습니다.');
      console.error('Error loading user data:', err);
    } finally {
      setInitialLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | { name?: string; value: unknown }> | any) => {
    const { name, value } = e.target;
    setUser(prev => ({
      ...prev,
      [name as string]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await userAPI.updateUser(user.id, {
        name: user.name,
        role: user.role,
        subject: user.subject,
      });
      navigate('/users'); // 회원 목록 페이지로 이동
    } catch (err: any) {
      // 백엔드에서 오는 에러 메시지 처리
      let errorMessage = '사용자 정보 수정 중 오류가 발생했습니다.';
      
      if (err.message) {
        if (typeof err.message === 'string') {
          errorMessage = err.message;
        } else if (err.message.detail) {
          errorMessage = err.message.detail;
        } else if (err.message.error) {
          errorMessage = err.message.error;
        }
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) {
    return (
      <Container maxWidth="sm" sx={{ mt: 4, textAlign: 'center' }}>
        <CircularProgress />
        <Typography variant="body1" sx={{ mt: 2 }}>
          사용자 정보를 불러오는 중...
        </Typography>
      </Container>
    );
  }

  return (
    <Container maxWidth="sm" sx={{ mt: 4 }}>
      <Paper sx={{ p: 4 }}>
        <Typography variant="h5" component="h1" gutterBottom align="center">
          회원 정보 수정
        </Typography>
        
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Box component="form" onSubmit={handleSubmit} sx={{ mt: 2 }}>
          <TextField
            fullWidth
            label="아이디"
            name="username"
            value={user.username}
            disabled
            margin="normal"
          />
          
          <TextField
            fullWidth
            label="이름"
            name="name"
            value={user.name}
            onChange={handleChange}
            margin="normal"
            required
            disabled={loading}
          />
          
          <FormControl fullWidth margin="normal">
            <InputLabel>역할</InputLabel>
            <Select
              name="role"
              value={user.role}
              onChange={handleChange}
              label="역할"
              disabled={loading || (currentUser?.role === 'TEACHER' && currentUser?.id === user.id)}
            >
              {currentUser?.role === 'ADMIN' && (
                <MenuItem value="ADMIN">관리자</MenuItem>
              )}
              <MenuItem value="TEACHER">선생님</MenuItem>
              <MenuItem value="ASSISTANT">조교</MenuItem>
            </Select>
          </FormControl>

          <FormControl fullWidth margin="normal">
            <InputLabel>과목</InputLabel>
            <Select
              name="subject"
              value={user.subject}
              onChange={handleChange}
              label="과목"
              disabled={loading}
            >
              <MenuItem value="CHEMISTRY">화학</MenuItem>
              <MenuItem value="BIOLOGY">생명</MenuItem>
              <MenuItem value="GEOSCIENCE">지학</MenuItem>
            </Select>
          </FormControl>

          <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
            <Button
              type="button"
              variant="outlined"
              fullWidth
              onClick={() => navigate('/users')}
              disabled={loading}
            >
              취소
            </Button>
            <Button
              type="submit"
              variant="contained"
              fullWidth
              disabled={loading}
              startIcon={loading ? <CircularProgress size={20} /> : null}
            >
              수정
            </Button>
          </Box>
        </Box>
      </Paper>
    </Container>
  );
};

export default UserEdit; 