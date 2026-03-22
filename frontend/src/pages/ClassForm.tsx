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
import { classAPI, subjectAPI } from '../services/api';

interface Subject {
  id: number;
  name: string;
}

interface ClassFormData {
  name: string;
  subject?: number | null;
  dayOfWeek?: 'MONDAY' | 'TUESDAY' | 'WEDNESDAY' | 'THURSDAY' | 'FRIDAY' | 'SATURDAY' | 'SUNDAY' | null;
  startTime?: string | null;
}

const ClassForm: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [formData, setFormData] = useState<ClassFormData>({
    name: '',
    subject: null,
    dayOfWeek: 'MONDAY',
    startTime: '',
  });
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [initialLoading, setInitialLoading] = useState<boolean>(true);
  const [isWithdrawnClass, setIsWithdrawnClass] = useState<boolean>(false);

  useEffect(() => {
    const init = async () => {
      await fetchSubjects();
      if (isEdit && id) {
        await loadClassData(Number(id));
      } else {
        setInitialLoading(false);
      }
    };
    init();
  }, [isEdit, id]);

  const fetchSubjects = async () => {
    try {
      const data = await subjectAPI.getSubjects();
      setSubjects(data);
      if (data.length > 0 && !isEdit) {
        setFormData(prev => ({ ...prev, subject: data[0].id }));
      }
    } catch (err) {
      console.error('과목 목록을 불러오는데 실패했습니다.', err);
    }
  };

  const loadClassData = async (classId: number) => {
    try {
      setInitialLoading(true);
      const classData = await classAPI.getClass(classId);
      
      const isWithdrawn = classData.name === '퇴원';
      setIsWithdrawnClass(isWithdrawn);

      // 백엔드에서 받은 데이터를 프론트엔드 형식으로 변환
      // 과목이 객체로 올 수 있으므로 id만 추출
      const subjectId = typeof classData.subject === 'object' && classData.subject !== null 
        ? classData.subject.id 
        : classData.subject;

      setFormData({
        name: classData.name,
        subject: subjectId || null,
        dayOfWeek: classData.day_of_week || 'MONDAY',
        startTime: classData.start_time || '',
      });
    } catch (err) {
      setError('반 정보를 불러오는 중 오류가 발생했습니다.');
    } finally {
      setInitialLoading(false);
    }
  };

  const handleChange = (e: any) => {
    const { name, value } = e.target;
    
    if (name === 'name') {
      setIsWithdrawnClass(value === '퇴원');
    }

    setFormData(prev => ({
      ...prev,
      [name as string]: value,
    }));
  };

  // 30분 단위 시간 목록 생성 (08:00 ~ 23:00)
  const generateTimeOptions = () => {
    const options = [];
    for (let hour = 8; hour <= 23; hour++) {
      for (let min of ['00', '30']) {
        const time = `${hour.toString().padStart(2, '0')}:${min}:00`;
        const label = `${hour.toString().padStart(2, '0')}:${min}`;
        options.push({ value: time, label });
      }
    }
    return options;
  };

  const timeOptions = generateTimeOptions();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!formData.name) {
      setError('반 이름은 필수 입력 항목입니다.');
      setLoading(false);
      return;
    }

    if (!isWithdrawnClass && !formData.subject) {
      setError('과목을 선택해주세요.');
      setLoading(false);
      return;
    }

    if (!isWithdrawnClass && !formData.startTime) {
      setError('시작 시간은 필수 입력 항목입니다.');
      setLoading(false);
      return;
    }

    try {
      const classData = {
        name: formData.name,
        subject: isWithdrawnClass ? null : formData.subject,
        day_of_week: isWithdrawnClass ? null : formData.dayOfWeek,
        start_time: isWithdrawnClass ? null : formData.startTime,
      };

      if (isEdit && id) {
        await classAPI.updateClass(Number(id), classData);
      } else {
        await classAPI.createClass(classData);
      }
      
      navigate('/classes');
    } catch (err: any) {
      let errorMessage = '반 저장 중 오류가 발생했습니다.';
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
            disabled={loading || (isEdit && isWithdrawnClass)}
          />
          
          {!isWithdrawnClass && (
            <>
              <FormControl fullWidth margin="normal">
                <InputLabel>과목</InputLabel>
                <Select
                  name="subject"
                  value={formData.subject || ''}
                  onChange={handleChange}
                  label="과목"
                  disabled={loading}
                  required
                >
                  {subjects.map((s) => (
                    <MenuItem key={s.id} value={s.id}>
                      {s.name}
                    </MenuItem>
                  ))}
                  {subjects.length === 0 && (
                    <MenuItem disabled>등록된 과목이 없습니다</MenuItem>
                  )}
                </Select>
              </FormControl>

              <FormControl fullWidth margin="normal">
                <InputLabel>요일</InputLabel>
                <Select
                  name="dayOfWeek"
                  value={formData.dayOfWeek || ''}
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

              <FormControl fullWidth margin="normal" required>
                <InputLabel>시작 시간</InputLabel>
                <Select
                  name="startTime"
                  value={formData.startTime || ''}
                  onChange={handleChange}
                  label="시작 시간"
                  disabled={loading}
                >
                  {timeOptions.map((option) => (
                    <MenuItem key={option.value} value={option.value}>
                      {option.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </>
          )}

          {isWithdrawnClass && (
            <Alert severity="info" sx={{ mt: 2 }}>
              "퇴원" 반은 과목, 요일, 시작 시간이 필요하지 않습니다. 모든 과목 사용자에게 노출됩니다.
            </Alert>
          )}

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
              disabled={loading || (!isWithdrawnClass && subjects.length === 0)}
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
