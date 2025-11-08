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
Paper,
Menu,
MenuItem,
Tabs,
Tab,
Avatar,
Alert,
LinearProgress,
List,
ListItem,
ListItemText,
ListItemIcon,
Divider,
  FormControl,
  InputLabel,
  Select,
} from '@mui/material';
import {
AttachFile,
Schedule,
Comment,
Visibility,
Upload,
Download,
Send,
QuestionAnswer,
MoreVert,
  FilterList,
} from '@mui/icons-material';
import { api } from '../../../api/client';

const StudentAssignments = () => {
  const navigate = useNavigate();
  const [tabValue, setTabValue] = useState(0);
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [courseFilter, setCourseFilter] = useState('all');
  const [classes, setClasses] = useState([]);

  const [comments] = useState([
    {
      id: 1,
      assignmentId: 1,
      author: 'Nguyễn Văn A',
      authorType: 'student',
      content: 'Thầy ơi, em có thể sử dụng thư viện numpy không ạ?',
      timestamp: '2024-01-12 14:30',
    },
    {
      id: 2,
      assignmentId: 1,
      author: 'Thầy Nguyễn Văn A',
      authorType: 'teacher',
      content: 'Được em, nhưng cần giải thích rõ thuật toán trong code nhé.',
      timestamp: '2024-01-12 15:45',
    },
    {
      id: 3,
      assignmentId: 1,
      author: 'Trần Thị B',
      authorType: 'student',
      content: 'Các bạn có thể chia sẻ tài liệu tham khảo không?',
      timestamp: '2024-01-12 16:20',
    },
  ]);

  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [openSubmissionDialog, setOpenSubmissionDialog] = useState(false);
  const [openExamDialog, setOpenExamDialog] = useState(false);
  const [openCommentsDialog, setOpenCommentsDialog] = useState(false);
  const [openDetailDialog, setOpenDetailDialog] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedItemForMenu, setSelectedItemForMenu] = useState(null);
  const [newComment, setNewComment] = useState('');
  const [submissionFiles, setSubmissionFiles] = useState([]);
  const [submissionNotes, setSubmissionNotes] = useState('');
  const [examState, setExamState] = useState({ timeLeftSec: 0, stream: null, error: '' });

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError('');
      try {
        // Load classes for filter
        const classesList = await api.studentClasses();
        setClasses(classesList);

        // Load assignments (đã được sort theo createdAt descending từ backend)
        const items = await api.studentAssignments();

        // Process assignments data
        const processedItems = (items || []).map(it => ({
          id: it.id,
          title: it.title,
          description: it.description || '',
          class: it.class || '',
          classId: it.classId,
          teacher: it.teacher || '',
          deadline: it.dueDate ? new Date(it.dueDate).toISOString().slice(0, 10) : '',
          isExam: !!it.isExam,
          durationMinutes: it.durationMinutes || null,
          attachments: it.attachments || [],
          mySubmission: it.mySubmission || { files: [], submittedAt: null, status: 'not_submitted' },
          status: it.status || 'not_submitted',
          grade: it.grade || null,
          comment: it.comment || '',
          createdAt: it.createdAt || new Date().toISOString(),
        }));

        setAssignments(processedItems);
      } catch (e) {
        setError(e?.message || 'Không thể tải danh sách bài tập');
      } finally {
        setLoading(false);
      }
    })();
    }, []);

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  const handleMenuClick = (event, item) => {
    setAnchorEl(event.currentTarget);
    setSelectedItemForMenu(item);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedItemForMenu(null);
  };

  const handleSubmitAssignment = (assignment) => {
    setSelectedAssignment(assignment);
    if (assignment.isExam) {
      navigate(`/student/exams/${assignment.id}`);
    } else {
      setOpenSubmissionDialog(true);
    }
    handleMenuClose();
  };

  const handleViewComments = (assignment) => {
    setSelectedAssignment(assignment);
    setOpenCommentsDialog(true);
    handleMenuClose();
  };

  const handleViewDetail = (assignment) => {
    setSelectedAssignment(assignment);
    setOpenDetailDialog(true);
    handleMenuClose();
  };

  const handleSubmissionSubmit = async () => {
    if (!selectedAssignment) return;
    try {
      const formData = new FormData();
      formData.append('assignmentId', selectedAssignment.id);
      formData.append('notes', submissionNotes);

      // Append files
      submissionFiles.forEach(file => {
        formData.append('files', file);
      });

      await api.studentSubmit(formData);
      setAssignments(prev => prev.map(a => a.id === selectedAssignment.id ? {
        ...a,
        mySubmission: { files: submissionFiles.map(f => f.name), submittedAt: new Date().toISOString(), status: 'submitted' },
        status: 'submitted' // Update the overall status as well
      } : a));
    } catch (error) {
      console.error('Submission error:', error);
    }
    setOpenSubmissionDialog(false);
    setSubmissionFiles([]);
    setSubmissionNotes('');
  };

  const handleAddComment = () => {
    if (newComment.trim()) {
      // Handle add comment logic
      console.log('Adding comment:', newComment);
      setNewComment('');
    }
  };

  const startCountdown = () => {
    const timer = setInterval(() => {
      setExamState(prev => {
        if (prev.timeLeftSec <= 1) {
          clearInterval(timer);
          setOpenExamDialog(false);
        }
        return { ...prev, timeLeftSec: Math.max(prev.timeLeftSec - 1, 0) };
      });
    }, 1000);
  };

  const requestCameraMic = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      setExamState(prev => ({ ...prev, stream }));
      const videoEl = document.getElementById('exam-video');
      if (videoEl) {
        videoEl.srcObject = stream;
      }
    } catch (e) {
      setExamState(prev => ({ ...prev, error: 'Không thể truy cập camera/micro. Vui lòng cấp quyền.' }));
    }
  };

  const getStatusColor = (status) => {
    if (!status) return 'default';
    switch (status) {
      case 'graded': return 'success';
      case 'submitted': return 'info';
      case 'pending': return 'warning';
      case 'overdue': return 'error';
      default: return 'default';
    }
  };

  const getStatusText = (assignment) => {
    if (!assignment) return 'Chưa nộp';
    if (assignment.status === 'graded') return 'Đã chấm';
    if (assignment.mySubmission && assignment.mySubmission.status === 'submitted') return 'Đã nộp';
    if (new Date(assignment.deadline) < new Date()) return 'Quá hạn';
    return 'Chưa nộp';
  };

  const getDaysUntilDeadline = (deadline) => {
    const today = new Date();
    const deadlineDate = new Date(deadline);
    const diffTime = deadlineDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const filteredComments = selectedAssignment 
    ? comments.filter(comment => comment.assignmentId === selectedAssignment.id)
    : [];

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Bài tập của tôi
      </Typography>
      <Typography variant="subtitle1" color="text.secondary" gutterBottom>
      Quản lý và theo dõi tiến độ bài tập của bạn.
      </Typography>

      {/* Bộ lọc */}
      <Paper sx={{ p: 2, mb: 3 }}>
      <Typography variant="h6" sx={{ mb: 2 }}>
      <FilterList sx={{ mr: 1, verticalAlign: 'middle' }} />
      Bộ lọc
      </Typography>
      <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <FormControl fullWidth>
              <InputLabel>Lọc theo Lớp học</InputLabel>
              <Select
                value={courseFilter}
                label="Lọc theo Lớp học"
                onChange={(e) => setCourseFilter(e.target.value)}
              >
                <MenuItem value="all">Tất cả lớp học</MenuItem>
                {classes.filter(cls => cls.id).map((cls) => (
                  <MenuItem key={cls.id} value={cls.id}>
                    {cls.name} ({cls.code})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </Paper>

      {loading && (
        <Alert severity="info" sx={{ mb: 2 }}>
          Đang tải danh sách bài tập...
        </Alert>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      <Paper sx={{ mb: 3 }}>
        <Tabs value={tabValue} onChange={handleTabChange}>
          <Tab label="Tất cả bài tập" />
          <Tab label="Chưa nộp" />
          <Tab label="Đã nộp" />
          <Tab label="Đã chấm" />
        </Tabs>
      </Paper>

      {tabValue === 0 && (
      <Grid container spacing={3}>
      {assignments.filter(assignment => assignment.classId && (courseFilter === 'all' || String(assignment.classId) === String(courseFilter)))
              .map((assignment) => (
              <Grid item xs={12} md={6} key={assignment.id}>
              <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                <CardContent sx={{ flexGrow: 1, cursor: 'pointer' }} onClick={() => handleViewDetail(assignment)}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                    <Typography variant="h6" component="div">
                      {assignment.title}
                    </Typography>
                    <IconButton
                      size="small"
                      onClick={(e) => { e.stopPropagation(); handleMenuClick(e, assignment); }}
                    >
                      <MoreVert />
                    </IconButton>
                  </Box>

                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    {assignment.class} - {assignment.teacher}
                  </Typography>

                  <Typography variant="body2" sx={{ mb: 2 }}>
                    {assignment.description}
                  </Typography>

                  <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                    <Chip
                      label={assignment.isExam ? 'Kỳ thi' : 'Bài tập'}
                      color={assignment.isExam ? 'error' : 'primary'}
                      size="small"
                    />
                    <Chip
                      label={getStatusText(assignment)}
                      color={getStatusColor(assignment.status)}
                      size="small"
                    />
                    <Chip
                      icon={<Schedule />}
                      label={`Hạn: ${assignment.deadline}`}
                      size="small"
                      color={getDaysUntilDeadline(assignment.deadline) <= 1 ? 'error' : 'default'}
                    />
                    {assignment.isExam && (
                      <>
                        <Chip
                          label={`Bắt đầu: ${assignment.startAt}`}
                          size="small"
                          variant="outlined"
                        />
                        <Chip
                          label={`Thời lượng: ${assignment.durationMinutes} phút`}
                          size="small"
                          variant="outlined"
                        />
                        {assignment.requireMonitoring && (
                          <Chip label="Giám sát" size="small" color="warning" />
                        )}
                      </>
                    )}
                  </Box>

                  {assignment.grade && (
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="body2" color="text.secondary">
                        Điểm số:
                      </Typography>
                      <Typography variant="h5" color="primary">
                        {assignment.grade}/10
                      </Typography>
                      {assignment.comment && (
                        <Typography variant="body2" sx={{ mt: 1 }}>
                          <strong>Nhận xét:</strong> {assignment.comment}
                        </Typography>
                      )}
                    </Box>
                  )}

                  {assignment.attachments.length > 0 && (
                    <Box sx={{ mt: 2 }}>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        File đính kèm:
                      </Typography>
                      {assignment.attachments.map((file, index) => (
                        <Chip
                          key={index}
                          icon={<AttachFile />}
                          label={file}
                          size="small"
                          sx={{ mr: 1, mb: 1 }}
                        />
                      ))}
                    </Box>
                  )}
                </CardContent>

                <CardActions>
                  {assignment.mySubmission.status === 'not_submitted' ? (
                    <Button
                      size="small"
                      variant="contained"
                      startIcon={<Upload />}
                      onClick={() => handleSubmitAssignment(assignment)}
                      disabled={new Date(assignment.deadline) < new Date()}
                    >
                    {assignment.isExam ? 'Vào thi' : 'Nộp bài'}
                    </Button>
                  ) : (
                    <Button
                      size="small"
                      startIcon={<Visibility />}
                      onClick={() => handleSubmitAssignment(assignment)}
                    >
                      Xem bài nộp
                    </Button>
                  )}
                  <Button
                    size="small"
                    startIcon={<Comment />}
                    onClick={() => handleViewComments(assignment)}
                  >
                    Bình luận
                  </Button>
                </CardActions>
              </Card>
                </Grid>
                ))}
              {assignments.filter(assignment => assignment.classId && (courseFilter === 'all' || String(assignment.classId) === String(courseFilter))).length === 0 && !loading && (
                <Grid item xs={12}>
                  <Typography variant="body1" color="text.secondary" align="center" sx={{ py: 4 }}>
                    {courseFilter === 'all' ? 'Chưa có bài tập nào' : 'Không có bài tập nào cho lớp học này'}
                  </Typography>
                </Grid>
              )}
        </Grid>
      )}

      {tabValue === 1 && (
      <Grid container spacing={3}>
      {assignments
      .filter(a => a.classId && (courseFilter === 'all' || String(a.classId) === String(courseFilter)) && a.mySubmission.status === 'not_submitted' && new Date(a.deadline) >= new Date())
      .map((assignment) => (
            <Grid item xs={12} md={6} key={assignment.id}>
              <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                <CardContent sx={{ flexGrow: 1, cursor: 'pointer' }} onClick={() => handleViewDetail(assignment)}>
                  <Typography variant="h6" component="div" gutterBottom>
                    {assignment.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    {assignment.class}
                  </Typography>
                  <Typography variant="body2" sx={{ mb: 2 }}>
                    {assignment.description}
                  </Typography>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" color="text.secondary">
                      Còn lại: {getDaysUntilDeadline(assignment.deadline)} ngày
                    </Typography>
                    <LinearProgress
                      variant="determinate"
                      value={Math.max(0, 100 - (getDaysUntilDeadline(assignment.deadline) / 7) * 100)}
                      color={getDaysUntilDeadline(assignment.deadline) <= 1 ? 'error' : 'primary'}
                    />
                  </Box>
                </CardContent>
                <CardActions>
                  <Button
                    variant="contained"
                    startIcon={<Upload />}
                    onClick={(e) => { e.stopPropagation(); handleSubmitAssignment(assignment); }}
                  >
                    {assignment.isExam ? 'Vào thi' : 'Nộp bài ngay'}
                  </Button>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {tabValue === 2 && (
      <Grid container spacing={3}>
      {assignments
      .filter(a => a.classId && (courseFilter === 'all' || String(a.classId) === String(courseFilter)) && a.mySubmission.status === 'submitted')
      .map((assignment) => (
            <Grid item xs={12} md={6} key={assignment.id}>
              <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                <CardContent sx={{ flexGrow: 1, cursor: 'pointer' }} onClick={() => handleViewDetail(assignment)}>
                  <Typography variant="h6" component="div" gutterBottom>
                    {assignment.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    {assignment.class}
                  </Typography>
                  <Typography variant="body2" sx={{ mb: 2 }}>
                    {assignment.description}
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                    <Chip
                      label={assignment.isExam ? 'Kỳ thi' : 'Bài tập'}
                      color={assignment.isExam ? 'error' : 'primary'}
                      size="small"
                    />
                    <Chip
                      label="Đã nộp"
                      color="info"
                      size="small"
                    />
                  </Box>
                  <Typography variant="body2" color="text.secondary">
                    Nộp lúc: {assignment.mySubmission.submittedAt}
                  </Typography>
                </CardContent>
                <CardActions>
                  <Button
                    size="small"
                    startIcon={<Visibility />}
                    onClick={(e) => { e.stopPropagation(); handleSubmitAssignment(assignment); }}
                  >
                    Xem bài nộp
                  </Button>
                  <Button
                    size="small"
                    startIcon={<Comment />}
                    onClick={(e) => { e.stopPropagation(); handleViewComments(assignment); }}
                  >
                    Bình luận
                  </Button>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {tabValue === 3 && (
      <Grid container spacing={3}>
      {assignments
      .filter(a => a.classId && (courseFilter === 'all' || String(a.classId) === String(courseFilter)) && a.status === 'graded')
      .map((assignment) => (
            <Grid item xs={12} md={6} key={assignment.id}>
              <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                <CardContent sx={{ flexGrow: 1, cursor: 'pointer' }} onClick={() => handleViewDetail(assignment)}>
                  <Typography variant="h6" component="div" gutterBottom>
                    {assignment.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    {assignment.class}
                  </Typography>
                  <Typography variant="body2" sx={{ mb: 2 }}>
                    {assignment.description}
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                    <Chip
                      label={assignment.isExam ? 'Kỳ thi' : 'Bài tập'}
                      color={assignment.isExam ? 'error' : 'primary'}
                      size="small"
                    />
                    <Chip
                      label="Đã chấm"
                      color="success"
                      size="small"
                    />
                  </Box>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="h4" color="primary">
                      {assignment.grade}/10
                    </Typography>
                    {assignment.comment && (
                      <Typography variant="body2" sx={{ mt: 1 }}>
                        <strong>Nhận xét:</strong> {assignment.comment}
                      </Typography>
                    )}
                  </Box>
                </CardContent>
                <CardActions>
                  <Button
                    size="small"
                    startIcon={<Visibility />}
                    onClick={(e) => { e.stopPropagation(); handleSubmitAssignment(assignment); }}
                  >
                    Xem chi tiết điểm
                  </Button>
                  <Button
                    size="small"
                    startIcon={<Comment />}
                    onClick={(e) => { e.stopPropagation(); handleViewComments(assignment); }}
                  >
                    Bình luận
                  </Button>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Context Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={() => handleSubmitAssignment(selectedItemForMenu)}>
          <Upload sx={{ mr: 1 }} />
          Nộp bài
        </MenuItem>
        <MenuItem onClick={() => handleViewComments(selectedItemForMenu)}>
          <Comment sx={{ mr: 1 }} />
          Xem bình luận
        </MenuItem>
        <MenuItem onClick={() => handleViewDetail(selectedItemForMenu)}>
          <Visibility sx={{ mr: 1 }} />
          Xem chi tiết
        </MenuItem>
      </Menu>

      {/* Submission Dialog */}
      <Dialog
        open={openSubmissionDialog}
        onClose={() => setOpenSubmissionDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {selectedAssignment?.mySubmission.status === 'not_submitted' ? 'Nộp bài' : 'Xem bài nộp'} - {selectedAssignment?.title}
        </DialogTitle>
        <DialogContent>
          {selectedAssignment?.mySubmission.status === 'not_submitted' ? (
            <Box>
              <Alert severity="info" sx={{ mb: 2 }}>
                Vui lòng tải lên file bài làm của bạn. Chỉ chấp nhận các định dạng: PDF, DOC, DOCX, ZIP, RAR
              </Alert>
              <TextField
                autoFocus
                margin="dense"
                label="Ghi chú (tùy chọn)"
                fullWidth
                multiline
                rows={3}
                variant="outlined"
                placeholder="Thêm ghi chú cho bài nộp..."
                value={submissionNotes}
                onChange={(e) => setSubmissionNotes(e.target.value)}
              />
              <Box sx={{ mt: 2 }}>
                <Button
                  variant="outlined"
                  startIcon={<AttachFile />}
                  component="label"
                >
                  Chọn file
                  <input
                    type="file"
                    hidden
                    multiple
                    onChange={(e) => setSubmissionFiles(Array.from(e.target.files))}
                  />
                </Button>
                {submissionFiles.length > 0 && (
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="body2" gutterBottom>
                      File đã chọn:
                    </Typography>
                    {submissionFiles.map((file, index) => (
                      <Chip
                        key={index}
                        label={file.name}
                        onDelete={() => setSubmissionFiles(prev => prev.filter((_, i) => i !== index))}
                        sx={{ mr: 1, mb: 1 }}
                      />
                    ))}
                  </Box>
                )}
              </Box>
            </Box>
          ) : (
            <Box>
              <Typography variant="h6" gutterBottom>
                Bài nộp của bạn
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Nộp lúc: {selectedAssignment?.mySubmission.submittedAt}
              </Typography>
              <Box sx={{ mt: 2 }}>
                <Typography variant="body2" gutterBottom>
                  File đã nộp:
                </Typography>
                {selectedAssignment?.mySubmission.files.map((file, index) => (
                  <Chip
                    key={index}
                    icon={<Download />}
                    label={file}
                    size="small"
                    sx={{ mr: 1, mb: 1 }}
                  />
                ))}
              </Box>
              {selectedAssignment?.grade && (
                <Box sx={{ mt: 3 }}>
                  <Typography variant="h6" gutterBottom>
                    Kết quả chấm điểm
                  </Typography>
                  <Typography variant="h4" color="primary" gutterBottom>
                    {selectedAssignment.grade}/10
                  </Typography>
                  {selectedAssignment.comment && (
                    <Typography variant="body1">
                      <strong>Nhận xét:</strong> {selectedAssignment.comment}
                    </Typography>
                  )}
                </Box>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenSubmissionDialog(false)}>
            {selectedAssignment?.mySubmission.status === 'not_submitted' ? 'Hủy' : 'Đóng'}
          </Button>
          {selectedAssignment?.mySubmission.status === 'not_submitted' && (
            <Button
              onClick={handleSubmissionSubmit}
              variant="contained"
              disabled={submissionFiles.length === 0}
            >
              Nộp bài
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* Exam Dialog */}
      <Dialog
        open={openExamDialog}
        onClose={() => {
          if (examState.stream) {
            examState.stream.getTracks().forEach(t => t.stop());
          }
          setOpenExamDialog(false);
        }}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>
          Kỳ thi - {selectedAssignment?.title}
        </DialogTitle>
        <DialogContent>
          {examState.error && (
            <Alert severity="error" sx={{ mb: 2 }}>{examState.error}</Alert>
          )}
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <Box sx={{ flex: 1, minWidth: 300 }}>
              <Typography variant="subtitle1" gutterBottom>Giám sát</Typography>
              <Chip label={`Thời gian còn lại: ${Math.floor(examState.timeLeftSec / 60)}:${String(examState.timeLeftSec % 60).padStart(2, '0')}`} color="error" sx={{ mb: 1 }} />
              <Chip label={selectedAssignment?.requireMonitoring ? 'Camera + Micro: BẮT BUỘC' : 'Giám sát: Không bắt buộc'} color={selectedAssignment?.requireMonitoring ? 'warning' : 'default'} sx={{ mb: 2, ml: 1 }} />
              <video id="exam-video" autoPlay playsInline muted style={{ width: '100%', borderRadius: 8, background: '#000' }} />
            </Box>
            <Box sx={{ flex: 2, minWidth: 320 }}>
              <Typography variant="subtitle1" gutterBottom>Đề thi</Typography>
              <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  {selectedAssignment?.description || 'Đề thi sẽ hiển thị tại đây.'}
                </Typography>
              </Paper>
              <Typography variant="subtitle1" gutterBottom>Bài làm</Typography>
              <TextField
                fullWidth
                multiline
                minRows={8}
                placeholder="Nhập câu trả lời, dán link, hoặc trình bày lời giải tại đây..."
              />
              <Box sx={{ mt: 2, display: 'flex', gap: 1, alignItems: 'center' }}>
                <Button variant="outlined" startIcon={<AttachFile />} component="label">
                  Đính kèm file
                  <input type="file" hidden multiple />
                </Button>
                <Typography variant="caption" color="text.secondary">Chấp nhận: PDF, DOC, DOCX, ZIP</Typography>
              </Box>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            if (examState.stream) {
              examState.stream.getTracks().forEach(t => t.stop());
            }
            setOpenExamDialog(false);
          }}>
            Thoát
          </Button>
          <Button variant="contained" color="error">
            Nộp bài
          </Button>
        </DialogActions>
      </Dialog>

      {/* Comments Dialog */}
      <Dialog
        open={openCommentsDialog}
        onClose={() => setOpenCommentsDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Bình luận - {selectedAssignment?.title}
        </DialogTitle>
        <DialogContent>
          {filteredComments.length > 0 ? (
            <List>
              {filteredComments.map((comment) => (
                <ListItem key={comment.id} alignItems="flex-start">
                  <ListItemIcon>
                    <Avatar sx={{ width: 32, height: 32 }}>
                      {comment.author.charAt(0)}
                    </Avatar>
                  </ListItemIcon>
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="subtitle2">
                          {comment.author}
                        </Typography>
                        <Chip
                          label={comment.authorType === 'teacher' ? 'Giảng viên' : 'Sinh viên'}
                          size="small"
                          color={comment.authorType === 'teacher' ? 'primary' : 'default'}
                        />
                        <Typography variant="caption" color="text.secondary">
                          {comment.timestamp}
                        </Typography>
                      </Box>
                    }
                    secondary={
                      <Typography variant="body2" sx={{ mt: 1 }}>
                        {comment.content}
                      </Typography>
                    }
                  />
                </ListItem>
              ))}
            </List>
          ) : (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <QuestionAnswer sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6" color="text.secondary">
                Chưa có bình luận nào
              </Typography>
            </Box>
          )}
          
          <Divider sx={{ my: 2 }} />
          
          <Box sx={{ display: 'flex', gap: 1 }}>
            <TextField
              fullWidth
              placeholder="Thêm bình luận..."
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              multiline
              rows={2}
            />
            <Button
              variant="contained"
              startIcon={<Send />}
              onClick={handleAddComment}
              disabled={!newComment.trim()}
            >
              Gửi
            </Button>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenCommentsDialog(false)}>
            Đóng
          </Button>
        </DialogActions>
      </Dialog>

      {/* Assignment Detail Dialog */}
      <Dialog
        open={openDetailDialog}
        onClose={() => setOpenDetailDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Chi tiết bài tập - {selectedAssignment?.title}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              {selectedAssignment?.title}
            </Typography>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              {selectedAssignment?.class} - {selectedAssignment?.teacher}
            </Typography>
          </Box>

          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle1" gutterBottom>
              Mô tả bài tập:
            </Typography>
            <Typography variant="body1" sx={{ mb: 2 }}>
              {selectedAssignment?.description}
            </Typography>
          </Box>

          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={12} sm={6}>
              <Typography variant="subtitle2" color="text.secondary">
                Loại bài tập:
              </Typography>
              <Chip
                label={selectedAssignment?.isExam ? 'Kỳ thi' : 'Bài tập'}
                color={selectedAssignment?.isExam ? 'error' : 'primary'}
                size="small"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography variant="subtitle2" color="text.secondary">
                Hạn nộp:
              </Typography>
              <Typography variant="body2">
                {selectedAssignment?.deadline}
              </Typography>
            </Grid>
            {selectedAssignment?.isExam && (
              <>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Thời gian bắt đầu:
                  </Typography>
                  <Typography variant="body2">
                    {selectedAssignment?.startAt}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Thời lượng:
                  </Typography>
                  <Typography variant="body2">
                    {selectedAssignment?.durationMinutes} phút
                  </Typography>
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Giám sát:
                  </Typography>
                  <Chip
                    label={selectedAssignment?.requireMonitoring ? 'Bắt buộc bật camera/micro' : 'Không bắt buộc'}
                    color={selectedAssignment?.requireMonitoring ? 'warning' : 'default'}
                    size="small"
                  />
                </Grid>
              </>
            )}
          </Grid>

          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              Trạng thái nộp bài:
            </Typography>
            <Chip
              label={getStatusText(selectedAssignment)}
              color={getStatusColor(selectedAssignment?.status)}
              size="small"
            />
          </Box>

          {selectedAssignment?.attachments && selectedAssignment.attachments.length > 0 && (
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                File đính kèm:
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {selectedAssignment.attachments.map((file, index) => (
                  <Chip
                    key={index}
                    icon={<AttachFile />}
                    label={file}
                    size="small"
                    variant="outlined"
                  />
                ))}
              </Box>
            </Box>
          )}

          {selectedAssignment?.mySubmission && selectedAssignment.mySubmission.status === 'submitted' && (
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Bài nộp của bạn:
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Nộp lúc: {selectedAssignment.mySubmission.submittedAt}
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {selectedAssignment.mySubmission.files.map((file, index) => (
                  <Chip
                    key={index}
                    icon={<Download />}
                    label={file}
                    size="small"
                    variant="outlined"
                  />
                ))}
              </Box>
            </Box>
          )}

          {selectedAssignment?.grade && (
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Kết quả chấm điểm:
              </Typography>
              <Typography variant="h4" color="primary" gutterBottom>
                {selectedAssignment.grade}/10
              </Typography>
              {selectedAssignment.comment && (
                <Typography variant="body1">
                  <strong>Nhận xét:</strong> {selectedAssignment.comment}
                </Typography>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDetailDialog(false)}>
            Đóng
          </Button>
          {selectedAssignment?.mySubmission.status === 'not_submitted' && new Date(selectedAssignment.deadline) >= new Date() && (
            <Button
              variant="contained"
              startIcon={<Upload />}
              onClick={() => {
                setOpenDetailDialog(false);
                handleSubmitAssignment(selectedAssignment);
              }}
            >
              {selectedAssignment.isExam ? 'Vào thi' : 'Nộp bài'}
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default StudentAssignments;
