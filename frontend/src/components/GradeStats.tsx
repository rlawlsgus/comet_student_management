import React from 'react';
import { Box, Typography } from '@mui/material';
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

interface GradeData {
  subject: string;
  average: number;
  highest: number;
  lowest: number;
}

interface GradeStatsProps {
  data: GradeData[];
}

const GradeStats: React.FC<GradeStatsProps> = ({ data }) => {
  return (
    <Box sx={{ width: '100%', height: '100%' }}>
      <Typography variant="h6" gutterBottom>
        성적 통계
      </Typography>
      <ResponsiveContainer width="100%" height="80%">
        <LineChart
          data={data}
          margin={{
            top: 20,
            right: 30,
            left: 20,
            bottom: 5,
          }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="subject" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Line
            type="monotone"
            dataKey="average"
            name="평균"
            stroke="#2196f3"
            activeDot={{ r: 8 }}
          />
          <Line
            type="monotone"
            dataKey="highest"
            name="최고점"
            stroke="#4caf50"
          />
          <Line
            type="monotone"
            dataKey="lowest"
            name="최저점"
            stroke="#f44336"
          />
        </LineChart>
      </ResponsiveContainer>
    </Box>
  );
};

export default GradeStats; 