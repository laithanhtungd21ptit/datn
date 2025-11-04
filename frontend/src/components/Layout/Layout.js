import React, { useState } from 'react';
import { useAuth } from '../../auth/AuthContext';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
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
} from '@mui/icons-material';

const drawerWidth = 240;

const Layout = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null);
  const [notifAnchorEl, setNotifAnchorEl] = useState(null);
  const [openNotificationDialog, setOpenNotificationDialog] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState(null);
  const navigate = useNavigate();
  const { logout } = useAuth();
  const location = useLocation();

  const isTeacher = location.pathname.includes('/teacher');
  const isStudent = location.pathname.includes('/student');
  const isAdmin = location.pathname.includes('/admin');

  const { currentUser } = useAuth();
  const roleLabel = isTeacher ? 'Giảng viên' : isStudent ? 'Sinh viên' : 'Quản trị viên';
  const displayName = currentUser?.fullName || (isTeacher ? 'Giảng viên Demo' : isStudent ? 'Sinh viên Demo' : 'Admin Demo');
  const userCode = currentUser?.username || '';

  // Notifications - currently no API, so empty
  const notificationsData = [];

  const teacherMenuItems = [
    { text: 'Trang chủ', icon: <Dashboard />, path: '/teacher' },
    { text: 'Quản lý lớp học', icon: <School />, path: '/teacher/classes' },
    { text: 'Quản lý bài tập', icon: <Assignment />, path: '/teacher/assignments' },
    { text: 'Giám sát học tập', icon: <Monitor />, path: '/teacher/monitoring' },
  ];

  const studentMenuItems = [
    { text: 'Trang chủ', icon: <Dashboard />, path: '/student' },
    { text: 'Lớp học', icon: <Class />, path: '/student/classes' },
    { text: 'Bài tập', icon: <Assignment />, path: '/student/assignments' },
    { text: 'Tài khoản', icon: <Person />, path: '/student/profile' },
  ];

  const adminMenuItems = [
    { text: 'Dashboard', icon: <Dashboard />, path: '/admin' },
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

  const handleViewNotification = (notification) => {
    setSelectedNotification(notification);
    setOpenNotificationDialog(true);
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
          <IconButton color="inherit" onClick={handleNotifClick} aria-haspopup="true" aria-controls="menu-notifications" aria-label="notifications">
            <Notifications />
          </IconButton>
          <IconButton
            size="large"
            aria-label="account of current user"
            aria-controls="menu-appbar"
            aria-haspopup="true"
            onClick={handleMenuClick}
            color="inherit"
          >
            <Avatar sx={{ width: 32, height: 32 }}>
              {displayName.charAt(0).toUpperCase()}
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
          >
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
      >
        <MenuItem disabled>
          <Typography variant="subtitle2">Thông báo</Typography>
        </MenuItem>
        {notificationsData.length === 0 ? (
          <MenuItem onClick={handleNotifClose}>Không có thông báo mới</MenuItem>
        ) : (
          notificationsData.map((n) => (
            <MenuItem key={n.id} onClick={() => handleViewNotification(n)} sx={{ maxWidth: 320, whiteSpace: 'normal' }}>
              <ListItemIcon>
                {n.type === 'assignment' && <Assignment color="primary" />}
                {n.type === 'class' && <Class color="info" />}
                {n.type === 'exam' && <Monitor color="warning" />}
                {n.type === 'grade' && <Person color="success" />}
              </ListItemIcon>
              <ListItemText
                primary={n.title}
                secondary={n.time}
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
    </Box>
  );
};

export default Layout;
