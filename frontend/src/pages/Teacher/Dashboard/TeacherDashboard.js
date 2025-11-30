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
  CircularProgress,
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
import { api } from '../../../api/client';

const TeacherDashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [openNotificationDialog, setOpenNotificationDialog] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState(null);
  const [openScheduleDialog, setOpenScheduleDialog] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState(null);
  const [showAllSchedule, setShowAllSchedule] = useState(false);
  const [showAllNotifications, setShowAllNotifications] = useState(false);

  // Initialize with empty arrays - will be populated from API
  const [notifications, setNotifications] = useState([]);
  const [todaySchedule, setTodaySchedule] = useState([]);
  const [quickStats, setQuickStats] = useState([]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const data = await api.teacherDashboard();
        
        // Set quick stats from API
        if (data?.stats) {
          setQuickStats([
            { title: 'Tổng lớp học', value: data.stats.classes || 0, icon: <People />, color: '#1976d2' },
            { title: 'Bài tập ', value: data.stats.assignments || 0, icon: <Assignment />, color: '#f57c00' },
            { title: 'Kỳ thi', value: data.stats.exams || 0, icon: <People />, color: '#388e3c' },
          ]);
        }
        
        // Set notifications from API
        if (Array.isArray(data?.notifications)) {
          setNotifications(data.notifications);
        }
        
        // Set schedule from API
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
      } catch (error) {
        console.error('Failed to load dashboard data:', error);
        // Keep empty arrays if API fails
      } finally {
        setLoading(false);
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

  // Show loading spinner while data is being fetched
  if (loading) {
    return (
      <Box 
        sx={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          minHeight: '80vh',
          flexDirection: 'column',
          gap: 2
        }}
      >
        <CircularProgress size={60} thickness={4} />
        <Typography variant="h6" color="text.secondary">
          Đang tải dữ liệu...
        </Typography>
      </Box>
    );
  }

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
