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

interface ClassFormData {
  name: string;
  subject: 'CHEMISTRY' | 'BIOLOGY' | 'EARTH_SCIENCE';
  dayOfWeek: 'MONDAY' | 'TUESDAY' | 'WEDNESDAY' | 'THURSDAY' | 'FRIDAY' | 'SATURDAY' | 'SUNDAY';
  startTime: string;
}

const ClassForm: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);
  const [formData, setFormData] = useState<ClassFormData>({
    name: '',
    subject: 'CHEMISTRY',
    dayOfWeek: 'MONDAY',
    startTime: '',
  });
  const [error, setError] = useState<string>('');

  useEffect(() => {
    if (isEdit) {
      // TODO: API 연동
      // 실제로는 API에서 반 데이터를 가져와야 합니다
      setFormData({
        name: '화학 기초반',
        subject: 'CHEMISTRY',
        dayOfWeek: 'MONDAY',
        startTime: '14:00',
      });
    }
  }, [isEdit]);

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

    if (!formData.name || !formData.startTime) {
      setError('반 이름과 시작 시간은 필수 입력 항목입니다.');
      return;
    }

    try {
      // TODO: API 연동
      // if (isEdit) {
      //   await updateClass(Number(id), formData);
      // } else {
      //   await createClass(formData);
      // }
      console.log('반 데이터:', formData);
      navigate('/classes');
    } catch (err) {
      setError('반 저장 중 오류가 발생했습니다.');
    }
  };

  return (
    <Container maxWidth="sm" sx={{ mt: 4 }}>
      <Paper sx={{ p: 4 }}>
        <Typography variant="h5" component="h1" gutterBottom align="center">
          {isEdit ? '반 정보 수정' : '반 추가'}
        </Typography>
        
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Box component="form" onSubmit={handleSubmit} sx={{ mt: 2 }}>
          <TextField
            fullWidth
            label="반 이름"
            name="name"
            value={formData.name}
            onChange={handleChange}
            margin="normal"
            required
          />
          
          <FormControl fullWidth margin="normal">
            <InputLabel>과목</InputLabel>
            <Select
              name="subject"
              value={formData.subject}
              onChange={handleChange}
              label="과목"
            >
              <MenuItem value="CHEMISTRY">화학</MenuItem>
              <MenuItem value="BIOLOGY">생명</MenuItem>
              <MenuItem value="EARTH_SCIENCE">지학</MenuItem>
            </Select>
          </FormControl>

          <FormControl fullWidth margin="normal">
            <InputLabel>요일</InputLabel>
            <Select
              name="dayOfWeek"
              value={formData.dayOfWeek}
              onChange={handleChange}
              label="요일"
            >
              <MenuItem value="MONDAY">월요일</MenuItem>
              <MenuItem value="TUESDAY">화요일</MenuItem>
              <MenuItem value="WEDNESDAY">수요일</MenuItem>
              <MenuItem value="THURSDAY">목요일</MenuItem>
              <MenuItem value="FRIDAY">금요일</MenuItem>
              <MenuItem value="SATURDAY">토요일</MenuItem>
              <MenuItem value="SUNDAY">일요일</MenuItem>
            </Select>
          </FormControl>

          <TextField
            fullWidth
            label="시작 시간"
            name="startTime"
            type="time"
            value={formData.startTime}
            onChange={handleChange}
            margin="normal"
            required
            InputLabelProps={{
              shrink: true,
            }}
          />

          <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
            <Button
              type="button"
              variant="outlined"
              fullWidth
              onClick={() => navigate('/classes')}
            >
              취소
            </Button>
            <Button
              type="submit"
              variant="contained"
              fullWidth
            >
              {isEdit ? '수정' : '추가'}
            </Button>
          </Box>
        </Box>
      </Paper>
    </Container>
  );
};

export default ClassForm; 