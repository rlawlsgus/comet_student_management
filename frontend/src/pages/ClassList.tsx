import React, { useState, useEffect, useRef } from 'react';
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
import { useAuth } from '../contexts/AuthContext';
import { classAPI } from '../services/api';
import { formatTime } from '../utils/dateUtils';

interface Class {
  id: number;
  name: string;
  subject: 'CHEMISTRY' | 'BIOLOGY' | 'EARTH_SCIENCE';
  day_of_week: 'MONDAY' | 'TUESDAY' | 'WEDNESDAY' | 'THURSDAY' | 'FRIDAY' | 'SATURDAY' | 'SUNDAY';
  start_time: string;
  student_count: number;
}

const ClassList: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [classes, setClasses] = useState<Class[]>([]);
  const [loading, setLoading] = useState(true);
  const mountedRef = useRef(false);

  useEffect(() => {
    // 컴포넌트가 마운트되었는지 확인
    if (!mountedRef.current) {
      mountedRef.current = true;
      fetchClasses();
    }
  }, []);

  const fetchClasses = async () => {
    try {
      const response = await classAPI.getClasses();
      console.log('반 목록 응답:', response); // 디버깅용
      setClasses(response);
    } catch (error) {
      console.error('반 목록 조회 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (classId: number) => {
    navigate(`/classes/${classId}/edit`);
  };

  const handleDelete = async (classId: number) => {
    if (window.confirm('정말로 이 반을 삭제하시겠습니까?')) {
      try {
        await classAPI.deleteClass(classId);
        setClasses(classes.filter(c => c.id !== classId));
      } catch (error) {
        console.error('반 삭제 실패:', error);
        alert('반 삭제에 실패했습니다.');
      }
    }
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
    return days[day as keyof typeof days] || day;
  };

  const getSubjectName = (subject: string) => {
    const subjects = {
      'CHEMISTRY': '화학',
      'BIOLOGY': '생명',
      'EARTH_SCIENCE': '지학',
    };
    return subjects[subject as keyof typeof subjects] || subject;
  };

  // 조교는 추가/수정/삭제 권한이 없음
  const canEdit = user?.role !== 'ASSISTANT';

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4 }}>
        <Typography>로딩 중...</Typography>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h5" component="h1">
          반 목록
        </Typography>
        {canEdit && (
          <Button
            variant="contained"
            color="primary"
            onClick={() => navigate('/classes/new')}
          >
            반 추가
          </Button>
        )}
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
              <TableCell>학생 수</TableCell>
              {canEdit && <TableCell>관리</TableCell>}
            </TableRow>
          </TableHead>
          <TableBody>
            {classes.map((classItem) => (
              <TableRow key={classItem.id}>
                <TableCell>{classItem.id}</TableCell>
                <TableCell>{classItem.name}</TableCell>
                <TableCell>{getSubjectName(classItem.subject)}</TableCell>
                <TableCell>{getDayOfWeek(classItem.day_of_week)}</TableCell>
                <TableCell>{formatTime(classItem.start_time)}</TableCell>
                <TableCell>{classItem.student_count}</TableCell>
                {canEdit && (
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
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Container>
  );
};

export default ClassList; 