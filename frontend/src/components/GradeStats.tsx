import React from 'react';
import { Box, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper } from '@mui/material';

interface GradeData {
  exam_name: string;
  average: number;
  highest: number;
  lowest: number;
  count: number;
}

interface GradeStatsProps {
  data: GradeData[];
}

const GradeStats: React.FC<GradeStatsProps> = ({ data }) => {
  if (data.length === 0) {
    return (
      <Box sx={{ width: '100%', height: '100%' }}>
        <Typography variant="h6" gutterBottom>
          성적 통계
        </Typography>
        <Typography variant="body2" color="text.secondary">
          시험 데이터가 없습니다.
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ width: '100%', height: '100%' }}>
      <Typography variant="h6" gutterBottom>
        최근 한달간 시험 성적 통계
      </Typography>
      <TableContainer component={Paper} sx={{ maxHeight: 400 }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>시험명</TableCell>
              <TableCell align="right">평균</TableCell>
              <TableCell align="right">최고점</TableCell>
              <TableCell align="right">최저점</TableCell>
              <TableCell align="right">응시자 수</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {data.map((exam, index) => (
              <TableRow key={index}>
                <TableCell component="th" scope="row">
                  {exam.exam_name}
                </TableCell>
                <TableCell align="right">{exam.average}점</TableCell>
                <TableCell align="right">{exam.highest}점</TableCell>
                <TableCell align="right">{exam.lowest}점</TableCell>
                <TableCell align="right">{exam.count}명</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

export default GradeStats; 