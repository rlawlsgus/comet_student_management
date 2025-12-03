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
  Chip,
  OutlinedInput,
} from '@mui/material';
import { useNavigate, useParams } from 'react-router-dom';
import { studentAPI, classAPI } from '../services/api';

interface StudentFormData {
  name: string;
  classes: number[];
  parentPhone: string;
  studentPhone?: string;
}

interface Class {
  id: number;
  name: string;
  subject: 'CHEMISTRY' | 'BIOLOGY' | 'GEOSCIENCE';
}

const StudentForm: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);
  const [formData, setFormData] = useState<StudentFormData>({
    name: '',
    classes: [],
    parentPhone: '',
    studentPhone: '',
  });
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [initialLoading, setInitialLoading] = useState<boolean>(true);
  const [allClasses, setAllClasses] = useState<Class[]>([]);

  useEffect(() => {
    const initializeData = async () => {
      setInitialLoading(true);
      await loadClasses();
      if (isEdit && id) {
        await loadStudentData(Number(id));
      }
      setInitialLoading(false);
    };

    initializeData();
  }, [isEdit, id]);

  const loadClasses = async () => {
    try {
      const response = await classAPI.getClasses();
      setAllClasses(response);
    } catch (err) {
      console.error('반 목록 조회 실패:', err);
      setError('반 목록을 불러오는 중 오류가 발생했습니다.');
    }
  };

  const loadStudentData = async (studentId: number) => {
    try {
      const studentData = await studentAPI.getStudent(studentId);
      setFormData({
        name: studentData.name,
        classes: studentData.classes.map((c: any) => c.id),
        parentPhone: studentData.parent_phone,
        studentPhone: studentData.student_phone || '',
      });
    } catch (err) {
      setError('학생 정보를 불러오는 중 오류가 발생했습니다.');
      console.error('Error loading student data:', err);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | { name?: string; value: unknown }> | any) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name as string]: value,
    }));
  };

  const handleClassChange = (event: any) => {
    const {
      target: { value },
    } = event;
    setFormData(prev => ({
      ...prev,
      classes: typeof value === 'string' ? value.split(',') : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!formData.name || !formData.parentPhone) {
      setError('이름, 부모님 전화번호는 필수 입력 항목입니다.');
      setLoading(false);
      return;
    }

    try {
      const studentData = {
        name: formData.name,
        classes: formData.classes,
        parent_phone: formData.parentPhone,
        student_phone: formData.studentPhone || '',
      };

      if (isEdit && id) {
        await studentAPI.updateStudent(Number(id), studentData);
      } else {
        await studentAPI.createStudent(studentData);
      }
      
      navigate('/students');
    } catch (err: any) {
      let errorMessage = '학생 정보 저장 중 오류가 발생했습니다.';
      if (err.response && err.response.data) {
        const errorData = err.response.data;
        const firstErrorKey = Object.keys(errorData)[0];
        errorMessage = errorData[firstErrorKey][0];
      } else if (err.message) {
        errorMessage = err.message;
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
          데이터를 불러오는 중...
        </Typography>
      </Container>
    );
  }

  return (
    <Container maxWidth="sm" sx={{ mt: 4 }}>
      <Paper sx={{ p: 4 }}>
        <Typography variant="h5" component="h1" gutterBottom align="center">
          {isEdit ? '학생 정보 수정' : '학생 추가'}
        </Typography>
        
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Box component="form" onSubmit={handleSubmit} sx={{ mt: 2 }}>
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
            <InputLabel>수강 반</InputLabel>
            <Select
              name="classes"
              multiple
              value={formData.classes}
              onChange={handleClassChange}
              input={<OutlinedInput label="수강 반" />}
              renderValue={(selected) => (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {(selected as number[]).map((value) => {
                    const classDetail = allClasses.find(c => c.id === value);
                    return <Chip key={value} label={classDetail?.name || value} />;
                  })}
                </Box>
              )}
            >
              {allClasses.map((classItem) => (
                <MenuItem key={classItem.id} value={classItem.id}>
                  {classItem.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <TextField
            fullWidth
            label="부모님 전화번호"
            name="parentPhone"
            value={formData.parentPhone}
            onChange={handleChange}
            margin="normal"
            required
            disabled={loading}
            placeholder="010-0000-0000"
          />

          <TextField
            fullWidth
            label="학생 전화번호"
            name="studentPhone"
            value={formData.studentPhone}
            onChange={handleChange}
            margin="normal"
            disabled={loading}
            placeholder="010-0000-0000"
          />

          <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
            <Button
              type="button"
              variant="outlined"
              fullWidth
              onClick={() => navigate('/students')}
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

export default StudentForm; 