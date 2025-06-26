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
import { studentAPI, classAPI } from '../services/api';

interface StudentFormData {
  name: string;
  subject: 'CHEMISTRY' | 'BIOLOGY' | 'EARTH_SCIENCE';
  classId: number;
  parentPhone: string;
  studentPhone?: string;
}

interface Class {
  id: number;
  name: string;
  subject: 'CHEMISTRY' | 'BIOLOGY' | 'EARTH_SCIENCE';
}

const StudentForm: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);
  const [formData, setFormData] = useState<StudentFormData>({
    name: '',
    subject: 'CHEMISTRY',
    classId: 0,
    parentPhone: '',
    studentPhone: '',
  });
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [initialLoading, setInitialLoading] = useState<boolean>(isEdit);
  const [classes, setClasses] = useState<Class[]>([]);

  useEffect(() => {
    const initializeData = async () => {
      await loadClasses();
      if (isEdit && id) {
        await loadStudentData(Number(id));
      }
    };
    
    initializeData();
  }, [isEdit, id]);

  const loadClasses = async () => {
    try {
      const response = await classAPI.getClasses();
      setClasses(response);
    } catch (err) {
      console.error('반 목록 조회 실패:', err);
      setError('반 목록을 불러오는 중 오류가 발생했습니다.');
    }
  };

  const loadStudentData = async (studentId: number) => {
    try {
      setInitialLoading(true);
      const studentData = await studentAPI.getStudent(studentId);
      
      // 백엔드에서 받은 데이터를 프론트엔드 형식으로 변환
      const selectedClass = classes.find(c => c.id === studentData.class_info);
      setFormData({
        name: studentData.name,
        subject: selectedClass?.subject || 'CHEMISTRY',
        classId: studentData.class_info,
        parentPhone: studentData.parent_phone,
        studentPhone: studentData.student_phone || '',
      });
    } catch (err) {
      setError('학생 정보를 불러오는 중 오류가 발생했습니다.');
      console.error('Error loading student data:', err);
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

    // 과목이 변경되면 반 선택 초기화 (단, 기존 반이 새 과목에 속하면 유지)
    if (name === 'subject') {
      const newSubject = value as 'CHEMISTRY' | 'BIOLOGY' | 'EARTH_SCIENCE';
      const currentClass = classes.find(c => c.id === formData.classId);
      
      // 현재 선택된 반이 새 과목에 속하지 않으면 초기화
      if (!currentClass || currentClass.subject !== newSubject) {
        setFormData(prev => ({
          ...prev,
          subject: newSubject,
          classId: 0,
        }));
      } else {
        // 현재 선택된 반이 새 과목에 속하면 과목만 변경
        setFormData(prev => ({
          ...prev,
          subject: newSubject,
        }));
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!formData.name || !formData.classId || !formData.parentPhone) {
      setError('이름, 반, 부모님 전화번호는 필수 입력 항목입니다.');
      setLoading(false);
      return;
    }

    try {
      // 프론트엔드 데이터를 백엔드 형식으로 변환
      const studentData = {
        name: formData.name,
        class_info: formData.classId,
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
      // 백엔드에서 오는 에러 메시지 처리
      let errorMessage = '학생 정보 저장 중 오류가 발생했습니다.';
      
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

  const filteredClasses = classes.filter(c => c.subject === formData.subject);

  if (initialLoading) {
    return (
      <Container maxWidth="sm" sx={{ mt: 4, textAlign: 'center' }}>
        <CircularProgress />
        <Typography variant="body1" sx={{ mt: 2 }}>
          학생 정보를 불러오는 중...
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
            <InputLabel>반</InputLabel>
            <Select
              name="classId"
              value={formData.classId}
              onChange={handleChange}
              label="반"
              required
              disabled={loading}
            >
              {filteredClasses.map((classItem) => (
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