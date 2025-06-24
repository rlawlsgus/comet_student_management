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
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { userAPI } from '../services/api';

interface RegisterFormData {
  username: string;
  password: string;
  confirmPassword: string;
  name: string;
  role: 'ADMIN' | 'TEACHER' | 'ASSISTANT';
  subject: 'CHEMISTRY' | 'BIOLOGY' | 'EARTH_SCIENCE';
}

const Register: React.FC = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState<RegisterFormData>({
    username: '',
    password: '',
    confirmPassword: '',
    name: '',
    role: 'TEACHER',
    subject: 'CHEMISTRY',
  });
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | { name?: string; value: unknown }> | any) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name as string]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (formData.password !== formData.confirmPassword) {
      setError('비밀번호가 일치하지 않습니다.');
      setLoading(false);
      return;
    }

    try {
      const { confirmPassword, ...userData } = formData;
      const response = await userAPI.createUser(userData);
      console.log('회원가입 성공:', response);
      navigate('/users'); // 회원 목록 페이지로 이동
    } catch (err: any) {
      console.error('회원가입 실패:', err);
      setError(err.message || '회원가입 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="sm" sx={{ mt: 4 }}>
      <Paper sx={{ p: 4 }}>
        <Typography variant="h5" component="h1" gutterBottom align="center">
          회원 등록
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
            value={formData.username}
            onChange={handleChange}
            margin="normal"
            required
            disabled={loading}
          />
          
          <TextField
            fullWidth
            label="비밀번호"
            name="password"
            type="password"
            value={formData.password}
            onChange={handleChange}
            margin="normal"
            required
            disabled={loading}
          />
          
          <TextField
            fullWidth
            label="비밀번호 확인"
            name="confirmPassword"
            type="password"
            value={formData.confirmPassword}
            onChange={handleChange}
            margin="normal"
            required
            disabled={loading}
          />
          
          <TextField
            fullWidth
            label="이름"
            name="name"
            value={formData.name}
            onChange={handleChange}
            margin="normal"
            required
            disabled={loading}
          />
          
          <FormControl fullWidth margin="normal">
            <InputLabel>역할</InputLabel>
            <Select
              name="role"
              value={formData.role}
              onChange={handleChange}
              label="역할"
              disabled={loading}
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
              value={formData.subject}
              onChange={handleChange}
              label="과목"
              disabled={loading}
            >
              <MenuItem value="CHEMISTRY">화학</MenuItem>
              <MenuItem value="BIOLOGY">생명</MenuItem>
              <MenuItem value="EARTH_SCIENCE">지학</MenuItem>
            </Select>
          </FormControl>

          <Button
            type="submit"
            fullWidth
            variant="contained"
            sx={{ mt: 3 }}
            disabled={loading}
          >
            {loading ? '등록 중...' : '등록'}
          </Button>
        </Box>
      </Paper>
    </Container>
  );
};

export default Register; 