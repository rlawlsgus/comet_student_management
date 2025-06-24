import React, { useState, useEffect, useRef } from 'react';
import { Box, Typography, Container, Paper, Alert } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import ClassList from '../components/ClassList';
import StudentInfo from '../components/StudentInfo';
import StudentDetail from '../components/StudentDetail';
import AttendanceStats from '../components/AttendanceStats';
import GradeStats from '../components/GradeStats';
import { dashboardAPI, studentAPI } from '../services/api';

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [selectedClassId, setSelectedClassId] = useState<number | undefined>(undefined);
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [classes, setClasses] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [attendanceStats, setAttendanceStats] = useState<any[]>([]);
  const [gradeStats, setGradeStats] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const mountedRef = useRef(false);

  // 대시보드 데이터 로드
  const loadDashboardData = async (classId?: number) => {
    setLoading(true);
    setError('');
    
    try {
      const stats = await dashboardAPI.getDashboardStats(classId);
      setClasses(stats.class_stats || []);
      setAttendanceStats(stats.attendance_stats || []);
      setGradeStats(stats.grade_stats || []);
      
      // 선택된 반의 학생들 로드
      if (classId) {
        const studentsData = await studentAPI.getStudents(classId);
        setStudents(studentsData || []);
      } else {
        setStudents([]);
      }
    } catch (err: any) {
      console.error('대시보드 데이터 로드 실패:', err);
      setError(err.message || '데이터를 불러오는 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // 컴포넌트가 마운트되었는지 확인
    if (!mountedRef.current) {
      mountedRef.current = true;
      loadDashboardData();
    }
  }, []);

  const handleClassSelect = async (classId: number) => {
    setSelectedClassId(classId);
    setSelectedStudent(null);
    await loadDashboardData(classId);
  };

  const handleStudentSelect = async (student: any) => {
    try {
      // 학생의 상세 정보(출석/시험 기록 포함) 가져오기
      const studentDetail = await studentAPI.getStudent(student.id);
      setSelectedStudent(studentDetail);
    } catch (err: any) {
      console.error('학생 상세 정보 로드 실패:', err);
      // 상세 정보 로드에 실패해도 기본 정보로 표시
      setSelectedStudent(student);
    }
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {/* 반 목록 */}
        <Paper
          sx={{
            p: 2,
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <Typography component="h2" variant="h6" color="primary" gutterBottom>
            반 목록
          </Typography>
          <ClassList
            classes={classes}
            selectedClassId={selectedClassId}
            onClassSelect={handleClassSelect}
            loading={loading}
          />
        </Paper>

        <Box sx={{ display: 'flex', gap: 3, height: 'calc(100vh - 300px)' }}>
          {/* 학생 목록 */}
          <Paper
            sx={{
              p: 2,
              display: 'flex',
              flexDirection: 'column',
              flex: 0.3,
              overflow: 'auto'
            }}
          >
            <Typography component="h2" variant="h6" color="primary" gutterBottom>
              학생 목록
            </Typography>
            <StudentInfo 
              students={students} 
              selectedClass={selectedClassId ? classes.find(c => c.id === selectedClassId)?.name || '' : ''}
              onStudentSelect={handleStudentSelect}
              loading={loading}
            />
          </Paper>

          {/* 학생 상세 정보 */}
          <Paper
            sx={{
              p: 2,
              display: 'flex',
              flexDirection: 'column',
              flex: 0.7,
              overflow: 'auto'
            }}
          >
            <StudentDetail student={selectedStudent} />
          </Paper>
        </Box>

        {/* 통계 섹션 */}
        {(attendanceStats.length > 0 || gradeStats.length > 0) && (
          <Box sx={{ display: 'flex', gap: 3 }}>
            {/* 출석 통계 */}
            {attendanceStats.length > 0 && (
              <Paper sx={{ p: 2, flex: 1 }}>
                <Typography component="h2" variant="h6" color="primary" gutterBottom>
                  출석 통계
                </Typography>
                <AttendanceStats data={attendanceStats} />
              </Paper>
            )}

            {/* 성적 통계 */}
            {gradeStats.length > 0 && (
              <Paper sx={{ p: 2, flex: 1 }}>
                <Typography component="h2" variant="h6" color="primary" gutterBottom>
                  성적 통계
                </Typography>
                <GradeStats data={gradeStats} />
              </Paper>
            )}
          </Box>
        )}
      </Box>
    </Container>
  );
};

export default Dashboard; 