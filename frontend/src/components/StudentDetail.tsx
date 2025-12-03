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
  CircularProgress,
} from '@mui/material';
import { examAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

interface Student {
  id: number;
  name: string;
  classes: { id: number; name: string; subject: string }[];
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
    id: number;
    name: string;
    category: 'REVIEW' | 'ESSAY' | 'ORAL' | 'MOCK' | 'SCHOOL';
    score: number | null;
    max_score: number | null;
    grade: string | null;
    exam_date: string;
    class_info: number;
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

interface ClassExamAverages {
  [classId: number]: ExamAverage[];
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div role="tabpanel" hidden={value !== index} id={`student-tabpanel-${index}`} aria-labelledby={`student-tab-${index}`} {...other}>
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

interface StudentDetailProps {
  student: Student | null;
}

const StudentDetail: React.FC<StudentDetailProps> = ({ student }) => {
  const [tabValue, setTabValue] = useState(0);
  const [examAverages, setExamAverages] = useState<ClassExamAverages>({});
  const [loadingAverages, setLoadingAverages] = useState(false);
  const { user } = useAuth();

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const getClassTypeDisplay = (classType: string) => {
    const classTypes = { REGULAR: '정규', MAKEUP: '대체', EXTRA: '보강', ADDITIONAL: '추가' };
    return classTypes[classType as keyof typeof classTypes] || classType;
  };

  useEffect(() => {
    const fetchExamAverages = async () => {
      if (!student || !student.classes || student.classes.length === 0) {
        setExamAverages({});
        return;
      }
      
      setLoadingAverages(true);
      try {
        const classIds = student.classes.map(c => c.id);
        const averagePromises = classIds.map(id => examAPI.getExamAverages(undefined, id));
        const results = await Promise.all(averagePromises);
        
        const averagesByClass: ClassExamAverages = {};
        classIds.forEach((id, index) => {
          averagesByClass[id] = results[index];
        });
        setExamAverages(averagesByClass);
      } catch (error) {
        console.error('시험 평균 점수 로드 실패:', error);
      } finally {
        setLoadingAverages(false);
      }
    };

    fetchExamAverages();
  }, [student]);

  if (!student) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography variant="h6" color="text.secondary">학생을 선택해주세요</Typography>
      </Box>
    );
  }

  const { attendance_records = [], exam_records = [], attendance_stats, exam_stats } = student;
  const attendanceRate = attendance_stats && attendance_stats.total_classes > 0 
    ? (attendance_stats.attended_classes / attendance_stats.total_classes) * 100 
    : 0;

  return (
    <Box>
      <Typography variant="h6" gutterBottom>{student.name} 학생 상세 정보</Typography>
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={tabValue} onChange={handleTabChange}>
          <Tab label="수업 내역" />
          <Tab label="시험 내역" />
          <Tab label="통계" />
        </Tabs>
      </Box>

      <TabPanel value={tabValue} index={0}>
        {attendance_records.length > 0 ? (
          <TableContainer component={Paper} sx={{ maxHeight: 800 }}>
            <Table stickyHeader>
              <TableHead><TableRow><TableCell>날짜</TableCell><TableCell>수업 종류</TableCell><TableCell>수업 내용</TableCell><TableCell>지각</TableCell><TableCell>숙제 이행도</TableCell><TableCell>숙제 정답률</TableCell></TableRow></TableHead>
              <TableBody>
                {attendance_records.map((record, index) => (
                  <TableRow key={index}><TableCell>{record.date}</TableCell><TableCell>{record.class_type_display || getClassTypeDisplay(record.class_type)}</TableCell><TableCell>{record.content}</TableCell><TableCell>{record.is_late ? '지각' : '정상'}</TableCell><TableCell>{record.homework_completion}%</TableCell><TableCell>{record.homework_accuracy}%</TableCell></TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        ) : (<Box sx={{ p: 3, textAlign: 'center' }}><Typography color="text.secondary">출석 기록이 없습니다.</Typography></Box>)}
      </TabPanel>

      <TabPanel value={tabValue} index={1}>
        {exam_records.length > 0 ? (
          <TableContainer component={Paper} sx={{ maxHeight: 800 }}>
            <Table stickyHeader>
              <TableHead><TableRow><TableCell>시험명</TableCell><TableCell>점수/등급</TableCell><TableCell>반 평균</TableCell><TableCell>날짜</TableCell></TableRow></TableHead>
              <TableBody>
                {loadingAverages ? <TableRow><TableCell colSpan={4} align="center"><CircularProgress /></TableCell></TableRow> : exam_records.map((record) => {
                  const classAverages = examAverages[record.class_info] || [];
                  const examAverage = classAverages.find(avg => avg.name === record.name);
                  const isGradeBased = record.category === 'ESSAY' || record.category === 'ORAL';

                  return (
                    <TableRow key={record.id}>
                      <TableCell>{record.name}</TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          {isGradeBased ? (
                            <Typography variant="body2" fontWeight="bold">{record.grade}</Typography>
                          ) : (
                            <>
                              <Typography variant="body2">{record.score}/{record.max_score}</Typography>
                              {examAverage && record.score != null && (
                                <Chip 
                                  label={record.score >= examAverage.average_score ? '평균 이상' : '평균 이하'} 
                                  color={record.score >= examAverage.average_score ? 'success' : 'warning'}
                                  size="small"
                                />
                              )}
                            </>
                          )}
                        </Box>
                      </TableCell>
                      <TableCell>
                        {isGradeBased || !examAverage ? '-' : `${Math.round(examAverage.average_score)}/${record.max_score}`}
                      </TableCell>
                      <TableCell>{record.exam_date}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        ) : (<Box sx={{ p: 3, textAlign: 'center' }}><Typography color="text.secondary">시험 기록이 없습니다.</Typography></Box>)}
      </TabPanel>

      <TabPanel value={tabValue} index={2}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <Card><CardContent>
            <Typography variant="h6" gutterBottom color="primary">출석 통계</Typography>
            <Box sx={{ mb: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}><Typography variant="body2">출석률</Typography><Typography variant="body2" fontWeight="bold">{Math.round(attendanceRate)}%</Typography></Box>
              <LinearProgress variant="determinate" value={attendanceRate} sx={{ height: 8, borderRadius: 4 }}/>
            </Box>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Box sx={{ flex: 1, textAlign: 'center' }}><Typography variant="h4" color="primary" fontWeight="bold">{attendance_stats?.total_classes || 0}</Typography><Typography variant="body2" color="text.secondary">총 수업</Typography></Box>
              <Box sx={{ flex: 1, textAlign: 'center' }}><Typography variant="h4" color="success.main" fontWeight="bold">{attendance_stats?.attended_classes || 0}</Typography><Typography variant="body2" color="text.secondary">출석</Typography></Box>
              <Box sx={{ flex: 1, textAlign: 'center' }}><Typography variant="h4" color="error.main" fontWeight="bold">{attendance_stats?.late_count || 0}</Typography><Typography variant="body2" color="text.secondary">지각</Typography></Box>
            </Box>
          </CardContent></Card>
          {exam_stats && <Card><CardContent>
            <Typography variant="h6" gutterBottom color="primary">시험 통계</Typography>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Box sx={{ flex: 1, textAlign: 'center' }}><Typography variant="h4" color="primary" fontWeight="bold">{exam_stats.average_score}</Typography><Typography variant="body2" color="text.secondary">평균 점수</Typography></Box>
              <Box sx={{ flex: 1, textAlign: 'center' }}><Typography variant="h4" color="success.main" fontWeight="bold">{exam_stats.highest_score}</Typography><Typography variant="body2" color="text.secondary">최고 점수</Typography></Box>
              <Box sx={{ flex: 1, textAlign: 'center' }}><Typography variant="h4" color="warning.main" fontWeight="bold">{exam_stats.lowest_score}</Typography><Typography variant="body2" color="text.secondary">최저 점수</Typography></Box>
            </Box>
          </CardContent></Card>}
        </Box>
      </TabPanel>
    </Box>
  );
};

export default StudentDetail; 