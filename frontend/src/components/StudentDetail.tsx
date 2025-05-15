import React, { useState } from 'react';
import {
  Box,
  Typography,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
} from '@mui/material';

interface Student {
  id: number;
  name: string;
  classInfo: string;
  attendanceRecords: {
    date: string;
    classType: string;
    content: string;
    isLate: boolean;
    homeworkCompletion: number;
    homeworkAccuracy: number;
  }[];
  examRecords: {
    name: string;
    score: number;
    date: string;
  }[];
  attendanceStats: {
    totalClasses: number;
    attendedClasses: number;
    lateCount: number;
  };
  examStats: {
    averageScore: number;
    highestScore: number;
    lowestScore: number;
  };
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`student-tabpanel-${index}`}
      aria-labelledby={`student-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

interface StudentDetailProps {
  student: Student | null;
}

const StudentDetail: React.FC<StudentDetailProps> = ({ student }) => {
  const [tabValue, setTabValue] = useState(0);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  if (!student) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography variant="h6" color="text.secondary">
          학생을 선택해주세요
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        {student.name} 학생 상세 정보
      </Typography>
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={tabValue} onChange={handleTabChange}>
          <Tab label="수업 내역" />
          <Tab label="시험 내역" />
          <Tab label="통계" />
        </Tabs>
      </Box>

      <TabPanel value={tabValue} index={0}>
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>날짜</TableCell>
                <TableCell>수업 종류</TableCell>
                <TableCell>수업 내용</TableCell>
                <TableCell>지각</TableCell>
                <TableCell>숙제 이행도</TableCell>
                <TableCell>숙제 정답률</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {student.attendanceRecords.map((record, index) => (
                <TableRow key={index}>
                  <TableCell>{record.date}</TableCell>
                  <TableCell>{record.classType}</TableCell>
                  <TableCell>{record.content}</TableCell>
                  <TableCell>{record.isLate ? '지각' : '정상'}</TableCell>
                  <TableCell>{record.homeworkCompletion}%</TableCell>
                  <TableCell>{record.homeworkAccuracy}%</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </TabPanel>

      <TabPanel value={tabValue} index={1}>
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>시험명</TableCell>
                <TableCell>점수</TableCell>
                <TableCell>날짜</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {student.examRecords.map((record, index) => (
                <TableRow key={index}>
                  <TableCell>{record.name}</TableCell>
                  <TableCell>{record.score}</TableCell>
                  <TableCell>{record.date}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </TabPanel>

      <TabPanel value={tabValue} index={2}>
        <Box sx={{ p: 2 }}>
          <Typography variant="subtitle1" gutterBottom>
            출석 통계
          </Typography>
          <Typography>
            총 수업: {student.attendanceStats.totalClasses}회
            출석: {student.attendanceStats.attendedClasses}회
            지각: {student.attendanceStats.lateCount}회
          </Typography>

          <Typography variant="subtitle1" sx={{ mt: 2 }} gutterBottom>
            시험 통계
          </Typography>
          <Typography>
            평균 점수: {student.examStats.averageScore}점
            최고 점수: {student.examStats.highestScore}점
            최저 점수: {student.examStats.lowestScore}점
          </Typography>
        </Box>
      </TabPanel>
    </Box>
  );
};

export default StudentDetail; 