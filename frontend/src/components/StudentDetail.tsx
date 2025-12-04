import React, { useState, useEffect, useMemo } from 'react';
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
  IconButton,
} from '@mui/material';
import { ArrowBackIosNew, ArrowForwardIos } from '@mui/icons-material';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
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
    class_info: number;
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
  selectedClassId?: number;
}

const StudentDetail: React.FC<StudentDetailProps> = ({ student, selectedClassId }) => {
  const [tabValue, setTabValue] = useState(0);
  const [examAverages, setExamAverages] = useState<ClassExamAverages>({});
  const [loadingAverages, setLoadingAverages] = useState(false);
  const [currentChartIndex, setCurrentChartIndex] = useState(0);
  const { user } = useAuth();

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const getClassTypeDisplay = (classType: string) => {
    const classTypes = { REGULAR: '정규', MAKEUP: '대체', EXTRA: '보강', ADDITIONAL: '추가' };
    return classTypes[classType as keyof typeof classTypes] || classType;
  };

  const examCategoryMap = {
    REVIEW: '복습테스트',
    MOCK: '모의고사',
    SCHOOL: '학교시험',
    ESSAY: '서술테스트',
    ORAL: '구술테스트',
  };

  const gradeOrder = ['F', 'D', 'C-', 'C', 'C+', 'B-', 'B', 'B+', 'A-', 'A', 'A+'];

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

  const filtered_attendance_records = useMemo(() => {
    return selectedClassId
      ? student?.attendance_records?.filter(att => att.class_info === selectedClassId) ?? []
      : student?.attendance_records ?? [];
  }, [student, selectedClassId]);

  const filtered_exam_records = useMemo(() => {
    return selectedClassId
      ? student?.exam_records?.filter(exam => exam.class_info === selectedClassId) ?? []
      : student?.exam_records ?? [];
  }, [student, selectedClassId]);

  const attendanceRate = useMemo(() => {
    const stats = student?.attendance_stats;
    if (stats && stats.total_classes > 0) {
      return (stats.attended_classes / stats.total_classes) * 100;
    }
    return 0;
  }, [student?.attendance_stats]);

  const exam_stats = useMemo(() => {
    const scoreExams = filtered_exam_records.filter(exam => exam.score !== null);
    if (scoreExams.length === 0) return null;

    const scores = scoreExams.map(exam => exam.score!);
    const totalScore = scores.reduce((sum, score) => sum + score, 0);
    
    return {
      average_score: Math.round(totalScore / scores.length),
      highest_score: Math.max(...scores),
      lowest_score: Math.min(...scores),
    };
  }, [filtered_exam_records]);

  const scoreChartData = useMemo(() => {
    if (!filtered_exam_records) return [];

    const groupedByCategory = filtered_exam_records.reduce((acc, exam) => {
      const category = exam.category;
      if (!acc[category]) acc[category] = [];
      acc[category].push(exam);
      return acc;
    }, {} as Record<string, typeof filtered_exam_records>);

    return Object.entries(groupedByCategory)
      .map(([category, exams]) => {
        const isGradeBased = category === 'ESSAY' || category === 'ORAL';
        const isMockExam = category === 'MOCK';
        
        let yDomain: (string[] | number[]) = [0, 100];
        if (isGradeBased) yDomain = gradeOrder;
        else if (isMockExam) yDomain = [0, 50];

        const data = exams
          .map((exam) => {
            let studentScore: number | string | null = null;
            let classAverage: number | null = null;

            if (isGradeBased) {
              studentScore = exam.grade;
            } else if (exam.score !== null) {
              const classAverages = examAverages[exam.class_info] || [];
              const examAverageData = classAverages.find((avg) => avg.name === exam.name);
              
              if (isMockExam) {
                studentScore = exam.score;
                if (examAverageData) classAverage = examAverageData.average_score;
              } else if (exam.max_score !== null && exam.max_score > 0) {
                studentScore = (exam.score / exam.max_score) * 100;
                if (examAverageData) classAverage = (examAverageData.average_score / exam.max_score) * 100;
              }
            }

            if (studentScore === null) return null;

            return {
              date: exam.exam_date,
              name: exam.name,
              studentScore,
              classAverage,
            };
          })
          .filter((item): item is NonNullable<typeof item> => item !== null)
          .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        return {
          categoryName: examCategoryMap[category as keyof typeof examCategoryMap],
          chartType: isGradeBased ? 'grade' : 'score',
          yDomain,
          data,
        };
      })
      .filter(group => group.data.length > 0);
  }, [filtered_exam_records, examAverages]);
  
  useEffect(() => {
    setCurrentChartIndex(0);
  }, [selectedClassId]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const chartType = scoreChartData[currentChartIndex]?.chartType;

      return (
        <Paper elevation={3} sx={{ p: 2 }}>
          <Typography variant="subtitle2">{label}</Typography>
          <Typography variant="body2" sx={{ color: payload[0].color }}>
            {`내 ${chartType === 'grade' ? '등급' : '점수'}: `}
            {chartType === 'grade' ? data.studentScore : `${(data.studentScore as number).toFixed(1)}점`}
          </Typography>
          {chartType === 'score' && payload[1] && payload[1].value !== null && (
            <Typography variant="body2" sx={{ color: payload[1].color }}>
              {`반 평균: ${payload[1].value.toFixed(1)}점`}
            </Typography>
          )}
        </Paper>
      );
    }
    return null;
  };

  if (!student) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography variant="h6" color="text.secondary">학생을 선택해주세요</Typography>
      </Box>
    );
  }
  
  const { attendance_stats } = student;
  const currentChart = scoreChartData[currentChartIndex];

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
        {filtered_attendance_records.length > 0 ? (
          <TableContainer component={Paper} sx={{ maxHeight: 800 }}>
            <Table stickyHeader>
              <TableHead><TableRow><TableCell>날짜</TableCell><TableCell>수업 종류</TableCell><TableCell>수업 내용</TableCell><TableCell>지각</TableCell><TableCell>숙제 이행도</TableCell><TableCell>숙제 정답률</TableCell></TableRow></TableHead>
              <TableBody>
                {filtered_attendance_records.map((record, index) => (
                  <TableRow key={index}><TableCell>{record.date}</TableCell><TableCell>{record.class_type_display || getClassTypeDisplay(record.class_type)}</TableCell><TableCell>{record.content}</TableCell><TableCell>{record.is_late ? '지각' : '정상'}</TableCell><TableCell>{record.homework_completion}%</TableCell><TableCell>{record.homework_accuracy}%</TableCell></TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        ) : (<Box sx={{ p: 3, textAlign: 'center' }}><Typography color="text.secondary">출석 기록이 없습니다.</Typography></Box>)}
      </TabPanel>

      <TabPanel value={tabValue} index={1}>
        {filtered_exam_records.length > 0 ? (
          <TableContainer component={Paper} sx={{ maxHeight: 800 }}>
            <Table stickyHeader>
              <TableHead><TableRow><TableCell>시험명</TableCell><TableCell>점수/등급</TableCell><TableCell>반 평균</TableCell><TableCell>날짜</TableCell></TableRow></TableHead>
              <TableBody>
                {loadingAverages ? <TableRow><TableCell colSpan={4} align="center"><CircularProgress /></TableCell></TableRow> : filtered_exam_records.map((record) => {
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
          
          {currentChart && (
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom color="primary">성적 추이</Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
                  <IconButton onClick={() => setCurrentChartIndex(prev => prev - 1)} disabled={currentChartIndex === 0}>
                    <ArrowBackIosNew />
                  </IconButton>
                  <Typography variant="subtitle1" sx={{ flexGrow: 1, textAlign: 'center' }}>
                    {currentChart.categoryName}
                  </Typography>
                  <IconButton onClick={() => setCurrentChartIndex(prev => prev + 1)} disabled={currentChartIndex >= scoreChartData.length - 1}>
                    <ArrowForwardIos />
                  </IconButton>
                </Box>
                <Box sx={{ height: 300, mt: 2 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={currentChart.data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis 
                        type={currentChart.chartType === 'grade' ? 'category' : 'number'} 
                        domain={currentChart.yDomain as any} 
                        ticks={currentChart.chartType === 'grade' ? currentChart.yDomain as string[] : undefined} 
                        dataKey={currentChart.chartType === 'grade' ? 'studentScore' : undefined}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend />
                      <Line type="linear" dataKey="studentScore" name="내 점수" stroke="#8884d8" activeDot={{ r: 8 }} />
                      {currentChart.chartType === 'score' && (
                        <Line type="linear" dataKey="classAverage" name="반 평균" stroke="#82ca9d" connectNulls />
                      )}
                    </LineChart>
                  </ResponsiveContainer>
                </Box>
              </CardContent>
            </Card>
          )}

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