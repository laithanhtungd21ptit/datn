import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
Box,
Typography,
Paper,
Chip,
Button,
Grid,
List,
ListItem,
ListItemText,
ListItemIcon,
Tabs,
Tab,
Card,
CardContent,
Avatar,
Table,
TableBody,
TableCell,
TableContainer,
TableHead,
TableRow,
TextField,
Dialog,
DialogTitle,
DialogContent,
DialogActions,
Divider,
FormControlLabel,
FormControl,
InputLabel,
  Select,
  MenuItem,
  Switch,
  IconButton,
} from '@mui/material';
import {
  ArrowBack,
  School,
  Assignment,
  People,
  Description,
  Schedule,
  LocationOn,
  Add,
  Edit,
  Upload,
  Download,
  Delete,
  Save,
} from '@mui/icons-material';
import { api } from '../../../api/client';

const TeacherClassDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [tab, setTab] = React.useState(0);
  const [comments, setComments] = React.useState([]);
  const [newComment, setNewComment] = React.useState('');
  const [openAnnDialog, setOpenAnnDialog] = React.useState(false);
  const [selectedAnnouncement, setSelectedAnnouncement] = React.useState(null);
  const [openAssignmentDialog, setOpenAssignmentDialog] = React.useState(false);
  const [newAssignment, setNewAssignment] = React.useState({
    title: '',
    description: '',
    dueDate: '',
    isExam: false,
    durationMinutes: 0
  });
  const [openEditAssignmentDialog, setOpenEditAssignmentDialog] = React.useState(false);
  const [editingAssignment, setEditingAssignment] = React.useState({
    id: '',
    title: '',
    description: '',
    dueDate: '',
    isExam: false,
    durationMinutes: 0
  });
  const [openRemoveDialog, setOpenRemoveDialog] = useState(false);
  const [studentToRemove, setStudentToRemove] = useState(null);

  const [classData, setClassData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Document state
  const [openDocumentDialog, setOpenDocumentDialog] = useState(false);
  const [newDocument, setNewDocument] = useState({
    title: '',
    description: '',
    file: null
  });

  // Announcement state
  const [openAnnouncementDialog, setOpenAnnouncementDialog] = useState(false);
  const [newAnnouncement, setNewAnnouncement] = useState({
    title: '',
    content: '',
    type: 'general'
  });

  const handleRemoveStudent = (student) => {
    setStudentToRemove(student);
    setOpenRemoveDialog(true);
  };

  const handleEditAssignment = (assignment) => {
    setEditingAssignment({
      id: assignment.id,
      title: assignment.title,
      description: assignment.description,
      dueDate: assignment.deadline,
      isExam: assignment.isExam,
      durationMinutes: assignment.durationMinutes
    });
    setOpenEditAssignmentDialog(true);
  };

  const handleConfirmRemove = async () => {
    try {
      // Mock API call - trong thực tế sẽ gọi api.teacherRemoveStudentFromClass(classData.id, studentToRemove.id)
      console.log('Removing student:', studentToRemove.id, 'from class:', classData.id);
      
      // Cập nhật danh sách sinh viên
      setClassData(prev => ({
        ...prev,
        students: prev.students.filter(s => s.id !== studentToRemove.id)
      }));
      
      setOpenRemoveDialog(false);
      setStudentToRemove(null);
    } catch (e) {
      setError(e?.message || 'Không thể xóa sinh viên khỏi lớp');
    }
  };

  // Document handlers
  const handleCreateDocument = () => {
    setOpenDocumentDialog(true);
  };

  const handleDocumentSubmit = async () => {
    if (!newDocument.title || !newDocument.file) return;

    try {
      const formData = new FormData();
      formData.append('file', newDocument.file);
      formData.append('title', newDocument.title);
      formData.append('description', newDocument.description);

      const uploadedDoc = await api.teacherUploadDocument(id, formData);

      // Update local state
      setClassData(prev => ({
        ...prev,
        documents: [uploadedDoc, ...(prev.documents || [])]
      }));

      setOpenDocumentDialog(false);
      setNewDocument({ title: '', description: '', file: null });
    } catch (e) {
      setError(e?.message || 'Không thể tải lên tài liệu');
    }
  };

  const handleDeleteDocument = async (docId) => {
    try {
      await api.teacherDeleteDocument(docId);
      setClassData(prev => ({
        ...prev,
        documents: prev.documents.filter(d => d.id !== docId)
      }));
    } catch (e) {
      setError(e?.message || 'Không thể xóa tài liệu');
    }
  };

  const handleEditAssignmentSubmit = async () => {
    if (!editingAssignment.title || !editingAssignment.dueDate) return;

    try {
      await api.teacherUpdateAssignment(editingAssignment.id, {
        title: editingAssignment.title,
        description: editingAssignment.description,
        dueDate: editingAssignment.dueDate,
        isExam: editingAssignment.isExam,
        durationMinutes: editingAssignment.isExam ? editingAssignment.durationMinutes : null,
      });

      // Update local state
      setClassData(prev => ({
        ...prev,
        assignments: prev.assignments.map(a =>
          a.id === editingAssignment.id
            ? { ...a, title: editingAssignment.title, description: editingAssignment.description, deadline: editingAssignment.dueDate, isExam: editingAssignment.isExam, durationMinutes: editingAssignment.durationMinutes }
            : a
        )
      }));

      setOpenEditAssignmentDialog(false);
      setEditingAssignment({
        id: '',
        title: '',
        description: '',
        dueDate: '',
        isExam: false,
        durationMinutes: 0
      });
    } catch (e) {
      setError(e?.message || 'Không thể cập nhật bài tập');
    }
  };

  // Announcement handlers
  const handleCreateAnnouncement = () => {
    setOpenAnnouncementDialog(true);
  };

  const handleAnnouncementSubmit = async () => {
    if (!newAnnouncement.title || !newAnnouncement.content) return;

    try {
      const announcement = await api.teacherCreateAnnouncement(id, newAnnouncement);

      // Update local state
      setClassData(prev => ({
        ...prev,
        announcements: [announcement, ...(prev.announcements || [])]
      }));

      setOpenAnnouncementDialog(false);
      setNewAnnouncement({ title: '', content: '', type: 'general' });
    } catch (e) {
      setError(e?.message || 'Không thể tạo thông báo');
    }
  };

  const handleDeleteAnnouncement = async (announcementId) => {
    try {
      await api.teacherDeleteAnnouncement(announcementId);
      setClassData(prev => ({
        ...prev,
        announcements: prev.announcements.filter(a => a.id !== announcementId)
      }));
    } catch (e) {
      setError(e?.message || 'Không thể xóa thông báo');
    }
  };

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const data = await api.teacherClassDetail(id);
        const commentsData = await api.teacherGetComments(id);
        setClassData({
          id: data.id,
          name: data.name,
          code: data.code,
          students: (data.students || []).map(s => ({ id: s.id, name: s.name || s.id, email: s.email || '' })),
          assignments: data.assignments || [],
          documents: data.documents || [],
          announcements: data.announcements || [],
        });
        setComments(commentsData || []);
      } catch (e) {
        console.error('Failed to load class detail:', e);
        setError('Không thể tải thông tin lớp học');
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  return (
    <Box>
      <Button startIcon={<ArrowBack />} onClick={() => navigate(-1)} sx={{ mb: 2 }}>
        Quay lại
      </Button>

      <Paper sx={{ p: 2, mb: 2 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item>
            <Avatar sx={{ bgcolor: 'primary.main', width: 56, height: 56 }}>
              <School />
            </Avatar>
          </Grid>
          <Grid item xs>
            <Typography variant="h5">{classData?.name || 'Lớp học'}</Typography>
            <Typography variant="body2" color="text.secondary">Mã lớp: {classData?.code || ''}</Typography>
          </Grid>
          <Grid item>
            <Chip icon={<People />} label={`${classData?.students?.length || 0} sinh viên`} color="primary" />
          </Grid>
        </Grid>

        <Grid container spacing={2} sx={{ mt: 1 }}>
          <Grid item>
            <Typography variant="body2" color="text.secondary">
              Giảng viên: {classData?.teacher || 'Chưa xác định'}
            </Typography>
          </Grid>
        </Grid>
      </Paper>

      <Paper sx={{ mb: 2 }}>
        <Tabs value={tab} onChange={(e, v) => setTab(v)}>
          <Tab label="Sinh viên" />
          <Tab label="Bài tập" />
          <Tab label="Tài liệu" />
          <Tab label="Thông báo" />
          <Tab label="Bình luận" />
        </Tabs>
      </Paper>

      {tab === 0 && (
        <Paper sx={{ p: 2 }}>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Mã SV</TableCell>
                  <TableCell>Họ tên</TableCell>
                  <TableCell>Email</TableCell>
                  <TableCell>Hành động</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {(classData?.students || []).map((s) => (
                  <TableRow key={s.id}>
                    <TableCell>{s.id}</TableCell>
                    <TableCell>{s.name}</TableCell>
                    <TableCell>{s.email}</TableCell>
                    <TableCell>
                      <Button
                        size="small"
                        color="error"
                        variant="outlined"
                        onClick={() => handleRemoveStudent(s)}
                      >
                        Xóa khỏi lớp
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}

      {tab === 1 && (
        <Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">Bài tập</Typography>
            <Button 
              variant="contained" 
              startIcon={<Add />}
              onClick={() => setOpenAssignmentDialog(true)}
            >
              Tạo bài tập mới
            </Button>
          </Box>
          <Grid container spacing={2}>
            {(classData?.assignments || [])
              .sort((a, b) => new Date(a.createdAt || a.updatedAt || 0) - new Date(b.createdAt || a.updatedAt || 0))
              .map(a => (
              <Grid item xs={12} md={6} key={a.id}>
                <Card>
                  <CardContent>
                    <Typography variant="subtitle1">{a.title}</Typography>
                    <Typography variant="body2" color="text.secondary">
                    Hạn: {a.deadline ? new Date(a.deadline).toLocaleDateString('vi-VN') : 'Chưa đặt'} • Đã nộp: {a.submissions || 0}
                    </Typography>
                    <Box sx={{ mt: 1, display: 'flex', gap: 1 }}>
                    <Button size="small" variant="outlined" startIcon={<Edit />} onClick={() => handleEditAssignment(a)}>Sửa</Button>
                    <Button size="small" variant="contained" startIcon={<Assignment />} onClick={() => navigate(`/teacher/assignments?assignmentId=${a.id}`)}>Xem bài nộp</Button>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Box>
      )}

      {tab === 2 && (
      <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
      <Typography variant="h6">Tài liệu</Typography>
      <Button
      variant="contained"
      startIcon={<Upload />}
      onClick={handleCreateDocument}
      >
      Tải lên tài liệu
      </Button>
      </Box>
      <Grid container spacing={2}>
        {(classData?.documents || []).map(d => (
        <Grid item xs={12} md={6} key={d.id}>
        <Card>
        <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <Description color="primary" />
      <Box sx={{ flexGrow: 1 }}>
        <Typography variant="subtitle1">{d.title}</Typography>
      <Typography variant="body2" color="text.secondary">
        {d.fileName} • {(d.fileSize / 1024).toFixed(1)} KB
      </Typography>
      <Typography variant="caption" color="text.secondary">
          Tải lên: {new Date(d.uploadedAt).toLocaleDateString('vi-VN')}
        </Typography>
      </Box>
      <Box sx={{ display: 'flex', gap: 1 }}>
      <IconButton 
        size="small" 
        color="primary" 
        component="a" 
        href={d.fileUrl.startsWith('http') ? d.fileUrl : `${process.env.REACT_APP_BACKEND_URL || 'http://localhost:4000'}${d.fileUrl}`}
        target="_blank"
        download
        rel="noopener noreferrer"
      >
        <Download />
      </IconButton>
      <IconButton size="small" color="error" onClick={() => handleDeleteDocument(d.id)}>
          <Delete />
          </IconButton>
          </Box>
          </Box>
          </CardContent>
          </Card>
          </Grid>
          ))}
            {(classData?.documents || []).length === 0 && (
              <Grid item xs={12}>
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <Description sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
                  <Typography variant="h6" color="text.secondary">
                    Chưa có tài liệu nào
                  </Typography>
                </Box>
              </Grid>
            )}
          </Grid>
        </Box>
      )}

      {tab === 3 && (
      <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
      <Typography variant="h6">Thông báo</Typography>
      <Button
      variant="contained"
      startIcon={<Add />}
      onClick={handleCreateAnnouncement}
      >
      Tạo thông báo
      </Button>
      </Box>
      <Grid container spacing={2}>
          {(classData?.announcements || []).map(a => (
              <Grid item xs={12} key={a.id}>
                <Card>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Description color="warning" />
                      <Box sx={{ flexGrow: 1 }}>
                        <Typography variant="subtitle1">{a.title}</Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                          {a.content}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Tạo: {new Date(a.createdAt).toLocaleDateString('vi-VN')} • Loại: {a.type}
                        </Typography>
                      </Box>
                      <Box>
                        <IconButton size="small" color="error" onClick={() => handleDeleteAnnouncement(a.id)}>
                          <Delete />
                        </IconButton>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
            {(classData?.announcements || []).length === 0 && (
              <Grid item xs={12}>
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <Description sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
                  <Typography variant="h6" color="text.secondary">
                    Chưa có thông báo nào
                  </Typography>
                </Box>
              </Grid>
            )}
          </Grid>
        </Box>
      )}
      {tab === 4 && (
        <Paper sx={{ p: 2 }}>
          <List>
            {comments.map((c) => (
              <ListItem key={c.id} alignItems="flex-start">
                <ListItemIcon>
                  <Avatar sx={{ width: 32, height: 32 }}>
                    {c.author.charAt(0)}
                  </Avatar>
                </ListItemIcon>
                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="subtitle2">{c.author}</Typography>
                      <Chip size="small" label={c.role === 'teacher' ? 'Giảng viên' : 'Sinh viên'} color={c.role === 'teacher' ? 'primary' : 'default'} />
                      <Typography variant="caption" color="text.secondary">{c.time}</Typography>
                    </Box>
                  }
                  secondary={<Typography variant="body2" sx={{ mt: 1 }}>{c.content}</Typography>}
                />
              </ListItem>
            ))}
          </List>
          <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
            <TextField
              fullWidth
              placeholder="Thêm bình luận..."
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              multiline
              minRows={2}
            />
            <Button
            variant="contained"
            onClick={async () => {
            if (!newComment.trim()) return;
            try {
              const comment = await api.teacherCreateComment(id, { content: newComment });
                setComments(prev => [comment, ...prev]);
                setNewComment('');
                } catch (e) {
                  setError(e?.message || 'Không thể gửi bình luận');
                }
              }}
              disabled={!newComment.trim()}
            >
              Gửi
            </Button>
          </Box>
        </Paper>
      )}

      {/* Dialog tạo bài tập mới */}
      <Dialog open={openAssignmentDialog} onClose={() => setOpenAssignmentDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>Tạo bài tập mới</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Tiêu đề bài tập"
            value={newAssignment.title}
            onChange={(e) => setNewAssignment(prev => ({ ...prev, title: e.target.value }))}
            margin="normal"
            required
          />
          <TextField
            fullWidth
            label="Mô tả"
            value={newAssignment.description}
            onChange={(e) => setNewAssignment(prev => ({ ...prev, description: e.target.value }))}
            margin="normal"
            multiline
            rows={4}
          />
          <TextField
            fullWidth
            label="Hạn nộp"
            type="datetime-local"
            value={newAssignment.dueDate}
            onChange={(e) => setNewAssignment(prev => ({ ...prev, dueDate: e.target.value }))}
            margin="normal"
            InputLabelProps={{ shrink: true }}
            required
          />
          <FormControlLabel
            control={
              <Switch
                checked={newAssignment.isExam}
                onChange={(e) => setNewAssignment(prev => ({ ...prev, isExam: e.target.checked }))}
              />
            }
            label="Đây là bài thi"
          />
          {newAssignment.isExam && (
            <TextField
              fullWidth
              label="Thời gian làm bài (phút)"
              type="number"
              value={newAssignment.durationMinutes}
              onChange={(e) => setNewAssignment(prev => ({ ...prev, durationMinutes: parseInt(e.target.value) || 0 }))}
              margin="normal"
              inputProps={{ min: 1, max: 300 }}
            />
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenAssignmentDialog(false)}>Hủy</Button>
          <Button
          variant="contained"
          startIcon={<Save />}
          onClick={async () => {
          try {
            const assignmentData = {
              classId: id,
              title: newAssignment.title,
            description: newAssignment.description,
            dueDate: newAssignment.dueDate,
            isExam: newAssignment.isExam,
            durationMinutes: newAssignment.isExam ? newAssignment.durationMinutes : null
          };

              const created = await api.teacherCreateAssignment(assignmentData);

                // Update local state
                setClassData(prev => ({
                  ...prev,
                  assignments: [...(prev.assignments || []), {
                    id: created.id,
                    title: newAssignment.title,
                    description: newAssignment.description,
                    dueDate: newAssignment.dueDate,
                    deadline: new Date(newAssignment.dueDate).toLocaleDateString('vi-VN'),
                    isExam: newAssignment.isExam,
                    durationMinutes: newAssignment.durationMinutes,
                    submissions: 0
                  }]
                }));

                setOpenAssignmentDialog(false);
                setNewAssignment({
                  title: '',
                  description: '',
                  dueDate: '',
                  isExam: false,
                  durationMinutes: 0
                });
              } catch (e) {
                setError(e?.message || 'Không thể tạo bài tập');
              }
            }}
          >
            Tạo bài tập
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={openAnnDialog} onClose={() => setOpenAnnDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{selectedAnnouncement?.title}</DialogTitle>
        <DialogContent>
          <Typography variant="caption" color="text.secondary">{selectedAnnouncement?.date}</Typography>
          <Divider sx={{ my: 1 }} />
          <Typography variant="body1">{selectedAnnouncement?.content || 'Không có nội dung chi tiết.'}</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenAnnDialog(false)}>Đóng</Button>
        </DialogActions>
      </Dialog>

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
            Bạn có chắc chắn muốn xóa sinh viên <strong>{studentToRemove?.name}</strong> 
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

      {/* Document Upload Dialog */}
      <Dialog
        open={openDocumentDialog}
        onClose={() => setOpenDocumentDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Tải lên tài liệu</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Tiêu đề tài liệu"
            fullWidth
            variant="outlined"
            value={newDocument.title}
            onChange={(e) => setNewDocument(prev => ({ ...prev, title: e.target.value }))}
            sx={{ mb: 2 }}
          />
          <TextField
            margin="dense"
            label="Mô tả (tùy chọn)"
            fullWidth
            variant="outlined"
            multiline
            rows={3}
            value={newDocument.description}
            onChange={(e) => setNewDocument(prev => ({ ...prev, description: e.target.value }))}
            sx={{ mb: 2 }}
          />
          <input
            type="file"
            accept=".pdf,.doc,.docx,.ppt,.pptx,.txt,.jpg,.jpeg,.png"
            onChange={(e) => setNewDocument(prev => ({ ...prev, file: e.target.files[0] }))}
            style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDocumentDialog(false)}>Hủy</Button>
          <Button
            variant="contained"
            onClick={handleDocumentSubmit}
            disabled={!newDocument.title || !newDocument.file}
          >
            Tải lên
          </Button>
        </DialogActions>
      </Dialog>

      {/* Announcement Create Dialog */}
      <Dialog
        open={openAnnouncementDialog}
        onClose={() => setOpenAnnouncementDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Tạo thông báo mới</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Tiêu đề thông báo"
            fullWidth
            variant="outlined"
            value={newAnnouncement.title}
            onChange={(e) => setNewAnnouncement(prev => ({ ...prev, title: e.target.value }))}
            sx={{ mb: 2 }}
          />
          <TextField
            margin="dense"
            label="Nội dung thông báo"
            fullWidth
            variant="outlined"
            multiline
            rows={4}
            value={newAnnouncement.content}
            onChange={(e) => setNewAnnouncement(prev => ({ ...prev, content: e.target.value }))}
            sx={{ mb: 2 }}
          />
          <FormControl fullWidth>
            <InputLabel>Loại thông báo</InputLabel>
            <Select
              value={newAnnouncement.type}
              onChange={(e) => setNewAnnouncement(prev => ({ ...prev, type: e.target.value }))}
              label="Loại thông báo"
            >
              <MenuItem value="general">Thông báo chung</MenuItem>
              <MenuItem value="assignment">Bài tập</MenuItem>
              <MenuItem value="exam">Bài thi</MenuItem>
              <MenuItem value="important">Quan trọng</MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenAnnouncementDialog(false)}>Hủy</Button>
          <Button
            variant="contained"
            onClick={handleAnnouncementSubmit}
            disabled={!newAnnouncement.title || !newAnnouncement.content}
          >
            Tạo thông báo
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Assignment Dialog */}
      <Dialog
        open={openEditAssignmentDialog}
        onClose={() => setOpenEditAssignmentDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Chỉnh sửa bài tập</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Tiêu đề bài tập"
            fullWidth
            variant="outlined"
            value={editingAssignment.title}
            onChange={(e) => setEditingAssignment(prev => ({ ...prev, title: e.target.value }))}
            sx={{ mb: 2 }}
          />
          <TextField
            margin="dense"
            label="Mô tả bài tập"
            fullWidth
            variant="outlined"
            multiline
            rows={4}
            value={editingAssignment.description}
            onChange={(e) => setEditingAssignment(prev => ({ ...prev, description: e.target.value }))}
            sx={{ mb: 2 }}
          />
          <TextField
            margin="dense"
            label="Hạn nộp"
            type="datetime-local"
            fullWidth
            variant="outlined"
            value={editingAssignment.dueDate}
            onChange={(e) => setEditingAssignment(prev => ({ ...prev, dueDate: e.target.value }))}
            InputLabelProps={{
              shrink: true,
            }}
            sx={{ mb: 2 }}
          />
          <FormControlLabel
            control={
              <Switch
                checked={editingAssignment.isExam}
                onChange={(e) => setEditingAssignment(prev => ({ ...prev, isExam: e.target.checked }))}
              />
            }
            label="Đây là kỳ thi"
            sx={{ mb: 2 }}
          />
          {editingAssignment.isExam && (
            <TextField
              margin="dense"
              label="Thời lượng (phút)"
              type="number"
              fullWidth
              variant="outlined"
              value={editingAssignment.durationMinutes}
              onChange={(e) => setEditingAssignment(prev => ({ ...prev, durationMinutes: parseInt(e.target.value) || 0 }))}
            />
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenEditAssignmentDialog(false)}>Hủy</Button>
          <Button
            variant="contained"
            onClick={handleEditAssignmentSubmit}
            disabled={!editingAssignment.title || !editingAssignment.dueDate}
          >
            Cập nhật bài tập
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default TeacherClassDetail;
