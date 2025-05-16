import React, { useState } from 'react';
import {
  Container,
  Paper,
  Typography,
  Button,
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  SelectChangeEvent,
} from '@mui/material';
import { Edit as EditIcon, Delete as DeleteIcon } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

interface Student {
  id: number;
  name: string;
  subject: 'CHEMISTRY' | 'BIOLOGY' | 'EARTH_SCIENCE';
  classId: number;
  className: string;
  parentPhone: string;
  studentPhone?: string;
}

interface Class {
  id: number;
  name: string;
  subject: 'CHEMISTRY' | 'BIOLOGY' | 'EARTH_SCIENCE';
}

const StudentList: React.FC = () => {
  const navigate = useNavigate();
  const [students, setStudents] = useState<Student[]>([
    {
      id: 1,
      name: '김학생',
      subject: 'CHEMISTRY',
      classId: 1,
      className: '화학 기초반',
      parentPhone: '010-1234-5678',
      studentPhone: '010-9876-5432',
    },
    {
      id: 2,
      name: '이학생',
      subject: 'BIOLOGY',
      classId: 2,
      className: '생명 심화반',
      parentPhone: '010-2345-6789',
    },
  ]);

  const [classes] = useState<Class[]>([
    { id: 1, name: '화학 기초반', subject: 'CHEMISTRY' },
    { id: 2, name: '생명 심화반', subject: 'BIOLOGY' },
  ]);

  const [filters, setFilters] = useState({
    subject: '',
    classId: '',
  });

  const handleFilterChange = (e: SelectChangeEvent) => {
    const { name, value } = e.target;
    setFilters(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const filteredStudents = students.filter(student => {
    if (filters.subject && student.subject !== filters.subject) return false;
    if (filters.classId && student.classId !== Number(filters.classId)) return false;
    return true;
  });

  const filteredClasses = classes.filter(c => !filters.subject || c.subject === filters.subject);

  const handleEdit = (studentId: number) => {
    navigate(`/students/${studentId}/edit`);
  };

  const handleDelete = (studentId: number) => {
    setStudents(students.filter(s => s.id !== studentId));
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h5" component="h1">
          학생 목록
        </Typography>
        <Button
          variant="contained"
          color="primary"
          onClick={() => navigate('/students/new')}
        >
          학생 추가
        </Button>
      </Box>

      <Paper sx={{ p: 2, mb: 3 }}>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <FormControl fullWidth>
            <InputLabel>과목</InputLabel>
            <Select
              name="subject"
              value={filters.subject}
              onChange={handleFilterChange}
              label="과목"
            >
              <MenuItem value="">전체</MenuItem>
              <MenuItem value="CHEMISTRY">화학</MenuItem>
              <MenuItem value="BIOLOGY">생명</MenuItem>
              <MenuItem value="EARTH_SCIENCE">지학</MenuItem>
            </Select>
          </FormControl>
          <FormControl fullWidth>
            <InputLabel>반</InputLabel>
            <Select
              name="classId"
              value={filters.classId}
              onChange={handleFilterChange}
              label="반"
            >
              <MenuItem value="">전체</MenuItem>
              {filteredClasses.map((classItem) => (
                <MenuItem key={classItem.id} value={classItem.id}>
                  {classItem.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
      </Paper>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>ID</TableCell>
              <TableCell>이름</TableCell>
              <TableCell>과목</TableCell>
              <TableCell>반</TableCell>
              <TableCell>부모님 전화번호</TableCell>
              <TableCell>학생 전화번호</TableCell>
              <TableCell>관리</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredStudents.map((student) => (
              <TableRow key={student.id}>
                <TableCell>{student.id}</TableCell>
                <TableCell>{student.name}</TableCell>
                <TableCell>{student.subject}</TableCell>
                <TableCell>{student.className}</TableCell>
                <TableCell>{student.parentPhone}</TableCell>
                <TableCell>{student.studentPhone}</TableCell>
                <TableCell>
                  <Button
                    size="small"
                    onClick={() => navigate(`/students/${student.id}/management`)}
                    sx={{ mr: 1 }}
                  >
                    관리
                  </Button>
                  <Button
                    size="small"
                    onClick={() => handleEdit(student.id)}
                    sx={{ mr: 1 }}
                  >
                    수정
                  </Button>
                  <Button
                    size="small"
                    color="error"
                    onClick={() => handleDelete(student.id)}
                  >
                    삭제
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Container>
  );
};

export default StudentList; 