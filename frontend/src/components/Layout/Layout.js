import React, { useState, useEffect } from 'react';
import { useAuth } from '../../auth/AuthContext';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import ChatPopup from '../Chat/ChatPopup';
import { getAvatarUrl, getInitials, getAvatarColor } from '../../utils/avatarHelper';
import {
  Box,
  Drawer,
  AppBar,
  Toolbar,
  List,
  Typography,
  Divider,
  IconButton,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Avatar,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Badge,
} from '@mui/material';
import {
  Menu as MenuIcon,
  Dashboard,
  School,
  Assignment,
  Monitor,
  Class,
  Person,
  Logout,
  Notifications,
  DoneAll,
  Description,
  Games,
  } from '@mui/icons-material';
import { api } from '../../api/client';

const drawerWidth = 240;

const Layout = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null);
  const [notifAnchorEl, setNotifAnchorEl] = useState(null);
  const [openNotificationDialog, setOpenNotificationDialog] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState(null);
  const [notificationsData, setNotificationsData] = useState([]);
  const navigate = useNavigate();
  const { logout } = useAuth();
  const location = useLocation();

  const isTeacher = location.pathname.includes('/teacher');
  const isStudent = location.pathname.includes('/student');
  const isAdmin = location.pathname.includes('/admin');

  const { currentUser } = useAuth();
  const roleLabel = isTeacher ? 'GV' : isStudent ? 'SV' : 'Quản trị viên';
  const displayName = currentUser?.fullName || (isTeacher ? 'Giảng viên Demo' : isStudent ? 'Sinh viên Demo' : 'Admin Demo');
  const userCode = currentUser?.username || '';

  // Fetch notifications for students and teachers
  useEffect(() => {
    if ((isStudent || isTeacher) && currentUser) {
      const fetchNotifications = async () => {
        try {
          // Ensure token is available before fetching
          const token = localStorage.getItem('accessToken');
          if (!token) {
            console.warn('No token available for fetching notifications');
            return;
          }
          
          const notifications = isStudent 
            ? await api.studentNotifications()
            : await api.teacherNotifications();
          setNotificationsData(notifications);
        } catch (error) {
          // Only log error if it's not a 403 (might be temporary token sync issue)
          if (error.message !== 'FORBIDDEN') {
            console.error('Failed to fetch notifications:', error);
          }
        }
      };
      
      // Add a small delay to ensure token is synced after profile updates
      const timeoutId = setTimeout(() => {
        fetchNotifications();
      }, 100);
      
      return () => clearTimeout(timeoutId);
    }
  }, [isStudent, isTeacher, currentUser]);

  const teacherMenuItems = [
    { text: 'Trang chủ', icon: <Dashboard />, path: '/teacher' },
    { text: 'Quản lý lớp học', icon: <School />, path: '/teacher/classes' },
    { text: 'Quản lý bài tập', icon: <Assignment />, path: '/teacher/assignments' },
    { text: 'Giám sát học tập', icon: <Monitor />, path: '/teacher/monitoring' },
  ];

  const studentMenuItems = [
    { text: 'Trang chủ', icon: <Dashboard />, path: '/student' },
    { text: 'Lớp học', icon: <Class />, path: '/student/classes' },
    { text: 'Thực hành bộ môn', icon: <Games />, path: '/student/practice' },
    { text: 'Bài tập', icon: <Assignment />, path: '/student/assignments' },
    { text: 'Tài khoản', icon: <Person />, path: '/student/profile' },
  ];

  const adminMenuItems = [
    { text: 'Tổng quan', icon: <Dashboard />, path: '/admin' },
    { text: 'Quản lý tài khoản', icon: <Person />, path: '/admin/accounts' },
    { text: 'Lớp học/Môn học', icon: <School />, path: '/admin/classes' },
  ];

  const menuItems = isTeacher ? teacherMenuItems : isStudent ? studentMenuItems : adminMenuItems;

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleMenuClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleNotifClick = (event) => {
    setNotifAnchorEl(event.currentTarget);
  };

  const handleNotifClose = () => {
    setNotifAnchorEl(null);
  };

  const handleViewNotification = async (notification) => {
    setSelectedNotification(notification);
    setOpenNotificationDialog(true);
    setNotifAnchorEl(null);

    // Mark as read if not already read
    if ((isStudent || isTeacher) && !notification.isRead) {
      try {
        if (isStudent) {
          await api.studentMarkNotificationRead(notification.id);
        } else if (isTeacher) {
          await api.teacherMarkNotificationRead(notification.id);
        }
        // Reload notifications from server to ensure sync
        const notifications = isStudent 
          ? await api.studentNotifications()
          : await api.teacherNotifications();
        setNotificationsData(notifications);
      } catch (error) {
        console.error('Failed to mark notification as read:', error);
      }
    }
  };

  const handleMarkAllRead = async () => {
    if ((isStudent || isTeacher) && notificationsData.length > 0) {
      try {
        if (isStudent) {
          await api.studentMarkAllNotificationsRead();
        } else if (isTeacher) {
          await api.teacherMarkAllNotificationsRead();
        }
        // Reload notifications from server to ensure sync
        const notifications = isStudent 
          ? await api.studentNotifications()
          : await api.teacherNotifications();
        setNotificationsData(notifications);
      } catch (error) {
        console.error('Failed to mark all notifications as read:', error);
      }
    }
    setNotifAnchorEl(null);
  };

  const handleLogout = () => {
    handleMenuClose();
    logout();
    navigate('/login');
  };

  const drawer = (
    <div>
      <Toolbar sx={{ bgcolor: 'primary.main', color: 'primary.contrastText' }}>
        <Box sx={{ width: '100%', overflow: 'hidden' }}>
          <Typography 
            variant="h6" 
            noWrap 
            component="div" 
            color="inherit"
            sx={{ 
              fontSize: { xs: '1rem', sm: '1.25rem' },
              overflow: 'hidden',
              textOverflow: 'ellipsis'
            }}
          >
            {roleLabel}: {displayName}
          </Typography>
          {userCode && (
            <Typography 
              variant="body2" 
              noWrap 
              component="div" 
              color="inherit" 
              sx={{ 
                opacity: 0.8,
                fontSize: { xs: '0.75rem', sm: '0.875rem' },
                overflow: 'hidden',
                textOverflow: 'ellipsis'
              }}
            >
              Mã: {userCode}
            </Typography>
          )}
        </Box>
      </Toolbar>
      <Divider />
      <List>
        {menuItems.map((item) => (
          <ListItem key={item.text} disablePadding>
            <ListItemButton
              selected={location.pathname === item.path}
              onClick={() => navigate(item.path)}
            >
              <ListItemIcon>
                {item.icon}
              </ListItemIcon>
              <ListItemText primary={item.text} />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
    </div>
  );

  return (
    <Box sx={{ display: 'flex' }}>
      <AppBar
        position="fixed"
        sx={{
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          ml: { sm: `${drawerWidth}px` },
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { sm: 'none' } }}
          >
            <MenuIcon />
          </IconButton>
          <Typography 
            variant="h6" 
            noWrap 
            component="div" 
            sx={{ 
              flexGrow: 1,
              fontSize: { xs: '1rem', sm: '1.25rem' },
              overflow: 'hidden',
              textOverflow: 'ellipsis'
            }}
          >
            Hệ thống Quản lý Bài tập
          </Typography>
          {(isStudent || isTeacher) && (
          <IconButton color="inherit" onClick={handleNotifClick} aria-haspopup="true" aria-controls="menu-notifications" aria-label="notifications">
              <Badge badgeContent={notificationsData.filter(n => !n.isRead).length} color="error">
                <Notifications />
              </Badge>
            </IconButton>
          )}
          <IconButton
          size="large"
          aria-label="account of current user"
          aria-controls="menu-appbar"
          aria-haspopup="true"
          onClick={handleMenuClick}
          color="inherit"
          >
          <Avatar
            src={getAvatarUrl(currentUser?.avatar)}
            alt={displayName}
            sx={{ 
              width: 32, 
              height: 32,
              bgcolor: currentUser?.avatar ? 'transparent' : getAvatarColor(displayName),
              border: '2px solid white',
              boxShadow: 1,
              cursor: 'pointer',
              transition: 'transform 0.2s',
              '&:hover': {
                transform: 'scale(1.1)'
              }
            }}
            imgProps={{
              onError: (e) => {
                e.target.style.display = 'none';
              }
            }}
          >
            {getInitials(displayName)}
          </Avatar>
          </IconButton>
          <Menu
            id="menu-appbar"
            anchorEl={anchorEl}
            anchorOrigin={{
              vertical: 'bottom',
              horizontal: 'right',
            }}
            keepMounted
            transformOrigin={{
              vertical: 'top',
              horizontal: 'right',
            }}
            open={Boolean(anchorEl)}
            onClose={handleMenuClose}
            PaperProps={{
              sx: { minWidth: 220, mt: 1 }
            }}
          >
            <Box sx={{ px: 2, py: 1.5, borderBottom: '1px solid #e0e0e0' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Avatar
                  src={getAvatarUrl(currentUser?.avatar)}
                  alt={displayName}
                  sx={{ 
                    width: 40, 
                    height: 40,
                    bgcolor: getAvatarColor(displayName)
                  }}
                >
                  {getInitials(displayName)}
                </Avatar>
                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                    {displayName}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {roleLabel}
                  </Typography>
                </Box>
              </Box>
            </Box>
            {isStudent && (
              <MenuItem onClick={() => { navigate('/student/profile'); handleMenuClose(); }}>
                <ListItemIcon>
                  <Person fontSize="small" />
                </ListItemIcon>
                Hồ sơ cá nhân
              </MenuItem>
            )}
            <MenuItem onClick={handleLogout}>
              <ListItemIcon>
                <Logout fontSize="small" />
              </ListItemIcon>
              Đăng xuất
            </MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>
      {/* Notifications Menu */}
      <Menu
      id="menu-notifications"
      anchorEl={notifAnchorEl}
      open={Boolean(notifAnchorEl)}
      onClose={handleNotifClose}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        PaperProps={{
        sx: { maxWidth: 400, maxHeight: 500 }
      }}
      >
      <Box sx={{ p: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <Typography variant="subtitle2">Thông báo</Typography>
      {notificationsData.length > 0 && notificationsData.some(n => !n.isRead) && (
      <Button
      size="small"
      startIcon={<DoneAll />}
      onClick={handleMarkAllRead}
      sx={{ fontSize: '0.75rem' }}
      >
      Đánh dấu tất cả đã đọc
      </Button>
      )}
      </Box>
      <Divider />
      {notificationsData.length === 0 ? (
      <MenuItem onClick={handleNotifClose}>Không có thông báo mới</MenuItem>
      ) : (
        notificationsData.map((n) => (
        <MenuItem
        key={n.id}
        onClick={() => handleViewNotification(n)}
        sx={{
        maxWidth: 400,
        whiteSpace: 'normal',
        backgroundColor: n.isRead ? 'transparent' : 'action.hover',
        '&:hover': {
        backgroundColor: n.isRead ? 'action.hover' : 'action.selected'
        }
        }}
        >
        <ListItemIcon>
        {n.type === 'announcement_created' && <Notifications color={n.isRead ? "disabled" : "primary"} />}
        {n.type === 'assignment_created' && <Assignment color={n.isRead ? "disabled" : "warning"} />}
          {n.type === 'assignment_graded' && <Assignment color={n.isRead ? "disabled" : "success"} />}
          {n.type === 'assignment_submitted' && <Assignment color={n.isRead ? "disabled" : "success"} />}
          {n.type === 'assignment_pending' && <Assignment color={n.isRead ? "disabled" : "warning"} />}
          {n.type === 'comment_created' && <Description color={n.isRead ? "disabled" : "info"} />}
          {n.type === 'document_uploaded' && <Description color={n.isRead ? "disabled" : "info"} />}
        </ListItemIcon>
        <ListItemText
        primary={
        <Typography
        variant="body2"
        sx={{
          fontWeight: n.isRead ? 'normal' : 'bold',
            textTransform: 'none' // Chuyển từ in hoa sang thường
        }}
        >
            {n.title}
          </Typography>
        }
        secondary={
        <Typography variant="caption" color="text.secondary">
            {n.time}
            </Typography>
            }
            />
            </MenuItem>
          ))
        )}
      </Menu>
      <Box
        component="nav"
        sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}
        aria-label="mailbox folders"
      >
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{
            keepMounted: true,
          }}
          sx={{
            display: { xs: 'block', sm: 'none' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
          }}
        >
          {drawer}
        </Drawer>
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', sm: 'block' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>
      <Box
        component="main"
        sx={{ 
          flexGrow: 1, 
          p: { xs: 2, sm: 3 }, 
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          minHeight: '100vh'
        }}
      >
        <Toolbar />
        <Outlet />
      </Box>

      {/* Notification Detail Dialog */}
      <Dialog
      open={openNotificationDialog}
      onClose={() => setOpenNotificationDialog(false)}
      maxWidth="sm"
      fullWidth
      >
      <DialogTitle sx={{ textTransform: 'none' }}>
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

      <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
      {selectedNotification?.content}
      </Typography>
      </DialogContent>
      <DialogActions>
      <Button onClick={() => setOpenNotificationDialog(false)}>
      Đóng
      </Button>
      </DialogActions>
      </Dialog>
      {/* Chat Popup */}
      <ChatPopup />
    </Box>
  );
};

export default Layout;
