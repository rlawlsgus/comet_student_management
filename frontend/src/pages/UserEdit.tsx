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
import { useNavigate, useParams } from 'react-router-dom';
import { userAPI, subjectAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

interface Subject {
  id: number;
  name: string;
}

interface User {
  id: number;
  username: string;
  name: string;
  role: 'ADMIN' | 'TEACHER' | 'ASSISTANT';
  subjects: number[];
}

const UserEdit: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { user: currentUser } = useAuth();
  const [newPassword, setNewPassword] = useState<string>('');
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [user, setUser] = useState<User>({
    id: 0,
    username: '',
    name: '',
    role: 'TEACHER',
    subjects: [],
  });
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [initialLoading, setInitialLoading] = useState<boolean>(true);
  const [fetchingSubjects, setFetchingSubjects] = useState(true);

  useEffect(() => {
    const init = async () => {
      await fetchSubjects();
      if (id) {
        await loadUserData(Number(id));
      }
    };
    init();
  }, [id]);

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

  const loadUserData = async (userId: number) => {
    try {
      setInitialLoading(true);
      const userData = await userAPI.getUser(userId);
      
      // 백엔드에서 subjects가 [{id, name}, ...] 형태로 오므로 id만 추출
      const subjectIds = Array.isArray(userData.subjects) 
        ? userData.subjects.map((s: any) => typeof s === 'object' ? s.id : s)
        : [];

      setUser({
        id: userData.id,
        username: userData.username,
        name: userData.name,
        role: userData.role,
        subjects: subjectIds,
      });
    } catch (err) {
      setError('사용자 정보를 불러오는 중 오류가 발생했습니다.');
    } finally {
      setInitialLoading(false);
    }
  };

  const handleChange = (e: any) => {
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
      const canChangePassword =
        (currentUser?.role === 'ADMIN') ||
        (currentUser?.role === 'TEACHER' && user.role === 'ASSISTANT');

      const payload: any = {
        name: user.name,
        role: user.role,
        subjects: user.subjects,
      };

      if (canChangePassword && newPassword.trim().length > 0) {
        if (newPassword.trim().length < 8) {
          throw new Error('비밀번호는 최소 8자 이상이어야 합니다.');
        }
        payload.new_password = newPassword.trim();
      }

      await userAPI.updateUser(user.id, payload);
      navigate('/users');
    } catch (err: any) {
      let errorMessage = '사용자 정보 수정 중 오류가 발생했습니다.';
      if (err.message) {
        if (typeof err.message === 'string') errorMessage = err.message;
        else if (err.message.detail) errorMessage = err.message.detail;
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
            <InputLabel>과목 (다중 선택 가능)</InputLabel>
            <Select
              multiple
              name="subjects"
              value={user.subjects}
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

          {((currentUser?.role === 'ADMIN') || (currentUser?.role === 'TEACHER' && user.role === 'ASSISTANT')) && (
            <TextField
              fullWidth
              label="새 비밀번호 (선택)"
              name="new_password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              margin="normal"
              helperText="최소 8자 이상 입력하세요. 비워두면 비밀번호는 변경되지 않습니다."
              disabled={loading}
            />
          )}

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
              disabled={loading || fetchingSubjects}
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
