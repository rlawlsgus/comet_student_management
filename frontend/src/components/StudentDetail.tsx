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
  class_info_name?: string;
  attendance_records?: {
    date: string;
    class_type: string;
    class_type_display?: string;
    content: string;
    is_late: boolean;
    homework_completion: number;
    homework_accuracy: number;
  }[];
  exam_records?: {
    name: string;
    score: number;
    exam_date: string;
  }[];
  attendance_stats?: {
    total_classes: number;
    attended_classes: number;
    late_count: number;
  };
  exam_stats?: {
    average_score: number;
    highest_score: number;
    lowest_score: number;
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

  const getClassTypeDisplay = (classType: string) => {
    const classTypes = {
      'REGULAR': '정규',
      'MAKEUP': '대체',
      'EXTRA': '보강',
      'ADDITIONAL': '추가',
    };
    return classTypes[classType as keyof typeof classTypes] || classType;
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

  const attendanceRecords = student.attendance_records || [];
  const examRecords = student.exam_records || [];
  const attendanceStats = student.attendance_stats || { total_classes: 0, attended_classes: 0, late_count: 0 };
  const examStats = student.exam_stats || { average_score: 0, highest_score: 0, lowest_score: 0 };

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
        {attendanceRecords.length > 0 ? (
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
                {attendanceRecords.map((record, index) => (
                  <TableRow key={index}>
                    <TableCell>{record.date}</TableCell>
                    <TableCell>{record.class_type_display || getClassTypeDisplay(record.class_type)}</TableCell>
                    <TableCell>{record.content}</TableCell>
                    <TableCell>{record.is_late ? '지각' : '정상'}</TableCell>
                    <TableCell>{record.homework_completion}%</TableCell>
                    <TableCell>{record.homework_accuracy}%</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        ) : (
          <Box sx={{ p: 3, textAlign: 'center' }}>
            <Typography color="text.secondary">
              출석 기록이 없습니다.
            </Typography>
          </Box>
        )}
      </TabPanel>

      <TabPanel value={tabValue} index={1}>
        {examRecords.length > 0 ? (
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
                {examRecords.map((record, index) => (
                  <TableRow key={index}>
                    <TableCell>{record.name}</TableCell>
                    <TableCell>{record.score}</TableCell>
                    <TableCell>{record.exam_date}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        ) : (
          <Box sx={{ p: 3, textAlign: 'center' }}>
            <Typography color="text.secondary">
              시험 기록이 없습니다.
            </Typography>
          </Box>
        )}
      </TabPanel>

      <TabPanel value={tabValue} index={2}>
        <Box sx={{ p: 2 }}>
          <Typography variant="subtitle1" gutterBottom>
            출석 통계
          </Typography>
          <Typography>
            총 수업: {attendanceStats.total_classes}회
            출석: {attendanceStats.attended_classes}회
            지각: {attendanceStats.late_count}회
          </Typography>

          <Typography variant="subtitle1" sx={{ mt: 2 }} gutterBottom>
            시험 통계
          </Typography>
          <Typography>
            평균 점수: {examStats.average_score}점
            최고 점수: {examStats.highest_score}점
            최저 점수: {examStats.lowest_score}점
          </Typography>
        </Box>
      </TabPanel>
    </Box>
  );
};

export default StudentDetail; 