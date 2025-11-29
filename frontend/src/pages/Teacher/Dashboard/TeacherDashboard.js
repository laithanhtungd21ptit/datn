import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
  Avatar,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Divider,
  Chip,
} from '@mui/material';
import {
  Schedule,
  Assignment,
  People,
  Notifications,
  Add,
  MoreVert,
  CheckCircle,
  Warning,
  Info,
} from '@mui/icons-material';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { api } from '../../../api/client';

const TeacherDashboard = () => {
  const navigate = useNavigate();
  const [openNotificationDialog, setOpenNotificationDialog] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState(null);
  const [openScheduleDialog, setOpenScheduleDialog] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState(null);
  const [showAllSchedule, setShowAllSchedule] = useState(false);
  const [showAllNotifications, setShowAllNotifications] = useState(false);

  const [notifications, setNotifications] = useState([
    { 
      id: 1, 
      title: 'Sinh viên Nguyễn Văn A đã nộp bài tập', 
      time: '5 phút trước', 
      type: 'success',
      content: 'Sinh viên Nguyễn Văn A (MSSV: 20123456) đã nộp bài tập "Thuật toán sắp xếp" trong lớp IT01. Bài nộp đúng hạn và đầy đủ file yêu cầu.',
      sender: 'Hệ thống',
      class: 'IT01 - Lập trình Web',
      studentName: 'Nguyễn Văn A',
      assignmentTitle: 'Thuật toán sắp xếp',
    },
    { 
      id: 2, 
      title: 'Bài tập "Thuật toán sắp xếp" sắp hết hạn', 
      time: '1 giờ trước', 
      type: 'warning',
      content: 'Bài tập "Thuật toán sắp xếp" trong lớp IT01 sẽ hết hạn vào 23:59 hôm nay. Hiện tại còn 5 sinh viên chưa nộp bài. Vui lòng nhắc nhở sinh viên hoàn thành bài tập.',
      sender: 'Hệ thống',
      class: 'IT01 - Lập trình Web',
      deadline: '2024-01-15 23:59',
      pendingStudents: 5,
    },
    { 
      id: 3, 
      title: 'Lớp IT01 có 3 sinh viên chưa nộp bài', 
      time: '2 giờ trước', 
      type: 'info',
      content: 'Trong lớp IT01, còn 3 sinh viên chưa nộp bài tập "Thuật toán sắp xếp": Trần Thị B, Lê Văn C, Phạm Thị D. Cần kiểm tra và nhắc nhở.',
      sender: 'Hệ thống',
      class: 'IT01 - Lập trình Web',
      pendingStudents: 3,
      pendingStudentNames: ['Trần Thị B', 'Lê Văn C', 'Phạm Thị D'],
    },
  ]);

  const [todaySchedule, setTodaySchedule] = useState([
    { 
      id: 1,
      time: '08:00', 
      subject: 'Lập trình Web', 
      class: 'IT01', 
      room: 'A101',
      description: 'Buổi học về HTML/CSS cơ bản và responsive design. Sinh viên sẽ học cách tạo layout và styling cho website.',
      students: 45,
      duration: 120,
      topics: ['HTML Structure', 'CSS Styling', 'Responsive Design'],
      materials: ['HTML_Basics.pdf', 'CSS_Guide.docx', 'Demo_Code.zip'],
    },
    { 
      id: 2,
      time: '10:00', 
      subject: 'Cơ sở dữ liệu', 
      class: 'IT02', 
      room: 'B202',
      description: 'Thực hành thiết kế ERD và chuẩn hóa cơ sở dữ liệu. Sinh viên sẽ làm bài tập về mô hình quan hệ.',
      students: 38,
      duration: 90,
      topics: ['ERD Design', 'Normalization', 'SQL Queries'],
      materials: ['ERD_Examples.pdf', 'Normalization_Guide.docx'],
    },
    { 
      id: 3,
      time: '14:00', 
      subject: 'Thuật toán', 
      class: 'IT03', 
      room: 'C303',
      description: 'Giảng dạy về thuật toán sắp xếp và tìm kiếm. Sinh viên sẽ cài đặt và so sánh hiệu suất các thuật toán.',
      students: 42,
      duration: 150,
      topics: ['Sorting Algorithms', 'Search Algorithms', 'Complexity Analysis'],
      materials: ['Algorithm_Book.pdf', 'Code_Templates.zip'],
    },
  ]);

  const [quickStats, setQuickStats] = useState([
    { title: 'Tổng lớp học', value: 12, icon: <People />, color: '#1976d2' },
    { title: 'Bài tập chưa chấm', value: 8, icon: <Assignment />, color: '#f57c00' },
    { title: 'Kỳ thi', value: 3, icon: <People />, color: '#388e3c' },
  ]);

  const [assignmentData, setAssignmentData] = useState([
    { name: 'Thứ 2', submitted: 45, pending: 5 },
    { name: 'Thứ 3', submitted: 52, pending: 3 },
    { name: 'Thứ 4', submitted: 48, pending: 7 },
    { name: 'Thứ 5', submitted: 55, pending: 2 },
    { name: 'Thứ 6', submitted: 41, pending: 9 },
    { name: 'Thứ 7', submitted: 38, pending: 12 },
    { name: 'CN', submitted: 25, pending: 15 },
  ]);

  useEffect(() => {
    (async () => {
      try {
        const data = await api.teacherDashboard();
        if (data?.stats) {
          setQuickStats([
            { title: 'Tổng lớp học', value: data.stats.classes, icon: <People />, color: '#1976d2' },
            { title: 'Bài tập chưa chấm', value: data.stats.assignments, icon: <Assignment />, color: '#f57c00' },
            { title: 'Kỳ thi', value: data.stats.exams, icon: <People />, color: '#388e3c' },
          ]);
        }
        if (Array.isArray(data?.notifications)) {
          setNotifications(data.notifications);
        }
        if (Array.isArray(data?.assignmentData)) {
          setAssignmentData(data.assignmentData);
        }
        if (Array.isArray(data?.schedule)) {
          setTodaySchedule(data.schedule.map(s => ({
            id: s.id,
            time: s.time,
            subject: s.subject,
            class: s.class,
            description: s.description,
            students: s.students,
            duration: s.duration,
            topics: s.topics,
            materials: s.materials,
          })));
        }
      } catch (e) {
        // Silent fail keeps UI working with defaults
      }
    })();
  }, []);

  const handleViewNotification = async (notification) => {
    setSelectedNotification(notification);
    setOpenNotificationDialog(true);

    // Mark as read if not already read
    if (!notification.isRead) {
      try {
        await api.teacherMarkNotificationRead(notification.id);
        // Reload notifications from server to ensure sync
        const data = await api.teacherDashboard();
        if (Array.isArray(data?.notifications)) {
          setNotifications(data.notifications);
        }
      } catch (error) {
        console.error('Failed to mark notification as read:', error);
      }
    }
  };

  const handleViewSchedule = (schedule) => {
    setSelectedSchedule(schedule);
    setOpenScheduleDialog(true);
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'success': return <CheckCircle color="success" />;
      case 'warning': return <Warning color="warning" />;
      case 'info': return <Info color="info" />;
      default: return <Notifications />;
    }
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Dashboard Giảng viên
      </Typography>
      <Typography variant="subtitle1" color="text.secondary" gutterBottom>
        Chào mừng bạn trở lại! Đây là tổng quan về hoạt động giảng dạy của bạn.
      </Typography>

      {/* Quick Stats */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        {quickStats.map((stat, index) => (
          <Grid item xs={12} sm={6} md={3} key={index}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <Avatar sx={{ bgcolor: stat.color, mr: 2 }}>
                    {stat.icon}
                  </Avatar>
                  <Box>
                    <Typography variant="h4" component="div">
                      {stat.value}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {stat.title}
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Grid container spacing={3}>
        {/* Today's Schedule */}
        <Grid item xs={12} md={6} sx={{ display: 'flex' }}>
          <Paper sx={{ p: 2, width: '100%', display: 'flex', flexDirection: 'column' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography 
                variant="h6" 
                component="div"
                sx={{ fontSize: { xs: '1.1rem', sm: '1.25rem' }, flex: 1 }}
              >
                <Schedule sx={{ mr: 1, verticalAlign: 'middle' }} />
                Lịch nộp hôm nay
              </Typography>
              <Button
                size="small"
                onClick={() => setShowAllSchedule(!showAllSchedule)}
                sx={{ display: todaySchedule.length > 4 ? 'block' : 'none', ml: 1 }}
              >
                {showAllSchedule ? 'Thu gọn' : `Xem tất cả (${todaySchedule.length})`}
              </Button>
            </Box>
            <List sx={{ flex: 1 }}>
              {todaySchedule.length === 0 ? (
                <ListItem>
                  <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic', textAlign: 'center', width: '100%' }}>
                    Không có bài tập nào có hạn nộp hôm nay
                  </Typography>
                </ListItem>
              ) : (
                <>
                  {todaySchedule.slice(0, showAllSchedule ? todaySchedule.length : 4).map((item, index) => (
                    <ListItem key={item.id || index} divider button onClick={() => handleViewSchedule(item)}>
                      <ListItemIcon>
                        <Assignment color="primary" />
                      </ListItemIcon>
                      <ListItemText
                        primary={`${item.time} - ${item.subject}`}
                        secondary={`Lớp: ${item.class} | Đã nộp: ${item.submittedCount || 0}/${item.totalStudents || 0}`}
                      />
                    </ListItem>
                  ))}
                  {!showAllSchedule && todaySchedule.length > 4 && (
                    <ListItem>
                      <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic', textAlign: 'center', width: '100%' }}>
                        (Còn {todaySchedule.length - 4} bài tập khác)
                      </Typography>
                    </ListItem>
                  )}
                </>
              )}
            </List>
          </Paper>
        </Grid>

        {/* Notifications */}
        <Grid item xs={12} md={6} sx={{ display: 'flex' }}>
          <Paper sx={{ p: 2, width: '100%', display: 'flex', flexDirection: 'column' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography 
                variant="h6" 
                component="div"
                sx={{ fontSize: { xs: '1.1rem', sm: '1.25rem' }, flex: 1 }}
              >
                <Notifications sx={{ mr: 1, verticalAlign: 'middle' }} />
                Thông báo mới
              </Typography>
              <Button
                size="small"
                onClick={() => setShowAllNotifications(!showAllNotifications)}
                sx={{ display: notifications.length > 4 ? 'block' : 'none', ml: 1 }}
              >
                {showAllNotifications ? 'Thu gọn' : `Xem tất cả (${notifications.length})`}
              </Button>
              <IconButton size="small" sx={{ ml: 1 }}>
                <MoreVert />
              </IconButton>
            </Box>
            <List sx={{ flex: 1 }}>
              {notifications.slice(0, showAllNotifications ? notifications.length : 4).map((notification) => (
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
              {!showAllNotifications && notifications.length > 4 && (
                <ListItem>
                  <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic', textAlign: 'center', width: '100%' }}>
                    (Còn {notifications.length - 4} thông báo khác)
                  </Typography>
                </ListItem>
              )}
            </List>
          </Paper>
        </Grid>

        {/* Assignment Statistics Chart */}
        <Grid item xs={12}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" component="div" gutterBottom>
              Thống kê nộp bài tập trong tuần
            </Typography>
            <Box sx={{ height: 300 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={assignmentData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="submitted" fill="#1976d2" name="Đã nộp" />
                  <Bar dataKey="pending" fill="#f57c00" name="Chưa nộp" />
                </BarChart>
              </ResponsiveContainer>
            </Box>
          </Paper>
        </Grid>
      </Grid>

      {/* Notification Detail Dialog */}
      <Dialog
        open={openNotificationDialog}
        onClose={() => setOpenNotificationDialog(false)}
        maxWidth="md"
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
            <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
              {getNotificationIcon(selectedNotification?.type)}
              <Chip
                label={selectedNotification?.type === 'success' ? 'Thành công' : 
                      selectedNotification?.type === 'warning' ? 'Cảnh báo' : 'Thông tin'}
                color={selectedNotification?.type === 'success' ? 'success' : 
                       selectedNotification?.type === 'warning' ? 'warning' : 'info'}
                size="small"
                sx={{ ml: 1 }}
              />
            </Box>
          </Box>

          <Divider sx={{ mb: 2 }} />

          <Typography variant="body1" sx={{ mb: 3 }}>
            {selectedNotification?.content}
          </Typography>

          {selectedNotification?.studentName && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Sinh viên:
              </Typography>
              <Typography variant="body2">
                {selectedNotification.studentName}
              </Typography>
            </Box>
          )}

          {selectedNotification?.assignmentTitle && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Bài tập:
              </Typography>
              <Typography variant="body2">
                {selectedNotification.assignmentTitle}
              </Typography>
            </Box>
          )}

          {selectedNotification?.deadline && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Hạn nộp:
              </Typography>
              <Typography variant="body2">
                {selectedNotification.deadline}
              </Typography>
            </Box>
          )}

          {selectedNotification?.pendingStudents && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Số sinh viên chưa nộp:
              </Typography>
              <Typography variant="body2">
                {selectedNotification.pendingStudents} sinh viên
              </Typography>
            </Box>
          )}

          {selectedNotification?.pendingStudentNames && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Danh sách sinh viên chưa nộp:
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {selectedNotification.pendingStudentNames.map((name, index) => (
                  <Chip key={index} label={name} size="small" variant="outlined" />
                ))}
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenNotificationDialog(false)}>
            Đóng
          </Button>
        </DialogActions>
      </Dialog>

      {/* Schedule Detail Dialog */}
      <Dialog
        open={openScheduleDialog}
        onClose={() => setOpenScheduleDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Chi tiết bài tập - {selectedSchedule?.subject}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              {selectedSchedule?.subject}
            </Typography>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Lớp: {selectedSchedule?.class}
            </Typography>
            {selectedSchedule?.isExam && (
              <Chip label="Bài thi" color="error" size="small" sx={{ mt: 1 }} />
            )}
          </Box>

          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={12} sm={6}>
              <Typography variant="subtitle2" color="text.secondary">
                Hạn nộp:
              </Typography>
              <Typography variant="body2">
                {selectedSchedule?.time} - {selectedSchedule?.dueDate ? new Date(selectedSchedule.dueDate).toLocaleDateString('vi-VN') : ''}
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography variant="subtitle2" color="text.secondary">
                Tình trạng nộp bài:
              </Typography>
              <Typography variant="body2">
                {selectedSchedule?.submittedCount || 0} / {selectedSchedule?.totalStudents || 0} sinh viên
              </Typography>
            </Grid>
          </Grid>

          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle1" gutterBottom>
              Mô tả:
            </Typography>
            <Typography variant="body1" sx={{ mb: 2 }}>
              {selectedSchedule?.description || 'Không có mô tả'}
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenScheduleDialog(false)}>
            Đóng
          </Button>
          <Button 
            variant="contained" 
            onClick={() => {
              if (selectedSchedule?.id) {
                navigate(`/teacher/assignments/${selectedSchedule.id}`);
              }
            }}
          >
            Xem bài tập
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default TeacherDashboard;
