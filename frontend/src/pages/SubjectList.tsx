import React, { useState, useEffect, useRef } from 'react';
import {
  Container,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Box,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  IconButton,
  CircularProgress,
  Snackbar,
  Alert,
} from '@mui/material';
import { Edit as EditIcon, Delete as DeleteIcon } from '@mui/icons-material';
import { subjectAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

interface Subject {
  id: number;
  name: string;
}

const SubjectList: React.FC = () => {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [name, setName] = useState('');
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error' | 'info' | 'warning';
  }>({
    open: false,
    message: '',
    severity: 'success',
  });
  
  const { user } = useAuth();
  const mountedRef = useRef(false);

  const isAdmin = user?.role === 'ADMIN';

  const fetchSubjects = async () => {
    try {
      const data = await subjectAPI.getSubjects();
      setSubjects(data);
    } catch (error) {
      console.error('과목 목록을 불러오는데 실패했습니다.', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!mountedRef.current) {
      mountedRef.current = true;
      fetchSubjects();
    }
  }, []);

  const handleOpen = (subject?: Subject) => {
    if (subject) {
      setEditingSubject(subject);
      setName(subject.name);
    } else {
      setEditingSubject(null);
      setName('');
    }
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      setSnackbar({
        open: true,
        message: '과목명을 입력해주세요.',
        severity: 'warning'
      });
      return;
    }

    try {
      if (editingSubject) {
        await subjectAPI.updateSubject(editingSubject.id, { name });
        setSnackbar({
          open: true,
          message: '과목이 성공적으로 수정되었습니다.',
          severity: 'success'
        });
      } else {
        await subjectAPI.createSubject({ name });
        setSnackbar({
          open: true,
          message: '새 과목이 추가되었습니다.',
          severity: 'success'
        });
      }
      fetchSubjects();
      handleClose();
    } catch (error: any) {
      setSnackbar({
        open: true,
        message: error.message || '저장에 실패했습니다.',
        severity: 'error'
      });
    }
  };

  const handleDelete = (subject: Subject) => {
    setSelectedSubject(subject);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!selectedSubject) return;

    try {
      await subjectAPI.deleteSubject(selectedSubject.id);
      setSubjects(subjects.filter(s => s.id !== selectedSubject.id));
      setSnackbar({
        open: true,
        message: '과목이 삭제되었습니다.',
        severity: 'success'
      });
    } catch (error: any) {
      setSnackbar({
        open: true,
        message: error.message || '삭제에 실패했습니다.',
        severity: 'error'
      });
    } finally {
      setDeleteDialogOpen(false);
      setSelectedSubject(null);
    }
  };

  const handleSnackbarClose = () => {
    setSnackbar(prev => ({ ...prev, open: false }));
  };

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, textAlign: 'center' }}>
        <CircularProgress />
        <Typography variant="body1" sx={{ mt: 2 }}>
          로딩 중...
        </Typography>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5" component="h1">
          과목 목록
        </Typography>
        {isAdmin && (
          <Button
            variant="contained"
            color="primary"
            onClick={() => handleOpen()}
          >
            과목 추가
          </Button>
        )}
      </Box>

      <TableContainer component={Paper} sx={{ maxHeight: 800 }}>
        <Table stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell sx={{ width: '70px' }}>ID</TableCell>
              <TableCell sx={{ width: '200px' }}>과목명</TableCell>
              <TableCell /> {/* 공간을 채워주는 빈 컬럼 */}
              {isAdmin && <TableCell sx={{ width: '100px' }}>관리</TableCell>}
            </TableRow>
          </TableHead>
          <TableBody>
            {subjects.map((subject) => (
              <TableRow key={subject.id}>
                <TableCell>{subject.id}</TableCell>
                <TableCell>{subject.name}</TableCell>
                <TableCell /> {/* 공간을 채워주는 빈 컬럼 */}
                {isAdmin && (
                  <TableCell>
                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                      <IconButton onClick={() => handleOpen(subject)} color="primary" size="small">
                        <EditIcon />
                      </IconButton>
                      <IconButton onClick={() => handleDelete(subject)} color="error" size="small">
                        <DeleteIcon />
                      </IconButton>
                    </Box>
                  </TableCell>
                )}
              </TableRow>
            ))}
            {subjects.length === 0 && (
              <TableRow>
                <TableCell colSpan={isAdmin ? 4 : 3} align="center">
                  등록된 과목이 없습니다.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* 등록/수정 다이얼로그 */}
      <Dialog open={open} onClose={handleClose} maxWidth="xs" fullWidth>
        <DialogTitle>{editingSubject ? '과목 수정' : '새 과목 추가'}</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="과목명"
            fullWidth
            variant="outlined"
            value={name}
            onChange={(e) => setName(e.target.value)}
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={handleClose} variant="outlined">취소</Button>
          <Button onClick={handleSubmit} color="primary" variant="contained">
            저장
          </Button>
        </DialogActions>
      </Dialog>

      {/* 삭제 확인 다이얼로그 */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>과목 삭제 확인</DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            이 작업은 되돌릴 수 없습니다.
          </Alert>
          <Typography>
            <strong>{selectedSubject?.name}</strong> 과목을 정말 삭제하시겠습니까?
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            이 과목과 연결된 반 정보 및 학생들의 출석/시험 기록 권한에 영향을 줄 수 있습니다.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDeleteDialogOpen(false)} variant="outlined">
            취소
          </Button>
          <Button onClick={confirmDelete} color="error" variant="contained">
            삭제
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleSnackbarClose}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert onClose={handleSnackbarClose} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default SubjectList;
