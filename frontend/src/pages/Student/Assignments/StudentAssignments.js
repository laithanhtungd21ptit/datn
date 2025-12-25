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
  Alert,
  LinearProgress,
  FormControl,
  InputLabel,
  Select,
  Pagination,
} from '@mui/material';
import {
AttachFile,
Schedule,
Visibility,
Upload,
Download,
MoreVert,
  FilterList,
} from '@mui/icons-material';
import { api } from '../../../api/client';

// Helper function to format description with teacher name
const formatDescriptionWithTeacher = (description, teacher) => {
  if (!description) return '';
  if (!teacher || teacher === 'Giảng viên') return description;
  
  // Remove trailing " - " or " -" if exists
  const cleanedDesc = description.replace(/\s*-\s*$/, '');
  // Add teacher name after dash
  return `${cleanedDesc} - ${teacher}`;
};

const StudentAssignments = () => {
  const navigate = useNavigate();
  const [tabValue, setTabValue] = useState(0);
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [courseFilter, setCourseFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('ongoing'); // 'ongoing' (đang diễn ra) hoặc 'expired' (hết hạn)
  const [classes, setClasses] = useState([]);
  const [page, setPage] = useState(1);
  const itemsPerPage = 10;

  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [openSubmissionDialog, setOpenSubmissionDialog] = useState(false);
  const [openExamDialog, setOpenExamDialog] = useState(false);
  const [openDetailDialog, setOpenDetailDialog] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedItemForMenu, setSelectedItemForMenu] = useState(null);
  const [submissionFiles, setSubmissionFiles] = useState([]);
  const [submissionNotes, setSubmissionNotes] = useState('');
  const [examState, setExamState] = useState({ timeLeftSec: 0, stream: null, error: '' });
  const [openExamWaitingDialog, setOpenExamWaitingDialog] = useState(false);
  const [examWaitingInfo, setExamWaitingInfo] = useState(null);
  const [waitingCountdown, setWaitingCountdown] = useState('');

  const formatCountdown = (target) => {
    if (!target) return '';
    const diff = Math.max(0, new Date(target) - new Date());
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  };

  const getExamPhase = (assignment) => {
    if (!assignment?.isExam) return null;
    const start = assignment.startAt ? new Date(assignment.startAt) : null;
    const end = assignment.endAt ? new Date(assignment.endAt) :
      (start && assignment.durationMinutes ? new Date(start.getTime() + assignment.durationMinutes * 60000) : null);
    if (!start || !end) return null;
    const now = new Date();
    if (now >= end) return 'ended';
    if (now >= start) return 'in_progress';
    return 'waiting';
  };

  const formatDate = (value) => {
    if (!value) return '---';
    try {
      return new Date(value).toLocaleDateString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    } catch {
      return value;
    }
  };

  const formatDateTime = (value) => {
    if (!value) return '---';
    try {
      return new Date(value).toLocaleString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return value;
    }
  };

  useEffect(() => {
    if (!openExamWaitingDialog || !examWaitingInfo?.startAt) {
      setWaitingCountdown('');
      return;
    }
    const updateCountdown = () => {
      setWaitingCountdown(formatCountdown(examWaitingInfo.startAt));
    };
    updateCountdown();
    const timer = setInterval(updateCountdown, 1000);
    return () => clearInterval(timer);
  }, [openExamWaitingDialog, examWaitingInfo]);

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
        const processedItems = (items || []).map(it => {
          const rawDeadline = it.dueDate ? new Date(it.dueDate) : null;
          const startAt = it.startTime || it.startAt || it.dueDate || null;
          const rawStart = startAt ? new Date(startAt) : null;
          const rawEnd = it.endTime
            ? new Date(it.endTime)
            : rawStart && it.durationMinutes
              ? new Date(rawStart.getTime() + it.durationMinutes * 60000)
              : rawDeadline;
          const isOverdue = it.isOverdue !== undefined
            ? it.isOverdue
            : (rawDeadline ? rawDeadline < new Date() : false);
          return {
            id: it.id,
            title: it.title,
            description: it.description || '',
            class: it.class || '',
            classId: it.classId,
            teacher: it.teacher || '',
            deadline: rawDeadline ? rawDeadline.toISOString() : '',
            isExam: !!it.isExam,
            durationMinutes: it.durationMinutes || null,
            requireMonitoring: !!it.requireMonitoring,
            startAt: rawStart ? rawStart.toISOString() : '',
            endAt: rawEnd ? rawEnd.toISOString() : '',
            attachments: it.attachments || [],
            mySubmission: it.mySubmission || { files: [], submittedAt: null, status: 'not_submitted' },
            status: it.status || 'not_submitted',
            grade: it.grade || null,
            comment: it.comment || '',
            createdAt: it.createdAt || new Date().toISOString(),
            isOverdue,
          };
        });

        setAssignments(processedItems);
      } catch (e) {
        setError(e?.message || 'Không thể tải danh sách bài tập');
      } finally {
        setLoading(false);
      }
    })();
    }, []);

  const attemptSubmitAssignment = (assignment) => {
    if (!assignment) return;
    if (assignment.isOverdue) {
      setError('Bài tập đã quá hạn, bạn không thể nộp nữa.');
      return;
    }
    setSelectedAssignment(assignment);
    setOpenSubmissionDialog(true);
  };

  const attemptEnterExam = (assignment) => {
    if (!assignment) return;
    
    // Kiểm tra xem đã nộp bài chưa
    if (assignment.mySubmission && assignment.mySubmission.status === 'submitted') {
      setError('Bạn đã nộp bài thi này rồi, không thể vào lại.');
      return;
    }
    
    const phase = getExamPhase(assignment);
    if (phase === 'ended') {
      setError('Kỳ thi này đã kết thúc, bạn không thể tham gia.');
      return;
    }
    if (phase === 'waiting') {
      setExamWaitingInfo(assignment);
      setOpenExamWaitingDialog(true);
      return;
    }
    navigate(`/student/exams/${assignment.id}`);
  };

  const triggerAssignmentAction = (assignment, { closeMenu = true } = {}) => {
    if (closeMenu) handleMenuClose();
    if (!assignment) return;
    if (assignment.isExam) {
      attemptEnterExam(assignment);
    } else {
      attemptSubmitAssignment(assignment);
    }
  };

  const handleSubmitAssignment = (assignment, options) => {
    triggerAssignmentAction(assignment, options);
  };

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
    if (assignment.isOverdue) return 'Quá hạn';
    return 'Chưa nộp';
  };

  const getDaysUntilDeadline = (deadline) => {
    if (!deadline) return 0;
    const today = new Date();
    const deadlineDate = new Date(deadline);
    const diffTime = deadlineDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  // Kiểm tra assignment có đang diễn ra hay hết hạn
  const isAssignmentOngoing = (assignment) => {
    if (!assignment) return false;
    const now = new Date();
    
    // Đối với bài thi, kiểm tra endAt
    if (assignment.isExam && assignment.endAt) {
      return new Date(assignment.endAt) >= now;
    }
    
    // Đối với bài tập thường, kiểm tra deadline
    if (assignment.deadline) {
      return new Date(assignment.deadline) >= now;
    }
    
    return true; // Mặc định là đang diễn ra nếu không có thông tin
  };

  // Filter function để lọc theo trạng thái
  const filterByStatus = (assignment) => {
    if (statusFilter === 'all') return true;
    const isOngoing = isAssignmentOngoing(assignment);
    return statusFilter === 'ongoing' ? isOngoing : !isOngoing;
  };

  // Reset page khi filter thay đổi
  useEffect(() => {
    setPage(1);
  }, [courseFilter, statusFilter, tabValue]);

  // Hàm xử lý thay đổi trang
  const handlePageChange = (event, value) => {
    setPage(value);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

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
          <Grid item xs={12} md={6}>
            <FormControl fullWidth>
              <InputLabel>Lọc theo Trạng thái</InputLabel>
              <Select
                value={statusFilter}
                label="Lọc theo Trạng thái"
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <MenuItem value="all">Tất cả</MenuItem>
                <MenuItem value="ongoing">Đang diễn ra</MenuItem>
                <MenuItem value="expired">Hết hạn</MenuItem>
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

      {tabValue === 0 && (() => {
        const filteredAssignments = assignments.filter(assignment => 
          assignment.classId && 
          (courseFilter === 'all' || String(assignment.classId) === String(courseFilter)) &&
          filterByStatus(assignment)
        );
        const totalPages = Math.ceil(filteredAssignments.length / itemsPerPage);
        const startIndex = (page - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        const paginatedAssignments = filteredAssignments.slice(startIndex, endIndex);

        return (
          <>
            <Grid container spacing={3}>
            {paginatedAssignments.map((assignment) => (
              <Grid item xs={12} md={6} key={assignment.id}>
              <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                <CardContent sx={{ flexGrow: 1, cursor: 'pointer' }} onClick={() => handleViewDetail(assignment)}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                    <Typography variant="h6" component="div">
                      {formatDescriptionWithTeacher(assignment.title)}
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

                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
                  <Chip
                    label={assignment.isExam ? 'Kỳ thi' : 'Bài tập'}
                    color={assignment.isExam ? 'error' : 'primary'}
                    size="small"
                  />
                  <Chip
                    label={getStatusText(assignment)}
                    color={getStatusColor(assignment.isOverdue ? 'overdue' : assignment.status)}
                    size="small"
                  />
                  <Chip
                    icon={<Schedule />}
                    label={`Hạn: ${formatDateTime(assignment.deadline)}`}
                    size="small"
                    color={assignment.isOverdue ? 'error' : (getDaysUntilDeadline(assignment.deadline) <= 1 ? 'warning' : 'default')}
                  />
                  {assignment.isExam && (
                    <>
                      {assignment.startAt && (
                        <Chip
                          label={`Bắt đầu: ${formatDateTime(assignment.startAt)}`}
                          size="small"
                          variant="outlined"
                        />
                      )}
                      {assignment.durationMinutes && (
                        <Chip
                          label={`Thời lượng: ${assignment.durationMinutes} phút`}
                          size="small"
                          variant="outlined"
                        />
                      )}
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
                      onClick={() => handleSubmitAssignment(assignment, { closeMenu: false })}
                      disabled={assignment.isExam ? (getExamPhase(assignment) === 'ended' || assignment.mySubmission?.status === 'submitted') : assignment.isOverdue}
                    >
                      {assignment.isExam
                        ? getExamPhase(assignment) === 'waiting'
                          ? 'Chờ thi'
                          : getExamPhase(assignment) === 'ended'
                            ? 'Đã kết thúc'
                            : 'Vào thi'
                        : assignment.isOverdue
                          ? 'Đã quá hạn'
                          : 'Nộp bài'}
                    </Button>
                  ) : (
                    <Button
                      size="small"
                      startIcon={<Visibility />}
                      onClick={() => {
                        setSelectedAssignment(assignment);
                        setOpenSubmissionDialog(true);
                      }}
                    >
                      Xem bài nộp
                    </Button>
                  )}
                </CardActions>
              </Card>
                </Grid>
                ))}
              {filteredAssignments.length === 0 && !loading && (
                <Grid item xs={12}>
                  <Typography variant="body1" color="text.secondary" align="center" sx={{ py: 4 }}>
                    {courseFilter === 'all' && statusFilter === 'all' 
                      ? 'Chưa có bài tập nào' 
                      : 'Không có bài tập nào phù hợp với bộ lọc'}
                  </Typography>
                </Grid>
              )}
            </Grid>
            {filteredAssignments.length > 0 && (
              <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4, mb: 2 }}>
                <Pagination 
                  count={totalPages} 
                  page={page} 
                  onChange={handlePageChange}
                  color="primary"
                  size="large"
                />
              </Box>
            )}
          </>
        );
      })()}

      {tabValue === 1 && (() => {
        const filteredAssignments = assignments.filter(a => 
          a.classId && 
          (courseFilter === 'all' || String(a.classId) === String(courseFilter)) && 
          a.mySubmission.status === 'not_submitted' && 
          new Date(a.deadline) >= new Date() &&
          filterByStatus(a)
        );
        const totalPages = Math.ceil(filteredAssignments.length / itemsPerPage);
        const startIndex = (page - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        const paginatedAssignments = filteredAssignments.slice(startIndex, endIndex);

        return (
          <>
            <Grid container spacing={3}>
            {paginatedAssignments.map((assignment) => (
            <Grid item xs={12} md={6} key={assignment.id}>
              <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                <CardContent sx={{ flexGrow: 1, cursor: 'pointer' }} onClick={() => handleViewDetail(assignment)}>
                  <Typography variant="h6" component="div" gutterBottom>
                    {formatDescriptionWithTeacher(assignment.title)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    {assignment.class} - {assignment.teacher}
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
                    onClick={(e) => { e.stopPropagation(); handleSubmitAssignment(assignment, { closeMenu: false }); }}
                  >
                    {assignment.isExam ? 'Vào thi' : 'Nộp bài ngay'}
                  </Button>
                </CardActions>
              </Card>
            </Grid>
            ))}
            </Grid>
            {filteredAssignments.length > 0 && (
              <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4, mb: 2 }}>
                <Pagination 
                  count={totalPages} 
                  page={page} 
                  onChange={handlePageChange}
                  color="primary"
                  size="large"
                />
              </Box>
            )}
          </>
        );
      })()}

      {tabValue === 2 && (() => {
        const filteredAssignments = assignments.filter(a => 
          a.classId && 
          (courseFilter === 'all' || String(a.classId) === String(courseFilter)) && 
          a.mySubmission.status === 'submitted' &&
          filterByStatus(a)
        );
        const totalPages = Math.ceil(filteredAssignments.length / itemsPerPage);
        const startIndex = (page - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        const paginatedAssignments = filteredAssignments.slice(startIndex, endIndex);

        return (
          <>
            <Grid container spacing={3}>
            {paginatedAssignments.map((assignment) => (
            <Grid item xs={12} md={6} key={assignment.id}>
              <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                <CardContent sx={{ flexGrow: 1, cursor: 'pointer' }} onClick={() => handleViewDetail(assignment)}>
                  <Typography variant="h6" component="div" gutterBottom>
                    {formatDescriptionWithTeacher(assignment.title)}
                  </Typography>
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
                      label="Đã nộp"
                      color="info"
                      size="small"
                    />
                  </Box>
                  <Typography variant="body2" color="text.secondary">
                    Nộp lúc: {formatDateTime(assignment.mySubmission.submittedAt)}
                  </Typography>
                </CardContent>
                <CardActions>
                  <Button
                    size="small"
                    startIcon={<Visibility />}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedAssignment(assignment);
                      setOpenSubmissionDialog(true);
                    }}
                  >
                    Xem bài nộp
                  </Button>
                </CardActions>
              </Card>
            </Grid>
            ))}
            </Grid>
            {filteredAssignments.length > 0 && (
              <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4, mb: 2 }}>
                <Pagination 
                  count={totalPages} 
                  page={page} 
                  onChange={handlePageChange}
                  color="primary"
                  size="large"
                />
              </Box>
            )}
          </>
        );
      })()}

      {tabValue === 3 && (() => {
        const filteredAssignments = assignments.filter(a => 
          a.classId && 
          (courseFilter === 'all' || String(a.classId) === String(courseFilter)) && 
          a.status === 'graded' &&
          filterByStatus(a)
        );
        const totalPages = Math.ceil(filteredAssignments.length / itemsPerPage);
        const startIndex = (page - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        const paginatedAssignments = filteredAssignments.slice(startIndex, endIndex);

        return (
          <>
            <Grid container spacing={3}>
            {paginatedAssignments.map((assignment) => (
            <Grid item xs={12} md={6} key={assignment.id}>
              <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                <CardContent sx={{ flexGrow: 1, cursor: 'pointer' }} onClick={() => handleViewDetail(assignment)}>
                  <Typography variant="h6" component="div" gutterBottom>
                    {formatDescriptionWithTeacher(assignment.title)}
                  </Typography>
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
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedAssignment(assignment);
                      setOpenSubmissionDialog(true);
                    }}
                  >
                    Xem chi tiết điểm
                  </Button>
                </CardActions>
              </Card>
            </Grid>
            ))}
            </Grid>
            {filteredAssignments.length > 0 && (
              <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4, mb: 2 }}>
                <Pagination 
                  count={totalPages} 
                  page={page} 
                  onChange={handlePageChange}
                  color="primary"
                  size="large"
                />
              </Box>
            )}
          </>
        );
      })()}

      {/* Context Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem
          disabled={
            !selectedItemForMenu ||
            (selectedItemForMenu?.isExam
              ? (getExamPhase(selectedItemForMenu) === 'ended' || selectedItemForMenu?.mySubmission?.status === 'submitted')
              : selectedItemForMenu?.isOverdue)
          }
          onClick={() => handleSubmitAssignment(selectedItemForMenu)}
        >
          <Upload sx={{ mr: 1 }} />
          Nộp bài
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
              
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Nộp lúc: {formatDateTime(selectedAssignment?.mySubmission.submittedAt)}
              </Typography>
              <Box sx={{ mt: 2 }}>
                <Typography variant="body2" gutterBottom>
                  File đã nộp:
                </Typography>
                {selectedAssignment?.mySubmission.files.map((file, index) => {
                  // Extract filename for display
                  let displayName = 'File';
                  if (file.includes('submission-')) {
                    const parts = file.split('-');
                    if (parts.length >= 4) {
                      const afterTimestamp = parts.slice(3).join('-');
                      displayName = afterTimestamp.split('/').pop().split('?')[0];
                    }
                  } else {
                    displayName = file.split('/').pop().split('?')[0];
                  }
                  
                  if (displayName.length > 30) {
                    const ext = displayName.split('.').pop();
                    displayName = displayName.substring(0, 20) + '...' + ext;
                  }

                  return (
                    <Chip
                      key={index}
                      icon={<Download />}
                      label={displayName}
                      title={file.split('/').pop()}
                      size="small"
                      sx={{ mr: 1, mb: 1 }}
                      clickable
                      onClick={(e) => {
                        e.stopPropagation();
                        
                        let fileUrl = file.trim();
                        
                        if (fileUrl.startsWith('http')) {
                          const ext = fileUrl.split('.').pop().toLowerCase().split('?')[0];
                          if (['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx'].includes(ext)) {
                            const viewerUrl = `https://docs.google.com/viewer?url=${encodeURIComponent(fileUrl)}&embedded=true`;
                            window.open(viewerUrl, '_blank', 'noopener,noreferrer');
                          } else {
                            window.open(fileUrl, '_blank', 'noopener,noreferrer');
                          }
                          return;
                        }
                        
                        // Fix local file path
                        let filePath = fileUrl.replace(/\/$/, '');
                        
                        if (!filePath.startsWith('/uploads/') && !filePath.startsWith('http')) {
                          filePath = filePath.replace(/^.*?(files-|file-|avatar-|attachments-|submission-)/, '$1');
                          filePath = `/uploads/${filePath}`;
                        }
                        
                        const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:4000';
                        const fullUrl = `${backendUrl}${filePath}`;
                        const ext = filePath.split('.').pop().toLowerCase();
                        
                        if (['pdf', 'jpg', 'jpeg', 'png', 'gif', 'webp', 'txt'].includes(ext)) {
                          window.open(fullUrl, '_blank', 'noopener,noreferrer');
                        } else if (['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx'].includes(ext)) {
                          const viewerUrl = `https://docs.google.com/viewer?url=${encodeURIComponent(fullUrl)}&embedded=true`;
                          window.open(viewerUrl, '_blank', 'noopener,noreferrer');
                        } else {
                          window.open(fullUrl, '_blank', 'noopener,noreferrer');
                        }
                      }}
                    />
                  );
                })}
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

      {/* Assignment Detail Dialog */}
      <Dialog
        open={openDetailDialog}
        onClose={() => setOpenDetailDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Chi tiết bài tập
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
                {formatDateTime(selectedAssignment?.deadline)}
              </Typography>
            </Grid>
            {selectedAssignment?.isExam && (
              <>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Thời gian bắt đầu:
                  </Typography>
                  <Typography variant="body2">
                    {formatDateTime(selectedAssignment?.startAt)}
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
                    label={selectedAssignment?.requireMonitoring ? 'Bắt buộc bật camera' : 'Không yêu cầu giám sát'}
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
                Nộp lúc: {formatDateTime(selectedAssignment.mySubmission.submittedAt)}
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {selectedAssignment.mySubmission.files.map((file, index) => {
                  // Extract filename
                  let displayName = 'File';
                  if (file.includes('submission-')) {
                    const parts = file.split('-');
                    if (parts.length >= 4) {
                      const afterTimestamp = parts.slice(3).join('-');
                      displayName = afterTimestamp.split('/').pop().split('?')[0];
                    }
                  } else {
                    displayName = file.split('/').pop().split('?')[0];
                  }
                  
                  if (displayName.length > 30) {
                    const ext = displayName.split('.').pop();
                    displayName = displayName.substring(0, 20) + '...' + ext;
                  }
                  
                  return (
                  <Chip
                    key={index}
                    icon={<Download />}
                    label={displayName}
                    title={file.split('/').pop()}
                    size="small"
                    variant="outlined"
                    onClick={() => {
                      let fileUrl = file.trim();
                      
                      if (fileUrl.startsWith('http')) {
                        const ext = fileUrl.split('.').pop().toLowerCase().split('?')[0];
                        if (['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx'].includes(ext)) {
                          const viewerUrl = `https://docs.google.com/viewer?url=${encodeURIComponent(fileUrl)}&embedded=true`;
                          window.open(viewerUrl, '_blank');
                        } else {
                          window.open(fileUrl, '_blank');
                        }
                        return;
                      }
                      
                      // Fix local file path - remove trailing slash and ensure /uploads/ prefix
                      let filePath = fileUrl.replace(/\/$/, '');
                      if (!filePath.startsWith('/uploads/') && !filePath.startsWith('http')) {
                        // Remove any leading path parts and ensure /uploads/ prefix
                        filePath = filePath.replace(/^.*?(files-|file-|avatar-|attachments-)/, '$1');
                        filePath = `/uploads/${filePath}`;
                      }
                      
                      const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:4000';
                      const fullUrl = `${backendUrl}${filePath}`;
                      const ext = filePath.split('.').pop().toLowerCase();
                      
                      if (['pdf', 'jpg', 'jpeg', 'png', 'gif', 'webp', 'txt'].includes(ext)) {
                        window.open(fullUrl, '_blank');
                      } else if (['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx'].includes(ext)) {
                        const viewerUrl = `https://docs.google.com/viewer?url=${encodeURIComponent(fullUrl)}&embedded=true`;
                        window.open(viewerUrl, '_blank');
                      } else {
                        window.open(fullUrl, '_blank');
                      }
                    }}
                    clickable
                  />
                  );
                })}
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
          {selectedAssignment?.mySubmission.status === 'not_submitted' && (
            (() => {
              const phase = getExamPhase(selectedAssignment);
              // Kiểm tra đã nộp bài chưa cho bài thi
              const hasSubmitted = selectedAssignment.mySubmission?.status === 'submitted';
              const canAttempt = selectedAssignment.isExam 
                ? (phase !== 'ended' && !hasSubmitted) 
                : !selectedAssignment.isOverdue;
              if (!canAttempt) return null;
              const label = selectedAssignment.isExam
                ? phase === 'waiting'
                  ? 'Chờ thi'
                  : phase === 'ended'
                    ? 'Đã kết thúc'
                    : 'Vào thi'
                : 'Nộp bài';
              return (
                <Button
                  variant="contained"
                  startIcon={<Upload />}
                  onClick={() => {
                    setOpenDetailDialog(false);
                    handleSubmitAssignment(selectedAssignment, { closeMenu: false });
                  }}
                >
                  {label}
                </Button>
              );
            })()
          )}
        </DialogActions>
      </Dialog>

      {/* Exam Waiting Dialog */}
      <Dialog
        open={openExamWaitingDialog}
        onClose={() => setOpenExamWaitingDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Chưa đến giờ thi</DialogTitle>
        <DialogContent>
          <Alert severity="info" sx={{ mb: 2 }}>
            Kỳ thi <strong>{examWaitingInfo?.title}</strong> chưa bắt đầu. Vui lòng chờ tới thời gian được phép.
          </Alert>
          <Typography variant="body1" gutterBottom>
            Thời gian bắt đầu: {formatDateTime(examWaitingInfo?.startAt)}
          </Typography>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Thời lượng: {examWaitingInfo?.durationMinutes || 0} phút
          </Typography>
          {waitingCountdown && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle2" color="text.secondary">
                Còn lại:
              </Typography>
              <Typography variant="h4" color="primary">
                {waitingCountdown}
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenExamWaitingDialog(false)}>Đóng</Button>
          <Button
            variant="contained"
            onClick={() => {
              setOpenExamWaitingDialog(false);
              attemptEnterExam(examWaitingInfo);
            }}
          >
            Thử lại
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default StudentAssignments;
