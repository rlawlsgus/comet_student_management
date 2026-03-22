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

interface RegisterFormData {
  username: string;
  password: string;
  confirmPassword: string;
  name: string;
  role: 'ADMIN' | 'TEACHER' | 'ASSISTANT';
  subjects: number[];
}

const Register: React.FC = () => {
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [formData, setFormData] = useState<RegisterFormData>({
    username: '',
    password: '',
    confirmPassword: '',
    name: '',
    role: 'TEACHER',
    subjects: [],
  });
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [fetchingSubjects, setFetchingSubjects] = useState(true);

  useEffect(() => {
    const fetchSubjects = async () => {
      try {
        const data = await subjectAPI.getSubjects();
        setSubjects(data);
      } catch (err) {
        console.error('과목 목록을 불러오는데 실패했습니다.', err);
      } finally {
        setFetchingSubjects(false);
      }
    };
    fetchSubjects();
  }, []);

  const handleChange = (e: any) => {
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

    if (formData.password.length < 8) {
      setError('비밀번호는 최소 8자 이상이어야 합니다.');
      setLoading(false);
      return;
    }

    try {
      const backendData = {
        username: formData.username,
        password: formData.password,
        confirm_password: formData.confirmPassword,
        name: formData.name,
        role: formData.role,
        subjects: formData.subjects,
      };

      await userAPI.createUser(backendData);
      navigate('/users');
    } catch (err: any) {
      let errorMessage = '회원 등록 중 오류가 발생했습니다.';
      if (err.message) {
        if (typeof err.message === 'string') errorMessage = err.message;
        else if (err.message.detail) errorMessage = err.message.detail;
      }
      setError(errorMessage);
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
              {currentUser?.role === 'ADMIN' && (
                <MenuItem value="ADMIN">관리자</MenuItem>
              )}
              <MenuItem value="TEACHER">선생님</MenuItem>
              <MenuItem value="ASSISTANT">조교</MenuItem>
            </Select>
          </FormControl>

          <FormControl fullWidth margin="normal">
            <InputLabel>과목 (다중 선택 가능)</InputLabel>
            <Select
              multiple
              name="subjects"
              value={formData.subjects}
              onChange={handleChange}
              input={<OutlinedInput label="과목 (다중 선택 가능)" />}
              renderValue={(selected) => (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {(selected as number[]).map((value) => (
                    <Chip key={value} label={subjects.find(s => s.id === value)?.name || value} />
                  ))}
                </Box>
              )}
              disabled={loading || fetchingSubjects}
            >
              {subjects.map((subject) => (
                <MenuItem key={subject.id} value={subject.id}>
                  {subject.name}
                </MenuItem>
              ))}
              {subjects.length === 0 && !fetchingSubjects && (
                <MenuItem disabled>등록된 과목이 없습니다</MenuItem>
              )}
            </Select>
          </FormControl>

          <Button
            type="submit"
            fullWidth
            variant="contained"
            sx={{ mt: 3 }}
            disabled={loading || fetchingSubjects}
            startIcon={loading ? <CircularProgress size={20} /> : null}
          >
            {loading ? '등록 중...' : '등록'}
          </Button>
        </Box>
      </Paper>
    </Container>
  );
};

export default Register;
