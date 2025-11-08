import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Tabs,
  Tab,
  Alert,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import {
  ArrowBack,
  School,
  Person,
  People,
  Assignment,
  Book,
  Group,
  TrendingUp,
  Warning,
  CheckCircle,
  Info,
} from '@mui/icons-material';
import { api } from '../../../api/client';

const AdminClassDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [tabValue, setTabValue] = useState(0);
  const [classData, setClassData] = useState(null);
  const [teacher, setTeacher] = useState(null);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [openRemoveDialog, setOpenRemoveDialog] = useState(false);
  const [studentToRemove, setStudentToRemove] = useState(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError('');
      try {
        // Call real API to get class details
        const classData = await api.adminGetClassDetail(id);
        setClassData(classData);
        setTeacher(classData.teacher);
        setStudents(classData.students || []);

      } catch (e) {
        setError(e?.message || 'Không thể tải thông tin lớp học');
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  const getStatusColor = (status) => {
    return status === 'active' ? 'success' : 'default';
  };

  const getStatusLabel = (status) => {
  return 'Đang hoạt động'; // All classes are active by default
  };

  const handleRemoveStudent = (student) => {
    setStudentToRemove(student);
    setOpenRemoveDialog(true);
  };

  const handleConfirmRemove = async () => {
    try {
      // Mock API call - trong thực tế sẽ gọi api.adminRemoveStudentFromClass(classData.id, studentToRemove.id)
      console.log('Removing student:', studentToRemove.id, 'from class:', classData.id);
      
      // Cập nhật danh sách sinh viên
      setStudents(prev => prev.filter(s => s.id !== studentToRemove.id));
      
      // Cập nhật tổng số sinh viên
      setClassData(prev => ({
        ...prev,
        totalStudents: prev.totalStudents - 1
      }));
      
      setOpenRemoveDialog(false);
      setStudentToRemove(null);
    } catch (e) {
      setError(e?.message || 'Không thể xóa sinh viên khỏi lớp');
    }
  };

  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography>Đang tải...</Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">{error}</Alert>
        <Button onClick={() => navigate('/admin/classes')} sx={{ mt: 2 }}>
          Quay lại
        </Button>
      </Box>
    );
  }

  if (!classData) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="warning">Không tìm thấy thông tin lớp học</Alert>
        <Button onClick={() => navigate('/admin/classes')} sx={{ mt: 2 }}>
          Quay lại
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ p: { xs: 2, sm: 3 } }}>
      {/* Back Button */}
      <Button startIcon={<ArrowBack />} onClick={() => navigate(-1)} sx={{ mb: 2 }}>
        Quay lại
      </Button>

      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Typography 
          variant="h4" 
          gutterBottom
          sx={{ 
            fontSize: { xs: '1.75rem', sm: '2.125rem' },
            overflow: 'hidden',
            textOverflow: 'ellipsis'
          }}
        >
          {classData.name}
        </Typography>
        <Typography 
          variant="subtitle1" 
          color="text.secondary" 
          gutterBottom
          sx={{ 
            fontSize: { xs: '0.875rem', sm: '1rem' },
            overflow: 'hidden',
            textOverflow: 'ellipsis'
          }}
        >
          {classData.code} - {classData.department}
        </Typography>
        <Box sx={{ 
          display: 'flex', 
          gap: 1, 
          alignItems: 'center',
          flexWrap: 'wrap'
        }}>
          <Chip
            label={getStatusLabel(classData.status)}
            color={getStatusColor(classData.status)}
            size="small"
            sx={{ fontSize: { xs: '0.75rem', sm: '0.8125rem' } }}
          />
          <Chip
            icon={<People />}
            label={`${classData.totalStudents} sinh viên`}
            color="primary"
            size="small"
            sx={{ fontSize: { xs: '0.75rem', sm: '0.8125rem' } }}
          />
        </Box>
      </Box>

      {/* Stats Cards */}
      <Grid container spacing={{ xs: 2, sm: 3 }} sx={{ mb: 3 }}>
        <Grid item xs={6} sm={6} md={3}>
          <Card sx={{ height: '100%' }}>
            <CardContent sx={{ textAlign: 'center', p: { xs: 1.5, sm: 2 } }}>
              <Typography 
                variant="h4" 
                color="primary.main"
                sx={{ fontSize: { xs: '1.5rem', sm: '2.125rem' } }}
              >
                {classData.totalStudents}
              </Typography>
              <Typography 
                variant="body2" 
                color="text.secondary"
                sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}
              >
                Tổng sinh viên
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} sm={6} md={3}>
          <Card sx={{ height: '100%' }}>
            <CardContent sx={{ textAlign: 'center', p: { xs: 1.5, sm: 2 } }}>
              <Typography 
                variant="h4" 
                color="success.main"
                sx={{ fontSize: { xs: '1.5rem', sm: '2.125rem' } }}
              >
                {students.length}
              </Typography>
              <Typography 
                variant="body2" 
                color="text.secondary"
                sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}
              >
                Sinh viên hoạt động
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} sm={6} md={3}>
          <Card sx={{ height: '100%' }}>
            <CardContent sx={{ textAlign: 'center', p: { xs: 1.5, sm: 2 } }}>
              <Typography 
                variant="h4" 
                color="warning.main"
                sx={{ fontSize: { xs: '1.5rem', sm: '2.125rem' } }}
              >
                {students.filter(s => s.assignmentsCompleted >= s.assignmentsTotal * 0.8).length}
              </Typography>
              <Typography 
                variant="body2" 
                color="text.secondary"
                sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}
              >
                Hoàn thành tốt
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} sm={6} md={3}>
          <Card sx={{ height: '100%' }}>
            <CardContent sx={{ textAlign: 'center', p: { xs: 1.5, sm: 2 } }}>
              <Typography 
                variant="h4" 
                color="error.main"
                sx={{ fontSize: { xs: '1.5rem', sm: '2.125rem' } }}
              >
                {students.filter(s => s.assignmentsCompleted < s.assignmentsTotal * 0.5).length}
              </Typography>
              <Typography 
                variant="body2" 
                color="text.secondary"
                sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}
              >
                Cần hỗ trợ
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Tabs */}
      <Paper sx={{ mb: 3 }}>
        <Tabs value={tabValue} onChange={handleTabChange}>
          <Tab icon={<Info />} label="Thông tin lớp" iconPosition="start" />
          <Tab icon={<Person />} label="Giảng viên" iconPosition="start" />
          <Tab icon={<People />} label="Danh sách sinh viên" iconPosition="start" />
        </Tabs>
      </Paper>

      {/* Tab Content */}
      {tabValue === 0 && (
        <Grid container spacing={3}>
          <Grid item xs={12} md={8}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Thông tin chi tiết lớp học
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="subtitle2" color="text.secondary">
                      Tên lớp học:
                    </Typography>
                    <Typography variant="body1">{classData.name}</Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="subtitle2" color="text.secondary">
                      Mã lớp học:
                    </Typography>
                    <Typography variant="body1">{classData.code}</Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="subtitle2" color="text.secondary">
                      Môn học:
                    </Typography>
                    <Typography variant="body1">{classData.subject}</Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="subtitle2" color="text.secondary">
                      Khoa:
                    </Typography>
                    <Typography variant="body1">{classData.department}</Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="subtitle2" color="text.secondary">
                      Học kỳ:
                    </Typography>
                    <Typography variant="body1">{classData.semester}</Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="subtitle2" color="text.secondary">
                      Lịch học:
                    </Typography>
                    <Typography variant="body1">{classData.schedule}</Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="subtitle2" color="text.secondary">
                      Phòng học:
                    </Typography>
                    <Typography variant="body1">{classData.room}</Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="subtitle2" color="text.secondary">
                      Ngày tạo:
                    </Typography>
                    <Typography variant="body1">
                      {new Date(classData.createdAt).toLocaleDateString('vi-VN')}
                    </Typography>
                  </Grid>
                  <Grid item xs={12}>
                    <Typography variant="subtitle2" color="text.secondary">
                      Mô tả:
                    </Typography>
                    <Typography variant="body1">{classData.description}</Typography>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Thống kê nhanh
                </Typography>
                <List>
                  <ListItem>
                    <ListItemIcon>
                      <People color="primary" />
                    </ListItemIcon>
                    <ListItemText 
                      primary="Tổng sinh viên" 
                      secondary={`${classData.totalStudents} sinh viên`} 
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemIcon>
                      <CheckCircle color="success" />
                    </ListItemIcon>
                    <ListItemText 
                      primary="Sinh viên hoạt động" 
                      secondary={`${students.filter(s => s.status === 'active').length} sinh viên`} 
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemIcon>
                      <Warning color="warning" />
                    </ListItemIcon>
                    <ListItemText 
                      primary="Cần hỗ trợ" 
                      secondary={`${students.filter(s => s.assignmentsCompleted < s.assignmentsTotal * 0.5).length} sinh viên`} 
                    />
                  </ListItem>
                </List>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {tabValue === 1 && teacher && (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Thông tin giảng viên
            </Typography>
            <Grid container spacing={3} alignItems="center">
              <Grid item xs={12} sm={3}>
                <Avatar sx={{ width: 80, height: 80, mx: 'auto', mb: 2 }}>
                  {teacher.fullName.charAt(0)}
                </Avatar>
              </Grid>
              <Grid item xs={12} sm={9}>
                <Typography variant="h5" gutterBottom>
                  {teacher.fullName}
                </Typography>
                <Typography variant="subtitle1" color="text.secondary" gutterBottom>
                  {teacher.username}
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                  <Chip
                  label="Đang hoạt động"
                  color="success"
                  size="small"
                  />
                  <Chip
                    label={teacher.department}
                    color="primary"
                    size="small"
                  />
                </Box>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="subtitle2" color="text.secondary">
                      Email:
                    </Typography>
                    <Typography variant="body1">{teacher.email}</Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="subtitle2" color="text.secondary">
                      Số điện thoại:
                    </Typography>
                    <Typography variant="body1">{teacher.phone}</Typography>
                  </Grid>
                </Grid>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      )}

      {tabValue === 2 && (
        <Card>
          <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
            <Typography 
              variant="h6" 
              gutterBottom
              sx={{ fontSize: { xs: '1.1rem', sm: '1.25rem' } }}
            >
              Danh sách sinh viên ({students.length} sinh viên)
            </Typography>
            <TableContainer sx={{ 
              overflowX: 'auto',
              '&::-webkit-scrollbar': {
                height: '8px',
              },
              '&::-webkit-scrollbar-track': {
                backgroundColor: '#f1f1f1',
              },
              '&::-webkit-scrollbar-thumb': {
                backgroundColor: '#c1c1c1',
                borderRadius: '4px',
              },
            }}>
              <Table sx={{ minWidth: 800 }}>
                <TableHead>
                  <TableRow>
                    <TableCell>STT</TableCell>
                    <TableCell>Sinh viên</TableCell>
                    <TableCell>Mã sinh viên</TableCell>
                    <TableCell>Email</TableCell>
                    <TableCell>Số điện thoại</TableCell>
                    <TableCell>Trạng thái</TableCell>
                    <TableCell>Hoàn thành bài tập</TableCell>
                    <TableCell>Ngày đăng ký</TableCell>
                    <TableCell>Hành động</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {students.map((student, index) => (
                    <TableRow key={student.id}>
                      <TableCell>{index + 1}</TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Avatar sx={{ width: 32, height: 32 }}>
                            {student.fullName.charAt(0)}
                          </Avatar>
                          <Box>
                            <Typography variant="subtitle2">{student.fullName}</Typography>
                            <Typography variant="caption" color="text.secondary">
                              {student.username}
                            </Typography>
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell>{student.studentId}</TableCell>
                      <TableCell>{student.email}</TableCell>
                      <TableCell>{student.phone}</TableCell>
                      <TableCell>
                        <Chip
                          label={getStatusLabel(student.status)}
                          color={getStatusColor(student.status)}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="body2">
                      {student.assignmentsCompleted || 0}/{student.assignmentsTotal || 0} bài
                      </Typography>
                      <Chip
                      label={`${student.completionRate || '0%'}`}
                      color={
                      (parseInt((student.completionRate || '0%').replace('%', '')) / 100) >= 0.8
                      ? 'success'
                      : (parseInt((student.completionRate || '0%').replace('%', '')) / 100) >= 0.5
                      ? 'warning'
                      : 'error'
                      }
                      size="small"
                      />
                      </Box>
                      </TableCell>
                      <TableCell>
                        {new Date(student.enrollmentDate).toLocaleDateString('vi-VN')}
                      </TableCell>
                      <TableCell>
                        <Button
                          size="small"
                          color="error"
                          variant="outlined"
                          onClick={() => handleRemoveStudent(student)}
                          sx={{ 
                            fontSize: { xs: '0.75rem', sm: '0.875rem' },
                            minWidth: { xs: 'auto', sm: '120px' }
                          }}
                        >
                          <Box sx={{ display: { xs: 'none', sm: 'inline' } }}>
                            Xóa khỏi lớp
                          </Box>
                          <Box sx={{ display: { xs: 'inline', sm: 'none' } }}>
                            Xóa
                          </Box>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      )}

      {/* Remove Student Confirmation Dialog */}
      <Dialog
        open={openRemoveDialog}
        onClose={() => setOpenRemoveDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          Xác nhận xóa sinh viên khỏi lớp
        </DialogTitle>
        <DialogContent>
          <Typography variant="body1" gutterBottom>
            Bạn có chắc chắn muốn xóa sinh viên <strong>{studentToRemove?.fullName}</strong> 
            khỏi lớp <strong>{classData?.name}</strong>?
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Hành động này không thể hoàn tác. Sinh viên sẽ bị xóa khỏi lớp và mất quyền truy cập 
            vào các bài tập và tài liệu của lớp này.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenRemoveDialog(false)}>
            Hủy
          </Button>
          <Button 
            onClick={handleConfirmRemove} 
            color="error" 
            variant="contained"
          >
            Xác nhận xóa
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AdminClassDetail;
