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
  Snackbar,
  Divider,
  Slider,
  TextField,
} from '@mui/material';
import { 
  Edit as EditIcon, 
  Delete as DeleteIcon,
  AutoStories as NoteIcon,
  Add as AddIcon,
  Send as SendIcon,
  Assignment as AssignmentIcon,
  School as SchoolIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { studentAPI, classAPI, attendanceAPI, examAPI, notificationAPI } from '../services/api';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { format } from 'date-fns';

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
  subject: 'CHEMISTRY' | 'BIOLOGY' | 'GEOSCIENCE';
}

const StudentList: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: number; name: string } | null>(null);
  const [openAttendanceDialog, setOpenAttendanceDialog] = useState(false);
  const [openExamDialog, setOpenExamDialog] = useState(false);
  const [openSendDialog, setOpenSendDialog] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [studentAttendances, setStudentAttendances] = useState<any[]>([]);
  const [error, setError] = useState<string>('');
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success',
  });

  const [filters, setFilters] = useState({
    subject: '',
    classId: '',
  });

  const [newAttendance, setNewAttendance] = useState({
    date: new Date(),
    class_type: 'REGULAR',
    content: '',
    is_late: 'false' as string,
    homework_completion: 0,
    homework_accuracy: 0,
  });

  const [newExam, setNewExam] = useState({
    name: '',
    score: 0,
    max_score: 100,
    attendance: null as number | null,
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

  // 출석 기록 개별 추가
  const handleAttendanceSubmit = async () => {
    if (!selectedStudent) {
      setSnackbar({
        open: true,
        message: '학생이 선택되지 않았습니다.',
        severity: 'error',
      });
      return;
    }

    // 유효성 검사
    if (newAttendance.homework_completion < 0 || newAttendance.homework_completion > 100) {
      setError('숙제 이행도는 0에서 100 사이여야 합니다.');
      return;
    }
    if (newAttendance.homework_accuracy < 0 || newAttendance.homework_accuracy > 100) {
      setError('숙제 정답률은 0에서 100 사이여야 합니다.');
      return;
    }

    try {
      setError('');
      await attendanceAPI.createAttendance({
        ...newAttendance,
        student: selectedStudent.id,
        date: format(newAttendance.date, 'yyyy-MM-dd'),
        is_late: newAttendance.is_late === 'true',
      });

      setOpenAttendanceDialog(false);
      setSelectedStudent(null);
      
      // 폼 초기화
      setNewAttendance({
        date: new Date(),
        class_type: 'REGULAR',
        content: '',
        is_late: 'false',
        homework_completion: 0,
        homework_accuracy: 0,
      });

      setSnackbar({
        open: true,
        message: `${selectedStudent.name} 학생에게 출석 기록이 추가되었습니다.`,
        severity: 'success',
      });
    } catch (error: any) {
      console.error('Error submitting attendance:', error);
      setError(error.message || '출석 기록 추가 중 오류가 발생했습니다.');
    }
  };

  // 시험 기록 개별 추가
  const handleExamSubmit = async () => {
    if (!selectedStudent) {
      setSnackbar({
        open: true,
        message: '학생이 선택되지 않았습니다.',
        severity: 'error',
      });
      return;
    }

    // 유효성 검사
    if (newExam.score < 0 || newExam.score > newExam.max_score) {
      setError(`점수는 0에서 ${newExam.max_score} 사이여야 합니다.`);
      return;
    }

    if (!newExam.attendance) {
      setError('출석 기록을 선택해주세요.');
      return;
    }

    try {
      setError('');
      
      // 선택된 출석 기록에 시험 기록 추가
      await examAPI.createExam({
        name: newExam.name,
        score: newExam.score,
        max_score: newExam.max_score,
        attendance: newExam.attendance,
      });

      setOpenExamDialog(false);
      setSelectedStudent(null);
      setStudentAttendances([]);
      
      // 폼 초기화
      setNewExam({
        name: '',
        score: 0,
        max_score: 100,
        attendance: null,
      });

      setSnackbar({
        open: true,
        message: `${selectedStudent.name} 학생에게 시험 기록이 추가되었습니다.`,
        severity: 'success',
      });
    } catch (error: any) {
      console.error('Error submitting exam:', error);
      setError(error.message || '시험 기록 추가 중 오류가 발생했습니다.');
    }
  };

  // 학생 선택 시 출석 기록 가져오기
  const handleStudentSelectForExam = async (student: Student) => {
    setSelectedStudent(student);
    try {
      const attendances = await studentAPI.getAttendanceRecords(student.id);
      setStudentAttendances(attendances);
      setOpenExamDialog(true);
    } catch (error: any) {
      console.error('Error fetching attendances:', error);
      setSnackbar({
        open: true,
        message: '출석 기록을 불러오는 중 오류가 발생했습니다.',
        severity: 'error',
      });
    }
  };

  // 전송 대상 데이터 가져오기
  const [sendTargets, setSendTargets] = useState<any[]>([]);
  const [loadingSendData, setLoadingSendData] = useState(false);

  const loadSendTargetData = async () => {
    if (filteredStudents.length === 0) {
      setSnackbar({
        open: true,
        message: '전송할 학생이 없습니다.',
        severity: 'error',
      });
      return;
    }

    try {
      setLoadingSendData(true);
      setError('');
      const today = format(new Date(), 'yyyy-MM-dd');
      
      // 각 학생의 오늘 출석 기록과 시험 기록 가져오기
      const studentPromises = filteredStudents.map(async (student) => {
        const attendances = await studentAPI.getAttendanceRecords(student.id);
        const todayAttendance = attendances.find((att: any) => att.date === today);
        
        if (todayAttendance) {
          const exams = await studentAPI.getExamRecords(student.id);
          const todayExams = exams.filter((exam: any) => exam.exam_date === today);
          
          // 각 시험의 평균 정보 가져오기 (해당 학생의 반 기준)
          const examAverages = await examAPI.getExamAverages(student.id);
          
          // 시험 기록에 평균 정보 추가
          const examsWithAverages = todayExams.map((exam: any) => {
            const examAverage = examAverages.find((avg: any) => avg.name === exam.name);
            return {
              ...exam,
              average_score: examAverage?.average_score || 0,
              class_average: examAverage?.average_score || 0,
              class_max_score: examAverage?.max_score || 0,
              class_min_score: examAverage?.min_score || 0,
              class_count: examAverage?.count || 0,
            };
          });
          
          return {
            student,
            attendance: todayAttendance,
            exams: examsWithAverages,
          };
        }
        return null;
      });

      const results = await Promise.all(studentPromises);
      const validResults = results.filter(result => result !== null);

      if (validResults.length === 0) {
        setSnackbar({
          open: true,
          message: '오늘 출석 기록이 있는 학생이 없습니다.',
          severity: 'error',
        });
        return;
      }

      setSendTargets(validResults);
      setOpenSendDialog(true);
    } catch (error: any) {
      console.error('Error loading send data:', error);
      setSnackbar({
        open: true,
        message: error.message || '전송 데이터를 불러오는 중 오류가 발생했습니다.',
        severity: 'error',
      });
    } finally {
      setLoadingSendData(false);
    }
  };

  // 일괄 전송
  const handleSendKakaoNotification = async () => {
    if (sendTargets.length === 0) {
      setSnackbar({
        open: true,
        message: '전송할 데이터가 없습니다.',
        severity: 'error',
      });
      return;
    }

    try {
      setError('');
      
      // 백엔드 API 호출
      const studentIds = sendTargets.map(target => target.student.id);
      const today = format(new Date(), 'yyyy-MM-dd');
      
      const response = await notificationAPI.sendBulkNotification(studentIds, today);
      
      setSnackbar({
        open: true,
        message: response.message || `${response.success_count || sendTargets.length}명의 학생에게 알림톡이 전송되었습니다.`,
        severity: 'success',
      });

      setOpenSendDialog(false);
      setSendTargets([]);
    } catch (error: any) {
      console.error('Error sending kakao notification:', error);
      setSnackbar({
        open: true,
        message: error.message || '알림톡 전송 중 오류가 발생했습니다.',
        severity: 'error',
      });
    }
  };

  const handleSnackbarClose = () => {
    setSnackbar(prev => ({ ...prev, open: false }));
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
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="contained"
            color="secondary"
            startIcon={<SendIcon />}
            onClick={loadSendTargetData}
            disabled={filteredStudents.length === 0 || loadingSendData}
          >
            {loadingSendData ? '데이터 로딩 중...' : '일괄 전송'}
          </Button>
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
              <MenuItem value="GEOSCIENCE">지학</MenuItem>
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
                                        <Tooltip title="출석 기록 추가">
                      <IconButton
                        size="small"
                        onClick={() => {
                          setSelectedStudent(student);
                          setOpenAttendanceDialog(true);
                        }}
                        color="info"
                      >
                        <AssignmentIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="시험 기록 추가">
                      <IconButton
                        size="small"
                        onClick={() => handleStudentSelectForExam(student)}
                        color="warning"
                      >
                        <SchoolIcon />
                      </IconButton>
                    </Tooltip>
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

      {/* 출석 기록 개별 추가 다이얼로그 */}
      <Dialog 
        open={openAttendanceDialog} 
        onClose={() => setOpenAttendanceDialog(false)} 
        maxWidth="md" 
        fullWidth
      >
        <DialogTitle>출석 기록 추가</DialogTitle>
        <DialogContent>
          {selectedStudent && (
            <Alert severity="info" sx={{ mb: 2 }}>
              {selectedStudent.name} 학생에게 출석 기록을 추가합니다.
            </Alert>
          )}
          
          <LocalizationProvider dateAdapter={AdapterDateFns}>
            <DatePicker
              label="날짜"
              value={newAttendance.date}
              onChange={(date) => setNewAttendance({ ...newAttendance, date: date || new Date() })}
              sx={{ mt: 2, mb: 2, width: '100%' }}
            />
          </LocalizationProvider>
          
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel id="class-type-label">수업 종류</InputLabel>
            <Select
              labelId="class-type-label"
              value={newAttendance.class_type}
              label="수업 종류"
              onChange={(e) => setNewAttendance({ ...newAttendance, class_type: e.target.value })}
            >
              <MenuItem value="REGULAR">정규</MenuItem>
              <MenuItem value="MAKEUP">대체</MenuItem>
              <MenuItem value="EXTRA">보강</MenuItem>
              <MenuItem value="ADDITIONAL">추가</MenuItem>
            </Select>
          </FormControl>
          
          <TextField
            fullWidth
            multiline
            rows={4}
            label="수업 내용"
            value={newAttendance.content}
            onChange={(e) => setNewAttendance({ ...newAttendance, content: e.target.value })}
            sx={{ mb: 2 }}
          />
          
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel id="is-late-label">지각 여부</InputLabel>
            <Select
              labelId="is-late-label"
              value={newAttendance.is_late}
              label="지각 여부"
              onChange={(e) => setNewAttendance({ ...newAttendance, is_late: e.target.value })}
            >
              <MenuItem value="false">아니오</MenuItem>
              <MenuItem value="true">예</MenuItem>
            </Select>
          </FormControl>
          
          <Typography gutterBottom>
            숙제 이행도: {newAttendance.homework_completion}%
          </Typography>
          <Slider
            value={newAttendance.homework_completion}
            onChange={(_, value) => setNewAttendance({ ...newAttendance, homework_completion: value as number })}
            min={0}
            max={100}
            step={1}
            marks={[
              { value: 0, label: '0%' },
              { value: 50, label: '50%' },
              { value: 100, label: '100%' },
            ]}
            sx={{ mb: 2 }}
          />
          
          <Typography gutterBottom>
            숙제 정답률: {newAttendance.homework_accuracy}%
          </Typography>
          <Slider
            value={newAttendance.homework_accuracy}
            onChange={(_, value) => setNewAttendance({ ...newAttendance, homework_accuracy: value as number })}
            min={0}
            max={100}
            step={1}
            marks={[
              { value: 0, label: '0%' },
              { value: 50, label: '50%' },
              { value: 100, label: '100%' },
            ]}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenAttendanceDialog(false)}>취소</Button>
          <Button onClick={handleAttendanceSubmit} variant="contained">
            추가
          </Button>
        </DialogActions>
      </Dialog>

      {/* 시험 기록 개별 추가 다이얼로그 */}
      <Dialog 
        open={openExamDialog} 
        onClose={() => setOpenExamDialog(false)} 
        maxWidth="md" 
        fullWidth
      >
        <DialogTitle>시험 기록 추가</DialogTitle>
        <DialogContent>
          {selectedStudent && (
            <Alert severity="info" sx={{ mb: 2 }}>
              {selectedStudent.name} 학생에게 시험 기록을 추가합니다.
            </Alert>
          )}
          
          <TextField
            fullWidth
            label="시험 이름"
            value={newExam.name}
            onChange={(e) => setNewExam({ ...newExam, name: e.target.value })}
            sx={{ mb: 2 }}
          />
          
          <TextField
            fullWidth
            type="number"
            label="만점"
            value={newExam.max_score}
            onChange={(e) => {
              const value = Number(e.target.value);
              if (value > 0) {
                setNewExam({ ...newExam, max_score: value });
              }
            }}
            inputProps={{ min: 1 }}
            sx={{ mb: 2 }}
          />
          
          <TextField
            fullWidth
            type="number"
            label="점수"
            value={newExam.score}
            onChange={(e) => {
              const value = Number(e.target.value);
              if (value >= 0 && value <= newExam.max_score) {
                setNewExam({ ...newExam, score: value });
              }
            }}
            inputProps={{ min: 0, max: newExam.max_score }}
            sx={{ mb: 2 }}
          />
          
          <FormControl fullWidth>
            <InputLabel id="attendance-label">출석 기록 선택</InputLabel>
            <Select
              labelId="attendance-label"
              value={newExam.attendance || ''}
              label="출석 기록 선택"
              onChange={(e) => setNewExam({ ...newExam, attendance: e.target.value as number })}
              MenuProps={{
                PaperProps: {
                  style: {
                    maxHeight: 300,
                  },
                },
              }}
            >
              {studentAttendances.map((attendance) => (
                <MenuItem key={attendance.id} value={attendance.id}>
                  {attendance.date} - {attendance.class_type_display}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setOpenExamDialog(false);
            setSelectedStudent(null);
            setStudentAttendances([]);
          }}>취소</Button>
          <Button onClick={handleExamSubmit} variant="contained">
            추가
          </Button>
        </DialogActions>
      </Dialog>

      {/* 일괄 전송 확인 다이얼로그 */}
      <Dialog 
        open={openSendDialog} 
        onClose={() => {
          setOpenSendDialog(false);
          setSendTargets([]);
        }}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>일괄 알림톡 전송 확인</DialogTitle>
        <DialogContent>
          <Alert severity="info" sx={{ mb: 2 }}>
            오늘 출석 기록이 있는 학생들의 정보를 학부모님께 전송합니다.
          </Alert>
          
          <Typography variant="h6" sx={{ mb: 1 }}>
            전송 대상
          </Typography>
          <Typography sx={{ mb: 2 }}>
            학생 수: <strong>{sendTargets.length}명</strong><br />
            전송 조건: 오늘({format(new Date(), 'yyyy-MM-dd')}) 출석 기록이 있는 학생
          </Typography>

          <Divider sx={{ my: 2 }} />

          {/* 전송할 내용 미리보기 */}
          <Typography variant="h6" sx={{ mb: 2 }}>
            전송할 내용 미리보기
          </Typography>
          
          <Box sx={{ maxHeight: 400, overflow: 'auto', mb: 2 }}>
            {sendTargets.map((target, index) => (
              <Box key={index} sx={{ mb: 3, p: 2, border: '1px solid #e0e0e0', borderRadius: 1 }}>
                <Typography variant="h6" sx={{ mb: 1, color: 'primary.main' }}>
                  {target.student.name} 학생
                </Typography>
                
                <Typography variant="body2" sx={{ mb: 1 }}>
                  <strong>학부모 연락처:</strong> {target.student.parent_phone}
                </Typography>

                <Divider sx={{ my: 1 }} />

                {/* 출석 기록 */}
                <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 'bold' }}>
                  출석 기록
                </Typography>
                <Typography variant="body2" sx={{ mb: 1 }}>
                  날짜: <strong>{target.attendance.date}</strong><br />
                  수업 종류: <strong>{target.attendance.class_type_display}</strong><br />
                  내용: <strong>{target.attendance.content}</strong><br />
                  지각: <strong>{target.attendance.is_late ? '예' : '아니오'}</strong><br />
                  숙제 이행도: <strong>{target.attendance.homework_completion}%</strong><br />
                  숙제 정답률: <strong>{target.attendance.homework_accuracy}%</strong>
                </Typography>

                {/* 관련된 시험 기록들 */}
                {target.exams.length > 0 && (
                  <>
                    <Divider sx={{ my: 1 }} />
                    <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 'bold' }}>
                      관련된 시험 기록 ({target.exams.length}개)
                    </Typography>
                    {target.exams.map((exam: any, examIndex: number) => (
                      <Box key={examIndex} sx={{ mb: 1, p: 1, backgroundColor: '#f5f5f5', borderRadius: 1 }}>
                        <Typography variant="body2">
                          <strong>{exam.name}</strong><br />
                          점수: <strong>{exam.score}/{exam.max_score}</strong><br />
                          반 평균: <strong>{Math.round(exam.class_average)}/{exam.max_score}</strong><br />
                          반 최고점: <strong>{exam.class_max_score}</strong><br />
                        </Typography>
                      </Box>
                    ))}
                  </>
                )}

                {target.exams.length === 0 && (
                  <>
                    <Divider sx={{ my: 1 }} />
                    <Typography variant="body2" color="text.secondary">
                      관련된 시험 기록이 없습니다.
                    </Typography>
                  </>
                )}
              </Box>
            ))}
          </Box>

          <Alert severity="warning" sx={{ mb: 2 }}>
            위 내용이 각 학생의 학부모님께 전송됩니다. 신중하게 확인 후 전송해주세요.
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => {
              setOpenSendDialog(false);
              setSendTargets([]);
            }} 
            variant="outlined"
          >
            취소
          </Button>
          <Button onClick={handleSendKakaoNotification} color="primary" variant="contained">
            전송
          </Button>
        </DialogActions>
      </Dialog>

      {/* 스낵바 */}
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

export default StudentList; 