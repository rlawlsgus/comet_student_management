import React, { useState, useEffect } from 'react';
import {
  Container,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Box,
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
import { userAPI } from '../services/api';

interface User {
  id: number;
  username: string;
  name: string;
  role: 'ADMIN' | 'TEACHER' | 'ASSISTANT';
  subject: 'CHEMISTRY' | 'BIOLOGY' | 'GEOSCIENCE';
  date_joined: string;
}

const UserList: React.FC = () => {
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await userAPI.getUsers();
      setUsers(response);
    } catch (error) {
      console.error('회원 목록 조회 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (user: User) => {
    navigate(`/users/${user.id}/edit`);
  };

  const handleDelete = (user: User) => {
    setSelectedUser(user);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!selectedUser) return;

    try {
      const response = await userAPI.deleteUser(selectedUser.id);
      setUsers(users.filter(user => user.id !== selectedUser.id));
      
      // 성공 메시지 표시
      if (response.message) {
        alert(response.message);
      } else {
        alert('회원이 성공적으로 삭제되었습니다.');
      }
    } catch (error: any) {
      console.error('회원 삭제 중 오류 발생:', error);
      
      // 에러 메시지 처리
      let errorMessage = '회원 삭제에 실패했습니다.';
      
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
      setSelectedUser(null);
    }
  };

  const getRoleDisplay = (role: string) => {
    const roles = {
      'ADMIN': '관리자',
      'TEACHER': '선생님',
      'ASSISTANT': '조교',
    };
    return roles[role as keyof typeof roles] || role;
  };

  const getSubjectDisplay = (subject: string) => {
    const subjects = {
      'CHEMISTRY': '화학',
      'BIOLOGY': '생명',
      'GEOSCIENCE': '지학',
    };
    return subjects[subject as keyof typeof subjects] || subject;
  };

  // 현재 사용자의 권한에 따라 버튼 표시 여부 결정
  const canEdit = currentUser?.role !== 'ASSISTANT';

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, textAlign: 'center' }}>
        <CircularProgress />
        <Typography variant="body1" sx={{ mt: 2 }}>
          회원 목록을 불러오는 중...
        </Typography>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h5" component="h1">
          회원 목록
        </Typography>
        {canEdit && (
          <Button
            variant="contained"
            color="primary"
            onClick={() => navigate('/register')}
          >
            회원 등록
          </Button>
        )}
      </Box>

      <TableContainer component={Paper} sx={{ maxHeight: 800 }}>
        <Table stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell>ID</TableCell>
              <TableCell>아이디</TableCell>
              <TableCell>이름</TableCell>
              <TableCell>역할</TableCell>
              <TableCell>과목</TableCell>
              <TableCell>가입일</TableCell>
              {canEdit && <TableCell>관리</TableCell>}
            </TableRow>
          </TableHead>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.id}>
                <TableCell>{user.id}</TableCell>
                <TableCell>{user.username}</TableCell>
                <TableCell>{user.name}</TableCell>
                <TableCell>{getRoleDisplay(user.role)}</TableCell>
                <TableCell>{getSubjectDisplay(user.subject)}</TableCell>
                <TableCell>
                  {new Date(user.date_joined).toLocaleDateString('ko-KR')}
                </TableCell>
                {canEdit && (
                  <TableCell>
                    <IconButton
                      color="primary"
                      onClick={() => handleEdit(user)}
                      size="small"
                    >
                      <EditIcon />
                    </IconButton>
                    <IconButton
                      color="error"
                      onClick={() => handleDelete(user)}
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
        <DialogTitle>회원 삭제 확인</DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            이 작업은 되돌릴 수 없습니다.
          </Alert>
          <Typography>
            <strong>{selectedUser?.name}</strong>님을 정말 삭제하시겠습니까?
          </Typography>
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

export default UserList; 