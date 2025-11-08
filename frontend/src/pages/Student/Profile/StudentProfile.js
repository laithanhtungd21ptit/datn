import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Button,
  TextField,
  Avatar,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Switch,
  FormControlLabel,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  ListItemSecondaryAction,
  Chip,
  Paper,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import {
  Edit,
  Save,
  Cancel,
  PhotoCamera,
  Lock,
  Email,
  Phone,
  LocationOn,
  School,
  CalendarToday,
  Security,
  Notifications,
  Visibility,
  VisibilityOff,
} from '@mui/icons-material';
import { api } from '../../../api/client';
import { useAuth } from '../../../auth/AuthContext';

const StudentProfile = () => {
  const { currentUser, login } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const [notificationSettings, setNotificationSettings] = useState({
    emailNotifications: true,
    smsNotifications: false,
    assignmentDeadlines: true,
    gradeUpdates: true,
    classAnnouncements: true,
    systemUpdates: false,
  });

  const [editMode, setEditMode] = useState(false);
  const [openPasswordDialog, setOpenPasswordDialog] = useState(false);
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  });
  const [tempProfile, setTempProfile] = useState(null);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoading(true);
        setError('');
        const data = await api.studentProfile();
        setProfile({
        ...data,
        major: data.department || 'Chưa cập nhật',
        year: 'Năm 3', // Default value
        class: 'IT01', // Default value
        // Academic statistics from API
        stats: data.stats || {},
        enrolledClasses: data.enrolledClasses || []
        });
        setTempProfile({
        ...data,
        major: data.department || 'Chưa cập nhật',
        year: 'Năm 3',
        class: 'IT01',
        // Academic statistics from API
        stats: data.stats || {},
        enrolledClasses: data.enrolledClasses || []
        });
      } catch (err) {
        setError(err.message || 'Không thể tải thông tin cá nhân');
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, []);

  const handleEditProfile = () => {
    setTempProfile(profile);
    setEditMode(true);
  };

  const handleSaveProfile = async () => {
    try {
      setLoading(true);
      const updatedProfile = await api.studentUpdateProfile({
        fullName: tempProfile.fullName,
        email: tempProfile.email,
        phone: tempProfile.phone,
        address: tempProfile.address,
        dateOfBirth: tempProfile.dateOfBirth,
        gender: tempProfile.gender,
        avatar: tempProfile.avatar
      });
      setProfile(updatedProfile);
      setEditMode(false);
      
      // Update currentUser in AuthContext to reflect avatar change in header
      if (currentUser) {
        const token = localStorage.getItem('accessToken');
        login(token, {
          ...currentUser,
          avatar: updatedProfile.avatar,
          fullName: updatedProfile.fullName,
          email: updatedProfile.email
        });
      }
    } catch (error) {
      setError(error.message || 'Không thể cập nhật thông tin cá nhân');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelEdit = () => {
    setTempProfile(profile);
    setEditMode(false);
  };

  const handleInputChange = (field, value) => {
    setTempProfile(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handlePasswordChange = (field, value) => {
    setPasswordData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSavePassword = () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      alert('Mật khẩu mới không khớp!');
      return;
    }
    // Handle password change logic
    console.log('Changing password...');
    setOpenPasswordDialog(false);
    setPasswordData({
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    });
  };

  const handleNotificationChange = (setting, value) => {
    setNotificationSettings(prev => ({
      ...prev,
      [setting]: value
    }));
  };

  const togglePasswordVisibility = (field) => {
    setShowPasswords(prev => ({
      ...prev,
      [field]: !prev[field]
    }));
  };

  const handleAvatarUpload = async (event) => {
    const file = event.target.files[0];
    if (file) {
      try {
        // Create FormData for file upload
        const formData = new FormData();
        formData.append('avatar', file);

        // Upload to server
        const response = await api.studentUploadAvatar(formData);

        // Update temp profile with the uploaded avatar URL
        setTempProfile(prev => ({
          ...prev,
          avatar: response.avatar
        }));
        
        // Also update profile state immediately
        setProfile(prev => ({
          ...prev,
          avatar: response.avatar
        }));
        
        // Update currentUser in AuthContext immediately to show in header
        if (currentUser) {
          const token = localStorage.getItem('accessToken');
          login(token, {
            ...currentUser,
            avatar: response.avatar
          });
        }
      } catch (error) {
        setError('Không thể tải lên ảnh đại diện');
      }
    }
  };

  const academicStats = profile?.stats ? [
    {
      label: 'Tổng điểm TB',
      value: profile.stats.averageGrade ? `${profile.stats.averageGrade}/10` : '--',
      color: 'primary'
    },
    {
      label: 'Số tín chỉ',
      value: `${profile.stats.totalCredits || 0}/120`,
      color: 'info'
    },
    {
      label: 'Bài tập đã nộp',
      value: `${profile.stats.submittedAssignments || 0}/${profile.stats.totalAssignments || 0}`,
      color: 'success'
    },
    {
      label: 'Lớp học tham gia',
      value: profile.stats.enrolledClasses || 0,
      color: 'warning'
    },
  ] : [
    { label: 'Tổng điểm TB', value: '--', color: 'primary' },
    { label: 'Số tín chỉ', value: '0/120', color: 'info' },
    { label: 'Bài tập đã nộp', value: '0/0', color: 'success' },
    { label: 'Lớp học tham gia', value: '0', color: 'warning' },
  ];

  if (loading) {
  return (
  <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
  <CircularProgress />
  </Box>
  );
  }

  if (error) {
    return (
      <Box>
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      </Box>
    );
  }

  if (!profile) {
    return (
      <Box>
        <Alert severity="info">
          Không tìm thấy thông tin cá nhân.
        </Alert>
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Tài khoản cá nhân
      </Typography>
      <Typography variant="subtitle1" color="text.secondary" gutterBottom>
        Quản lý thông tin cá nhân và cài đặt tài khoản của bạn.
      </Typography>

      <Grid container spacing={3}>
        {/* Profile Information */}
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h6">
                  Thông tin cá nhân
                </Typography>
                {!editMode ? (
                  <Button
                    variant="outlined"
                    startIcon={<Edit />}
                    onClick={handleEditProfile}
                  >
                    Chỉnh sửa
                  </Button>
                ) : (
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button
                      variant="contained"
                      startIcon={<Save />}
                      onClick={handleSaveProfile}
                    >
                      Lưu
                    </Button>
                    <Button
                      variant="outlined"
                      startIcon={<Cancel />}
                      onClick={handleCancelEdit}
                    >
                      Hủy
                    </Button>
                  </Box>
                )}
              </Box>

              <Grid container spacing={3}>
                <Grid item xs={12} sm={4}>
                  <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <Avatar
                      src={
                        editMode 
                          ? (tempProfile.avatar ? (tempProfile.avatar.startsWith('http') ? tempProfile.avatar : `${process.env.REACT_APP_BACKEND_URL || 'http://localhost:4000'}${tempProfile.avatar}`) : undefined)
                          : (profile.avatar ? (profile.avatar.startsWith('http') ? profile.avatar : `${process.env.REACT_APP_BACKEND_URL || 'http://localhost:4000'}${profile.avatar}`) : undefined)
                      }
                      sx={{ width: 120, height: 120, mb: 2 }}
                    >
                      {profile.fullName?.charAt(0).toUpperCase()}
                    </Avatar>
                    {editMode && (
                      <Button
                        variant="outlined"
                        startIcon={<PhotoCamera />}
                        component="label"
                        size="small"
                      >
                        Đổi ảnh
                        <input
                          type="file"
                          hidden
                          accept="image/*"
                          onChange={handleAvatarUpload}
                        />
                      </Button>
                    )}
                  </Box>
                </Grid>

                <Grid item xs={12} sm={8}>
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        label="Họ và tên"
                        value={editMode ? tempProfile.fullName : profile.fullName}
                        onChange={(e) => handleInputChange('fullName', e.target.value)}
                        disabled={!editMode}
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        label="Mã sinh viên"
                        value={profile.studentId}
                        disabled
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        label="Email"
                        value={editMode ? tempProfile.email : profile.email}
                        onChange={(e) => handleInputChange('email', e.target.value)}
                        disabled={!editMode}
                        InputProps={{
                          startAdornment: <Email sx={{ mr: 1, color: 'text.secondary' }} />
                        }}
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                    <TextField
                    fullWidth
                    label="Số điện thoại"
                    value={editMode ? tempProfile.phone : profile.phone}
                    onChange={(e) => handleInputChange('phone', e.target.value)}
                    disabled={!editMode}
                    InputProps={{
                    startAdornment: <Phone sx={{ mr: 1, color: 'text.secondary' }} />
                    }}
                    />
                    </Grid>
                     <Grid item xs={12} sm={6}>
                       <TextField
                         fullWidth
                         label="Ngày sinh"
                         type="date"
                         value={editMode ? tempProfile.dateOfBirth : profile.dateOfBirth}
                         onChange={(e) => handleInputChange('dateOfBirth', e.target.value)}
                         disabled={!editMode}
                         InputLabelProps={{
                           shrink: true,
                         }}
                       />
                     </Grid>
                     <Grid item xs={12} sm={6}>
                       <FormControl fullWidth disabled={!editMode}>
                         <InputLabel>Giới tính</InputLabel>
                         <Select
                           value={editMode ? tempProfile.gender : profile.gender}
                           label="Giới tính"
                           onChange={(e) => handleInputChange('gender', e.target.value)}
                         >
                           <MenuItem value="Nam">Nam</MenuItem>
                           <MenuItem value="Nữ">Nữ</MenuItem>
                           <MenuItem value="Khác">Khác</MenuItem>
                         </Select>
                       </FormControl>
                     </Grid>
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        label="Địa chỉ"
                        value={editMode ? tempProfile.address : profile.address}
                        onChange={(e) => handleInputChange('address', e.target.value)}
                        disabled={!editMode}
                        InputProps={{
                          startAdornment: <LocationOn sx={{ mr: 1, color: 'text.secondary' }} />
                        }}
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        label="Ngành học"
                        value={profile.major}
                        disabled
                        InputProps={{
                          startAdornment: <School sx={{ mr: 1, color: 'text.secondary' }} />
                        }}
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        label="Khóa học"
                        value={profile.year}
                        disabled
                        InputProps={{
                          startAdornment: <CalendarToday sx={{ mr: 1, color: 'text.secondary' }} />
                        }}
                      />
                    </Grid>
                  </Grid>
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          {/* Academic Stats */}
          <Card sx={{ mt: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Thống kê học tập
              </Typography>
              <Grid container spacing={2}>
                {academicStats.map((stat, index) => (
                  <Grid item xs={6} sm={3} key={index}>
                    <Paper sx={{ p: 2, textAlign: 'center' }}>
                      <Typography variant="h4" color={`${stat.color}.main`}>
                        {stat.value}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {stat.label}
                      </Typography>
                    </Paper>
                  </Grid>
                ))}
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* Settings */}
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Cài đặt tài khoản
              </Typography>
              
              <List>
                <ListItem>
                  <ListItemIcon>
                    <Lock />
                  </ListItemIcon>
                  <ListItemText primary="Đổi mật khẩu" />
                  <ListItemSecondaryAction>
                    <Button
                      size="small"
                      onClick={() => setOpenPasswordDialog(true)}
                    >
                      Thay đổi
                    </Button>
                  </ListItemSecondaryAction>
                </ListItem>
                
                <ListItem>
                  <ListItemIcon>
                    <Notifications />
                  </ListItemIcon>
                  <ListItemText primary="Thông báo" />
                  <ListItemSecondaryAction>
                    <Switch
                      checked={notificationSettings.emailNotifications}
                      onChange={(e) => handleNotificationChange('emailNotifications', e.target.checked)}
                    />
                  </ListItemSecondaryAction>
                </ListItem>
                
                <ListItem>
                  <ListItemIcon>
                    <Security />
                  </ListItemIcon>
                  <ListItemText primary="Bảo mật" />
                  <ListItemSecondaryAction>
                    <Chip label="Bảo mật cao" color="success" size="small" />
                  </ListItemSecondaryAction>
                </ListItem>
              </List>
            </CardContent>
          </Card>

          {/* Notification Settings */}
          <Card sx={{ mt: 2 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Cài đặt thông báo
              </Typography>
              
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={notificationSettings.assignmentDeadlines}
                      onChange={(e) => handleNotificationChange('assignmentDeadlines', e.target.checked)}
                    />
                  }
                  label="Deadline bài tập"
                />
                
                <FormControlLabel
                  control={
                    <Switch
                      checked={notificationSettings.gradeUpdates}
                      onChange={(e) => handleNotificationChange('gradeUpdates', e.target.checked)}
                    />
                  }
                  label="Cập nhật điểm"
                />
                
                <FormControlLabel
                  control={
                    <Switch
                      checked={notificationSettings.classAnnouncements}
                      onChange={(e) => handleNotificationChange('classAnnouncements', e.target.checked)}
                    />
                  }
                  label="Thông báo lớp học"
                />
                
                <FormControlLabel
                  control={
                    <Switch
                      checked={notificationSettings.systemUpdates}
                      onChange={(e) => handleNotificationChange('systemUpdates', e.target.checked)}
                    />
                  }
                  label="Cập nhật hệ thống"
                />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Password Change Dialog */}
      <Dialog
        open={openPasswordDialog}
        onClose={() => setOpenPasswordDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Đổi mật khẩu</DialogTitle>
        <DialogContent>
          <Alert severity="info" sx={{ mb: 2 }}>
            Mật khẩu mới phải có ít nhất 8 ký tự, bao gồm chữ hoa, chữ thường và số.
          </Alert>
          
          <TextField
            autoFocus
            margin="dense"
            label="Mật khẩu hiện tại"
            type={showPasswords.current ? 'text' : 'password'}
            fullWidth
            variant="outlined"
            value={passwordData.currentPassword}
            onChange={(e) => handlePasswordChange('currentPassword', e.target.value)}
            InputProps={{
              endAdornment: (
                <IconButton
                  onClick={() => togglePasswordVisibility('current')}
                  edge="end"
                >
                  {showPasswords.current ? <VisibilityOff /> : <Visibility />}
                </IconButton>
              ),
            }}
          />
          
          <TextField
            margin="dense"
            label="Mật khẩu mới"
            type={showPasswords.new ? 'text' : 'password'}
            fullWidth
            variant="outlined"
            value={passwordData.newPassword}
            onChange={(e) => handlePasswordChange('newPassword', e.target.value)}
            InputProps={{
              endAdornment: (
                <IconButton
                  onClick={() => togglePasswordVisibility('new')}
                  edge="end"
                >
                  {showPasswords.new ? <VisibilityOff /> : <Visibility />}
                </IconButton>
              ),
            }}
          />
          
          <TextField
            margin="dense"
            label="Xác nhận mật khẩu mới"
            type={showPasswords.confirm ? 'text' : 'password'}
            fullWidth
            variant="outlined"
            value={passwordData.confirmPassword}
            onChange={(e) => handlePasswordChange('confirmPassword', e.target.value)}
            InputProps={{
              endAdornment: (
                <IconButton
                  onClick={() => togglePasswordVisibility('confirm')}
                  edge="end"
                >
                  {showPasswords.confirm ? <VisibilityOff /> : <Visibility />}
                </IconButton>
              ),
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenPasswordDialog(false)}>
            Hủy
          </Button>
          <Button
            onClick={handleSavePassword}
            variant="contained"
            disabled={!passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword}
          >
            Đổi mật khẩu
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default StudentProfile;
