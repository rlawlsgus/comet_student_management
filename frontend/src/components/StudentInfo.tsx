import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  CircularProgress,
  Box,
} from '@mui/material';

interface Student {
  id: number;
  name: string;
  classInfo?: string;
  class_info_name?: string;
  attendanceRecords?: {
    date: string;
    classType: string;
    content: string;
    isLate: boolean;
    homeworkCompletion: number;
    homeworkAccuracy: number;
  }[];
  examRecords?: {
    name: string;
    score: number;
    date: string;
  }[];
  attendanceStats?: {
    totalClasses: number;
    attendedClasses: number;
    lateCount: number;
  };
  examStats?: {
    averageScore: number;
    highestScore: number;
    lowestScore: number;
  };
}

interface StudentInfoProps {
  students: Student[];
  selectedClass: string;
  onStudentSelect: (student: Student) => void;
  loading?: boolean;
}

const StudentInfo: React.FC<StudentInfoProps> = ({ students, selectedClass, onStudentSelect, loading = false }) => {
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
        <CircularProgress />
      </Box>
    );
  }

  const filteredStudents = selectedClass 
    ? students.filter(student => student.class_info_name === selectedClass)
    : students;

  return (
    <TableContainer>
      <Table sx={{ minWidth: 0 }} aria-label="학생 목록">
        <TableHead>
          <TableRow>
            <TableCell>이름</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {filteredStudents.map((student) => (
            <TableRow 
              key={student.id}
              onClick={() => onStudentSelect(student)}
              sx={{ cursor: 'pointer', '&:hover': { backgroundColor: '#f5f5f5' } }}
            >
              <TableCell>{student.name}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default StudentInfo; 