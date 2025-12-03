import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
  Box,
  Typography,
} from '@mui/material';

interface Student {
  id: number;
  name: string;
  classes: number[];
}

interface StudentInfoProps {
  students: Student[];
  selectedClassId: number; // 0 for all, -1 for unassigned
  onStudentSelect: (student: Student) => void;
  loading?: boolean;
}

const StudentInfo: React.FC<StudentInfoProps> = ({ students, selectedClassId, onStudentSelect, loading = false }) => {
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
        <CircularProgress />
      </Box>
    );
  }

  const filteredStudents = students.filter(student => {
    if (selectedClassId === 0) { // 'All' classes
      return true;
    }
    if (selectedClassId === -1) { // 'Unassigned'
      return student.classes.length === 0;
    }
    // Filter by specific class ID
    return student.classes.includes(selectedClassId);
  });

  return (
    <TableContainer>
      <Table sx={{ minWidth: 0 }} aria-label="학생 목록">
        <TableHead>
          <TableRow>
            <TableCell>이름</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {filteredStudents.length > 0 ? (
            filteredStudents.map((student) => (
              <TableRow 
                key={student.id}
                onClick={() => onStudentSelect(student)}
                sx={{ cursor: 'pointer', '&:hover': { backgroundColor: '#f5f5f5' } }}
              >
                <TableCell>{student.name}</TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell>
                <Typography color="text.secondary" align="center">
                  학생 없음
                </Typography>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default StudentInfo; 