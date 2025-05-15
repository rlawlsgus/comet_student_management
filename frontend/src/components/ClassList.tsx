import React from 'react';
import { Box, Typography, Button } from '@mui/material';

interface Class {
  id: number;
  name: string;
  grade: number;
  studentCount: number;
}

interface ClassListProps {
  classes: Class[];
  selectedClassId?: number;
  onClassSelect: (classId: number) => void;
}

const ClassList: React.FC<ClassListProps> = ({ classes, selectedClassId, onClassSelect }) => {
  return (
    <Box sx={{ display: 'flex', gap: 1, overflowX: 'auto', pb: 1 }}>
      {classes.map((classItem) => (
        <Button
          key={classItem.id}
          variant={selectedClassId === classItem.id ? "contained" : "outlined"}
          onClick={() => onClassSelect(classItem.id)}
          sx={{ 
            minWidth: '120px',
            whiteSpace: 'nowrap',
            flexShrink: 0
          }}
        >
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <Typography variant="subtitle1">
              {classItem.grade}학년 {classItem.name}반
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {classItem.studentCount}명
            </Typography>
          </Box>
        </Button>
      ))}
    </Box>
  );
};

export default ClassList; 