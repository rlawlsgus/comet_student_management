import React, { useState } from 'react';
import { Box, Typography, IconButton } from '@mui/material';
import { ChevronLeft, ChevronRight } from '@mui/icons-material';
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
  selectedMonth?: Date;
  onMonthChange?: (date: Date) => void;
}

const AttendanceStats: React.FC<AttendanceStatsProps> = ({ 
  data, 
  selectedMonth = new Date(),
  onMonthChange 
}) => {
  const [currentMonth, setCurrentMonth] = useState<Date>(selectedMonth);

  // 월 이동 함수
  const changeMonth = (direction: 'prev' | 'next') => {
    const newMonth = new Date(currentMonth);
    if (direction === 'prev') {
      newMonth.setMonth(newMonth.getMonth() - 1);
    } else {
      newMonth.setMonth(newMonth.getMonth() + 1);
    }
    setCurrentMonth(newMonth);
    if (onMonthChange) {
      onMonthChange(newMonth);
    }
  };

  // 월 표시
  const monthDisplay = currentMonth.toLocaleDateString('ko-KR', { 
    year: 'numeric', 
    month: 'long' 
  });

  return (
    <Box sx={{ width: '100%', height: '100%' }}>
      {/* 헤더와 네비게이션 */}
      <Box sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between',
        mb: 2 
      }}>
        <IconButton 
          onClick={() => changeMonth('prev')}
          size="small"
        >
          <ChevronLeft />
        </IconButton>
        
        <Typography variant="h6" align="center" sx={{ flex: 1 }}>
          {monthDisplay} 출석 통계
        </Typography>
        
        <IconButton 
          onClick={() => changeMonth('next')}
          size="small"
        >
          <ChevronRight />
        </IconButton>
      </Box>

      {/* 차트 */}
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

      {/* 데이터가 없을 때 안내 메시지 */}
      {(!data || data.length === 0) && (
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          height: '60%',
          color: 'text.secondary'
        }}>
          <Typography variant="body2">
            {monthDisplay}의 출석 데이터가 없습니다.
          </Typography>
        </Box>
      )}
    </Box>
  );
};

export default AttendanceStats; 