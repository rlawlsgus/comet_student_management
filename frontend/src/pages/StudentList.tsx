import React, { useState, useEffect } from 'react';
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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Alert,
  Tooltip,
} from '@mui/material';
import { 
  Edit as EditIcon, 
  Delete as DeleteIcon,
  AutoStories as NoteIcon 
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { studentAPI, classAPI } from '../services/api';

interface Student {
  id: number;
  name: string;
  class_info: number;
  class_info_name: string;
  parent_phone: string;
  student_phone?: string;
  attendance_stats: {
    total_classes: number;
    attended_classes: number;
    late_count: number;
  };
  exam_stats: {
    average_score: number;
    highest_score: number;
    lowest_score: number;
  };
}

interface Class {
  id: number;
  name: string;
  subject: 'CHEMISTRY' | 'BIOLOGY' | 'EARTH_SCIENCE';
}

const StudentList: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: number; name: string } | null>(null);

  const [filters, setFilters] = useState({
    subject: '',
    classId: '',
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [studentsResponse, classesResponse] = await Promise.all([
        studentAPI.getStudents(),
        classAPI.getClasses()
      ]);
      setStudents(studentsResponse);
      setClasses(classesResponse);
    } catch (error) {
      console.error('데이터 조회 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (e: SelectChangeEvent) => {
    const { name, value } = e.target;
    setFilters(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const filteredStudents = students.filter(student => {
    if (filters.subject) {
      const studentClass = classes.find(c => c.id === student.class_info);
      if (!studentClass || studentClass.subject !== filters.subject) return false;
    }
    if (filters.classId && student.class_info !== Number(filters.classId)) return false;
    return true;
  });

  const filteredClasses = classes.filter(c => !filters.subject || c.subject === filters.subject);

  const handleEdit = (studentId: number) => {
    navigate(`/students/${studentId}/edit`);
  };

  const handleDeleteClick = (studentId: number, studentName: string) => {
    setDeleteTarget({ id: studentId, name: studentName });
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;

    try {
      const response = await studentAPI.deleteStudent(deleteTarget.id);
      // 삭제 성공 시에만 목록에서 제거
      setStudents(students.filter(s => s.id !== deleteTarget.id));
      
      // 성공 메시지 표시
      if (response.message) {
        alert(response.message);
      } else {
        alert('학생이 성공적으로 삭제되었습니다.');
      }
    } catch (error: any) {
      console.error('학생 삭제 실패:', error);
      
      // 에러 메시지 처리
      let errorMessage = '학생 삭제에 실패했습니다.';
      
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
    }
    
    setDeleteDialogOpen(false);
    setDeleteTarget(null);
  };

  const handleDeleteCancel = () => {
    setDeleteDialogOpen(false);
    setDeleteTarget(null);
  };

  // 조교는 추가/수정/삭제 권한이 없지만 관리 권한은 있음
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
          학생 목록
        </Typography>
        {canEdit && (
          <Button
            variant="contained"
            color="primary"
            onClick={() => navigate('/students/new')}
          >
            학생 추가
          </Button>
        )}
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

      <TableContainer component={Paper} sx={{ maxHeight: 800 }}>
        <Table stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell>ID</TableCell>
              <TableCell>이름</TableCell>
              <TableCell>반</TableCell>
              <TableCell>부모님 전화번호</TableCell>
              <TableCell>학생 전화번호</TableCell>
              <TableCell>출석률</TableCell>
              <TableCell>평균 점수</TableCell>
              <TableCell>관리</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredStudents.map((student) => (
              <TableRow key={student.id}>
                <TableCell>{student.id}</TableCell>
                <TableCell>{student.name}</TableCell>
                <TableCell>{student.class_info_name}</TableCell>
                <TableCell>{student.parent_phone}</TableCell>
                <TableCell>{student.student_phone || '-'}</TableCell>
                <TableCell>
                  {student.attendance_stats.total_classes > 0 
                    ? `${Math.round((student.attendance_stats.attended_classes / student.attendance_stats.total_classes) * 100)}%`
                    : '0%'
                  }
                </TableCell>
                <TableCell>{student.exam_stats.average_score}점</TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Tooltip title="관리">
                      <IconButton
                        size="small"
                        onClick={() => navigate(`/students/${student.id}/management`)}
                        color="primary"
                      >
                        <NoteIcon />
                      </IconButton>
                    </Tooltip>
                    {canEdit && (
                      <>
                        <Tooltip title="수정">
                          <IconButton
                            size="small"
                            onClick={() => handleEdit(student.id)}
                            color="primary"
                          >
                            <EditIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="삭제">
                          <IconButton
                            size="small"
                            onClick={() => handleDeleteClick(student.id, student.name)}
                            color="error"
                          >
                            <DeleteIcon />
                          </IconButton>
                        </Tooltip>
                      </>
                    )}
                  </Box>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog
        open={deleteDialogOpen}
        onClose={handleDeleteCancel}
        aria-labelledby="alert-dialog-title"
        aria-describedby="alert-dialog-description"
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle id="alert-dialog-title">
          학생 삭제 확인
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="alert-dialog-description">
            <Typography variant="body1" sx={{ mb: 2 }}>
              <strong>{deleteTarget?.name}</strong> 학생을 삭제하시겠습니까?
            </Typography>
            <Alert severity="warning" sx={{ mb: 2 }}>
              이 작업은 되돌릴 수 없으며, 학생과 관련된 모든 출석 기록 및 시험 기록도 함께 삭제됩니다.
            </Alert>
            <Typography variant="body2" color="text.secondary">
              정말로 삭제하시겠습니까?
            </Typography>
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDeleteCancel} variant="outlined">
            취소
          </Button>
          <Button 
            onClick={handleDeleteConfirm} 
            color="error" 
            variant="contained"
            autoFocus
          >
            삭제
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default StudentList; 