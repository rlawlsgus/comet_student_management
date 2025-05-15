import React from 'react';
import { Box, Typography } from '@mui/material';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

interface AttendanceData {
  date: string;
  present: number;
  absent: number;
  late: number;
}

interface AttendanceStatsProps {
  data: AttendanceData[];
}

const AttendanceStats: React.FC<AttendanceStatsProps> = ({ data }) => {
  return (
    <Box sx={{ width: '100%', height: '100%' }}>
      <Typography variant="h6" gutterBottom>
        출석 통계
      </Typography>
      <ResponsiveContainer width="100%" height="80%">
        <BarChart
          data={data}
          margin={{
            top: 20,
            right: 30,
            left: 20,
            bottom: 5,
          }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Bar dataKey="present" name="출석" fill="#4caf50" />
          <Bar dataKey="absent" name="결석" fill="#f44336" />
          <Bar dataKey="late" name="지각" fill="#ff9800" />
        </BarChart>
      </ResponsiveContainer>
    </Box>
  );
};

export default AttendanceStats; 