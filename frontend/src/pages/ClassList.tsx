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
} from '@mui/material';
import { Edit as EditIcon, Delete as DeleteIcon } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

interface Class {
  id: number;
  name: string;
  subject: 'CHEMISTRY' | 'BIOLOGY' | 'EARTH_SCIENCE';
  dayOfWeek: 'MONDAY' | 'TUESDAY' | 'WEDNESDAY' | 'THURSDAY' | 'FRIDAY' | 'SATURDAY' | 'SUNDAY';
  startTime: string;
  teacherId: number;
}

const ClassList: React.FC = () => {
  const navigate = useNavigate();
  const [classes, setClasses] = useState<Class[]>([
    {
      id: 1,
      name: '화학 기초반',
      subject: 'CHEMISTRY',
      dayOfWeek: 'MONDAY',
      startTime: '14:00',
      teacherId: 1,
    },
    {
      id: 2,
      name: '생명 심화반',
      subject: 'BIOLOGY',
      dayOfWeek: 'WEDNESDAY',
      startTime: '15:30',
      teacherId: 2,
    },
  ]);

  const handleEdit = (classId: number) => {
    navigate(`/classes/${classId}/edit`);
  };

  const handleDelete = (classId: number) => {
    setClasses(classes.filter(c => c.id !== classId));
  };

  const getDayOfWeek = (day: string) => {
    const days = {
      'MONDAY': '월요일',
      'TUESDAY': '화요일',
      'WEDNESDAY': '수요일',
      'THURSDAY': '목요일',
      'FRIDAY': '금요일',
      'SATURDAY': '토요일',
      'SUNDAY': '일요일',
    };
    return days[day as keyof typeof days];
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h5" component="h1">
          반 목록
        </Typography>
        <Button
          variant="contained"
          color="primary"
          onClick={() => navigate('/classes/new')}
        >
          반 추가
        </Button>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>ID</TableCell>
              <TableCell>반 이름</TableCell>
              <TableCell>과목</TableCell>
              <TableCell>요일</TableCell>
              <TableCell>시작 시간</TableCell>
              <TableCell>관리</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {classes.map((classItem) => (
              <TableRow key={classItem.id}>
                <TableCell>{classItem.id}</TableCell>
                <TableCell>{classItem.name}</TableCell>
                <TableCell>
                  {classItem.subject === 'CHEMISTRY' ? '화학' : 
                   classItem.subject === 'BIOLOGY' ? '생명' : '지학'}
                </TableCell>
                <TableCell>{getDayOfWeek(classItem.dayOfWeek)}</TableCell>
                <TableCell>{classItem.startTime}</TableCell>
                <TableCell>
                  <IconButton
                    color="primary"
                    onClick={() => handleEdit(classItem.id)}
                    size="small"
                  >
                    <EditIcon />
                  </IconButton>
                  <IconButton
                    color="error"
                    onClick={() => handleDelete(classItem.id)}
                    size="small"
                  >
                    <DeleteIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Container>
  );
};

export default ClassList; 