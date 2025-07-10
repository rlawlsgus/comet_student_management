import React, { useState, useEffect } from 'react';
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
  Card,
  CardContent,
  LinearProgress,
  Chip,
} from '@mui/material';
import { examAPI } from '../services/api';

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
    max_score: number;
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

interface ExamAverage {
  name: string;
  average_score: number;
  max_score: number;
  min_score: number;
  count: number;
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
  const [examAverages, setExamAverages] = useState<ExamAverage[]>([]);
  const [loading, setLoading] = useState(false);

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

  // 시험별 평균 점수 가져오기
  useEffect(() => {
    const fetchExamAverages = async () => {
      if (!student) return;
      
      try {
        setLoading(true);
        const averages = await examAPI.getExamAverages(student.id);
        setExamAverages(averages);
      } catch (error) {
        console.error('시험 평균 점수 로드 실패:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchExamAverages();
  }, [student]);

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

  // 출석률 계산
  const attendanceRate = attendanceStats.total_classes > 0 
    ? (attendanceStats.attended_classes / attendanceStats.total_classes) * 100 
    : 0;

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
          <TableContainer component={Paper} sx={{ maxHeight: 800 }}>
            <Table stickyHeader>
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
          <TableContainer component={Paper} sx={{ maxHeight: 800 }}>
            <Table stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell>시험명</TableCell>
                  <TableCell>점수</TableCell>
                  <TableCell>반 평균</TableCell>
                  <TableCell>날짜</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {examRecords.map((record, index) => {
                  const examAverage = examAverages.find(avg => avg.name === record.name);
                  const isAboveAverage = examAverage ? record.score >= examAverage.average_score : false;
                  
                  return (
                    <TableRow key={index}>
                      <TableCell>{record.name}</TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="body2">
                            {record.score}/{record.max_score}
                          </Typography>
                          {examAverage && (
                            <Chip 
                              label={isAboveAverage ? '평균 이상' : '평균 이하'} 
                              color={isAboveAverage ? 'success' : 'warning'}
                              size="small"
                            />
                          )}
                        </Box>
                      </TableCell>
                      <TableCell>
                        {examAverage ? `${Math.round(examAverage.average_score)}/${record.max_score}` : '-'}
                      </TableCell>
                      <TableCell>{record.exam_date}</TableCell>
                    </TableRow>
                  );
                })}
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
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {/* 출석 통계 */}
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom color="primary">
                출석 통계
              </Typography>
              <Box sx={{ mb: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2">출석률</Typography>
                  <Typography variant="body2" fontWeight="bold">
                    {Math.round(attendanceRate)}%
                  </Typography>
                </Box>
                <LinearProgress 
                  variant="determinate" 
                  value={attendanceRate} 
                  sx={{ height: 8, borderRadius: 4 }}
                />
              </Box>
              <Box sx={{ display: 'flex', gap: 2 }}>
                <Box sx={{ flex: 1, textAlign: 'center' }}>
                  <Typography variant="h4" color="primary" fontWeight="bold">
                    {attendanceStats.total_classes}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    총 수업
                  </Typography>
                </Box>
                <Box sx={{ flex: 1, textAlign: 'center' }}>
                  <Typography variant="h4" color="success.main" fontWeight="bold">
                    {attendanceStats.attended_classes}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    출석
                  </Typography>
                </Box>
                <Box sx={{ flex: 1, textAlign: 'center' }}>
                  <Typography variant="h4" color="error.main" fontWeight="bold">
                    {attendanceStats.late_count}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    지각
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>

          {/* 시험 통계 */}
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom color="primary">
                시험 통계
              </Typography>
              <Box sx={{ display: 'flex', gap: 2 }}>
                <Box sx={{ flex: 1, textAlign: 'center' }}>
                  <Typography variant="h4" color="primary" fontWeight="bold">
                    {examStats.average_score}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    평균 점수
                  </Typography>
                </Box>
                <Box sx={{ flex: 1, textAlign: 'center' }}>
                  <Typography variant="h4" color="success.main" fontWeight="bold">
                    {examStats.highest_score}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    최고 점수
                  </Typography>
                </Box>
                <Box sx={{ flex: 1, textAlign: 'center' }}>
                  <Typography variant="h4" color="warning.main" fontWeight="bold">
                    {examStats.lowest_score}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    최저 점수
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>


        </Box>
      </TabPanel>
    </Box>
  );
};

export default StudentDetail; 