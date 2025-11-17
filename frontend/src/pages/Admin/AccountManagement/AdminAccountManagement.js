import React, { useState, useEffect } from 'react';
import dayjs from 'dayjs';
import 'dayjs/locale/vi';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Button,
  Chip,
  Avatar,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Menu,
  MenuItem,
  Tabs,
  Tab,
  FormControl,
  InputLabel,
  Select,
  Alert,
  Divider,
  Snackbar,
} from '@mui/material';
import {
  Add,
  MoreVert,
  Edit,
  Delete,
  Person,
  School,
  Block,
  CheckCircle,
  Search,
  Download,
  Security,
} from '@mui/icons-material';
import { api, apiRequest } from '../../../api/client';

const AdminAccountManagement = () => {
  const navigate = useNavigate();
  const [tabValue, setTabValue] = useState(0);
  const [users, setUsers] = useState([]);
  const [total, setTotal] = useState(0);
  const [page] = useState(0);
  const [pageSize] = useState(100); // Show all users for admin
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [loadError, setLoadError] = useState('');
  const [resultDialog, setResultDialog] = useState({ open: false, title: '', message: '', severity: 'success', navigateBack: false });
  const openSnack = (message, severity = 'success') => setResultDialog({ open: true, title: severity === 'error' ? 'Lỗi' : severity === 'warning' ? 'Cảnh báo' : 'Thông báo', message, severity, navigateBack: true });
  const closeSnack = () => setResultDialog(prev => ({ ...prev, open: false }));
  const openResultDialog = (title, message, severity = 'success', navigateBack = false) => setResultDialog({ open: true, title, message, severity, navigateBack });
  const closeResultDialog = () => {
    const shouldBack = resultDialog.navigateBack;
    setResultDialog(prev => ({ ...prev, open: false }));
    if (shouldBack) navigate(-1);
  };

  // Notification dialog state
  const [notificationDialog, setNotificationDialog] = useState({ open: false, user: null });
  const [notificationForm, setNotificationForm] = useState({ title: '', content: '', type: 'general' });

  // Filters state must be declared before useEffect to avoid TDZ errors
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  // Fetch users from backend when filters change
  useEffect(() => {
    (async () => {
      try {
        setLoadError('');
        const params = {
          q: searchTerm || undefined,
          role: roleFilter !== 'all' ? roleFilter : undefined,
          status: statusFilter !== 'all' ? statusFilter : undefined,
          page: page + 1,
          pageSize,
        };
        const { items, total: totalItems } = await api.adminAccounts(params);
        setUsers((items || []).map((u, idx) => ({
          id: u.id || idx + 1,
          username: u.username,
          fullName: u.fullName || u.username,
          email: u.email || `${u.username}@example.com`,
          phone: u.phone || '',
          role: u.role,
          status: u.status || 'active',
          lastLogin: u.lastLogin || null,
          createdAt: u.createdAt || null,
          department: u.department || '',
          avatar: null,
        })));
        setTotal(Number(totalItems || 0));
      } catch (e) {
        setLoadError(e?.message || 'Không thể tải danh sách tài khoản');
      }
    })();
  }, [searchTerm, roleFilter, statusFilter, page, pageSize]);

  const [selectedUser, setSelectedUser] = useState(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedUserForMenu, setSelectedUserForMenu] = useState(null);
  const [newUser, setNewUser] = useState({
    username: '',
    fullName: '',
    email: '',
    phone: '',
    role: 'student',
    department: '',
    password: '',
  });

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
    // Đồng bộ tab với roleFilter
    if (newValue === 0) setRoleFilter('all');
    else if (newValue === 1) setRoleFilter('teacher');
    else if (newValue === 2) setRoleFilter('student');
    else if (newValue === 3) setRoleFilter('admin');
  };

  const handleExportCsv = () => {
    const rows = filteredUsers.map(u => ({
      username: u.username,
      fullName: u.fullName,
      email: u.email,
      role: u.role,
      status: u.status,
      phone: u.phone || '',
      department: u.department || '',
      createdAt: u.createdAt || '',
      lastLogin: u.lastLogin || '',
    }));
    const header = ['username','fullName','email','role','status','phone','department','createdAt','lastLogin'];
    const csv = [header.join(','), ...rows.map(r => header.map(h => `"${String(r[h] ?? '').replace(/"/g,'""')}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'accounts.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleMenuClick = (event, user) => {
    setAnchorEl(event.currentTarget);
    setSelectedUserForMenu(user);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedUserForMenu(null);
  };

  const handleCreateUser = () => {
    setOpenDialog(true);
  };

  const handleEditUser = (user) => {
    setSelectedUser(user);
    setOpenEditDialog(true);
    handleMenuClose();
  };

  const handleDeleteUser = (user) => {
    setSelectedUser(user);
    setOpenDeleteDialog(true);
    handleMenuClose();
  };

  const handleToggleStatus = async (user) => {
    const newStatus = user.status === 'active' ? 'inactive' : 'active';
    try {
      await api.adminUpdateAccount(user.id, { status: newStatus });
      // Update local state after successful API call
      setUsers(prev => prev.map(u =>
        u.id === user.id
          ? { ...u, status: newStatus }
          : u
      ));
    } catch (e) {
      setLoadError(e?.message || 'Không thể cập nhật trạng thái tài khoản');
    }
    handleMenuClose();
  };

  const handleSendNotification = (user) => {
    setNotificationDialog({ open: true, user });
    setNotificationForm({ title: '', content: '', type: 'general' });
    handleMenuClose();
  };

  const handleNotificationSubmit = async () => {
    if (!notificationForm.title.trim() || !notificationForm.content.trim()) {
      setLoadError('Vui lòng nhập đầy đủ tiêu đề và nội dung thông báo');
      return;
    }

    try {
      await api.adminSendNotification({
        recipientId: notificationDialog.user.id,
        title: notificationForm.title.trim(),
        content: notificationForm.content.trim(),
        type: notificationForm.type
      });

      setNotificationDialog({ open: false, user: null });
      setNotificationForm({ title: '', content: '', type: 'general' });
      openResultDialog('Thành công', `Đã gửi thông báo đến ${notificationDialog.user.fullName}`, 'success');
    } catch (error) {
      setLoadError(error?.message || 'Không thể gửi thông báo');
    }
  };

  const isValidEmail = (email) => /.+@.+\..+/.test(String(email || ''));

  const handleCreateUserSubmit = async () => {
    if (!newUser.username || !newUser.fullName || !newUser.email || !newUser.password) {
      openResultDialog('Thiếu thông tin', 'Vui lòng nhập đầy đủ thông tin bắt buộc', 'warning', true);
      return;
    }
    if (!isValidEmail(newUser.email)) {
      openResultDialog('Email không hợp lệ', 'Vui lòng kiểm tra lại định dạng email', 'warning', true);
      return;
    }
    try {
      const created = await apiRequest('/api/admin/accounts', {
        method: 'POST',
        body: JSON.stringify({
          username: newUser.username,
          fullName: newUser.fullName,
          email: newUser.email,
          role: newUser.role,
          password: newUser.password,
          phone: newUser.phone,
          department: newUser.department,
          status: 'active',
        }),
      });
      setUsers(prev => [
        {
          id: created.id,
          username: created.username,
          fullName: created.fullName,
          email: created.email,
          phone: created.phone || '',
          role: created.role,
          status: created.status,
          lastLogin: 'Mới',
          createdAt: created.createdAt,
          department: created.department || '',
          avatar: null,
        },
        ...prev,
      ]);
      openResultDialog('Thành công', 'Tạo tài khoản thành công', 'success', true);
    } catch (e) {
      const msg = String(e?.message || 'ERROR');
      if (msg === 'USERNAME_EXISTS') openResultDialog('Lỗi', 'Username đã tồn tại', 'error', true);
      else if (msg === 'MISSING_FIELDS') openResultDialog('Thiếu thông tin', 'Vui lòng nhập đầy đủ thông tin bắt buộc', 'warning', true);
      else openResultDialog('Thất bại', 'Tạo tài khoản thất bại', 'error', true);
      return;
    }
    setOpenDialog(false);
    setNewUser({
      username: '',
      fullName: '',
      email: '',
      phone: '',
      role: 'student',
      department: '',
      password: '',
    });
  };

  const handleDeleteConfirm = async () => {
    try {
      await apiRequest(`/api/admin/accounts/${selectedUser.id}`, { method: 'DELETE' });
      setUsers(prev => prev.filter(u => u.id !== selectedUser.id));
      openResultDialog('Thành công', 'Xóa tài khoản thành công', 'success', true);
    } catch {}
    setOpenDeleteDialog(false);
  };

  const [editingUser, setEditingUser] = useState({ fullName: '', email: '', role: 'student', status: 'active' });

  const handleOpenEdit = (user) => {
    setEditingUser({ fullName: user.fullName, email: user.email, role: user.role, status: user.status });
    handleEditUser(user);
  };

  const handleEditSubmit = async () => {
    if (!editingUser.fullName || !editingUser.email) {
      openResultDialog('Thiếu thông tin', 'Vui lòng nhập họ tên và email', 'warning', true);
      return;
    }
    if (!isValidEmail(editingUser.email)) {
      openResultDialog('Email không hợp lệ', 'Vui lòng kiểm tra lại định dạng email', 'warning', true);
      return;
    }
    try {
      const updated = await apiRequest(`/api/admin/accounts/${selectedUser.id}`, {
        method: 'PUT',
        body: JSON.stringify(editingUser),
      });
      setUsers(prev => prev.map(u => u.id === selectedUser.id ? {
        ...u,
        fullName: updated.fullName,
        email: updated.email,
        role: updated.role,
        status: updated.status,
      } : u));
      openResultDialog('Thành công', 'Cập nhật tài khoản thành công', 'success', true);
    } catch {}
    setOpenEditDialog(false);
  };

  const getRoleIcon = (role) => {
    switch (role) {
      case 'admin': return <Security color="error" />;
      case 'teacher': return <School color="primary" />;
      case 'student': return <Person color="info" />;
      default: return <Person />;
    }
  };

  const getRoleColor = (role) => {
    switch (role) {
      case 'admin': return 'error';
      case 'teacher': return 'primary';
      case 'student': return 'info';
      default: return 'default';
    }
  };

  const getStatusColor = (status) => {
    return status === 'active' ? 'success' : 'error';
  };

  const getRoleText = (role) => {
    switch (role) {
      case 'admin': return 'Quản trị viên';
      case 'teacher': return 'Giảng viên';
      case 'student': return 'Sinh viên';
      default: return 'Không xác định';
    }
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.username.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === 'all' || user.role === roleFilter;
    const matchesStatus = statusFilter === 'all' || user.status === statusFilter;
    
    return matchesSearch && matchesRole && matchesStatus;
  });

  const userStats = {
    total: users.length,
    active: users.filter(u => u.status === 'active').length,
    inactive: users.filter(u => u.status === 'inactive').length,
    admins: users.filter(u => u.role === 'admin').length,
    teachers: users.filter(u => u.role === 'teacher').length,
    students: users.filter(u => u.role === 'student').length,
  };

  return (
    <Box>
      {loadError && (
        <Alert severity="error" sx={{ mb: 2 }}>{loadError}</Alert>
      )}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" gutterBottom>
          Quản lý tài khoản
        </Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={handleCreateUser}
        >
          Tạo tài khoản mới
        </Button>
      </Box>

      {/* Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={2}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h4" color="primary">
                {userStats.total}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Tổng tài khoản
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={2}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h4" color="success.main">
                {userStats.active}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Hoạt động
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={2}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h4" color="error.main">
                {userStats.inactive}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Không hoạt động
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={2}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h4" color="error.main">
                {userStats.admins}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Admin
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={2}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h4" color="primary.main">
                {userStats.teachers}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Giảng viên
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={2}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h4" color="info.main">
                {userStats.students}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Sinh viên
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Paper sx={{ mb: 3 }}>
        <Tabs value={tabValue} onChange={handleTabChange}>
          <Tab label="Tất cả tài khoản" />
          <Tab label="Giảng viên" />
          <Tab label="Sinh viên" />
          <Tab label="Admin" />
        </Tabs>
      </Paper>

      {/* Filters */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              placeholder="Tìm kiếm theo tên, email, username..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: <Search sx={{ mr: 1, color: 'text.secondary' }} />
              }}
            />
          </Grid>
          <Grid item xs={12} md={3}>
            <FormControl fullWidth>
              <InputLabel>Vai trò</InputLabel>
              <Select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                label="Vai trò"
              >
                <MenuItem value="all">Tất cả</MenuItem>
                <MenuItem value="admin">Admin</MenuItem>
                <MenuItem value="teacher">Giảng viên</MenuItem>
                <MenuItem value="student">Sinh viên</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={3}>
            <FormControl fullWidth>
              <InputLabel>Trạng thái</InputLabel>
              <Select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                label="Trạng thái"
              >
                <MenuItem value="all">Tất cả</MenuItem>
                <MenuItem value="active">Hoạt động</MenuItem>
                <MenuItem value="inactive">Không hoạt động</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={2}>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button variant="outlined" startIcon={<Download />} onClick={handleExportCsv}>
                Xuất
              </Button>
            </Box>
          </Grid>
        </Grid>
      </Paper>

      {/* Users Table */}
      <Paper>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Người dùng</TableCell>
                <TableCell>Vai trò</TableCell>
                <TableCell>Trạng thái</TableCell>
                <TableCell>Đăng nhập cuối</TableCell>
                <TableCell>Ngày tạo</TableCell>
                <TableCell>Hành động</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredUsers.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} align="center">
                    <Typography variant="body2" color="text.secondary">Không có tài khoản để hiển thị</Typography>
                  </TableCell>
                </TableRow>
              )}
              {filteredUsers.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <Avatar sx={{ mr: 2, width: 40, height: 40 }}>
                        {user.fullName.charAt(0)}
                      </Avatar>
                      <Box>
                        <Typography variant="subtitle2">
                          {user.fullName}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {user.email}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" display="block">
                          @{user.username}
                        </Typography>
                      </Box>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      {getRoleIcon(user.role)}
                      <Chip
                        label={getRoleText(user.role)}
                        color={getRoleColor(user.role)}
                        size="small"
                        sx={{ ml: 1 }}
                      />
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={user.status === 'active' ? 'Hoạt động' : 'Không hoạt động'}
                      color={getStatusColor(user.status)}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>{user.lastLogin ? dayjs(user.lastLogin).locale('vi').format('DD/MM/YYYY HH:mm') : 'Chưa đăng nhập'}</TableCell>
                  <TableCell>{dayjs(user.createdAt).locale('vi').format('DD/MM/YYYY HH:mm')}</TableCell>
                  <TableCell>
                    <IconButton
                      size="small"
                      onClick={(e) => handleMenuClick(e, user)}
                    >
                      <MoreVert />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Context Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={() => handleOpenEdit(selectedUserForMenu)}>
          <Edit sx={{ mr: 1 }} />
          Chỉnh sửa
        </MenuItem>
        <MenuItem onClick={() => handleToggleStatus(selectedUserForMenu)}>
        {selectedUserForMenu?.status === 'active' ? (
        <>
        <Block sx={{ mr: 1 }} />
        Khóa tài khoản
        </>
        ) : (
        <>
        <CheckCircle sx={{ mr: 1 }} />
        Kích hoạt tài khoản
        </>
        )}
        </MenuItem>
        <MenuItem onClick={() => handleSendNotification(selectedUserForMenu)}>
          <Person sx={{ mr: 1 }} />
          Gửi thông báo
        </MenuItem>
        <Divider />
        <MenuItem 
          onClick={() => handleDeleteUser(selectedUserForMenu)}
          sx={{ color: 'error.main' }}
        >
          <Delete sx={{ mr: 1 }} />
          Xóa tài khoản
        </MenuItem>
      </Menu>

      {/* Create User Dialog */}
      <Dialog
        open={openDialog}
        onClose={() => setOpenDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Tạo tài khoản mới</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Username"
                value={newUser.username}
                onChange={(e) => setNewUser(prev => ({ ...prev, username: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Họ và tên"
                value={newUser.fullName}
                onChange={(e) => setNewUser(prev => ({ ...prev, fullName: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Email"
                type="email"
                value={newUser.email}
                onChange={(e) => setNewUser(prev => ({ ...prev, email: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Số điện thoại"
                value={newUser.phone}
                onChange={(e) => setNewUser(prev => ({ ...prev, phone: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Vai trò</InputLabel>
                <Select
                  value={newUser.role}
                  onChange={(e) => setNewUser(prev => ({ ...prev, role: e.target.value }))}
                  label="Vai trò"
                >
                  <MenuItem value="student">Sinh viên</MenuItem>
                  <MenuItem value="teacher">Giảng viên</MenuItem>
                  <MenuItem value="admin">Admin</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Khoa/Bộ môn"
                value={newUser.department}
                onChange={(e) => setNewUser(prev => ({ ...prev, department: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Mật khẩu"
                type="password"
                value={newUser.password}
                onChange={(e) => setNewUser(prev => ({ ...prev, password: e.target.value }))}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>
            Hủy
          </Button>
          <Button
            onClick={handleCreateUserSubmit}
            variant="contained"
            disabled={!newUser.username || !newUser.fullName || !newUser.email || !newUser.password}
          >
            Tạo tài khoản
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={closeSnack}
        message={snackbar.message}
      />

      {/* Result Dialog */}
      <Dialog open={resultDialog.open} onClose={closeResultDialog} maxWidth="xs" fullWidth>
        <DialogTitle>{resultDialog.title}</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mt: 1 }} color={resultDialog.severity === 'error' ? 'error' : resultDialog.severity === 'warning' ? 'warning.main' : 'text.primary'}>
            {resultDialog.message}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeResultDialog} variant="contained">OK</Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={openDeleteDialog}
        onClose={() => setOpenDeleteDialog(false)}
      >
        <DialogTitle>Xác nhận xóa tài khoản</DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            Bạn có chắc chắn muốn xóa tài khoản "{selectedUser?.fullName}"? 
            Hành động này không thể hoàn tác.
          </Alert>
          <Typography variant="body2" color="text.secondary">
            Tài khoản sẽ bị xóa vĩnh viễn và tất cả dữ liệu liên quan sẽ bị mất.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDeleteDialog(false)}>
            Hủy
          </Button>
          <Button
            onClick={handleDeleteConfirm}
            variant="contained"
            color="error"
          >
            Xóa tài khoản
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog
        open={openEditDialog}
        onClose={() => setOpenEditDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Chỉnh sửa tài khoản</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Họ và tên"
                value={editingUser.fullName}
                onChange={(e) => setEditingUser(prev => ({ ...prev, fullName: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Email"
                type="email"
                value={editingUser.email}
                onChange={(e) => setEditingUser(prev => ({ ...prev, email: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Vai trò</InputLabel>
                <Select
                  value={editingUser.role}
                  onChange={(e) => setEditingUser(prev => ({ ...prev, role: e.target.value }))}
                  label="Vai trò"
                >
                  <MenuItem value="student">Sinh viên</MenuItem>
                  <MenuItem value="teacher">Giảng viên</MenuItem>
                  <MenuItem value="admin">Admin</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Trạng thái</InputLabel>
                <Select
                  value={editingUser.status}
                  onChange={(e) => setEditingUser(prev => ({ ...prev, status: e.target.value }))}
                  label="Trạng thái"
                >
                  <MenuItem value="active">Hoạt động</MenuItem>
                  <MenuItem value="inactive">Không hoạt động</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenEditDialog(false)}>Hủy</Button>
          <Button onClick={handleEditSubmit} variant="contained">Lưu</Button>
        </DialogActions>
      </Dialog>

          {/* Send Notification Dialog */}
      <Dialog
        open={notificationDialog.open}
        onClose={() => setNotificationDialog({ open: false, user: null })}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Gửi thông báo đến {notificationDialog.user?.fullName}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <TextField
              fullWidth
              label="Tiêu đề thông báo"
              value={notificationForm.title}
              onChange={(e) => setNotificationForm(prev => ({ ...prev, title: e.target.value }))}
              sx={{ mb: 2 }}
              required
            />
            <TextField
              fullWidth
              label="Nội dung thông báo"
              value={notificationForm.content}
              onChange={(e) => setNotificationForm(prev => ({ ...prev, content: e.target.value }))}
              multiline
              rows={4}
              sx={{ mb: 2 }}
              required
            />
            <FormControl fullWidth>
              <InputLabel>Loại thông báo</InputLabel>
              <Select
                value={notificationForm.type}
                onChange={(e) => setNotificationForm(prev => ({ ...prev, type: e.target.value }))}
                label="Loại thông báo"
              >
                <MenuItem value="general">Thông báo chung</MenuItem>
                <MenuItem value="important">Quan trọng</MenuItem>
                <MenuItem value="reminder">Nhắc nhở</MenuItem>
                <MenuItem value="announcement">Thông báo lớp</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setNotificationDialog({ open: false, user: null })}>
            Hủy
          </Button>
          <Button
            onClick={handleNotificationSubmit}
            variant="contained"
            disabled={!notificationForm.title.trim() || !notificationForm.content.trim()}
          >
            Gửi thông báo
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AdminAccountManagement;
