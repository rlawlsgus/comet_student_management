import React, { useState, useEffect } from 'react';
import {
  Box,
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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  Checkbox,
  IconButton,
  Tooltip,
  Snackbar,
  Divider,
  Slider,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { format } from 'date-fns';
import { useParams, useNavigate } from 'react-router-dom';
import DeleteIcon from '@mui/icons-material/Delete';
import SendIcon from '@mui/icons-material/Send';
import { studentAPI, attendanceAPI, examAPI, notificationAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

interface Student {
  id: number;
  name: string;
  class_info_name: string;
  parent_phone: string;
  student_phone?: string;
}

interface Attendance {
  id: number;
  date: string;
  class_type: string;
  class_type_display: string;
  content: string;
  is_late: boolean;
  homework_completion: number;
  homework_accuracy: number;
}

interface Exam {
  id: number;
  name: string;
  score: number;
  max_score: number;
  exam_date: string;
  attendance: number;
}

interface ExamAverage {
  name: string;
  average_score: number;
  max_score: number;
  min_score: number;
  count: number;
}

const StudentManagement: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const [student, setStudent] = useState<Student | null>(null);
  const [attendances, setAttendances] = useState<Attendance[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);
  const [examAverages, setExamAverages] = useState<ExamAverage[]>([]);
  const [openAttendanceDialog, setOpenAttendanceDialog] = useState(false);
  const [openExamDialog, setOpenExamDialog] = useState(false);
  const [openDeleteAttendanceDialog, setOpenDeleteAttendanceDialog] = useState(false);
  const [openDeleteExamDialog, setOpenDeleteExamDialog] = useState(false);
  const [openSendDialog, setOpenSendDialog] = useState(false);
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [selectedAttendances, setSelectedAttendances] = useState<number[]>([]);
  const [selectedExams, setSelectedExams] = useState<number[]>([]);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success',
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
    if (id) {
      fetchStudentData(Number(id));
    }
  }, [id]);

  const fetchStudentData = async (studentId: number) => {
    try {
      setLoading(true);
      setError('');

      // 학생 정보 가져오기
      const studentData = await studentAPI.getStudent(studentId);
      setStudent(studentData);

      // 출석 기록 가져오기
      const attendanceData = await studentAPI.getAttendanceRecords(studentId);
      setAttendances(attendanceData);

      // 시험 기록 가져오기
      const examData = await studentAPI.getExamRecords(studentId);
      setExams(examData);

      // 시험별 평균 점수 가져오기
      const averageData = await examAPI.getExamAverages(studentId);
      setExamAverages(averageData);
    } catch (error) {
      console.error('Error fetching student data:', error);
      setError('학생 정보를 불러오는 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleAttendanceSubmit = async () => {
    if (!student) return;

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
        student: student.id,
        date: format(newAttendance.date, 'yyyy-MM-dd'),
        is_late: newAttendance.is_late === 'true',
      });

      setOpenAttendanceDialog(false);
      fetchStudentData(student.id);
      
      // 폼 초기화
      setNewAttendance({
        date: new Date(),
        class_type: 'REGULAR',
        content: '',
        is_late: 'false',
        homework_completion: 0,
        homework_accuracy: 0,
      });
    } catch (error: any) {
      console.error('Error submitting attendance:', error);
      setError(error.message || '출석 기록 추가 중 오류가 발생했습니다.');
    }
  };

  const handleExamSubmit = async () => {
    if (!student) return;

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
      await examAPI.createExam({
        name: newExam.name,
        score: newExam.score,
        max_score: newExam.max_score,
        attendance: newExam.attendance,
      });

      setOpenExamDialog(false);
      fetchStudentData(student.id);
      
      // 폼 초기화
      setNewExam({
        name: '',
        score: 0,
        max_score: 100,
        attendance: null,
      });
    } catch (error: any) {
      console.error('Error submitting exam:', error);
      setError(error.message || '시험 기록 추가 중 오류가 발생했습니다.');
    }
  };

  const handleAttendanceSelect = (attendanceId: number) => {
    setSelectedAttendances(prev => 
      prev.includes(attendanceId)
        ? prev.filter(id => id !== attendanceId)
        : [...prev, attendanceId]
    );
  };

  const handleExamSelect = (examId: number) => {
    setSelectedExams(prev => 
      prev.includes(examId)
        ? prev.filter(id => id !== examId)
        : [...prev, examId]
    );
  };

  const handleAttendanceSelectAll = () => {
    if (selectedAttendances.length === attendances.length) {
      setSelectedAttendances([]);
    } else {
      setSelectedAttendances(attendances.map(att => att.id));
    }
  };

  const handleExamSelectAll = () => {
    if (selectedExams.length === exams.length) {
      setSelectedExams([]);
    } else {
      setSelectedExams(exams.map(exam => exam.id));
    }
  };

  const handleDeleteAttendances = async () => {
    if (selectedAttendances.length === 0 || !student) return;

    try {
      setError('');
      const deletePromises = selectedAttendances.map(id =>
        attendanceAPI.deleteAttendance(id)
      );

      await Promise.all(deletePromises);
      setSelectedAttendances([]);
      setOpenDeleteAttendanceDialog(false);
      fetchStudentData(student.id);
    } catch (error: any) {
      console.error('Error deleting attendances:', error);
      setError(error.message || '출석 기록 삭제 중 오류가 발생했습니다.');
    }
  };

  const handleDeleteExams = async () => {
    if (selectedExams.length === 0 || !student) return;

    try {
      setError('');
      const deletePromises = selectedExams.map(id =>
        examAPI.deleteExam(id)
      );

      await Promise.all(deletePromises);
      setSelectedExams([]);
      setOpenDeleteExamDialog(false);
      fetchStudentData(student.id);
    } catch (error: any) {
      console.error('Error deleting exams:', error);
      setError(error.message || '시험 기록 삭제 중 오류가 발생했습니다.');
    }
  };

  const handleDeleteAttendancesClick = () => {
    if (selectedAttendances.length === 0) return;
    setOpenDeleteAttendanceDialog(true);
  };

  const handleDeleteExamsClick = () => {
    if (selectedExams.length === 0) return;
    setOpenDeleteExamDialog(true);
  };

  const handleSendKakaoNotification = async () => {
    if (selectedAttendances.length === 0 || !student) {
      setSnackbar({
        open: true,
        message: '전송할 출석 기록을 선택해주세요.',
        severity: 'error',
      });
      return;
    }

    if (selectedAttendances.length > 1) {
      setSnackbar({
        open: true,
        message: '한 번에 하나의 출석 기록만 전송할 수 있습니다.',
        severity: 'error',
      });
      return;
    }

    try {
      setError('');
      const selectedAttendanceId = selectedAttendances[0];
      
      // 백엔드 API 호출
      const response = await notificationAPI.sendSingleNotification(student.id, selectedAttendanceId);
      
      setSnackbar({
        open: true,
        message: response.message || `${student.name} 학생의 출석 기록이 학부모님께 전송되었습니다.`,
        severity: 'success',
      });

      setOpenSendDialog(false);
      setSelectedAttendances([]);
    } catch (error: any) {
      console.error('Error sending kakao notification:', error);
      setSnackbar({
        open: true,
        message: error.message || '알림톡 전송 중 오류가 발생했습니다.',
        severity: 'error',
      });
    }
  };

  const handleSendButtonClick = () => {
    if (selectedAttendances.length === 0) {
      setSnackbar({
        open: true,
        message: '전송할 출석 기록을 선택해주세요.',
        severity: 'error',
      });
      return;
    }

    if (selectedAttendances.length > 1) {
      setSnackbar({
        open: true,
        message: '한 번에 하나의 출석 기록만 전송할 수 있습니다.',
        severity: 'error',
      });
      return;
    }

    setOpenSendDialog(true);
  };

  const handleSnackbarClose = () => {
    setSnackbar(prev => ({ ...prev, open: false }));
  };

  if (loading) {
    return <Typography>학생 정보를 불러오는 중...</Typography>;
  }

  if (!student) {
    return <Typography>학생을 찾을 수 없습니다.</Typography>;
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h4">
          {student.name} 학생 관리
        </Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="contained"
            color="primary"
            startIcon={<SendIcon />}
            onClick={handleSendButtonClick}
            disabled={selectedAttendances.length !== 1}
          >
            전송하기
          </Button>
          <Button variant="outlined" onClick={() => navigate('/students')}>
            목록으로 돌아가기
          </Button>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        <Box>
          <Paper sx={{ p: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
              <Typography variant="h6">
                출석 기록
              </Typography>
              <Box sx={{ display: 'flex', gap: 1 }}>
                {selectedAttendances.length > 0 && (
                  <Button
                    variant="outlined"
                    color="error"
                    startIcon={<DeleteIcon />}
                    onClick={handleDeleteAttendancesClick}
                  >
                    선택 삭제 ({selectedAttendances.length})
                  </Button>
                )}
                <Button
                  variant="contained"
                  onClick={() => setOpenAttendanceDialog(true)}
                >
                  출석 기록 추가
                </Button>
              </Box>
            </Box>
            <TableContainer sx={{ maxHeight: 800 }}>
              <Table stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell padding="checkbox">
                      <Checkbox
                        checked={attendances.length > 0 && selectedAttendances.length === attendances.length}
                        indeterminate={selectedAttendances.length > 0 && selectedAttendances.length < attendances.length}
                        onChange={handleAttendanceSelectAll}
                      />
                    </TableCell>
                    <TableCell>날짜</TableCell>
                    <TableCell>수업 종류</TableCell>
                    <TableCell>내용</TableCell>
                    <TableCell>지각</TableCell>
                    <TableCell>숙제 이행도</TableCell>
                    <TableCell>숙제 정답률</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {attendances.map((attendance) => (
                    <TableRow key={attendance.id}>
                      <TableCell padding="checkbox">
                        <Checkbox
                          checked={selectedAttendances.includes(attendance.id)}
                          onChange={() => handleAttendanceSelect(attendance.id)}
                        />
                      </TableCell>
                      <TableCell>{attendance.date}</TableCell>
                      <TableCell>{attendance.class_type_display}</TableCell>
                      <TableCell>{attendance.content}</TableCell>
                      <TableCell>{attendance.is_late ? '예' : '아니오'}</TableCell>
                      <TableCell>{attendance.homework_completion}%</TableCell>
                      <TableCell>{attendance.homework_accuracy}%</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Box>

        <Box>
          <Paper sx={{ p: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
              <Typography variant="h6">
                시험 기록
              </Typography>
              <Box sx={{ display: 'flex', gap: 1 }}>
                {selectedExams.length > 0 && (
                  <Button
                    variant="outlined"
                    color="error"
                    startIcon={<DeleteIcon />}
                    onClick={handleDeleteExamsClick}
                  >
                    선택 삭제 ({selectedExams.length})
                  </Button>
                )}
                <Button
                  variant="contained"
                  onClick={() => setOpenExamDialog(true)}
                >
                  시험 기록 추가
                </Button>
              </Box>
            </Box>
            <TableContainer sx={{ maxHeight: 800 }}>
              <Table stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell padding="checkbox">
                      <Checkbox
                        checked={exams.length > 0 && selectedExams.length === exams.length}
                        indeterminate={selectedExams.length > 0 && selectedExams.length < exams.length}
                        onChange={handleExamSelectAll}
                      />
                    </TableCell>
                    <TableCell>시험 이름</TableCell>
                    <TableCell>점수</TableCell>
                    <TableCell>만점</TableCell>
                    <TableCell>시험 날짜</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {exams.map((exam) => (
                    <TableRow key={exam.id}>
                      <TableCell padding="checkbox">
                        <Checkbox
                          checked={selectedExams.includes(exam.id)}
                          onChange={() => handleExamSelect(exam.id)}
                        />
                      </TableCell>
                      <TableCell>{exam.name}</TableCell>
                      <TableCell>{exam.score}</TableCell>
                      <TableCell>{exam.max_score}</TableCell>
                      <TableCell>{exam.exam_date}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Box>
      </Box>

      {/* 출석 기록 추가 다이얼로그 */}
      <Dialog open={openAttendanceDialog} onClose={() => setOpenAttendanceDialog(false)}>
        <DialogTitle>출석 기록 추가</DialogTitle>
        <DialogContent>
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
            저장
          </Button>
        </DialogActions>
      </Dialog>

      {/* 시험 기록 추가 다이얼로그 */}
      <Dialog open={openExamDialog} onClose={() => setOpenExamDialog(false)}>
        <DialogTitle>시험 기록 추가</DialogTitle>
        <DialogContent>
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
              {attendances.map((attendance) => (
                <MenuItem key={attendance.id} value={attendance.id}>
                  {attendance.date} - {attendance.class_type_display}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenExamDialog(false)}>취소</Button>
          <Button onClick={handleExamSubmit} variant="contained">
            저장
          </Button>
        </DialogActions>
      </Dialog>

      {/* 출석 기록 삭제 확인 다이얼로그 */}
      <Dialog 
        open={openDeleteAttendanceDialog} 
        onClose={() => setOpenDeleteAttendanceDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>출석 기록 삭제 확인</DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            이 작업은 되돌릴 수 없습니다.
          </Alert>
          <Typography>
            선택된 <strong>{selectedAttendances.length}개</strong>의 출석 기록을 삭제하시겠습니까?
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            출석 기록과 함께 연관된 시험 기록도 함께 삭제됩니다.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDeleteAttendanceDialog(false)} variant="outlined">
            취소
          </Button>
          <Button onClick={handleDeleteAttendances} color="error" variant="contained">
            삭제
          </Button>
        </DialogActions>
      </Dialog>

      {/* 시험 기록 삭제 확인 다이얼로그 */}
      <Dialog 
        open={openDeleteExamDialog} 
        onClose={() => setOpenDeleteExamDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>시험 기록 삭제 확인</DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            이 작업은 되돌릴 수 없습니다.
          </Alert>
          <Typography>
            선택된 <strong>{selectedExams.length}개</strong>의 시험 기록을 삭제하시겠습니까?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDeleteExamDialog(false)} variant="outlined">
            취소
          </Button>
          <Button onClick={handleDeleteExams} color="error" variant="contained">
            삭제
          </Button>
        </DialogActions>
      </Dialog>

      {/* 전송 확인 다이얼로그 */}
      <Dialog 
        open={openSendDialog} 
        onClose={() => setOpenSendDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>카카오톡 알림톡 전송 확인</DialogTitle>
        <DialogContent>
          {selectedAttendances.length > 0 && student && (
            <>
              <Alert severity="info" sx={{ mb: 2 }}>
                선택된 출석 기록을 학부모님께 전송합니다.
              </Alert>
              
              <Typography variant="h6" sx={{ mb: 1 }}>
                전송 대상
              </Typography>
              <Typography sx={{ mb: 2 }}>
                학생: <strong>{student.name}</strong><br />
                학부모 연락처: <strong>{student.parent_phone}</strong><br />
              </Typography>

              <Divider sx={{ my: 2 }} />

              {(() => {
                const selectedAttendance = attendances.find(att => att.id === selectedAttendances[0]);
                if (selectedAttendance) {
                  return (
                    <>
                      <Typography variant="h6" sx={{ mb: 1 }}>
                        전송할 출석 기록
                      </Typography>
                      <Typography sx={{ mb: 2 }}>
                        날짜: <strong>{selectedAttendance.date}</strong><br />
                        수업 종류: <strong>{selectedAttendance.class_type_display}</strong><br />
                        내용: <strong>{selectedAttendance.content}</strong><br />
                        지각: <strong>{selectedAttendance.is_late ? '예' : '아니오'}</strong><br />
                        숙제 이행도: <strong>{selectedAttendance.homework_completion}%</strong><br />
                        숙제 정답률: <strong>{selectedAttendance.homework_accuracy}%</strong>
                      </Typography>

                      <Divider sx={{ my: 2 }} />

                      {/* 관련된 시험 기록들 표시 */}
                      {(() => {
                        const relatedExams = exams.filter(exam => exam.attendance === selectedAttendance.id);

                        if (relatedExams.length > 0) {
                          return (
                            <>
                              <Typography variant="h6" sx={{ mb: 1 }}>
                                관련된 시험 기록 ({relatedExams.length}개)
                              </Typography>
                              <Box sx={{ maxHeight: 200, overflow: 'auto', mb: 2 }}>
                                {relatedExams.map((exam, index) => {
                                  const examAverage = examAverages.find(avg => avg.name === exam.name);
                                  return (
                                    <Box key={exam.id} sx={{ mb: 1, p: 1, border: '1px solid #e0e0e0', borderRadius: 1 }}>
                                      <Typography variant="body2">
                                        <strong>{exam.name}</strong><br />
                                        점수: <strong>{exam.score}/{exam.max_score}</strong><br />
                                        {examAverage && (
                                          <>
                                            반 평균: <strong>{Math.round(examAverage.average_score)}/{exam.max_score}</strong><br />
                                            반 최고점: <strong>{examAverage.max_score}</strong><br />
                                          </>
                                        )}
                                        시험 날짜: <strong>{exam.exam_date}</strong>
                                      </Typography>
                                    </Box>
                                  );
                                })}
                              </Box>
                            </>
                          );
                        } else {
                          return (
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                              관련된 시험 기록이 없습니다.
                            </Typography>
                          );
                        }
                      })()}
                    </>
                  );
                }
                return null;
              })()}
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenSendDialog(false)} variant="outlined">
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

export default StudentManagement; 