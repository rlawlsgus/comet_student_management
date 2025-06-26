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
import { classAPI } from '../services/api';

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
  const [loading, setLoading] = useState<boolean>(false);
  const [initialLoading, setInitialLoading] = useState<boolean>(isEdit);

  useEffect(() => {
    if (isEdit && id) {
      loadClassData(Number(id));
    }
  }, [isEdit, id]);

  const loadClassData = async (classId: number) => {
    try {
      setInitialLoading(true);
      const classData = await classAPI.getClass(classId);
      
      // 백엔드에서 받은 데이터를 프론트엔드 형식으로 변환
      setFormData({
        name: classData.name,
        subject: classData.subject,
        dayOfWeek: classData.day_of_week,
        startTime: classData.start_time,
      });
    } catch (err) {
      setError('반 정보를 불러오는 중 오류가 발생했습니다.');
      console.error('Error loading class data:', err);
    } finally {
      setInitialLoading(false);
    }
  };

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

    if (!formData.name || !formData.startTime) {
      setError('반 이름과 시작 시간은 필수 입력 항목입니다.');
      setLoading(false);
      return;
    }

    try {
      // 프론트엔드 데이터를 백엔드 형식으로 변환
      const classData = {
        name: formData.name,
        subject: formData.subject,
        day_of_week: formData.dayOfWeek,
        start_time: formData.startTime,
      };

      if (isEdit && id) {
        await classAPI.updateClass(Number(id), classData);
      } else {
        await classAPI.createClass(classData);
      }
      
      navigate('/classes');
    } catch (err: any) {
      // 백엔드에서 오는 에러 메시지 처리
      let errorMessage = '반 저장 중 오류가 발생했습니다.';
      
      if (err.message) {
        // 백엔드에서 오는 상세 에러 메시지가 있으면 사용
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
          반 정보를 불러오는 중...
        </Typography>
      </Container>
    );
  }

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
            disabled={loading}
          />
          
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

          <FormControl fullWidth margin="normal">
            <InputLabel>요일</InputLabel>
            <Select
              name="dayOfWeek"
              value={formData.dayOfWeek}
              onChange={handleChange}
              label="요일"
              disabled={loading}
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
            disabled={loading}
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
              {isEdit ? '수정' : '추가'}
            </Button>
          </Box>
        </Box>
      </Paper>
    </Container>
  );
};

export default ClassForm; 