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
} from '@mui/material';
import { useNavigate, useParams } from 'react-router-dom';

interface User {
  id: number;
  username: string;
  name: string;
  role: 'TEACHER' | 'ASSISTANT';
  subject: 'CHEMISTRY' | 'BIOLOGY' | 'EARTH_SCIENCE';
  status: 'ACTIVE' | 'INACTIVE';
}

const UserEdit: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [user, setUser] = useState<User>({
    id: 0,
    username: '',
    name: '',
    role: 'TEACHER',
    subject: 'CHEMISTRY',
    status: 'ACTIVE',
  });
  const [error, setError] = useState<string>('');

  useEffect(() => {
    // TODO: API 연동
    // 실제로는 API에서 사용자 데이터를 가져와야 합니다
    const fetchUser = async () => {
      try {
        // const response = await getUser(Number(id));
        // setUser(response.data);
        
        // 임시 데이터
        setUser({
          id: Number(id),
          username: 'teacher1',
          name: '김선생',
          role: 'TEACHER',
          subject: 'CHEMISTRY',
          status: 'ACTIVE',
        });
      } catch (err) {
        setError('사용자 정보를 불러오는 중 오류가 발생했습니다.');
      }
    };

    fetchUser();
  }, [id]);

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

    try {
      // TODO: API 연동
      // await updateUser(user);
      console.log('사용자 수정 데이터:', user);
      navigate('/users'); // 회원 목록 페이지로 이동
    } catch (err) {
      setError('사용자 정보 수정 중 오류가 발생했습니다.');
    }
  };

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
          />
          
          <FormControl fullWidth margin="normal">
            <InputLabel>역할</InputLabel>
            <Select
              name="role"
              value={user.role}
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
              value={user.subject}
              onChange={handleChange}
              label="과목"
            >
              <MenuItem value="CHEMISTRY">화학</MenuItem>
              <MenuItem value="BIOLOGY">생명</MenuItem>
              <MenuItem value="EARTH_SCIENCE">지학</MenuItem>
            </Select>
          </FormControl>

          <FormControl fullWidth margin="normal">
            <InputLabel>상태</InputLabel>
            <Select
              name="status"
              value={user.status}
              onChange={handleChange}
              label="상태"
            >
              <MenuItem value="ACTIVE">활성</MenuItem>
              <MenuItem value="INACTIVE">비활성</MenuItem>
            </Select>
          </FormControl>

          <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
            <Button
              type="button"
              variant="outlined"
              fullWidth
              onClick={() => navigate('/users')}
            >
              취소
            </Button>
            <Button
              type="submit"
              variant="contained"
              fullWidth
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