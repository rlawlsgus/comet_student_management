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
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { format } from 'date-fns';
import { useParams, useNavigate } from 'react-router-dom';

interface Student {
  id: number;
  username: string;
  email: string;
}

interface Attendance {
  id: number;
  date: string;
  class_type: string;
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
  class_average?: number;
}

const StudentManagement: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [student, setStudent] = useState<Student | null>(null);
  const [attendances, setAttendances] = useState<Attendance[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);
  const [openAttendanceDialog, setOpenAttendanceDialog] = useState(false);
  const [openExamDialog, setOpenExamDialog] = useState(false);
  const [error, setError] = useState<string>('');
  const [newAttendance, setNewAttendance] = useState({
    date: new Date(),
    class_type: 'regular',
    content: '',
    is_late: 'false',
    homework_completion: 0,
    homework_accuracy: 0,
  });
  const [newExam, setNewExam] = useState({
    name: '',
    score: 0,
    max_score: 100,
  });

  useEffect(() => {
    // TODO: API 호출로 학생 정보 가져오기
    setStudent({
      id: Number(id),
      username: 'student1',
      email: 'student1@example.com',
    });
    fetchStudentData(Number(id));
  }, [id]);

  const fetchStudentData = async (studentId: number) => {
    try {
      // TODO: API 호출로 선택된 학생의 출석 및 시험 정보 가져오기
      setAttendances([
        {
          id: 1,
          date: '2024-03-15',
          class_type: '정규',
          content: '화학 기초 - 원소의 주기율',
          is_late: false,
          homework_completion: 100,
          homework_accuracy: 95,
        },
        {
          id: 2,
          date: '2024-03-16',
          class_type: '대체',
          content: '화학 기초 - 화학 결합',
          is_late: true,
          homework_completion: 80,
          homework_accuracy: 85,
        },
      ]);

      setExams([
        {
          id: 1,
          name: '1차 중간고사',
          score: 85,
          max_score: 100,
          class_average: 82.5,
        },
        {
          id: 2,
          name: '2차 중간고사',
          score: 92,
          max_score: 100,
          class_average: 88.3,
        },
      ]);
    } catch (error) {
      console.error('Error fetching student data:', error);
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
      const response = await fetch('/api/attendance/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...newAttendance,
          student: student.id,
          date: format(newAttendance.date, 'yyyy-MM-dd'),
          is_late: newAttendance.is_late === 'true',
        }),
      });

      if (response.ok) {
        setOpenAttendanceDialog(false);
        fetchStudentData(student.id);
        setError('');
      }
    } catch (error) {
      console.error('Error submitting attendance:', error);
      setError('출석 기록 추가 중 오류가 발생했습니다.');
    }
  };

  const handleExamSubmit = async () => {
    if (!student) return;

    // 유효성 검사
    if (newExam.score < 0 || newExam.score > newExam.max_score) {
      setError(`점수는 0에서 ${newExam.max_score} 사이여야 합니다.`);
      return;
    }

    try {
      const response = await fetch('/api/exams/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...newExam,
          student: student.id,
        }),
      });

      if (response.ok) {
        setOpenExamDialog(false);
        fetchStudentData(student.id);
        setError('');
      }
    } catch (error) {
      console.error('Error submitting exam:', error);
      setError('시험 기록 추가 중 오류가 발생했습니다.');
    }
  };

  if (!student) {
    return <Typography>학생 정보를 불러오는 중...</Typography>;
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h4">
          {student.username} 학생 관리
        </Typography>
        <Button variant="outlined" onClick={() => navigate('/students')}>
          목록으로 돌아가기
        </Button>
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
              <Button
                variant="contained"
                onClick={() => setOpenAttendanceDialog(true)}
              >
                출석 기록 추가
              </Button>
            </Box>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
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
                      <TableCell>{attendance.date}</TableCell>
                      <TableCell>{attendance.class_type}</TableCell>
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
              <Button
                variant="contained"
                onClick={() => setOpenExamDialog(true)}
              >
                시험 기록 추가
              </Button>
            </Box>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>시험 이름</TableCell>
                    <TableCell>점수</TableCell>
                    <TableCell>만점</TableCell>
                    <TableCell>반 평균</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {exams.map((exam) => (
                    <TableRow key={exam.id}>
                      <TableCell>{exam.name}</TableCell>
                      <TableCell>{exam.score}</TableCell>
                      <TableCell>{exam.max_score}</TableCell>
                      <TableCell>
                        {exam.class_average
                          ? `(${exam.class_average.toFixed(2)})`
                          : '-'}
                      </TableCell>
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
              <MenuItem value="regular">정규</MenuItem>
              <MenuItem value="makeup">대체</MenuItem>
              <MenuItem value="extra">보강</MenuItem>
              <MenuItem value="additional">추가</MenuItem>
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
          <TextField
            fullWidth
            type="number"
            label="숙제 이행도 (%)"
            value={newAttendance.homework_completion}
            onChange={(e) => {
              const value = Number(e.target.value);
              if (value >= 0 && value <= 100) {
                setNewAttendance({ ...newAttendance, homework_completion: value });
              }
            }}
            inputProps={{ min: 0, max: 100 }}
            sx={{ mb: 2 }}
          />
          <TextField
            fullWidth
            type="number"
            label="숙제 정답률 (%)"
            value={newAttendance.homework_accuracy}
            onChange={(e) => {
              const value = Number(e.target.value);
              if (value >= 0 && value <= 100) {
                setNewAttendance({ ...newAttendance, homework_accuracy: value });
              }
            }}
            inputProps={{ min: 0, max: 100 }}
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
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenExamDialog(false)}>취소</Button>
          <Button onClick={handleExamSubmit} variant="contained">
            저장
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default StudentManagement; 