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
  Chip,
} from '@mui/material';
import { 
  Edit as EditIcon, 
  Delete as DeleteIcon,
  AutoStories as NoteIcon,
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
  classes: number[];
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
    homework_completion: 100,
    homework_accuracy: 100,
    class_info: null as number | null,
  });

  const [newExam, setNewExam] = useState({
    name: '',
    category: 'REVIEW',
    score: 0,
    max_score: 100,
    grade: 'A',
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
    // Subject Filter
    if (filters.subject) {
      const studentClassSubjects = student.classes.map(classId => {
        const foundClass = classes.find(c => c.id === classId);
        return foundClass ? foundClass.subject : null;
      });
      if (!studentClassSubjects.includes(filters.subject as any)) {
        return false;
      }
    }
  
    // Class Filter
    if (filters.classId) {
      if (filters.classId === 'UNASSIGNED') {
        if (student.classes.length > 0) return false;
      } else {
        if (!student.classes.includes(Number(filters.classId))) return false;
      }
    }
  
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
      setStudents(students.filter(s => s.id !== deleteTarget.id));
      setSnackbar({ open: true, message: response.message || '학생이 성공적으로 삭제되었습니다.', severity: 'success' });
    } catch (error: any) {
      const errorMessage = error.response?.data?.detail || '학생 삭제에 실패했습니다.';
      setSnackbar({ open: true, message: errorMessage, severity: 'error' });
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
    if (!selectedStudent || !newAttendance.class_info) {
        setSnackbar({ open: true, message: '학생과 반을 모두 선택해야 합니다.', severity: 'error' });
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
      setSnackbar({ open: true, message: `${selectedStudent.name} 학생에게 출석 기록이 추가되었습니다.`, severity: 'success' });
    } catch (error: any) {
      console.error('Error submitting attendance:', error);
      setError(error.message || '출석 기록 추가 중 오류가 발생했습니다.');
    }
  };

  // 시험 기록 개별 추가
  const handleExamSubmit = async () => {
    if (!selectedStudent) return;

    const { category, name, score, max_score, grade, attendance } = newExam;

    if (!attendance) {
      setError('출석 기록을 선택해주세요.');
      return;
    }

    let examData: any = { name, category, attendance };

    if (category === 'REVIEW' || category === 'SCHOOL') {
      if (score < 0 || score > max_score) {
        setError(`점수는 0에서 ${max_score} 사이여야 합니다.`);
        return;
      }
      examData = { ...examData, score, max_score };
    } else if (category === 'ESSAY' || category === 'ORAL') {
      examData = { ...examData, grade };
    } else if (category === 'MOCK') {
      if (score < 0 || score > 50) {
        setError('점수는 0에서 50 사이여야 합니다.');
        return;
      }
      examData = { ...examData, score, max_score: 50 };
    }

    try {
      setError('');
      await examAPI.createExam(examData);

      setOpenExamDialog(false);
      setSnackbar({ open: true, message: `${selectedStudent.name} 학생에게 시험 기록이 추가되었습니다.`, severity: 'success' });
      
      // 폼 초기화
      setNewExam({
        name: '',
        category: 'REVIEW',
        score: 0,
        max_score: 100,
        grade: 'A',
        attendance: null,
      });
    } catch (error: any) {
      console.error('Error submitting exam:', error);
      const errText = error.response?.data?.detail || error.message || '시험 기록 추가 중 오류가 발생했습니다.';
      setError(errText);
      setSnackbar({ open: true, message: errText, severity: 'error' });
    }
  };

  const handleStudentSelectForExam = async (student: Student) => {
    setSelectedStudent(student);
    setError('');
    try {
      const attendances = await studentAPI.getAttendanceRecords(student.id);
      setStudentAttendances(attendances);
      
      // 폼 초기화 및 가장 최근 출석 기록을 기본값으로 설정
      setNewExam({
        name: '',
        category: 'REVIEW',
        score: 0,
        max_score: 100,
        grade: 'A',
        attendance: attendances.length > 0 ? attendances[0].id : null,
      });

      setOpenExamDialog(true);
    } catch (error: any) {
      setSnackbar({ open: true, message: '출석 기록을 불러오는 중 오류가 발생했습니다.', severity: 'error' });
    }
  };
  
  const [sendTargets, setSendTargets] = useState<any[]>([]);
  const [loadingSendData, setLoadingSendData] = useState(false);

  const loadSendTargetData = async () => {
    if (filteredStudents.length === 0) {
      setSnackbar({ open: true, message: '전송할 학생이 없습니다.', severity: 'error' });
      return;
    }

    try {
      setLoadingSendData(true);
      setError('');
      const today = format(new Date(), 'yyyy-MM-dd');
      
      const studentPromises = filteredStudents.map(async (student) => {
        const attendances = await studentAPI.getAttendanceRecords(student.id);
        const todayAttendances = attendances.filter((att: any) => att.date === today);
        
        if (todayAttendances.length > 0) {
          const exams = await studentAPI.getExamRecords(student.id);
          const todayExams = exams.filter((exam: any) => exam.exam_date === today);
          
          const attendanceWithExams = todayAttendances.map(async (att: any) => {
            const classExams = todayExams.filter((ex: any) => ex.attendance === att.id);
            const examAverages = await examAPI.getExamAverages(undefined, att.class_info);
            
            const examsWithAverages = classExams.map((exam: any) => {
              const examAverage = examAverages.find((avg: any) => avg.name === exam.name);
              return { ...exam, ...examAverage };
            });
            return { student, attendance: att, exams: examsWithAverages };
          });
          return Promise.all(attendanceWithExams);
        }
        return null;
      });

      const results = (await Promise.all(studentPromises)).flat().filter(Boolean);

      if (results.length === 0) {
        setSnackbar({ open: true, message: '오늘 출석 기록이 있는 학생이 없습니다.', severity: 'error' });
        return;
      }

      setSendTargets(results as any[]);
      setOpenSendDialog(true);
    } catch (error: any) {
      setSnackbar({ open: true, message: '전송 데이터를 불러오는 중 오류가 발생했습니다.', severity: 'error' });
    } finally {
      setLoadingSendData(false);
    }
  };
  
  const handleSendKakaoNotification = async () => {
    // This logic needs to be revisited as a student might have multiple attendances
    // For now, we'll send a notification for each attendance record.
    try {
      const responses = await Promise.all(sendTargets.map(target => 
        notificationAPI.sendSingleNotification(target.student.id, target.attendance.id)
      ));
      
      const successCount = responses.filter(r => r.message).length;
      setSnackbar({ open: true, message: `${successCount}건의 알림톡이 성공적으로 전송되었습니다.`, severity: 'success' });
      setOpenSendDialog(false);
    } catch (error: any) {
      setSnackbar({ open: true, message: '알림톡 전송 중 오류가 발생했습니다.', severity: 'error' });
    }
  };

  const handleSnackbarClose = () => {
    setSnackbar(prev => ({ ...prev, open: false }));
  };

  const canEdit = user?.role !== 'ASSISTANT';

  if (loading) {
    return <Container maxWidth="lg" sx={{ mt: 4 }}><Typography>로딩 중...</Typography></Container>;
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h5" component="h1">학생 목록</Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button variant="contained" color="secondary" startIcon={<SendIcon />} onClick={loadSendTargetData} disabled={filteredStudents.length === 0 || loadingSendData}>
            {loadingSendData ? '데이터 로딩 중...' : '일괄 전송'}
          </Button>
          {canEdit && <Button variant="contained" color="primary" onClick={() => navigate('/students/new')}>학생 추가</Button>}
        </Box>
      </Box>

      <Paper sx={{ p: 2, mb: 3 }}>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <FormControl fullWidth>
            <InputLabel>과목</InputLabel>
            <Select name="subject" value={filters.subject} onChange={handleFilterChange} label="과목">
              <MenuItem value="">전체</MenuItem>
              <MenuItem value="CHEMISTRY">화학</MenuItem>
              <MenuItem value="BIOLOGY">생명</MenuItem>
              <MenuItem value="GEOSCIENCE">지학</MenuItem>
            </Select>
          </FormControl>
          <FormControl fullWidth>
            <InputLabel>반</InputLabel>
            <Select name="classId" value={filters.classId} onChange={handleFilterChange} label="반">
              <MenuItem value="">전체</MenuItem>
              <MenuItem value="UNASSIGNED">반 미배정</MenuItem>
              {filteredClasses.map((classItem) => (
                <MenuItem key={classItem.id} value={classItem.id}>{classItem.name}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
      </Paper>

      <TableContainer component={Paper} sx={{ maxHeight: 800 }}>
        <Table stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell sx={{ whiteSpace: 'nowrap' }}>ID</TableCell>
              <TableCell sx={{ whiteSpace: 'nowrap' }}>이름</TableCell>
              <TableCell>수강 반</TableCell>
              <TableCell sx={{ whiteSpace: 'nowrap' }}>부모님 전화번호</TableCell>
              <TableCell sx={{ whiteSpace: 'nowrap' }}>학생 전화번호</TableCell>
              <TableCell sx={{ whiteSpace: 'nowrap' }}>출석률</TableCell>
              <TableCell sx={{ whiteSpace: 'nowrap' }}>평균 점수</TableCell>
              <TableCell sx={{ whiteSpace: 'nowrap' }}>관리</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredStudents.map((student) => (
              <TableRow key={student.id}>
                <TableCell sx={{ whiteSpace: 'nowrap' }}>{student.id}</TableCell>
                <TableCell sx={{ whiteSpace: 'nowrap' }}>{student.name}</TableCell>
                <TableCell>
                  {student.classes.map(classId => {
                    const className = classes.find(c => c.id === classId)?.name;
                    return <Chip key={classId} label={className || '알 수 없는 반'} size="small" sx={{ mr: 0.5, mb: 0.5 }} />;
                  })}
                </TableCell>
                <TableCell sx={{ whiteSpace: 'nowrap' }}>{student.parent_phone}</TableCell>
                <TableCell sx={{ whiteSpace: 'nowrap' }}>{student.student_phone || '-'}</TableCell>
                <TableCell sx={{ whiteSpace: 'nowrap' }}>
                  {student.attendance_stats.total_classes > 0 
                    ? `${Math.round((student.attendance_stats.attended_classes / student.attendance_stats.total_classes) * 100)}%`
                    : '0%'}
                </TableCell>
                <TableCell sx={{ whiteSpace: 'nowrap' }}>{student.exam_stats.average_score}점</TableCell>
                <TableCell sx={{ whiteSpace: 'nowrap' }}>
                  <Box sx={{ display: 'flex', gap: 0.5 }}>
                    <Tooltip title="출석 기록 추가"><IconButton size="small" onClick={() => { setSelectedStudent(student); setOpenAttendanceDialog(true); }} color="info"><AssignmentIcon /></IconButton></Tooltip>
                    <Tooltip title="시험 기록 추가"><IconButton size="small" onClick={() => handleStudentSelectForExam(student)} color="warning"><SchoolIcon /></IconButton></Tooltip>
                    <Tooltip title="학생 관리"><IconButton size="small" onClick={() => navigate(`/students/${student.id}/management`)} color="default"><NoteIcon /></IconButton></Tooltip>
                    {canEdit && (
                      <>
                        <Tooltip title="수정"><IconButton size="small" onClick={() => handleEdit(student.id)} color="primary"><EditIcon /></IconButton></Tooltip>
                        <Tooltip title="삭제"><IconButton size="small" onClick={() => handleDeleteClick(student.id, student.name)} color="error"><DeleteIcon /></IconButton></Tooltip>
                      </>
                    )}
                  </Box>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      
      {/* Dialogs and Snackbar... */}
       <Dialog
        open={deleteDialogOpen}
        onClose={handleDeleteCancel}
      >
        <DialogTitle>학생 삭제 확인</DialogTitle>
        <DialogContent>
          <DialogContentText>
            <strong>{deleteTarget?.name}</strong> 학생을 삭제하시겠습니까? 이 작업은 되돌릴 수 없으며, 관련된 모든 출석 및 시험 기록이 삭제됩니다.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDeleteCancel}>취소</Button>
          <Button onClick={handleDeleteConfirm} color="error">삭제</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={openAttendanceDialog} onClose={() => setOpenAttendanceDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>출석 기록 추가: {selectedStudent?.name}</DialogTitle>
        <DialogContent>
            <FormControl fullWidth sx={{ mt: 2, mb: 2 }}>
                <InputLabel>수업 선택</InputLabel>
                <Select
                    value={newAttendance.class_info || ''}
                    label="수업 선택"
                    onChange={(e) => setNewAttendance({ ...newAttendance, class_info: e.target.value as number })}
                >
                    {selectedStudent?.classes.map(classId => {
                        const classInfo = classes.find(c => c.id === classId);
                        return <MenuItem key={classId} value={classId}>{classInfo?.name}</MenuItem>
                    })}
                </Select>
            </FormControl>
            <LocalizationProvider dateAdapter={AdapterDateFns}>
                <DatePicker label="날짜" value={newAttendance.date} onChange={(date) => setNewAttendance({ ...newAttendance, date: date || new Date() })} sx={{ width: '100%', mb: 2 }}/>
            </LocalizationProvider>
            <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel>수업 종류</InputLabel>
                <Select value={newAttendance.class_type} label="수업 종류" onChange={(e) => setNewAttendance({ ...newAttendance, class_type: e.target.value })}>
                    <MenuItem value="REGULAR">정규</MenuItem>
                    <MenuItem value="MAKEUP">대체</MenuItem>
                    <MenuItem value="EXTRA">보강</MenuItem>
                    <MenuItem value="ADDITIONAL">추가</MenuItem>
                </Select>
            </FormControl>
            <TextField fullWidth multiline rows={3} label="수업 내용" value={newAttendance.content} onChange={(e) => setNewAttendance({ ...newAttendance, content: e.target.value })} sx={{ mb: 2 }}/>
            <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel>지각 여부</InputLabel>
                <Select value={newAttendance.is_late} label="지각 여부" onChange={(e) => setNewAttendance({ ...newAttendance, is_late: e.target.value })}>
                    <MenuItem value="false">아니오</MenuItem>
                    <MenuItem value="true">예</MenuItem>
                </Select>
            </FormControl>
            <Typography gutterBottom>숙제 이행도: {newAttendance.homework_completion}%</Typography>
            <Slider value={newAttendance.homework_completion} onChange={(_, value) => setNewAttendance({ ...newAttendance, homework_completion: value as number })} min={0} max={100} step={10} marks valueLabelDisplay="auto" />
            <Typography gutterBottom>숙제 정답률: {newAttendance.homework_accuracy}%</Typography>
            <Slider value={newAttendance.homework_accuracy} onChange={(_, value) => setNewAttendance({ ...newAttendance, homework_accuracy: value as number })} min={0} max={100} step={10} marks valueLabelDisplay="auto" />
        </DialogContent>
        <DialogActions>
            <Button onClick={() => setOpenAttendanceDialog(false)}>취소</Button>
            <Button onClick={handleAttendanceSubmit} variant="contained">추가</Button>
        </DialogActions>
            </Dialog>
      
      {/* 시험 기록 개별 추가 다이얼로그 */}
      <Dialog open={openExamDialog} onClose={() => setOpenExamDialog(false)} sx={{ '& .MuiDialog-paper': { width: '500px' } }}>
        <DialogTitle>시험 기록 추가: {selectedStudent?.name}</DialogTitle>
        <DialogContent>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          <FormControl fullWidth sx={{ mt: 2, mb: 2 }}>
            <InputLabel id="exam-category-label">시험 종류</InputLabel>
            <Select
              labelId="exam-category-label"
              value={newExam.category}
              label="시험 종류"
              onChange={(e) => setNewExam({ ...newExam, category: e.target.value, score: 0, max_score: e.target.value === 'MOCK' ? 50 : 100 })}
            >
              <MenuItem value="REVIEW">복습테스트</MenuItem>
              <MenuItem value="ESSAY">서술테스트</MenuItem>
              <MenuItem value="ORAL">구술테스트</MenuItem>
              <MenuItem value="MOCK">모의고사</MenuItem>
              <MenuItem value="SCHOOL">학교기출</MenuItem>
            </Select>
          </FormControl>
          <TextField
            fullWidth
            label="시험 이름"
            value={newExam.name}
            onChange={(e) => setNewExam({ ...newExam, name: e.target.value })}
            sx={{ mb: 2 }}
            required
          />

          {(newExam.category === 'REVIEW' || newExam.category === 'SCHOOL') && (
            <>
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
            </>
          )}

          {newExam.category === 'MOCK' && (
            <>
              <TextField
                fullWidth
                type="number"
                label="만점"
                value={50}
                disabled
                sx={{ mb: 2 }}
              />
              <TextField
                fullWidth
                type="number"
                label="점수"
                value={newExam.score}
                onChange={(e) => {
                  const value = Number(e.target.value);
                  if (value >= 0 && value <= 50) {
                    setNewExam({ ...newExam, score: value });
                  }
                }}
                inputProps={{ min: 0, max: 50 }}
                sx={{ mb: 2 }}
              />
            </>
          )}

          {(newExam.category === 'ESSAY' || newExam.category === 'ORAL') && (
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel id="exam-grade-label">등급</InputLabel>
              <Select
                labelId="exam-grade-label"
                value={newExam.grade}
                label="등급"
                onChange={(e) => setNewExam({ ...newExam, grade: e.target.value })}
              >
                <MenuItem value="A+">A+</MenuItem>
                <MenuItem value="A">A</MenuItem>
                <MenuItem value="A-">A-</MenuItem>
                <MenuItem value="B+">B+</MenuItem>
                <MenuItem value="B">B</MenuItem>
                <MenuItem value="B-">B-</MenuItem>
                <MenuItem value="C+">C+</MenuItem>
                <MenuItem value="C">C</MenuItem>
                <MenuItem value="C-">C-</MenuItem>
                <MenuItem value="D">D</MenuItem>
                <MenuItem value="F">F</MenuItem>
              </Select>
            </FormControl>
          )}
          
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
                  {`${attendance.date} - ${attendance.class_info_name || '알 수 없는 반'}`}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenExamDialog(false)}>취소</Button>
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