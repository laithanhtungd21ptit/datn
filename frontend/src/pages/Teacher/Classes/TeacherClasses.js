import React, { useEffect, useState } from 'react';
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
  Menu,
  MenuItem,
} from '@mui/material';
import {
  Add,
  MoreVert,
  People,
  Assignment,
  Notifications,
  Edit,
  Delete,
  Send,
  Visibility,
} from '@mui/icons-material';
import { api } from '../../../api/client';
import ClassNotificationDialog from '../../../components/Teacher/ClassNotificationDialog';

const TeacherClasses = () => {
  const navigate = useNavigate();
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError('');
      try {
        const list = await api.teacherClasses();
        setClasses(list.map(c => ({ id: c.id, name: c.name, code: c.code, description: c.department || '', students: c.students ?? 0, assignments: c.assignments ?? 0 })));
      } catch (e) {
        setError(e?.message || 'Không thể tải danh sách lớp');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const [students] = useState([
    { id: 1, name: 'Nguyễn Văn A', studentId: 'IT001', email: 'a.nguyen@email.com', status: 'active' },
    { id: 2, name: 'Trần Thị B', studentId: 'IT002', email: 'b.tran@email.com', status: 'active' },
    { id: 3, name: 'Lê Văn C', studentId: 'IT003', email: 'c.le@email.com', status: 'inactive' },
    { id: 4, name: 'Phạm Thị D', studentId: 'IT004', email: 'd.pham@email.com', status: 'active' },
  ]);

  const [selectedClass, setSelectedClass] = useState(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [openStudentsDialog, setOpenStudentsDialog] = useState(false);
  const [openNotificationDialog, setOpenNotificationDialog] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedClassForMenu, setSelectedClassForMenu] = useState(null);
  const [openRenameDialog, setOpenRenameDialog] = useState(false);
  const [renameText, setRenameText] = useState('');
  const [openShareDialog, setOpenShareDialog] = useState(false);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [notificationForm, setNotificationForm] = useState({
    title: '',
    content: '',
    type: 'general',
  });
  const [sendingNotification, setSendingNotification] = useState(false);

  const handleMenuClick = (event, classItem) => {
    event.stopPropagation();
    setAnchorEl(event.currentTarget);
    setSelectedClassForMenu(classItem);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedClassForMenu(null);
  };

  const handleViewStudents = async (classItem) => {
    setSelectedClass({ ...classItem, studentList: [] });
    try {
      const classDetail = await api.teacherClassDetail(classItem.id);
      setSelectedClass({
        ...classItem,
        studentList: Array.isArray(classDetail.students) ? classDetail.students : [],
      });
    } catch (e) {
      console.error('Error loading students:', e);
      setSelectedClass(prev => ({ ...prev, studentList: [] }));
    }
    setOpenStudentsDialog(true);
    handleMenuClose();
  };

  const handleSendNotification = (classItem) => {
    setSelectedClass(classItem);
    setNotificationForm({
      title: '',
      content: '',
      type: 'general',
    });
    setOpenNotificationDialog(true);
    handleMenuClose();
  };

  const handleOpenRename = () => {
    setRenameText(selectedClassForMenu?.name || '');
    setOpenRenameDialog(true);
    handleMenuClose();
  };

  const handleRenameSubmit = () => {
    if (!renameText.trim()) return;
    setClasses(prev => prev.map(c => c.id === selectedClassForMenu.id ? { ...c, name: renameText } : c));
    setOpenRenameDialog(false);
  };

  const handleOpenShare = () => {
    setOpenShareDialog(true);
    handleMenuClose();
  };

  const handleCopyShare = async () => {
    const origin = (typeof window !== 'undefined' && window.location) ? window.location.origin : '';
    const classCode = selectedClassForMenu?.code || '';
    const classId = selectedClassForMenu?.id;
    // Share link: direct to student classes with join code param (mock flow)
    const link = `${origin}/student/classes?join=${encodeURIComponent(classCode)}${classId ? `&classId=${classId}` : ''}`;
    try { await navigator.clipboard.writeText(link); } catch (e) {}
  };

  const handleOpenDelete = () => {
    setOpenDeleteDialog(true);
    handleMenuClose();
  };

  const handleDeleteConfirm = () => {
    setClasses(prev => prev.filter(c => c.id !== selectedClassForMenu.id));
    setOpenDeleteDialog(false);
  };

  const handleSendNotificationSubmit = async () => {
    if (
      !selectedClass ||
      !notificationForm.title.trim() ||
      !notificationForm.content.trim()
    ) {
      return;
    }
    try {
      setSendingNotification(true);
      await api.teacherCreateAnnouncement(selectedClass.id, notificationForm);
      setOpenNotificationDialog(false);
      setNotificationForm({ title: '', content: '', type: 'general' });
    } catch (e) {
      console.error('Error sending notification:', e);
      setError(e?.message || 'Không thể gửi thông báo');
    } finally {
      setSendingNotification(false);
    }
  };

  const [createForm, setCreateForm] = useState({ name: '', code: '', description: '' });

  const handleCreateClass = () => {
    setOpenDialog(true);
  };

  const handleCreateSubmit = async () => {
    if (!createForm.name || !createForm.code) return;
    try {
      await api.teacherCreateClass(createForm);
      const list = await api.teacherClasses();
      setClasses(list.map(c => ({ id: c.id, name: c.name, code: c.code, description: c.department || '', students: c.students ?? 0, assignments: c.assignments ?? 0 })));
      setOpenDialog(false);
      setCreateForm({ name: '', code: '', description: '' });
    } catch (e) {
      console.error('Error creating class:', e);
    }
  };

  const handleViewDetail = (classItem) => {
    navigate(`/teacher/classes/${classItem.id}`);
  };

  const filteredClasses = classes.filter(classItem =>
    classItem.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    classItem.code.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
          Tạo lớp học mới
        </Button>
      </Box>

      {/* Search Filter */}
      <Box sx={{ mb: 3 }}>
        <TextField
          fullWidth
          placeholder="Tìm kiếm lớp học theo tên hoặc mã lớp..."
          variant="outlined"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          sx={{ maxWidth: 400 }}
        />
      </Box>

      {/* Classes Grid */}
      <Grid container spacing={3}>
        {error && (
          <Grid item xs={12}>
            <Typography color="error">{error}</Typography>
          </Grid>
        )}
        {!error && classes.length === 0 && (
          <Grid item xs={12}>
            <Typography color="text.secondary">{loading ? 'Đang tải...' : 'Chưa có lớp học'}</Typography>
          </Grid>
        )}
        {filteredClasses.map((classItem) => (
          <Grid item xs={12} sm={6} md={4} key={classItem.id}>
            <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              <CardContent sx={{ flexGrow: 1, cursor: 'pointer' }} onClick={() => handleViewDetail(classItem)}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                  <Typography variant="h6" component="div">
                    {classItem.name}
                  </Typography>
                  <IconButton
                    size="small"
                    onClick={(e) => handleMenuClick(e, classItem)}
                  >
                    <MoreVert />
                  </IconButton>
                </Box>
                
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Mã lớp: {classItem.code}
                </Typography>
                
                <Typography variant="body2" sx={{ mb: 2 }}>
                  {classItem.description}
                </Typography>

                <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                  <Chip
                    icon={<People />}
                    label={`${classItem.students} sinh viên`}
                    size="small"
                    color="primary"
                  />
                  <Chip
                    icon={<Assignment />}
                    label={`${classItem.assignments} bài tập`}
                    size="small"
                    color="secondary"
                  />
                </Box>

                {/* Schedule and room hidden as requested */}
              </CardContent>
              
              <CardActions>
                <Button
                  size="small"
                  startIcon={<Visibility />}
                  onClick={() => handleViewDetail(classItem)}
                >
                  Xem chi tiết
                </Button>
                <Button
                  size="small"
                  startIcon={<Notifications />}
                  onClick={() => handleSendNotification(classItem)}
                >
                  Gửi thông báo
                </Button>
              </CardActions>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Context Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={handleOpenRename}>
          <Edit sx={{ mr: 1 }} />
          Đổi tên lớp học
        </MenuItem>
        <MenuItem onClick={handleOpenShare}>
          <Send sx={{ mr: 1 }} />
          Chia sẻ mã lớp
        </MenuItem>
        <MenuItem onClick={handleOpenDelete} sx={{ color: 'error.main' }}>
          <Delete sx={{ mr: 1 }} />
          Xóa lớp học
        </MenuItem>
      </Menu>

      {/* Students Dialog */}
      <Dialog
        open={openStudentsDialog}
        onClose={() => setOpenStudentsDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Danh sách sinh viên - {selectedClass?.name}
        </DialogTitle>
        <DialogContent>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Mã sinh viên</TableCell>
                  <TableCell>Họ và tên</TableCell>
                  <TableCell>Email</TableCell>
                  <TableCell>Trạng thái</TableCell>
                  <TableCell>Hành động</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
              {((selectedClass?.studentList && Array.isArray(selectedClass.studentList)) ? selectedClass.studentList : []).map((student) => (
              <TableRow key={student.id}>
              <TableCell>{student.studentId}</TableCell>
              <TableCell>{student.fullName}</TableCell>
              <TableCell>{student.email}</TableCell>
              <TableCell>
              <Chip
              label={student.status === 'active' ? 'Hoạt động' : student.status === 'locked' ? 'Đã khóa' : 'Không hoạt động'}
              color={student.status === 'active' ? 'success' : student.status === 'locked' ? 'error' : 'default'}
              size="small"
              />
              </TableCell>
              <TableCell>
              <Button size="small" startIcon={<Edit />}>
              Chỉnh sửa
              </Button>
              </TableCell>
              </TableRow>
              ))}
              </TableBody>
            </Table>
          </TableContainer>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenStudentsDialog(false)}>
            Đóng
          </Button>
        </DialogActions>
      </Dialog>

      {/* Rename Class Dialog */}
      <Dialog open={openRenameDialog} onClose={() => setOpenRenameDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Đổi tên lớp học</DialogTitle>
        <DialogContent>
          <TextField fullWidth label="Tên lớp" value={renameText} onChange={(e) => setRenameText(e.target.value)} autoFocus />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenRenameDialog(false)}>Hủy</Button>
          <Button onClick={handleRenameSubmit} variant="contained" disabled={!renameText.trim()}>Lưu</Button>
        </DialogActions>
      </Dialog>

      {/* Share Class Dialog */}
      <Dialog open={openShareDialog} onClose={() => setOpenShareDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Chia sẻ liên kết lớp học</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 1 }}>Liên kết mời:</Typography>
          {(() => {
            const origin = (typeof window !== 'undefined' && window.location) ? window.location.origin : '';
            const classCode = selectedClassForMenu?.code || '';
            const classId = selectedClassForMenu?.id;
            const link = `${origin}/student/classes?join=${encodeURIComponent(classCode)}${classId ? `&classId=${classId}` : ''}`;
            return (
              <TextField fullWidth value={link} InputProps={{ readOnly: true }} />
            );
          })()}
          <Typography variant="caption" color="text.secondary">Sinh viên bấm vào link này để tham gia lớp.</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenShareDialog(false)}>Đóng</Button>
          <Button onClick={handleCopyShare} variant="contained">Sao chép liên kết</Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirm Dialog */}
      <Dialog open={openDeleteDialog} onClose={() => setOpenDeleteDialog(false)}>
        <DialogTitle>Xác nhận xóa lớp học</DialogTitle>
        <DialogContent>
          <Typography>Bạn có chắc chắn muốn xóa lớp "{selectedClassForMenu?.name}"?</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDeleteDialog(false)}>Hủy</Button>
          <Button color="error" variant="contained" onClick={handleDeleteConfirm}>Xóa</Button>
        </DialogActions>
      </Dialog>

      <ClassNotificationDialog
        open={openNotificationDialog}
        onClose={() => setOpenNotificationDialog(false)}
        onSubmit={handleSendNotificationSubmit}
        formState={notificationForm}
        setFormState={setNotificationForm}
        submitting={sendingNotification}
        classNameLabel={selectedClass?.name || ''}
      />

      {/* Create Class Dialog */}
      <Dialog
        open={openDialog}
        onClose={() => setOpenDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Tạo lớp học mới</DialogTitle>
        <DialogContent>
        <TextField
        autoFocus
        margin="dense"
        label="Tên lớp học"
        fullWidth
        variant="outlined"
          value={createForm.name}
          onChange={(e) => setCreateForm(prev => ({ ...prev, name: e.target.value }))}
        />
        <TextField
        margin="dense"
        label="Mã lớp học"
          fullWidth
          variant="outlined"
        value={createForm.code}
        onChange={(e) => setCreateForm(prev => ({ ...prev, code: e.target.value }))}
        />
        <TextField
        margin="dense"
        label="Mô tả"
          fullWidth
          multiline
        rows={3}
        variant="outlined"
        value={createForm.description}
        onChange={(e) => setCreateForm(prev => ({ ...prev, description: e.target.value }))}
        />
        </DialogContent>
        <DialogActions>
        <Button onClick={() => setOpenDialog(false)}>
        Hủy
        </Button>
        <Button variant="contained" onClick={handleCreateSubmit} disabled={!createForm.name || !createForm.code}>
        Tạo lớp
        </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default TeacherClasses;
