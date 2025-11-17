import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout/Layout';
import ProtectedRoute from './auth/ProtectedRoute.jsx';
import Login from './pages/Login/Login';
import TeacherDashboard from './pages/Teacher/Dashboard/TeacherDashboard';
import TeacherClasses from './pages/Teacher/Classes/TeacherClasses';
import TeacherAssignments from './pages/Teacher/Assignments/TeacherAssignments';
import TeacherAssignmentDetail from './pages/Teacher/Assignments/TeacherAssignmentDetail';
import TeacherMonitoring from './pages/Teacher/Monitoring/TeacherMonitoring';
import StudentDashboard from './pages/Student/Dashboard/StudentDashboard';
import StudentClasses from './pages/Student/Classes/StudentClasses';
import StudentClassDetail from './pages/Student/Classes/StudentClassDetail';
import StudentAssignments from './pages/Student/Assignments/StudentAssignments';
import StudentProfile from './pages/Student/Profile/StudentProfile';
import StudentExamPage from './pages/Student/Exams/StudentExamPage';
import StudentPracticePage from './pages/Student/Practice/StudentPracticePage';
import StudentPracticeGamePage from './pages/Student/Practice/StudentPracticeGamePage';
import AdminDashboard from './pages/Admin/Dashboard/AdminDashboard';
import AdminAccountManagement from './pages/Admin/AccountManagement/AdminAccountManagement';
import AdminClassSubjectManagement from './pages/Admin/ClassSubjectManagement/AdminClassSubjectManagement';
import AdminClassDetail from './pages/Admin/ClassSubjectManagement/AdminClassDetail';
import TeacherClassDetail from './pages/Teacher/Classes/TeacherClassDetail';
import ForgotPassword from './pages/Login/ForgotPassword';
 

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      {/* Full-screen exam route (no Layout) */}
       <Route path="/student/exams/:id" element={<StudentExamPage />} />
       {/* Full-screen practice game route (no Layout) */}
       <Route path="/student/practice/:subjectId/:gameId" element={<StudentPracticeGamePage />} />
       <Route path="/" element={<Layout />}>
        {/* Teacher Routes */}
        <Route path="teacher" element={<ProtectedRoute role="teacher"><TeacherDashboard /></ProtectedRoute>} />
        <Route path="teacher/classes" element={<ProtectedRoute role="teacher"><TeacherClasses /></ProtectedRoute>} />
        <Route path="teacher/classes/:id" element={<ProtectedRoute role="teacher"><TeacherClassDetail /></ProtectedRoute>} />
        <Route path="teacher/assignments" element={<ProtectedRoute role="teacher"><TeacherAssignments /></ProtectedRoute>} />
        <Route path="teacher/assignments/:id" element={<ProtectedRoute role="teacher"><TeacherAssignmentDetail /></ProtectedRoute>} />
        <Route path="teacher/monitoring" element={<ProtectedRoute role="teacher"><TeacherMonitoring /></ProtectedRoute>} />
        
        {/* Student Routes */}
        <Route path="student" element={<ProtectedRoute role="student"><StudentDashboard /></ProtectedRoute>} />
        <Route path="student/classes" element={<ProtectedRoute role="student"><StudentClasses /></ProtectedRoute>} />
        <Route path="student/classes/:id" element={<ProtectedRoute role="student"><StudentClassDetail /></ProtectedRoute>} />
        <Route path="student/practice" element={<ProtectedRoute role="student"><StudentPracticePage /></ProtectedRoute>} />
        <Route path="student/assignments" element={<ProtectedRoute role="student"><StudentAssignments /></ProtectedRoute>} />
        <Route path="student/profile" element={<ProtectedRoute role="student"><StudentProfile /></ProtectedRoute>} />
        
        {/* Admin Routes */}
        <Route path="admin" element={<ProtectedRoute role="admin"><AdminDashboard /></ProtectedRoute>} />
        <Route path="admin/accounts" element={<ProtectedRoute role="admin"><AdminAccountManagement /></ProtectedRoute>} />
        <Route path="admin/classes" element={<ProtectedRoute role="admin"><AdminClassSubjectManagement /></ProtectedRoute>} />
        <Route path="admin/classes/:id" element={<ProtectedRoute role="admin"><AdminClassDetail /></ProtectedRoute>} />
        
      </Route>
    </Routes>
  );
}

export default App;
