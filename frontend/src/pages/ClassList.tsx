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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  CircularProgress,
} from '@mui/material';
import { Edit as EditIcon, Delete as DeleteIcon } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { classAPI } from '../services/api';
import { formatTime } from '../utils/dateUtils';

interface Class {
  id: number;
  name: string;
  subject: 'CHEMISTRY' | 'BIOLOGY' | 'GEOSCIENCE';
  day_of_week: 'MONDAY' | 'TUESDAY' | 'WEDNESDAY' | 'THURSDAY' | 'FRIDAY' | 'SATURDAY' | 'SUNDAY';
  start_time: string;
  student_count: number;
}

const ClassList: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [classes, setClasses] = useState<Class[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedClass, setSelectedClass] = useState<Class | null>(null);
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

  const handleDelete = (classItem: Class) => {
    setSelectedClass(classItem);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!selectedClass) return;

    try {
      const response = await classAPI.deleteClass(selectedClass.id);
      setClasses(classes.filter(c => c.id !== selectedClass.id));
      
      // 성공 메시지 표시
      if (response.message) {
        alert(response.message);
      } else {
        alert('반이 성공적으로 삭제되었습니다.');
      }
    } catch (error: any) {
      console.error('반 삭제 실패:', error);
      
      // 백엔드에서 오는 에러 메시지 처리
      let errorMessage = '반 삭제에 실패했습니다.';
      
      if (error.message) {
        if (typeof error.message === 'string') {
          errorMessage = error.message;
        } else if (error.message.detail) {
          errorMessage = error.message.detail;
        } else if (error.message.error) {
          errorMessage = error.message.error;
        }
      }
      
      alert(errorMessage);
    } finally {
      setDeleteDialogOpen(false);
      setSelectedClass(null);
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
      'GEOSCIENCE': '지학',
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

      <TableContainer component={Paper} sx={{ maxHeight: 800 }}>
        <Table stickyHeader>
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
                      onClick={() => handleDelete(classItem)}
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

      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>반 삭제 확인</DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            이 작업은 되돌릴 수 없습니다.
          </Alert>
          <Typography>
            <strong>{selectedClass?.name}</strong> 반을 정말 삭제하시겠습니까?
          </Typography>
          {selectedClass && selectedClass.student_count > 0 && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              이 반에는 {selectedClass.student_count}명의 학생이 등록되어 있습니다.
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)} variant="outlined">
            취소
          </Button>
          <Button onClick={confirmDelete} color="error" variant="contained">
            삭제
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default ClassList; 