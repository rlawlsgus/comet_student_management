import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider, CssBaseline } from '@mui/material';
import theme from './styles/theme';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Register from './pages/Register';
import Profile from './pages/Profile';
import UserList from './pages/UserList';
import UserEdit from './pages/UserEdit';
import ClassList from './pages/ClassList';
import ClassForm from './pages/ClassForm';
import StudentList from './pages/StudentList';
import StudentForm from './pages/StudentForm';
import StudentManagement from './pages/StudentManagement';
import './styles/App.css';

const App: React.FC = () => {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<Layout />}>
            <Route index element={<Dashboard />} />
            <Route path="users" element={<UserList />} />
            <Route path="users/:id/edit" element={<UserEdit />} />
            <Route path="register" element={<Register />} />
            <Route path="profile" element={<Profile />} />
            <Route path="classes" element={<ClassList />} />
            <Route path="classes/new" element={<ClassForm />} />
            <Route path="classes/:id/edit" element={<ClassForm />} />
            <Route path="students" element={<StudentList />} />
            <Route path="students/new" element={<StudentForm />} />
            <Route path="students/:id/edit" element={<StudentForm />} />
            <Route path="students/:id/management" element={<StudentManagement />} />
          </Route>
        </Routes>
      </Router>
    </ThemeProvider>
  );
};

export default App;
