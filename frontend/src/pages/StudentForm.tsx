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
  const [classes, setClasses] = useState<Class[]>([
    { id: 1, name: '화학 기초반', subject: 'CHEMISTRY' },
    { id: 2, name: '생명 심화반', subject: 'BIOLOGY' },
  ]);

  useEffect(() => {
    if (isEdit) {
      // TODO: API 연동
      // 실제로는 API에서 학생 데이터를 가져와야 합니다
      setFormData({
        name: '김학생',
        subject: 'CHEMISTRY',
        classId: 1,
        parentPhone: '010-1234-5678',
        studentPhone: '010-9876-5432',
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

    if (!formData.name || !formData.classId || !formData.parentPhone) {
      setError('이름, 과목, 반, 부모님 전화번호는 필수 입력 항목입니다.');
      return;
    }

    try {
      // TODO: API 연동
      // if (isEdit) {
      //   await updateStudent(Number(id), formData);
      // } else {
      //   await createStudent(formData);
      // }
      console.log('학생 데이터:', formData);
      navigate('/students');
    } catch (err) {
      setError('학생 정보 저장 중 오류가 발생했습니다.');
    }
  };

  const filteredClasses = classes.filter(c => c.subject === formData.subject);

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
            <InputLabel>반</InputLabel>
            <Select
              name="classId"
              value={formData.classId}
              onChange={handleChange}
              label="반"
              required
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
            placeholder="010-0000-0000"
          />

          <TextField
            fullWidth
            label="학생 전화번호"
            name="studentPhone"
            value={formData.studentPhone}
            onChange={handleChange}
            margin="normal"
            placeholder="010-0000-0000"
          />

          <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
            <Button
              type="button"
              variant="outlined"
              fullWidth
              onClick={() => navigate('/students')}
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

export default StudentForm; 