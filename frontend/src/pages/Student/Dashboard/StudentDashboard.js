import React, { useState, useEffect } from 'react';
import {
  Grid,
  Paper,
  Typography,
  Box,
  Card,
  CardContent,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Button,
  Chip,
  Avatar,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Divider,
} from '@mui/material';
import {
  Schedule,
  Assignment,
  Class,
  Notifications,
  Add,
  MoreVert,
  CheckCircle,
  Warning,
  Info,
  AccessTime,
  Grade,
} from '@mui/icons-material';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { api } from '../../../api/client';

const StudentDashboard = () => {
  const [openNotificationDialog, setOpenNotificationDialog] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState(null);
  const [openDeadlineDialog, setOpenDeadlineDialog] = useState(false);
  const [selectedDeadline, setSelectedDeadline] = useState(null);
  const [openGradeDialog, setOpenGradeDialog] = useState(false);
  const [selectedGrade, setSelectedGrade] = useState(null);
  const [openExamDialog, setOpenExamDialog] = useState(false);
  const [selectedExam, setSelectedExam] = useState(null);
  
  const [notifications, setNotifications] = useState([
    { 
      id: 1, 
      title: 'Bài tập "Thuật toán sắp xếp" sắp hết hạn', 
      time: '2 giờ trước', 
      type: 'warning',
      content: 'Bài tập về thuật toán sắp xếp sẽ hết hạn vào ngày mai (15/01/2024). Vui lòng hoàn thành và nộp bài trước 23:59. Nếu có thắc mắc, hãy liên hệ với giảng viên.',
      sender: 'Thầy Nguyễn Văn A',
      class: 'IT01 - Lập trình Web'
    },
    { 
      id: 2, 
      title: 'Điểm bài tập "Database Design" đã được công bố', 
      time: '1 ngày trước', 
      type: 'success',
      content: 'Điểm số bài tập Database Design đã được cập nhật. Bạn có thể xem chi tiết điểm số và nhận xét trong mục Bài tập. Chúc mừng các bạn đã hoàn thành tốt!',
      sender: 'Cô Trần Thị B',
      class: 'IT02 - Cơ sở dữ liệu'
    },
    { 
      id: 3, 
      title: 'Lớp IT01 có thông báo mới từ giảng viên', 
      time: '2 ngày trước', 
      type: 'info',
      content: 'Lịch học tuần tới sẽ có thay đổi. Buổi học thứ 3 sẽ được chuyển từ 14:00 thành 16:00. Vui lòng cập nhật lịch cá nhân và tham gia đầy đủ.',
      sender: 'Thầy Nguyễn Văn A',
      class: 'IT01 - Lập trình Web'
    },
  ]);

  const [upcomingExams, setUpcomingExams] = useState([
    { 
      id: 1,
      startAt: '2024-01-16 08:00', 
      title: 'Thi giữa kỳ Lập trình Web', 
      duration: 60, 
      class: 'IT01', 
      monitoring: true,
      teacher: 'Thầy Nguyễn Văn A',
      description: 'Kỳ thi giữa kỳ môn Lập trình Web bao gồm các chủ đề: HTML/CSS, JavaScript, ReactJS, NodeJS. Thời gian làm bài 60 phút.',
      instructions: 'Chuẩn bị laptop, kết nối internet ổn định. Bật camera và microphone trong suốt quá trình thi. Không được sử dụng tài liệu.',
      room: 'Phòng A101',
      maxGrade: 10,
    },
    { 
      id: 2,
      startAt: '2024-01-18 14:00', 
      title: 'Thi giữa kỳ Cơ sở dữ liệu', 
      duration: 90, 
      class: 'IT02', 
      monitoring: true,
      teacher: 'Cô Trần Thị B',
      description: 'Kỳ thi giữa kỳ môn Cơ sở dữ liệu bao gồm: Thiết kế ERD, Chuẩn hóa, SQL, MySQL. Thời gian làm bài 90 phút.',
      instructions: 'Sử dụng MySQL Workbench để thực hiện các câu hỏi thực hành. Bật camera và microphone. Có thể sử dụng tài liệu MySQL.',
      room: 'Phòng A102',
      maxGrade: 10,
    },
    { 
      id: 3,
      startAt: '2024-01-20 09:00', 
      title: 'Thi giữa kỳ Thuật toán', 
      duration: 75, 
      class: 'IT03', 
      monitoring: false,
      teacher: 'Thầy Lê Văn C',
      description: 'Kỳ thi giữa kỳ môn Thuật toán bao gồm: Thuật toán sắp xếp, tìm kiếm, đồ thị, độ phức tạp. Thời gian làm bài 75 phút.',
      instructions: 'Làm bài trên giấy, có thể sử dụng máy tính bỏ túi. Không yêu cầu bật camera/microphone.',
      room: 'Phòng A103',
      maxGrade: 10,
    },
  ]);

  const [quickStats, setQuickStats] = useState([
  { title: 'Lớp học tham gia', value: 0, icon: <Class />, color: '#1976d2' },
  { title: 'Bài tập đã nộp', value: 0, icon: <Assignment />, color: '#388e3c' },
  { title: 'Bài tập chưa nộp', value: 0, icon: <Warning />, color: '#f57c00' },
    { title: 'Bài tập chưa chấm', value: 0, icon: <Grade />, color: '#9c27b0' },
  ]);

  const [upcomingDeadlines, setUpcomingDeadlines] = useState([]);

  const [recentGrades, setRecentGrades] = useState([]);

  const [gradeData, setGradeData] = useState([
    { name: 'Tuần 1', grade: 8.0 },
    { name: 'Tuần 2', grade: 8.5 },
    { name: 'Tuần 3', grade: 9.0 },
    { name: 'Tuần 4', grade: 8.0 },
    { name: 'Tuần 5', grade: 8.5 },
    { name: 'Tuần 6', grade: 9.0 },
    { name: 'Tuần 7', grade: 8.5 },
  ]);

  const [assignmentStatusData, setAssignmentStatusData] = useState([
    { name: 'Đã nộp', value: 12, color: '#388e3c' },
    { name: 'Chưa nộp', value: 3, color: '#f57c00' },
    { name: 'Quá hạn', value: 1, color: '#d32f2f' },
  ]);

  useEffect(() => {
  (async () => {
  try {
  const data = await api.studentDashboard();

        // Update quick stats from real data
        if (data?.stats) {
          setQuickStats([
            { title: 'Lớp học tham gia', value: data.stats.enrolledClasses || 0, icon: <Class />, color: '#1976d2' },
            { title: 'Bài tập đã nộp', value: data.stats.submittedAssignments || 0, icon: <Assignment />, color: '#388e3c' },
            { title: 'Bài tập chưa nộp', value: (data.stats.totalAssignments || 0) - (data.stats.submittedAssignments || 0), icon: <Warning />, color: '#f57c00' },
            { title: 'Bài tập chưa chấm', value: (data.stats.submittedAssignments || 0) - (data.stats.gradedAssignments || 0), icon: <Grade />, color: '#9c27b0' },
          ]);
        }

        // Create assignment status data for pie chart from real data
        if (data?.stats) {
          const submitted = data.stats.submittedAssignments || 0;
          const graded = data.stats.gradedAssignments || 0;
          const notSubmitted = (data.stats.totalAssignments || 0) - submitted;
          const notGraded = submitted - graded;

          setAssignmentStatusData([
            { name: 'Đã nộp & chấm', value: graded, color: '#4caf50' },
            { name: 'Đã nộp, chờ chấm', value: notGraded, color: '#ff9800' },
            { name: 'Chưa nộp', value: notSubmitted, color: '#f44336' },
          ]);
        }

        // Create grade trend data from grades history
        if (Array.isArray(data?.grades) && data.grades.length > 0) {
          const gradeTrend = data.grades.slice(-7).map((grade, index) => ({
            name: `Tuần ${index + 1}`,
            grade: grade.score || 0
          }));
          setGradeData(gradeTrend);
        }

        // Update upcoming deadlines (assignments)
        let deadlines = [];
        if (Array.isArray(data?.upcomingDeadlines)) {
        deadlines = data.upcomingDeadlines.map((d, idx) => ({
        id: `assignment-${d.id || idx}`,
        title: d.title,
        class: d.class || 'Unknown Class',
        deadline: d.dueDate,
        daysLeft: Math.ceil((new Date(d.dueDate) - new Date()) / (1000 * 60 * 60 * 24)),
        status: 'pending',
        description: d.description || 'Không có mô tả',
        type: 'assignment',
          attachments: [], // No attachments from API yet
            maxGrade: 10,
          }));
        }

        // Update upcoming exams
        if (Array.isArray(data?.upcomingExams)) {
          const exams = data.upcomingExams.map((exam, idx) => ({
            id: `exam-${exam.id || idx}`,
            title: exam.title,
            class: exam.class || 'Unknown Class',
            deadline: exam.startAt,
            daysLeft: Math.ceil((new Date(exam.startAt) - new Date()) / (1000 * 60 * 60 * 24)),
            status: 'exam',
            description: exam.description || 'Kỳ thi',
            type: 'exam',
            duration: exam.duration,
            room: exam.room,
            maxGrade: exam.maxGrade || 10,
          }));
          deadlines = [...deadlines, ...exams];
        }

        // Sort by deadline
        deadlines.sort((a, b) => new Date(a.deadline) - new Date(b.deadline));
        setUpcomingDeadlines(deadlines);
        if (Array.isArray(data?.grades)) {
          setRecentGrades(data.grades.map((g, idx) => ({
            id: g.id || idx,
            subject: g.class,
            assignment: g.assignment,
            grade: g.score,
            date: new Date(g.gradedAt).toLocaleDateString('vi-VN'),
            maxGrade: g.maxScore || 10,
            comment: g.notes || 'Không có nhận xét',
            teacher: 'Giảng viên', // Could be added to API
            class: g.class,
            submittedAt: new Date(g.submittedAt).toLocaleString('vi-VN'),
            gradedAt: new Date(g.gradedAt).toLocaleString('vi-VN'),
          })));
        }

        // Update upcoming exams
        if (Array.isArray(data?.upcomingExams)) {
          setUpcomingExams(data.upcomingExams.map((exam, idx) => ({
            id: exam.id || idx,
            startAt: exam.startAt,
            title: exam.title,
            duration: exam.duration || 90,
            class: exam.class || 'Unknown Class',
            monitoring: exam.monitoring || false,
            teacher: exam.teacher || 'Giảng viên',
            description: exam.description || '',
            room: exam.room || 'Phòng A101',
            maxGrade: exam.maxGrade || 10,
          })));
        }

        // Update notifications/announcements
        if (Array.isArray(data?.announcements)) {
          setNotifications(data.announcements.map((announcement, idx) => ({
            id: announcement.id || idx,
            title: announcement.title,
            time: announcement.time,
            type: announcement.type || 'info',
            content: announcement.content,
            sender: announcement.sender || 'Giảng viên',
            class: announcement.class || 'Unknown Class'
          })));
        }

        // Update stats if available
        if (data?.stats) {
          setQuickStats([
            { title: 'Lớp học tham gia', value: data.stats.totalClasses || 0, icon: <Class />, color: '#1976d2' },
            { title: 'Bài tập đã nộp', value: data.stats.submittedAssignments || 0, icon: <Assignment />, color: '#388e3c' },
            { title: 'Bài tập đã chấm', value: data.stats.gradedAssignments || 0, icon: <Grade />, color: '#1976d2' },
          ]);
        }

        // Update grade data for chart
        if (Array.isArray(data?.grades) && data.grades.length > 0) {
          setGradeData(data.grades.map((g, idx) => ({ name: `Tuần ${idx + 1}`, grade: g.score })));
        }
      } catch (e) {
        // Keep static data if API fails
        console.log('Dashboard API failed, using static data:', e);
      }
    })();
  }, []);

  const handleViewNotification = (notification) => {
    setSelectedNotification(notification);
    setOpenNotificationDialog(true);
  };

  const handleViewDeadline = (deadline) => {
    setSelectedDeadline(deadline);
    setOpenDeadlineDialog(true);
  };

  const handleViewGrade = (grade) => {
    setSelectedGrade(grade);
    setOpenGradeDialog(true);
  };

  const handleViewExam = (exam) => {
    setSelectedExam(exam);
    setOpenExamDialog(true);
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'success': return <CheckCircle color="success" />;
      case 'warning': return <Warning color="warning" />;
      case 'info': return <Info color="info" />;
      default: return <Notifications />;
    }
  };

  const getDeadlineStatusColor = (daysLeft) => {
    if (daysLeft <= 1) return 'error';
    if (daysLeft <= 3) return 'warning';
    return 'success';
  };

  return (
    <Box sx={{ p: { xs: 0, sm: 1 } }}>
      <Typography 
        variant="h4" 
        gutterBottom
        sx={{ fontSize: { xs: '1.75rem', sm: '2.125rem' } }}
      >
        Dashboard Sinh viên
      </Typography>
      <Typography 
        variant="subtitle1" 
        color="text.secondary" 
        gutterBottom
        sx={{ 
          fontSize: { xs: '0.875rem', sm: '1rem' },
          mb: { xs: 2, sm: 3 }
        }}
      >
        Chào mừng bạn trở lại! Đây là tổng quan về quá trình học tập của bạn.
      </Typography>

      {/* Quick Stats */}
      <Grid container spacing={{ xs: 1, sm: 3 }} sx={{ mb: 3 }}>
        {quickStats.map((stat, index) => (
          <Grid item xs={4} sm={6} md={3} key={index}>
            <Card sx={{ height: '100%' }}>
              <CardContent sx={{ p: { xs: 1, sm: 2 } }}>
                <Box sx={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  mb: 0,
                  flexDirection: { xs: 'column', sm: 'row' },
                  textAlign: { xs: 'center', sm: 'left' }
                }}>
                  <Avatar sx={{ 
                    bgcolor: stat.color, 
                    mr: { xs: 0, sm: 2 },
                    mb: { xs: 0.25, sm: 0 },
                    width: { xs: 28, sm: 40 },
                    height: { xs: 28, sm: 40 }
                  }}>
                    {stat.icon}
                  </Avatar>
                  <Box>
                    <Typography 
                      variant="h4" 
                      component="div"
                      sx={{ fontSize: { xs: '1.1rem', sm: '2.125rem' } }}
                    >
                      {stat.value}
                    </Typography>
                    <Typography 
                      variant="body2" 
                      color="text.secondary"
                      sx={{ 
                        fontSize: { xs: '0.65rem', sm: '0.875rem' },
                        lineHeight: { xs: 1.1, sm: 1.43 }
                      }}
                    >
                      {stat.title}
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Grid container spacing={{ xs: 2, sm: 3 }}>
        {/* Upcoming Exams */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: { xs: 1.5, sm: 2 } }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography 
                variant="h6" 
                component="div"
                sx={{ fontSize: { xs: '1.1rem', sm: '1.25rem' } }}
              >
                <Schedule sx={{ mr: 1, verticalAlign: 'middle' }} />
                Kỳ thi sắp tới
              </Typography>
            </Box>
            <List>
              {upcomingExams.map((exam, index) => (
                <ListItem key={index} divider button onClick={() => handleViewExam(exam)}>
                  <ListItemIcon>
                    <Assignment color="error" />
                  </ListItemIcon>
                  <ListItemText
                    primary={`${exam.startAt} - ${exam.title}`}
                    secondary={`${exam.class} | Thời lượng: ${exam.duration} phút | Giám sát: ${exam.monitoring ? 'Có' : 'Không'}`}
                  />
                </ListItem>
              ))}
            </List>
          </Paper>
        </Grid>

        {/* Notifications */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: { xs: 1.5, sm: 2 } }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography 
                variant="h6" 
                component="div"
                sx={{ fontSize: { xs: '1.1rem', sm: '1.25rem' } }}
              >
                <Notifications sx={{ mr: 1, verticalAlign: 'middle' }} />
                Thông báo mới
              </Typography>
              <IconButton size="small">
                <MoreVert />
              </IconButton>
            </Box>
            <List>
              {notifications.map((notification) => (
                <ListItem key={notification.id} divider button onClick={() => handleViewNotification(notification)}>
                  <ListItemIcon>
                    {getNotificationIcon(notification.type)}
                  </ListItemIcon>
                  <ListItemText
                    primary={notification.title}
                    secondary={notification.time}
                  />
                </ListItem>
              ))}
            </List>
          </Paper>
        </Grid>

        {/* Upcoming Deadlines */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: { xs: 1.5, sm: 2 } }}>
            <Typography variant="h6" component="div" gutterBottom>
              <AccessTime sx={{ mr: 1, verticalAlign: 'middle' }} />
              Deadline sắp tới
            </Typography>
            <List>
            {upcomingDeadlines.map((deadline) => (
            <ListItem key={deadline.id} divider button onClick={() => handleViewDeadline(deadline)}>
            <ListItemIcon>
            {deadline.type === 'exam' ? (
                <Schedule color="error" />
              ) : (
              <Assignment color="warning" />
            )}
            </ListItemIcon>
            <ListItemText
            primary={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="body2">{deadline.title}</Typography>
                  <Chip
                      label={deadline.type === 'exam' ? 'Kỳ thi' : 'Bài tập'}
                        size="small"
                          color={deadline.type === 'exam' ? 'error' : 'primary'}
                        />
                      </Box>
                    }
                    secondary={`${deadline.class} - ${deadline.type === 'exam' ? 'Bắt đầu' : 'Hạn'}: ${new Date(deadline.deadline).toLocaleDateString('vi-VN')}`}
                  />
                  <Chip
                    label={`${deadline.daysLeft} ngày`}
                    color={getDeadlineStatusColor(deadline.daysLeft)}
                    size="small"
                  />
                </ListItem>
              ))}
            </List>
          </Paper>
        </Grid>

        {/* Recent Grades */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: { xs: 1.5, sm: 2 } }}>
            <Typography variant="h6" component="div" gutterBottom>
              <Grade sx={{ mr: 1, verticalAlign: 'middle' }} />
              Điểm số gần đây
            </Typography>
            <List>
              {recentGrades.map((grade, index) => (
                <ListItem key={index} divider button onClick={() => handleViewGrade(grade)}>
                  <ListItemIcon>
                    <Grade color="primary" />
                  </ListItemIcon>
                  <ListItemText
                    primary={`${grade.subject} - ${grade.assignment}`}
                    secondary={`Ngày: ${grade.date}`}
                  />
                  <Typography variant="h6" color="primary">
                    {grade.grade}
                  </Typography>
                </ListItem>
              ))}
            </List>
          </Paper>
        </Grid>

        {/* Grade Progress Chart */}
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: { xs: 1.5, sm: 2 } }}>
            <Typography variant="h6" component="div" gutterBottom>
              Xu hướng điểm số
            </Typography>
            <Box sx={{ height: 300 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={gradeData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis domain={[0, 10]} />
                  <Tooltip />
                  <Line type="monotone" dataKey="grade" stroke="#1976d2" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </Box>
          </Paper>
        </Grid>

        {/* Assignment Status */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: { xs: 1.5, sm: 2 } }}>
            <Typography variant="h6" component="div" gutterBottom>
              Trạng thái bài tập
            </Typography>
            <Box sx={{ height: 300 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={assignmentStatusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {assignmentStatusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </Box>
            <Box sx={{ mt: 2 }}>
              {assignmentStatusData.map((item, index) => (
                <Box key={index} sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <Box
                    sx={{
                      width: 12,
                      height: 12,
                      backgroundColor: item.color,
                      borderRadius: '50%',
                      mr: 1,
                    }}
                  />
                  <Typography variant="body2">
                    {item.name}: {item.value}
                  </Typography>
                </Box>
              ))}
            </Box>
          </Paper>
        </Grid>
      </Grid>

      {/* Notification Detail Dialog */}
      <Dialog
        open={openNotificationDialog}
        onClose={() => setOpenNotificationDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {selectedNotification?.title}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Người gửi: {selectedNotification?.sender}
            </Typography>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Lớp: {selectedNotification?.class}
            </Typography>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Thời gian: {selectedNotification?.time}
            </Typography>
          </Box>
          
          <Divider sx={{ mb: 2 }} />
          
          <Typography variant="body1">
            {selectedNotification?.content}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenNotificationDialog(false)}>
            Đóng
          </Button>
        </DialogActions>
      </Dialog>

      {/* Deadline Detail Dialog */}
      <Dialog
        open={openDeadlineDialog}
        onClose={() => setOpenDeadlineDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
        Chi tiết {selectedDeadline?.type === 'exam' ? 'kỳ thi' : 'bài tập'} - {selectedDeadline?.title}
        </DialogTitle>
        <DialogContent>
        <Box sx={{ mb: 3 }}>
        <Typography variant="h6" gutterBottom>
        {selectedDeadline?.title}
        </Typography>
        <Typography variant="body2" color="text.secondary" gutterBottom>
        {selectedDeadline?.class}
        </Typography>
        <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
        <Chip
            label={selectedDeadline?.type === 'exam' ? 'Kỳ thi' : 'Bài tập'}
              color={selectedDeadline?.type === 'exam' ? 'error' : 'primary'}
                size="small"
              />
            </Box>
          </Box>

          <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle1" gutterBottom>
          {selectedDeadline?.type === 'exam' ? 'Mô tả kỳ thi:' : 'Mô tả bài tập:'}
          </Typography>
          <Typography variant="body1" sx={{ mb: 2 }}>
          {selectedDeadline?.description}
          </Typography>
          </Box>

          <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6}>
          <Typography variant="subtitle2" color="text.secondary">
          {selectedDeadline?.type === 'exam' ? 'Thời gian bắt đầu:' : 'Hạn nộp:'}
          </Typography>
          <Typography variant="body2">
          {new Date(selectedDeadline?.deadline).toLocaleString('vi-VN')}
          </Typography>
          </Grid>
          <Grid item xs={12} sm={6}>
          <Typography variant="subtitle2" color="text.secondary">
          Còn lại:
          </Typography>
          <Chip
          label={`${selectedDeadline?.daysLeft} ngày`}
          color={getDeadlineStatusColor(selectedDeadline?.daysLeft)}
          size="small"
          />
          </Grid>
          {selectedDeadline?.type === 'exam' && selectedDeadline?.duration && (
          <Grid item xs={12} sm={6}>
          <Typography variant="subtitle2" color="text.secondary">
              Thời lượng:
            </Typography>
          <Typography variant="body2">
              {selectedDeadline.duration} phút
              </Typography>
              </Grid>
            )}
            {selectedDeadline?.type === 'exam' && selectedDeadline?.room && (
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" color="text.secondary">
                  Phòng thi:
                </Typography>
                <Typography variant="body2">
                  {selectedDeadline.room}
                </Typography>
              </Grid>
            )}
            <Grid item xs={12} sm={6}>
              <Typography variant="subtitle2" color="text.secondary">
                Điểm tối đa:
              </Typography>
              <Typography variant="body2">
                {selectedDeadline?.maxGrade} điểm
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography variant="subtitle2" color="text.secondary">
                Trạng thái:
              </Typography>
              <Chip
                label={selectedDeadline?.status === 'pending' ? 'Chưa nộp' : 'Đã nộp'}
                color={selectedDeadline?.status === 'pending' ? 'warning' : 'success'}
                size="small"
              />
            </Grid>
          </Grid>

          {selectedDeadline?.attachments && selectedDeadline.attachments.length > 0 && (
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                File đính kèm:
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {selectedDeadline.attachments.map((file, index) => (
                  <Chip
                    key={index}
                    label={file}
                    size="small"
                    variant="outlined"
                  />
                ))}
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDeadlineDialog(false)}>
            Đóng
          </Button>
          <Button variant="contained">
            Xem trong Bài tập
          </Button>
        </DialogActions>
      </Dialog>

      {/* Grade Detail Dialog */}
      <Dialog
        open={openGradeDialog}
        onClose={() => setOpenGradeDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          Chi tiết điểm số - {selectedGrade?.assignment}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              {selectedGrade?.subject} - {selectedGrade?.assignment}
            </Typography>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              {selectedGrade?.class}
            </Typography>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Giảng viên: {selectedGrade?.teacher}
            </Typography>
          </Box>

          <Box sx={{ mb: 3, textAlign: 'center' }}>
            <Typography variant="h2" color="primary" gutterBottom>
              {selectedGrade?.grade}/{selectedGrade?.maxGrade}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Điểm số
            </Typography>
          </Box>

          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={12} sm={6}>
              <Typography variant="subtitle2" color="text.secondary">
                Ngày nộp:
              </Typography>
              <Typography variant="body2">
                {selectedGrade?.submittedAt}
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography variant="subtitle2" color="text.secondary">
                Ngày chấm:
              </Typography>
              <Typography variant="body2">
                {selectedGrade?.gradedAt}
              </Typography>
            </Grid>
          </Grid>

          {selectedGrade?.comment && (
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Nhận xét của giảng viên:
              </Typography>
              <Typography variant="body1">
                {selectedGrade.comment}
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenGradeDialog(false)}>
            Đóng
          </Button>
          <Button variant="contained">
            Xem bài nộp
          </Button>
        </DialogActions>
      </Dialog>

      {/* Exam Detail Dialog */}
      <Dialog
        open={openExamDialog}
        onClose={() => setOpenExamDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Chi tiết kỳ thi - {selectedExam?.title}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              {selectedExam?.title}
            </Typography>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Lớp: {selectedExam?.class}
            </Typography>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Giảng viên: {selectedExam?.teacher}
            </Typography>
          </Box>

          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle1" gutterBottom>
              Mô tả kỳ thi:
            </Typography>
            <Typography variant="body1" sx={{ mb: 2 }}>
              {selectedExam?.description}
            </Typography>
          </Box>

          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={12} sm={6}>
              <Typography variant="subtitle2" color="text.secondary">
                Thời gian bắt đầu:
              </Typography>
              <Typography variant="body2">
                {selectedExam?.startAt}
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography variant="subtitle2" color="text.secondary">
                Thời lượng:
              </Typography>
              <Typography variant="body2">
                {selectedExam?.duration} phút
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography variant="subtitle2" color="text.secondary">
                Phòng thi:
              </Typography>
              <Typography variant="body2">
                {selectedExam?.room}
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography variant="subtitle2" color="text.secondary">
                Điểm tối đa:
              </Typography>
              <Typography variant="body2">
                {selectedExam?.maxGrade} điểm
              </Typography>
            </Grid>
            <Grid item xs={12}>
              <Typography variant="subtitle2" color="text.secondary">
                Giám sát:
              </Typography>
              <Chip
                label={selectedExam?.monitoring ? 'Bắt buộc bật camera/microphone' : 'Không yêu cầu giám sát'}
                color={selectedExam?.monitoring ? 'warning' : 'default'}
                size="small"
              />
            </Grid>
          </Grid>

          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle1" gutterBottom>
              Hướng dẫn làm bài:
            </Typography>
            <Typography variant="body1">
              {selectedExam?.instructions}
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenExamDialog(false)}>
            Đóng
          </Button>
          <Button variant="contained">
            Vào thi
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default StudentDashboard;
