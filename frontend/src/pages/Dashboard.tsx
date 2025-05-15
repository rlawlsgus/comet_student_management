import React, { useState } from 'react';
import { Box, Typography, Container, Paper } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import ClassList from '../components/ClassList';
import StudentInfo from '../components/StudentInfo';
import StudentDetail from '../components/StudentDetail';
import AttendanceStats from '../components/AttendanceStats';
import GradeStats from '../components/GradeStats';

// 임시 데이터
const mockClasses = [
  { id: 1, name: '1', grade: 1, studentCount: 30 },
  { id: 2, name: '2', grade: 1, studentCount: 28 },
  { id: 3, name: '3', grade: 2, studentCount: 32 },
];

const mockStudents = [
  {
    id: 1,
    name: '홍길동',
    classInfo: '1',
    attendanceRecords: [
      {
        date: '2024-03-01',
        classType: '정규',
        content: '화학 기초',
        isLate: false,
        homeworkCompletion: 100,
        homeworkAccuracy: 90
      },
      {
        date: '2024-03-02',
        classType: '정규',
        content: '화학 기초',
        isLate: true,
        homeworkCompletion: 80,
        homeworkAccuracy: 85
      }
    ],
    examRecords: [
      {
        name: '국어 중간고사',
        score: 85,
        date: '2024-03-15'
      },
      {
        name: '수학 중간고사',
        score: 92,
        date: '2024-03-15'
      },
      {
        name: '영어 중간고사',
        score: 78,
        date: '2024-03-15'
      }
    ],
    attendanceStats: {
      totalClasses: 20,
      attendedClasses: 19,
      lateCount: 1
    },
    examStats: {
      averageScore: 85,
      highestScore: 95,
      lowestScore: 75
    }
  },
  {
    id: 2,
    name: '김철수',
    classInfo: '1',
    attendanceRecords: [
      {
        date: '2024-03-01',
        classType: '정규',
        content: '화학 기초',
        isLate: true,
        homeworkCompletion: 80,
        homeworkAccuracy: 85
      },
      {
        date: '2024-03-02',
        classType: '정규',
        content: '화학 기초',
        isLate: false,
        homeworkCompletion: 90,
        homeworkAccuracy: 88
      }
    ],
    examRecords: [
      {
        name: '국어 중간고사',
        score: 92,
        date: '2024-03-15'
      },
      {
        name: '수학 중간고사',
        score: 88,
        date: '2024-03-15'
      },
      {
        name: '영어 중간고사',
        score: 95,
        date: '2024-03-15'
      }
    ],
    attendanceStats: {
      totalClasses: 20,
      attendedClasses: 18,
      lateCount: 2
    },
    examStats: {
      averageScore: 92,
      highestScore: 98,
      lowestScore: 85
    }
  }
];


const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [selectedClassId, setSelectedClassId] = useState<number | undefined>(undefined);
  const [selectedStudent, setSelectedStudent] = useState<any>(null);

  const handleClassSelect = (classId: number) => {
    setSelectedClassId(classId);
    setSelectedStudent(null);
  };

  const handleStudentSelect = (student: any) => {
    setSelectedStudent(student);
  };

  // 선택된 반의 학생들 데이터
  const selectedClassStudents = selectedClassId
    ? mockStudents.filter(student => student.classInfo === mockClasses.find(c => c.id === selectedClassId)?.name)
    : [];

  // 출석 통계 계산
  const calculateAttendanceStats = () => {
    if (!selectedClassStudents.length) return [];

    const dates = Array.from(new Set(
      selectedClassStudents.flatMap(student => 
        student.attendanceRecords.map(record => record.date)
      )
    )).sort();

    return dates.map(date => {
      const dayRecords = selectedClassStudents.flatMap(student =>
        student.attendanceRecords.filter(record => record.date === date)
      );

      return {
        date,
        present: dayRecords.filter(record => !record.isLate).length,
        absent: 0,
        late: dayRecords.filter(record => record.isLate).length
      };
    });
  };

  // 성적 통계 계산
  const calculateGradeStats = () => {
    if (!selectedClassStudents.length) return [];

    const subjects = ['국어', '수학', '영어'];
    return subjects.map(subject => {
      const scores = selectedClassStudents.flatMap(student => 
        student.examRecords
          .filter(record => record.name.includes(subject))
          .map(record => record.score)
      );

      if (scores.length === 0) {
        return {
          subject,
          average: 0,
          highest: 0,
          lowest: 0
        };
      }

      return {
        subject,
        average: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length),
        highest: Math.max(...scores),
        lowest: Math.min(...scores)
      };
    });
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
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
            classes={mockClasses}
            selectedClassId={selectedClassId}
            onClassSelect={handleClassSelect}
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
              students={mockStudents} 
              selectedClass={selectedClassId ? mockClasses.find(c => c.id === selectedClassId)?.name || '' : ''}
              onStudentSelect={handleStudentSelect}
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

        <Box sx={{ display: 'flex', gap: 3 }}>
          {/* 출석 통계 */}
          <Paper
            sx={{
              p: 2,
              display: 'flex',
              flexDirection: 'column',
              height: 240,
              flex: 1,
            }}
          >
            <AttendanceStats data={calculateAttendanceStats()} />
          </Paper>

          {/* 성적 통계 */}
          <Paper
            sx={{
              p: 2,
              display: 'flex',
              flexDirection: 'column',
              height: 240,
              flex: 1,
            }}
          >
            <GradeStats data={calculateGradeStats()} />
          </Paper>
        </Box>
      </Box>
    </Container>
  );
};

export default Dashboard; 