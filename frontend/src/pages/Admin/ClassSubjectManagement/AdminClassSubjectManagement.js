import React, { useState, useEffect, useMemo } from 'react';
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
  Download,
} from '@mui/icons-material';
import { api } from '../../../api/client';

const AdminClassSubjectManagement = () => {
  const navigate = useNavigate();
  const [tabValue, setTabValue] = useState(0);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [systemStats, setSystemStats] = useState({ totalStudents: 0, totalTeachers: 0 });

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
  const [exporting, setExporting] = useState(false);

  const handleExportClasses = async () => {
    setExporting(true);
    try {
      // Create CSV data for classes
      const csvData = [
        ['Tên lớp học', 'Mã lớp học', 'Giảng viên', 'Khoa'],
        ...classes.map(cls => [
          cls.name || '',
          cls.code || '',
          cls.teacherName || '',
          cls.department || ''
        ])
      ];

      const csvContent = csvData.map(row => 
        row.map(cell => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(',')
      ).join('\n');

      const filename = `danh_sach_lop_hoc_${new Date().toISOString().split('T')[0]}.csv`;

      // Create and download CSV file with UTF-8 BOM for Excel
      const BOM = '\uFEFF';
      const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

    } catch (error) {
      setError('Không thể xuất danh sách lớp học: ' + error?.message);
    } finally {
      setExporting(false);
    }
  };
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
        const [classItems, teacherItems, dashboardData] = await Promise.all([
          api.adminClasses(),
          api.adminAccounts({ role: 'teacher', pageSize: 1000 }), // Load all teachers
          api.adminDashboard() // Load system stats for total students
        ]);
        const teacherMap = teacherItems.items.reduce((acc, t) => {
          acc[t.id] = t.fullName;
          return acc;
        }, {});
        setSystemStats({
          totalStudents: dashboardData?.system?.students || 0,
          totalTeachers: dashboardData?.system?.teachers || 0
        });
        setClasses(classItems.map(c => ({
          id: c.id,
          name: c.name,
          code: c.code,
          teacherId: c.teacherId,
          teacherName: teacherMap[c.teacherId] || 'Unknown',
          department: c.department,
          credits: c.credits || 3,
          studentCount: c.studentCount || 0,
          assignmentCount: c.assignmentCount || 0
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
          department: c.department,
          credits: c.credits || 3,
          studentCount: c.studentCount || 0,
          assignmentCount: c.assignmentCount || 0
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
        department: c.department,
        credits: c.credits || 3,
        studentCount: c.studentCount || 0,
        assignmentCount: c.assignmentCount || 0
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

  const classStats = useMemo(() => {
    const totalEnrollments = classes.reduce((total, cls) => total + (cls.studentCount || 0), 0);
    return {
      total: classes.length,
      active: classes.length,
      inactive: 0,
      totalStudents: systemStats.totalStudents, // Lấy từ system stats (sinh viên duy nhất)
      totalAssignments: classes.reduce((total, cls) => total + (cls.assignmentCount || 0), 0),
      totalEnrollments: totalEnrollments, // Tổng enrollment (1 sinh viên có thể enroll nhiều lớp)
      averageStudentsPerClass: classes.length > 0 ? Math.round(totalEnrollments / classes.length) : 0,
      uniqueTeachers: new Set(classes.map(c => c.teacherId)).size,
      uniqueDepartments: new Set(classes.map(c => c.department)).size,
    };
  }, [classes, systemStats]);

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" gutterBottom>
          Quản lý lớp học
        </Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="outlined"
            startIcon={<Download />}
            onClick={handleExportClasses}
            disabled={exporting || classes.length === 0}
          >
            {exporting ? 'Đang xuất...' : 'Xuất báo cáo'}
          </Button>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={handleCreateClass}
          >
            Tạo lớp học
          </Button>
        </Box>
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
                    <TableCell align="center">Sinh viên</TableCell>
                    <TableCell align="center">Bài tập</TableCell>
                    <TableCell align="center">Tín chỉ</TableCell>
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
                       <TableCell align="center">
                         <Chip label={classItem.studentCount || 0} size="small" />
                       </TableCell>
                       <TableCell align="center">
                         <Chip label={classItem.assignmentCount || 0} size="small" color="secondary" />
                       </TableCell>
                       <TableCell align="center">
                         {classItem.credits || 3}
                       </TableCell>
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
          {/* Statistics Cards */}
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <Avatar sx={{ bgcolor: 'primary.main', width: 56, height: 56, mx: 'auto', mb: 1 }}>
                  <Class />
                </Avatar>
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
                <Avatar sx={{ bgcolor: 'success.main', width: 56, height: 56, mx: 'auto', mb: 1 }}>
                  <CheckCircle />
                </Avatar>
                <Typography variant="h4" color="success.main">
                  {classStats.active}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Lớp hoạt động
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <Avatar sx={{ bgcolor: 'info.main', width: 56, height: 56, mx: 'auto', mb: 1 }}>
                  <People />
                </Avatar>
                <Typography variant="h4" color="info.main">
                  {classStats.totalStudents}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Sinh viên (Hệ thống)
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <Avatar sx={{ bgcolor: 'warning.main', width: 56, height: 56, mx: 'auto', mb: 1 }}>
                  <Assignment />
                </Avatar>
                <Typography variant="h4" color="warning.main">
                  {classStats.averageStudentsPerClass}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  TB sinh viên/lớp
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          {/* Detailed Statistics */}
          <Grid item xs={12} md={8}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <TrendingUp color="primary" />
                  Thống kê chi tiết
                </Typography>
                <Divider sx={{ mb: 2 }} />
                <List>
                  <ListItem>
                    <ListItemIcon>
                      <Class />
                    </ListItemIcon>
                    <ListItemText 
                      primary="Tổng số lớp học" 
                      secondary={`${classStats.total} lớp học`}
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemIcon>
                      <CheckCircle color="success" />
                    </ListItemIcon>
                    <ListItemText 
                      primary="Lớp hoạt động" 
                      secondary={`${classStats.active} lớp (${classStats.total > 0 ? Math.round((classStats.active / classStats.total) * 100) : 0}%)`}
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemIcon>
                      <People />
                    </ListItemIcon>
                    <ListItemText 
                      primary="Sinh viên (Hệ thống)" 
                      secondary={`${classStats.totalStudents} sinh viên duy nhất`}
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemIcon>
                      <Group />
                    </ListItemIcon>
                    <ListItemText 
                      primary="Tổng đăng ký" 
                      secondary={`${classStats.totalEnrollments} lần đăng ký (enrollment)`}
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemIcon>
                      <Assignment />
                    </ListItemIcon>
                    <ListItemText 
                      primary="Bài tập" 
                      secondary={`${classStats.totalAssignments} bài tập`}
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemIcon>
                      <Person />
                    </ListItemIcon>
                    <ListItemText 
                      primary="Giáo viên" 
                      secondary={`${classStats.uniqueTeachers} giáo viên`}
                    />
                  </ListItem>
                </List>
              </CardContent>
            </Card>
          </Grid>

          {/* Summary Information */}
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Info color="info" />
                  Thông tin tóm tắt
                </Typography>
                <Divider sx={{ mb: 2 }} />
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" color="text.secondary">
                    TB đăng ký/lớp
                  </Typography>
                  <Typography variant="h6">
                    {classStats.averageStudentsPerClass} enrollment
                  </Typography>
                </Box>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Khoa/bộ môn
                  </Typography>
                  <Typography variant="h6">
                    {classStats.uniqueDepartments} khoa
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="subtitle2" color="text.secondary">
                    Trạng thái hệ thống
                  </Typography>
                  <Chip 
                    icon={<CheckCircle />}
                    label="Bình thường" 
                    color="success" 
                    size="small"
                  />
                </Box>
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
