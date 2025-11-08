import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  CardActions,
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
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
} from '@mui/material';
import {
  Add,
  MoreVert,
  Edit,
  Delete,
  School,
  Class,
  People,
  Assignment,
  Person,
  Book,
  Group,
  TrendingUp,
  Warning,
  CheckCircle,
  Info,
} from '@mui/icons-material';
import { api } from '../../../api/client';

const AdminClassSubjectManagement = () => {
  const navigate = useNavigate();
  const [tabValue, setTabValue] = useState(0);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [subjects] = useState([
    { id: 1, name: 'Lập trình Web', code: 'WEB' },
    { id: 2, name: 'Cơ sở dữ liệu', code: 'DB' },
    { id: 3, name: 'Thuật toán', code: 'ALG' },
  ]);

  const [teachers, setTeachers] = useState([]);

  const [selectedItem, setSelectedItem] = useState(null);
  const [openClassDialog, setOpenClassDialog] = useState(false);
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedItemForMenu, setSelectedItemForMenu] = useState(null);
  const [newClass, setNewClass] = useState({
    name: '',
    code: '',
    subject: '',
    teacher: '',
    teacherId: '',
    department: 'CNTT',
  });

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError('');
      try {
        const [classItems, teacherItems] = await Promise.all([
          api.adminClasses(),
          api.adminAccounts({ role: 'teacher', pageSize: 1000 }) // Load all teachers
        ]);
        const teacherMap = teacherItems.items.reduce((acc, t) => {
          acc[t.id] = t.fullName;
          return acc;
        }, {});
        setClasses(classItems.map(c => ({
          id: c.id,
          name: c.name,
          code: c.code,
          teacherId: c.teacherId,
          teacherName: teacherMap[c.teacherId] || 'Unknown',
          department: c.department
        })));
        setTeachers(teacherItems.items.map(t => ({ id: t.id, name: t.fullName, department: t.department || 'CNTT' })));
      } catch (e) {
        setError(e?.message || 'Không thể tải danh sách lớp');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  const handleMenuClick = (event, item, type) => {
    setAnchorEl(event.currentTarget);
    setSelectedItemForMenu({ ...item, type });
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedItemForMenu(null);
  };

  const handleCreateClass = () => {
    setOpenClassDialog(true);
  };

  const handleEditItem = (item, type) => {
    console.log('Opening edit dialog for item:', item);
    setSelectedItem(item);
    setNewClass({ name: item.name, code: item.code, teacherId: item.teacherId, department: item.department });
    setOpenEditDialog(true);
    handleMenuClose();
  };

  const handleDeleteItem = (item) => {
    setSelectedItem(item);
    setOpenDeleteDialog(true);
    handleMenuClose();
  };

  const handleCreateClassSubmit = async () => {
    if (!newClass.name || !newClass.code || !newClass.teacherId) return;
    try {
      await api.adminCreateClass({ name: newClass.name, code: newClass.code, teacherId: newClass.teacherId, department: newClass.department });
      const [items, teacherItems] = await Promise.all([
        api.adminClasses(),
        api.adminAccounts({ role: 'teacher', pageSize: 1000 })
      ]);
      const teacherMap = teacherItems.items.reduce((acc, t) => {
          acc[t.id] = t.fullName;
          return acc;
        }, {});
        setClasses(items.map(c => ({
          id: c.id,
          name: c.name,
          code: c.code,
          teacherId: c.teacherId,
          teacherName: teacherMap[c.teacherId] || 'Unknown',
          department: c.department
        })));
    } catch (e) {
      setError(e?.message || 'Không thể tạo lớp học');
    }
    setOpenClassDialog(false);
    setNewClass({ name: '', code: '', subject: '', teacher: '', teacherId: '', department: 'CNTT' });
  };

  const handleEditClassSubmit = async () => {
    if (!newClass.name || !newClass.code || !newClass.teacherId) return;
    try {
      console.log('Updating class:', selectedItem.id, newClass);
      await api.adminUpdateClass(selectedItem.id, {
        name: newClass.name,
        code: newClass.code,
        teacherId: newClass.teacherId,
        department: newClass.department
      });

      // Refresh classes list
      const [items, teacherItems] = await Promise.all([
        api.adminClasses(),
        api.adminAccounts({ role: 'teacher', pageSize: 1000 })
      ]);
      const teacherMap = teacherItems.items.reduce((acc, t) => {
        acc[t.id] = t.fullName;
        return acc;
      }, {});
      setClasses(items.map(c => ({
        id: c.id,
        name: c.name,
        code: c.code,
        teacherId: c.teacherId,
        teacherName: teacherMap[c.teacherId] || 'Unknown',
        department: c.department
      })));

      setOpenEditDialog(false);
      setNewClass({ name: '', code: '', subject: '', teacher: '', teacherId: '', department: 'CNTT' });
      console.log('Class updated successfully');
    } catch (e) {
      console.error('Error updating class:', e);
      setError(e?.message || 'Không thể cập nhật lớp học');
    }
  };

  const handleDeleteConfirm = async () => {
    try {
      await api.adminDeleteClass(selectedItem.id);
      setClasses(prev => prev.filter(c => c.id !== selectedItem.id));
    } catch {}
    setOpenDeleteDialog(false);
  };

  const handleClassClick = (classItem) => {
    navigate(`/admin/classes/${classItem.id}`);
  };

  const getStatusColor = (status) => {
    return status === 'active' ? 'success' : 'default';
  };

  const getStatusText = (status) => {
    return status === 'active' ? 'Hoạt động' : '—';
  };

  const classStats = {
    total: classes.length,
    active: classes.length,
    inactive: 0,
    totalStudents: 0,
    totalAssignments: 0,
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" gutterBottom>
          Quản lý lớp học
        </Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={handleCreateClass}
        >
          Tạo lớp học
        </Button>
      </Box>

      <Paper sx={{ mb: 3 }}>
        <Tabs value={tabValue} onChange={handleTabChange}>
          <Tab label="Danh sách lớp học" />
          <Tab label="Thống kê" />
        </Tabs>
      </Paper>

      {tabValue === 0 && (
        <>
          <Grid container spacing={3} sx={{ mb: 3 }}>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent sx={{ textAlign: 'center' }}>
                  <Typography variant="h4" color="primary">
                    {classStats.total}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Tổng lớp học
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent sx={{ textAlign: 'center' }}>
                  <Typography variant="h4" color="success.main">
                    {classStats.active}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Lớp hoạt động
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          <Paper>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Lớp học</TableCell>
                    <TableCell>Mã</TableCell>
                    <TableCell>Giảng viên</TableCell>
                    <TableCell>Khoa</TableCell>
                    <TableCell>Hành động</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {classes.map((classItem) => (
                    <TableRow 
                      key={classItem.id}
                      sx={{ 
                        cursor: 'pointer',
                        '&:hover': { backgroundColor: 'action.hover' }
                      }}
                      onClick={() => handleClassClick(classItem)}
                    >
                      <TableCell>
                        <Typography variant="subtitle2" sx={{ color: 'primary.main' }}>
                          {classItem.name}
                        </Typography>
                      </TableCell>
                      <TableCell>{classItem.code}</TableCell>
                      <TableCell>{classItem.teacherName}</TableCell>
                      <TableCell>{classItem.department || '—'}</TableCell>
                      <TableCell>
                        <IconButton 
                          size="small" 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMenuClick(e, classItem, 'class');
                          }}
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
        </>
      )}

      {tabValue === 1 && (
        <Grid container spacing={3}>
          <Grid item xs={12} md={8}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Thống kê tổng quan
                </Typography>
                <List>
                  <ListItem>
                    <ListItemIcon>
                      <Class color="primary" />
                    </ListItemIcon>
                    <ListItemText primary="Tổng số lớp học" secondary={`${classStats.total} lớp`} />
                  </ListItem>
                </List>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleMenuClose}>
        <MenuItem onClick={() => handleEditItem(selectedItemForMenu, selectedItemForMenu?.type)}>
          <Edit sx={{ mr: 1 }} />
          Chỉnh sửa
        </MenuItem>
        <Divider />
        <MenuItem onClick={() => handleDeleteItem(selectedItemForMenu)} sx={{ color: 'error.main' }}>
          <Delete sx={{ mr: 1 }} />
          Xóa
        </MenuItem>
      </Menu>

      <Dialog open={openClassDialog} onClose={() => setOpenClassDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>Tạo lớp học mới</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth label="Tên lớp học" value={newClass.name} onChange={(e) => setNewClass(prev => ({ ...prev, name: e.target.value }))} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth label="Mã lớp học" value={newClass.code} onChange={(e) => setNewClass(prev => ({ ...prev, code: e.target.value }))} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
              <InputLabel>Giảng viên</InputLabel>
              <Select value={newClass.teacherId} onChange={(e) => setNewClass(prev => ({ ...prev, teacherId: e.target.value }))} label="Giảng viên">
              {teachers.map((teacher) => (
              <MenuItem key={teacher.id} value={teacher.id}>{teacher.name}</MenuItem>
              ))}
              </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth label="Khoa/Bộ môn" value={newClass.department} onChange={(e) => setNewClass(prev => ({ ...prev, department: e.target.value }))} />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenClassDialog(false)}>Hủy</Button>
          <Button onClick={handleCreateClassSubmit} variant="contained" disabled={!newClass.name || !newClass.code || !newClass.teacherId}>Tạo lớp học</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={openEditDialog} onClose={() => setOpenEditDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>Chỉnh sửa lớp học</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Tên lớp học"
                value={newClass.name}
                onChange={(e) => setNewClass(prev => ({ ...prev, name: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Mã lớp học"
                value={newClass.code}
                onChange={(e) => setNewClass(prev => ({ ...prev, code: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Giảng viên</InputLabel>
                <Select
                  value={newClass.teacherId}
                  onChange={(e) => setNewClass(prev => ({ ...prev, teacherId: e.target.value }))}
                  label="Giảng viên"
                >
                  {teachers.map((teacher) => (
                    <MenuItem key={teacher.id} value={teacher.id}>{teacher.name}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Khoa/Bộ môn"
                value={newClass.department}
                onChange={(e) => setNewClass(prev => ({ ...prev, department: e.target.value }))}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenEditDialog(false)}>Hủy</Button>
          <Button
            onClick={handleEditClassSubmit}
            variant="contained"
            disabled={!newClass.name || !newClass.code || !newClass.teacherId}
          >
            Cập nhật
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={openDeleteDialog} onClose={() => setOpenDeleteDialog(false)}>
        <DialogTitle>Xác nhận xóa</DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            Bạn có chắc chắn muốn xóa lớp học này? Hành động này không thể hoàn tác.
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDeleteDialog(false)}>Hủy</Button>
          <Button onClick={handleDeleteConfirm} variant="contained" color="error">Xóa</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AdminClassSubjectManagement;
