import React from 'react';
import { Box, Typography, Button, CircularProgress } from '@mui/material';

interface Class {
  id: number;
  name: string;
  subject: string;
  student_count: number;
}

interface ClassListProps {
  classes: Class[];
  selectedClassId?: number;
  onClassSelect: (classId: number) => void;
  loading?: boolean;
}

const ClassList: React.FC<ClassListProps> = ({ classes, selectedClassId, onClassSelect, loading = false }) => {
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
        <CircularProgress />
      </Box>
    );
  }

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
              {classItem.name}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {classItem.student_count}명
            </Typography>
          </Box>
        </Button>
      ))}
    </Box>
  );
};

export default ClassList; 