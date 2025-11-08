import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
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
Paper,
Menu,
MenuItem,
Tabs,
Tab,
Avatar,
  FormControl,
InputLabel,
Select,
LinearProgress,
List,
ListItem,
ListItemText,
ListItemIcon,
  Divider,
  Alert,
} from '@mui/material';
import {
Add,
MoreVert,
AttachFile,
Schedule,
People,
Grade,
Comment,
Edit,
Delete,
Visibility,
Download,
Send,
  FilterList,
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs from 'dayjs';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { api } from '../../../api/client';

const TeacherAssignments = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [tabValue, setTabValue] = useState(0);
  const [assignments, setAssignments] = useState([]);

  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [openSubmissionDialog, setOpenSubmissionDialog] = useState(false);
  const [openGradingDialog, setOpenGradingDialog] = useState(false);
  const [openCommentsDialog, setOpenCommentsDialog] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedItemForMenu, setSelectedItemForMenu] = useState(null);
  const [gradingData, setGradingData] = useState({ grade: '', comment: '' });
  const [filters, setFilters] = useState({ assignmentId: 'all', status: 'all', type: 'all', search: '' });
  const [courseFilter, setCourseFilter] = useState('all');
  const [assignmentFilter, setAssignmentFilter] = useState('all');
  const [classes, setClasses] = useState([]);
  const [newComment, setNewComment] = useState('');
  // Comments removed from assignments page as they're not relevant here
  const [newExam, setNewExam] = useState({ isExam: false, startAt: null, durationMinutes: 60, requireMonitoring: true });
  const [comments] = useState([]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError('');
      try {
        // Load assignments with filters
        const params = {};
        if (courseFilter !== 'all') params.courseId = courseFilter;
        if (assignmentFilter !== 'all') params.assignmentName = assignmentFilter;
        params.sort = 'created_at:asc'; // Sort by oldest first (left to right, top to bottom)

        const list = await api.teacherAssignmentsList(params);
        // Sort assignments by creation date (oldest first) to ensure correct order
        const sortedAssignments = list.map(a => ({
          id: a.id,
          title: a.title,
          description: a.description,
          dueDate: a.dueDate || '',
          deadline: a.dueDate ? new Date(a.dueDate).toISOString().slice(0,10) : '',
          status: a.status,
          class: a.className,
          classCode: a.classCode,
          classId: a.classId,
          submittedStudents: a.submittedStudents,
          gradedStudents: a.gradedStudents,
          totalStudents: a.totalStudents,
          isExam: a.isExam,
          durationMinutes: a.durationMinutes,
          attachments: [],
          createdAt: a.createdAt || new Date().toISOString(),
        })).sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

        setAssignments(sortedAssignments);

        // Load classes for filter
        const classesList = await api.teacherClasses();
        setClasses(classesList);

        // Check if there's an assignmentId in URL params (coming from class detail page)
        const assignmentId = searchParams.get('assignmentId');
        const isEditMode = searchParams.get('edit') === 'true';

        if (assignmentId) {
          const assignment = list.find(a => String(a.id) === assignmentId);
          if (assignment) {
            if (isEditMode) {
              // Edit mode: open edit dialog
              handleEditAssignment(assignment);
            } else {
              // View submissions mode: show submissions
              await handleViewSubmissions({
                id: assignment.id,
                title: assignment.title
              });
              // Switch to grading tab
              setTabValue(1);
              // Set filter to show only this assignment
              setFilters(prev => ({ ...prev, assignmentId: assignmentId }));
            }
          }
        }
      } catch (e) {
        setError(e?.message || 'Không thể tải danh sách bài tập');
      } finally {
        setLoading(false);
      }
    })();
    }, [searchParams, courseFilter, assignmentFilter]);

  const loadSubmissionsForGrading = useCallback(async () => {
    try {
      if (filters.assignmentId === 'all') {
        // Load submissions for all assignments
        const allSubmissions = [];
        for (const assignment of assignments) {
          try {
            const list = await api.teacherSubmissions(assignment.id);
            const submissions = list.map(s => ({
              id: s.id,
              assignmentId: assignment.id,
              assignmentTitle: assignment.title,
              isExam: false,
              studentName: s.studentName,
              studentId: s.studentId,
              submittedAt: s.submittedAt ? new Date(s.submittedAt).toISOString() : '',
              attachments: s.files || [],
              grade: s.score,
              comment: s.notes || '',
              status: s.score != null ? 'graded' : 'submitted'
            }));
            allSubmissions.push(...submissions);
          } catch (e) {
            console.error(`Error loading submissions for assignment ${assignment.id}:`, e);
          }
        }
        setSubmissions(allSubmissions);
      } else {
        // Load submissions for specific assignment
        const assignment = assignments.find(a => String(a.id) === filters.assignmentId);
        if (assignment) {
          const list = await api.teacherSubmissions(assignment.id);
          setSubmissions(list.map(s => ({
            id: s.id,
            assignmentId: assignment.id,
            assignmentTitle: assignment.title,
            isExam: false,
            studentName: s.studentName,
            studentId: s.studentId,
            submittedAt: s.submittedAt ? new Date(s.submittedAt).toISOString() : '',
            attachments: s.files || [],
            grade: s.score,
            comment: s.notes || '',
            status: s.score != null ? 'graded' : 'submitted'
          })));
        }
      }
    } catch (e) {
      console.error('Error loading submissions:', e);
      setError('Không thể tải danh sách bài nộp');
    }
  }, [assignments, filters.assignmentId]);

  // Load submissions when tab changes to grading tab
  useEffect(() => {
    if (tabValue === 1 && assignments.length > 0) {
      loadSubmissionsForGrading();
    }
  }, [tabValue, assignments.length, loadSubmissionsForGrading]);

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

  const handleAssignmentClick = (assignment) => {
    // Chuyển đến trang chi tiết bài tập
    navigate(`/teacher/assignments/${assignment.id}`);
  };

  const handleViewSubmissions = async (assignment) => {
    setSelectedAssignment(assignment);
    try {
      const list = await api.teacherSubmissions(assignment.id);
      setSubmissions(list.map(s => ({ id: s.id, assignmentId: assignment.id, assignmentTitle: assignment.title, isExam: false, studentName: s.studentName, studentId: s.studentId, submittedAt: s.submittedAt ? new Date(s.submittedAt).toISOString() : '', attachments: s.files || [], grade: s.score, comment: s.notes || '', status: s.score != null ? 'graded' : 'submitted' })));
    } catch {}
    setOpenSubmissionDialog(true);
    handleMenuClose();
  };

  const handleGradeSubmission = (submission) => {
    setSelectedItemForMenu(submission);
    setGradingData({ grade: submission.grade !== undefined && submission.grade !== null ? submission.grade : '', comment: submission.comment || '' });
    setOpenGradingDialog(true);
    // Don't call handleMenuClose() here as it resets selectedItemForMenu to null
    setAnchorEl(null); // Just close the menu without resetting selectedItemForMenu
  };

  const handleGradingSubmit = async () => {
    if (!selectedItemForMenu) return;

    try {
      const score = Number(gradingData.grade || 0);
      const notes = gradingData.comment || '';

      await api.teacherGradeSubmission(selectedItemForMenu.id, { score, notes });

      // Update local state
      setSubmissions(prev => prev.map(s =>
        s.id === selectedItemForMenu.id
          ? { ...s, grade: score, comment: notes, status: 'graded' }
          : s
      ));

      setOpenGradingDialog(false);
      setGradingData({ grade: '', comment: '' });
      setSelectedItemForMenu(null);
    } catch (e) {
      console.error('Error grading submission:', e);
      setError(e?.message || 'Không thể chấm điểm bài nộp');
    }
  };

  const handleCreateAssignment = () => {
    setOpenDialog(true);
  };

  const [createForm, setCreateForm] = useState({ classId: '', title: '', description: '', dueDate: '', isExam: false, durationMinutes: 60 });
  const [creating, setCreating] = useState(false);

  // Edit assignment state
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [editForm, setEditForm] = useState({ id: '', classId: '', title: '', description: '', dueDate: '', isExam: false, durationMinutes: 60 });
  const [editing, setEditing] = useState(false);

  const submitCreate = async () => {
    if (!createForm.classId || !createForm.title || !createForm.dueDate) return;
    try {
      setCreating(true);
      await api.teacherCreateAssignment({
        classId: createForm.classId,
        title: createForm.title,
        description: createForm.description,
        dueDate: createForm.dueDate,
        isExam: createForm.isExam,
        durationMinutes: createForm.isExam ? Number(createForm.durationMinutes || 60) : null,
      });
      const list = await api.teacherAssignmentsList();
      setAssignments(list.map(a => ({
        id: a.id,
        title: a.title,
        description: a.description,
        dueDate: a.dueDate || '',
        deadline: a.dueDate ? new Date(a.dueDate).toISOString().slice(0,10) : '',
        status: a.status,
        class: a.className,
        classCode: a.classCode,
        classId: a.classId,
        submittedStudents: a.submittedStudents,
        gradedStudents: a.gradedStudents,
        totalStudents: a.totalStudents,
        isExam: a.isExam,
        durationMinutes: a.durationMinutes,
        attachments: []
      })));
      setOpenDialog(false);
      setCreateForm({ classId: '', title: '', description: '', dueDate: '', isExam: false, durationMinutes: 60 });
    } catch (e) {
      setError(e?.message || 'Không thể tạo bài tập');
    } finally {
      setCreating(false);
    }
  };

  const handleEditAssignment = (assignment) => {
    // Find the assignment details to pre-populate the form
    const fullAssignment = assignments.find(a => a.id === assignment.id);
    if (fullAssignment) {
      setEditForm({
        id: fullAssignment.id,
        classId: fullAssignment.classId || '',
        title: fullAssignment.title || '',
        description: fullAssignment.description || '',
        dueDate: fullAssignment.dueDate || '',
        isExam: fullAssignment.isExam || false,
        durationMinutes: fullAssignment.durationMinutes || 60
      });
      setOpenEditDialog(true);
    }
    handleMenuClose();
  };

  const handleDeleteAssignment = async (assignment) => {
    if (!window.confirm(`Bạn có chắc chắn muốn xóa bài tập "${assignment.title}"? Hành động này không thể hoàn tác.`)) {
      return;
    }

    try {
      await api.teacherDeleteAssignment(assignment.id);

      // Update local state
      setAssignments(prev => prev.filter(a => a.id !== assignment.id));

      handleMenuClose();
    } catch (e) {
      setError(e?.message || 'Không thể xóa bài tập');
    }
  };

  const submitEdit = async () => {
    if (!editForm.id || !editForm.title) return;
    try {
      setEditing(true);
      await api.teacherUpdateAssignment(editForm.id, {
        title: editForm.title,
        description: editForm.description,
        dueDate: editForm.dueDate,
        isExam: editForm.isExam,
        durationMinutes: editForm.isExam ? Number(editForm.durationMinutes || 60) : null
      });

      // Update local state
      setAssignments(prev => prev.map(a =>
        a.id === editForm.id
          ? { ...a, title: editForm.title, description: editForm.description, dueDate: editForm.dueDate, deadline: editForm.dueDate ? new Date(editForm.dueDate).toISOString().slice(0,10) : '', isExam: editForm.isExam, durationMinutes: editForm.durationMinutes }
          : a
      ));

      setOpenEditDialog(false);
      setEditForm({ id: '', classId: '', title: '', description: '', dueDate: '', isExam: false, durationMinutes: 60 });
    } catch (e) {
      setError(e?.message || 'Không thể cập nhật bài tập');
    } finally {
      setEditing(false);
    }
  };

  const exportGradesCsv = () => {
    if (!selectedAssignment) return;
    const rows = submissions
      .filter(s => s.assignmentId === selectedAssignment.id)
      .map(s => ({
        studentId: s.studentId,
        studentName: s.studentName,
        grade: s.grade ?? '',
        status: s.status,
      }));
    const header = 'studentId,studentName,grade,status\n';
    const body = rows.map(r => `${r.studentId},"${r.studentName}",${r.grade},${r.status}`).join('\n');
    const csv = header + body;
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `grades_${selectedAssignment.id}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleOpenComments = (assignment) => {
    setSelectedAssignment(assignment);
    setOpenCommentsDialog(true);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'success';
      case 'draft': return 'default';
      case 'closed': return 'error';
      default: return 'default';
    }
  };

  const getSubmissionStatusColor = (status) => {
    switch (status) {
      case 'graded': return 'success';
      case 'submitted': return 'warning';
      case 'late': return 'error';
      default: return 'default';
    }
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <Box>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h4" gutterBottom>
            Quản lý bài tập
          </Typography>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={handleCreateAssignment}
          >
            Tạo bài tập mới
          </Button>
        </Box>

        {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
        {error}
        </Alert>
        )}

        {/* Filters */}
        <Paper sx={{ p: 2, mb: 3 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>
            <FilterList sx={{ mr: 1, verticalAlign: 'middle' }} />
            Bộ lọc
        </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} md={4}>
              <FormControl fullWidth>
                <InputLabel>Lọc theo Lớp học</InputLabel>
                <Select
                  value={courseFilter}
                  label="Lọc theo Lớp học"
                  onChange={(e) => {
                    setCourseFilter(e.target.value);
                    setAssignmentFilter('all'); // Reset assignment filter when course changes
                  }}
                >
                  <MenuItem value="all">Tất cả lớp học</MenuItem>
                  {classes.map((cls) => (
                    <MenuItem key={cls.id} value={cls.id}>
                      {cls.name} ({cls.code})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={4}>
              <FormControl fullWidth>
                <InputLabel>Lọc theo Bài tập</InputLabel>
                <Select
                  value={assignmentFilter}
                  label="Lọc theo Bài tập"
                  onChange={(e) => setAssignmentFilter(e.target.value)}
                >
                  <MenuItem value="all">Tất cả bài tập</MenuItem>
                  {assignments
                    .filter(a => courseFilter === 'all' || a.classId === courseFilter)
                    .map((assignment) => (
                      <MenuItem key={assignment.id} value={assignment.id}>
                        {assignment.title}
                      </MenuItem>
                    ))}
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </Paper>

        <Paper sx={{ mb: 3 }}>
        <Tabs value={tabValue} onChange={handleTabChange}>
        <Tab label="Danh sách bài tập" />
        <Tab label="Chấm điểm" />
        <Tab label="Thống kê" />
        </Tabs>
        </Paper>

        {tabValue === 0 && (
          <Grid container spacing={3}>
            {assignments
              .filter(assignment =>
                (courseFilter === 'all' || assignment.classId === courseFilter) &&
                (assignmentFilter === 'all' || assignment.id === assignmentFilter)
              )
              .sort((a, b) => new Date(b.dueDate || b.createdAt) - new Date(a.dueDate || a.createdAt))
              .map((assignment) => (
              <Grid item xs={12} md={6} key={assignment.id}>
                <Card 
                  sx={{ 
                    height: '100%', 
                    display: 'flex', 
                    flexDirection: 'column',
                    cursor: 'pointer',
                    '&:hover': {
                      boxShadow: 3,
                      transform: 'translateY(-2px)',
                      transition: 'all 0.2s ease-in-out'
                    }
                  }}
                  onClick={() => handleAssignmentClick(assignment)}
                >
                  <CardContent sx={{ flexGrow: 1 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                      <Typography variant="h6" component="div" sx={{ color: 'primary.main' }}>
                        {assignment.title}
                      </Typography>
                      <IconButton
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation(); // Ngăn click event bubble up
                          handleMenuClick(e, assignment, 'assignment');
                        }}
                      >
                        <MoreVert />
                      </IconButton>
                    </Box>

                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      {assignment.class}
                    </Typography>

                    <Typography variant="body2" sx={{ mb: 2 }}>
                      {assignment.description}
                    </Typography>

                    <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                      <Chip
                        label={assignment.status}
                        color={getStatusColor(assignment.status)}
                        size="small"
                      />
                      {assignment.isExam && (
                        <Chip label="Kỳ thi" color="error" size="small" />
                      )}
                      <Chip
                        icon={<Schedule />}
                        label={`Hạn: ${assignment.deadline}`}
                        size="small"
                        color="warning"
                      />
                    </Box>

                    <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                      <Chip
                        icon={<People />}
                        label={`${assignment.submittedStudents}/${assignment.totalStudents} đã nộp`}
                        size="small"
                      />
                      <Chip
                        icon={<Grade />}
                        label={`${assignment.gradedStudents} đã chấm`}
                        size="small"
                        color="success"
                      />
                    </Box>

                    <LinearProgress
                      variant="determinate"
                      value={assignment.totalStudents ? (assignment.submittedStudents / assignment.totalStudents) * 100 : 0}
                      sx={{ mb: 1 }}
                    />
                    <Typography variant="caption" color="text.secondary">
                      Tỷ lệ nộp bài: {assignment.totalStudents ? Math.round((assignment.submittedStudents / assignment.totalStudents) * 100) : 0}%
                    </Typography>

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
                    <Button
                      size="small"
                      startIcon={<Visibility />}
                      onClick={(e) => { e.stopPropagation(); handleViewSubmissions(assignment); }}
                    >
                      Xem bài nộp
                    </Button>
                  <Button size="small" startIcon={<Comment />} onClick={(e) => { e.stopPropagation(); handleOpenComments(assignment); }}>
                      Bình luận
                    </Button>
                  </CardActions>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}

        {tabValue === 1 && (
          <Paper sx={{ p: 2 }}>
            {/* Filters */}
            <Box sx={{ mb: 2, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              <TextField
                select
                label="Bài tập"
                value={filters.assignmentId}
                onChange={(e) => setFilters(prev => ({ ...prev, assignmentId: e.target.value }))}
                sx={{ minWidth: 220 }}
                SelectProps={{ native: true }}
              >
                <option value="all">Tất cả</option>
                {assignments.map(a => (
                  <option key={a.id} value={String(a.id)}>{a.title}</option>
                ))}
              </TextField>
              <TextField
                select
                label="Loại"
                value={filters.type}
                onChange={(e) => setFilters(prev => ({ ...prev, type: e.target.value }))}
                sx={{ minWidth: 160 }}
                SelectProps={{ native: true }}
              >
                <option value="all">Tất cả</option>
                <option value="assignment">Bài tập</option>
                <option value="exam">Kỳ thi</option>
              </TextField>
              <TextField
                select
                label="Trạng thái"
                value={filters.status}
                onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                sx={{ minWidth: 180 }}
                SelectProps={{ native: true }}
              >
                <option value="all">Tất cả</option>
                <option value="submitted">Chờ chấm</option>
                <option value="graded">Đã chấm</option>
              </TextField>
              <TextField
                label="Tìm kiếm (tên/MSSV)"
                value={filters.search}
                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                sx={{ minWidth: 240 }}
              />
            </Box>
            <Typography variant="h6" gutterBottom>
              Chấm điểm bài tập
            </Typography>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Bài tập</TableCell>
                    <TableCell>Loại</TableCell>
                    <TableCell>Sinh viên</TableCell>
                    <TableCell>Thời gian nộp</TableCell>
                    <TableCell>File đính kèm</TableCell>
                    <TableCell>Điểm</TableCell>
                    <TableCell>Trạng thái</TableCell>
                    <TableCell>Hành động</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {submissions
                    .filter(s => filters.assignmentId === 'all' || String(s.assignmentId) === filters.assignmentId)
                    .filter(s => filters.type === 'all' || (filters.type === 'exam' ? s.isExam : !s.isExam))
                    .filter(s => filters.status === 'all' || s.status === filters.status)
                    .filter(s => {
                      const q = filters.search.trim().toLowerCase();
                      if (!q) return true;
                      return s.studentName.toLowerCase().includes(q) || s.studentId.toLowerCase().includes(q);
                    })
                    .map((submission) => (
                    <TableRow key={submission.id}>
                      <TableCell>
                        <Typography variant="body2" color="text.secondary">
                          {submission.assignmentTitle}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip label={submission.isExam ? 'Kỳ thi' : 'Bài tập'} size="small" color={submission.isExam ? 'error' : 'default'} />
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <Avatar sx={{ mr: 2, width: 32, height: 32 }}>
                            {submission.studentName.charAt(0)}
                          </Avatar>
                          <Box>
                            <Typography variant="body2">{submission.studentName}</Typography>
                            <Typography variant="caption" color="text.secondary">
                              {submission.studentId}
                            </Typography>
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell>{submission.submittedAt}</TableCell>
                      <TableCell>
                      {submission.attachments && submission.attachments.length > 0 ? (
                      submission.attachments.map((file, index) => (
                      <Chip
                        key={index}
                        icon={<Download />}
                        label={file.split('/').pop()} // Show filename only
                        size="small"
                          sx={{ mr: 1, mb: 0.5 }}
                            onClick={() => {
                            // Open file in new tab - use backend URL
                            const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:4000';
                              window.open(`${backendUrl}${file}`, '_blank');
                               }}
                               clickable
                             />
                           ))
                         ) : (
                           <Typography variant="body2" color="text.secondary">
                             Không có file
                           </Typography>
                         )}
                       </TableCell>
                      <TableCell>
                        {submission.grade ? (
                          <Typography variant="body2" color="primary.main">
                            {submission.grade}/10
                          </Typography>
                        ) : (
                          <Typography variant="body2" color="text.secondary">
                            Chưa chấm
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={submission.status === 'graded' ? 'Đã chấm' : 'Chờ chấm'}
                          color={getSubmissionStatusColor(submission.status)}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                         <Button
                         size="small"
                         startIcon={<Grade />}
                         onClick={() => handleGradeSubmission(submission)}
                         >
                           Chấm điểm
                         </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        )}

        {tabValue === 2 && (
          <Box>
            <Typography variant="h6" gutterBottom>
              Thống kê bài tập
            </Typography>

            {/* Apply same filters as list view */}
            <Paper sx={{ p: 2, mb: 3 }}>
              <Typography variant="subtitle1" sx={{ mb: 2 }}>
                Áp dụng bộ lọc
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} md={4}>
                  <FormControl fullWidth>
                    <InputLabel>Chọn Lớp học</InputLabel>
                    <Select
                      value={courseFilter}
                      label="Chọn Lớp học"
                      onChange={(e) => {
                        setCourseFilter(e.target.value);
                        setAssignmentFilter('all');
                      }}
                    >
                      <MenuItem value="all">Tất cả lớp học</MenuItem>
                      {classes.map((cls) => (
                        <MenuItem key={cls.id} value={cls.id}>
                          {cls.name} ({cls.code})
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} md={4}>
                  <FormControl fullWidth>
                    <InputLabel>Chọn Bài tập</InputLabel>
                    <Select
                      value={assignmentFilter}
                      label="Chọn Bài tập"
                      onChange={(e) => setAssignmentFilter(e.target.value)}
                    >
                      <MenuItem value="all">Tất cả bài tập</MenuItem>
                      {assignments
                        .filter(a => courseFilter === 'all' || a.classId === courseFilter)
                        .map((assignment) => (
                          <MenuItem key={assignment.id} value={assignment.id}>
                            {assignment.title}
                          </MenuItem>
                        ))}
                    </Select>
                  </FormControl>
                </Grid>
              </Grid>
            </Paper>

            {/* Statistics Charts */}
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Paper sx={{ p: 2 }}>
                  <Typography variant="h6" gutterBottom>
                    Tỷ lệ sinh viên chưa nộp bài
                  </Typography>
                  <Box sx={{ height: 300 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={[
                            {
                              name: 'Đã nộp',
                              value: assignments
                                .filter(a =>
                                  (courseFilter === 'all' || a.classId === courseFilter) &&
                                  (assignmentFilter === 'all' || a.id === assignmentFilter)
                                )
                                .reduce((sum, a) => sum + a.submittedStudents, 0)
                            },
                            {
                              name: 'Chưa nộp',
                              value: assignments
                                .filter(a =>
                                  (courseFilter === 'all' || a.classId === courseFilter) &&
                                  (assignmentFilter === 'all' || a.id === assignmentFilter)
                                )
                                .reduce((sum, a) => sum + (a.totalStudents - a.submittedStudents), 0)
                            }
                          ]}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={100}
                          paddingAngle={5}
                          dataKey="value"
                          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        >
                          <Cell fill="#4caf50" />
                          <Cell fill="#f44336" />
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </Box>
                </Paper>
              </Grid>

              <Grid item xs={12} md={6}>
                <Paper sx={{ p: 2 }}>
                  <Typography variant="h6" gutterBottom>
                    Thống kê tổng quan
                  </Typography>
                  <Box sx={{ p: 2 }}>
                    {(() => {
                      const filteredAssignments = assignments.filter(a =>
                        (courseFilter === 'all' || a.classId === courseFilter) &&
                        (assignmentFilter === 'all' || a.id === assignmentFilter)
                      );

                      const totalAssignments = filteredAssignments.length;
                      const totalStudents = filteredAssignments.reduce((sum, a) => sum + a.totalStudents, 0);
                      const totalSubmitted = filteredAssignments.reduce((sum, a) => sum + a.submittedStudents, 0);
                      const totalGraded = filteredAssignments.reduce((sum, a) => sum + a.gradedStudents, 0);

                      return (
                        <Grid container spacing={2}>
                          <Grid item xs={6}>
                            <Typography variant="body2" color="text.secondary">Tổng bài tập</Typography>
                            <Typography variant="h4" color="primary">{totalAssignments}</Typography>
                          </Grid>
                          <Grid item xs={6}>
                            <Typography variant="body2" color="text.secondary">Tổng sinh viên</Typography>
                            <Typography variant="h4" color="secondary">{totalStudents}</Typography>
                          </Grid>
                          <Grid item xs={6}>
                            <Typography variant="body2" color="text.secondary">Đã nộp</Typography>
                            <Typography variant="h4" sx={{ color: '#4caf50' }}>{totalSubmitted}</Typography>
                          </Grid>
                          <Grid item xs={6}>
                            <Typography variant="body2" color="text.secondary">Đã chấm</Typography>
                            <Typography variant="h4" sx={{ color: '#2196f3' }}>{totalGraded}</Typography>
                          </Grid>
                        </Grid>
                      );
                    })()}
                  </Box>
                </Paper>
              </Grid>
            </Grid>
          </Box>
        )}

        {/* Context Menu */}
        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={handleMenuClose}
        >
          {selectedItemForMenu?.type === 'assignment' && (
            <>
              <MenuItem onClick={() => handleViewSubmissions(selectedItemForMenu)}>
                <Visibility sx={{ mr: 1 }} />
                Xem bài nộp
              </MenuItem>
              <MenuItem onClick={() => handleEditAssignment(selectedItemForMenu)}>
                <Edit sx={{ mr: 1 }} />
                Chỉnh sửa
              </MenuItem>
              <MenuItem sx={{ color: 'error.main' }} onClick={() => handleDeleteAssignment(selectedItemForMenu)}>
                <Delete sx={{ mr: 1 }} />
                Xóa
              </MenuItem>
            </>
          )}
          {selectedItemForMenu?.type === 'submission' && (
            <MenuItem onClick={() => handleGradeSubmission(selectedItemForMenu)}>
              <Grade sx={{ mr: 1 }} />
              Chấm điểm
            </MenuItem>
          )}
        </Menu>

        {/* Submissions Dialog */}
        <Dialog
          open={openSubmissionDialog}
          onClose={() => setOpenSubmissionDialog(false)}
          maxWidth="lg"
          fullWidth
        >
          <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box> 
              Bài nộp - {selectedAssignment?.title}
            </Box>
            <Button variant="outlined" startIcon={<Download />} onClick={exportGradesCsv}>
              Xuất điểm (CSV)
            </Button>
          </DialogTitle>
          <DialogContent>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Sinh viên</TableCell>
                    <TableCell>Thời gian nộp</TableCell>
                    <TableCell>File đính kèm</TableCell>
                    <TableCell>Điểm</TableCell>
                    <TableCell>Trạng thái</TableCell>
                    <TableCell>Hành động</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {submissions.filter(s => s.assignmentId === (selectedAssignment?.id ?? -1)).map((submission) => (
                    <TableRow key={submission.id}>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <Avatar sx={{ mr: 2, width: 32, height: 32 }}>
                            {submission.studentName.charAt(0)}
                          </Avatar>
                          <Box>
                            <Typography variant="body2">{submission.studentName}</Typography>
                            <Typography variant="caption" color="text.secondary">
                              {submission.studentId}
                            </Typography>
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell>{submission.submittedAt}</TableCell>
                      <TableCell>
                        {submission.attachments.map((file, index) => (
                          <Chip
                            key={index}
                            icon={<Download />}
                            label={file}
                            size="small"
                            sx={{ mr: 1 }}
                          />
                        ))}
                      </TableCell>
                      <TableCell>
                        {submission.grade ? (
                          <Typography variant="body2" color="primary.main">
                            {submission.grade}/10
                          </Typography>
                        ) : (
                          <Typography variant="body2" color="text.secondary">
                            Chưa chấm
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={submission.status === 'graded' ? 'Đã chấm' : 'Chờ chấm'}
                          color={getSubmissionStatusColor(submission.status)}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <Button
                          size="small"
                          startIcon={<Grade />}
                          onClick={() => handleGradeSubmission(submission)}
                        >
                          Chấm điểm
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenSubmissionDialog(false)}>
              Đóng
            </Button>
          </DialogActions>
        </Dialog>

        {/* Assignment Comments Dialog */}
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
            {comments.filter(c => selectedAssignment && c.assignmentId === selectedAssignment.id).length > 0 ? (
              <List>
                {comments.filter(c => selectedAssignment && c.assignmentId === selectedAssignment.id).map((c) => (
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
                          <Chip size="small" label={c.authorType === 'teacher' ? 'Giảng viên' : 'Sinh viên'} color={c.authorType === 'teacher' ? 'primary' : 'default'} />
                          <Typography variant="caption" color="text.secondary">{c.timestamp}</Typography>
                        </Box>
                      }
                      secondary={<Typography variant="body2" sx={{ mt: 1 }}>{c.content}</Typography>}
                    />
                  </ListItem>
                ))}
              </List>
            ) : (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <Typography variant="body2" color="text.secondary">Chưa có bình luận nào</Typography>
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
                onClick={() => setNewComment('')}
                disabled={!newComment.trim()}
              >
                Gửi
              </Button>
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenCommentsDialog(false)}>Đóng</Button>
          </DialogActions>
        </Dialog>
        {/* Grading Dialog */}
        <Dialog
          open={openGradingDialog}
          onClose={() => setOpenGradingDialog(false)}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>
            Chấm điểm {selectedItemForMenu?.isExam ? '(Kỳ thi)' : ''} - {selectedItemForMenu?.studentName}
          </DialogTitle>
          <DialogContent>
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Điểm số (0-10):
              </Typography>
              <TextField
                type="number"
                inputProps={{ min: 0, max: 10, step: 0.5 }}
                value={gradingData.grade || ''}
                onChange={(e) => {
                  const value = parseFloat(e.target.value) || 0;
                  setGradingData(prev => ({ ...prev, grade: value }));
                }}
                fullWidth
                variant="outlined"
              />
              <Typography variant="body2" sx={{ mt: 1 }}>
                Điểm: {Number(gradingData.grade) || 0}/10
              </Typography>
            </Box>
            <TextField
              autoFocus
              margin="dense"
              label="Nhận xét"
              fullWidth
              multiline
              rows={4}
              variant="outlined"
              value={gradingData.comment}
              onChange={(e) => setGradingData(prev => ({ ...prev, comment: e.target.value }))}
              placeholder="Nhập nhận xét cho sinh viên..."
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenGradingDialog(false)}>
              Hủy
            </Button>
            <Button
              onClick={handleGradingSubmit}
              variant="contained"
              disabled={gradingData.grade === undefined || gradingData.grade === null || gradingData.grade === ''}
            >
              Lưu điểm
            </Button>
          </DialogActions>
        </Dialog>

        {/* Create Assignment Dialog */}
        <Dialog
          open={openDialog}
          onClose={() => setOpenDialog(false)}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle>Tạo bài tập mới</DialogTitle>
          <DialogContent>
            <TextField
              autoFocus
              margin="dense"
              label="Tiêu đề bài tập"
              fullWidth
              variant="outlined"
              value={createForm.title}
              onChange={(e) => setCreateForm(prev => ({ ...prev, title: e.target.value }))}
            />
            <TextField
              margin="dense"
              label="Lớp học"
              fullWidth
              variant="outlined"
              select
              value={createForm.classId}
              onChange={(e) => setCreateForm(prev => ({ ...prev, classId: e.target.value }))}
              SelectProps={{ native: true }}
            >
              <option value="">Chọn lớp học</option>
              {/* Gợi ý: có thể fetch /api/teacher/classes để đổ options */}
            </TextField>
            <TextField
              margin="dense"
              label="Mô tả bài tập"
              fullWidth
              multiline
              rows={4}
              variant="outlined"
              value={createForm.description}
              onChange={(e) => setCreateForm(prev => ({ ...prev, description: e.target.value }))}
            />
            <DatePicker
              label="Deadline"
              slotProps={{
                textField: {
                  fullWidth: true,
                  sx: { mt: 2 }
                }
              }}
              value={createForm.dueDate ? dayjs(createForm.dueDate) : null}
              onChange={(v) => setCreateForm(prev => ({ ...prev, dueDate: v ? v.toISOString() : '' }))}
            />
            <TextField
              margin="dense"
              label="File đính kèm"
              fullWidth
              variant="outlined"
              InputProps={{
                endAdornment: <Button startIcon={<AttachFile />}>Chọn file</Button>
              }}
            />

            <Box sx={{ mt: 3 }}>
              <Typography variant="subtitle1" gutterBottom>
                Cấu hình kỳ thi (tùy chọn)
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Chip
                    label={createForm.isExam ? 'Kỳ thi: Bật' : 'Kỳ thi: Tắt'}
                    color={createForm.isExam ? 'error' : 'default'}
                    onClick={() => setCreateForm(prev => ({ ...prev, isExam: !prev.isExam }))}
                    clickable
                  />
                  {createForm.isExam && (
                    <Chip
                      label={'Giám sát: Tùy chọn'}
                      color={'warning'}
                      onClick={() => {}}
                      clickable
                    />
                  )}
                </Box>
                {createForm.isExam && (
                  <>
                    <DatePicker
                      label="Thời gian bắt đầu"
                      disabled
                      value={null}
                      slotProps={{ textField: { fullWidth: true } }}
                    />
                    <TextField
                      label="Thời lượng (phút)"
                      type="number"
                      value={createForm.durationMinutes}
                      onChange={(e) => setCreateForm(prev => ({ ...prev, durationMinutes: parseInt(e.target.value || '0', 10) }))}
                      fullWidth
                    />
                  </>
                )}
              </Box>
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenDialog(false)}>
              Hủy
            </Button>
            <Button variant="contained" onClick={submitCreate} disabled={creating || !createForm.classId || !createForm.title || !createForm.dueDate}>
              {creating ? 'Đang tạo...' : 'Tạo bài tập'}
            </Button>
            </DialogActions>
            </Dialog>

            {/* Edit Assignment Dialog */}
            <Dialog
            open={openEditDialog}
            onClose={() => setOpenEditDialog(false)}
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
              value={editForm.title}
              onChange={(e) => setEditForm(prev => ({ ...prev, title: e.target.value }))}
            />
            <TextField
              margin="dense"
              label="Mô tả bài tập"
              fullWidth
              multiline
              rows={4}
              variant="outlined"
              value={editForm.description}
              onChange={(e) => setEditForm(prev => ({ ...prev, description: e.target.value }))}
            />
            <DatePicker
              label="Deadline"
              slotProps={{
                textField: {
                  fullWidth: true,
                  sx: { mt: 2 }
                }
              }}
              value={editForm.dueDate ? dayjs(editForm.dueDate) : null}
              onChange={(v) => setEditForm(prev => ({ ...prev, dueDate: v ? v.toISOString() : '' }))}
            />

            <Box sx={{ mt: 3 }}>
              <Typography variant="subtitle1" gutterBottom>
                Cấu hình kỳ thi
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Chip
                    label={editForm.isExam ? 'Kỳ thi: Bật' : 'Kỳ thi: Tắt'}
                    color={editForm.isExam ? 'error' : 'default'}
                    onClick={() => setEditForm(prev => ({ ...prev, isExam: !prev.isExam }))}
                    clickable
                  />
                </Box>
                {editForm.isExam && (
                  <TextField
                    label="Thời lượng (phút)"
                    type="number"
                    value={editForm.durationMinutes}
                    onChange={(e) => setEditForm(prev => ({ ...prev, durationMinutes: parseInt(e.target.value || '0', 10) }))}
                    fullWidth
                  />
                )}
              </Box>
            </Box>
          </DialogContent>
            <DialogActions>
            <Button onClick={() => setOpenEditDialog(false)}>
            Hủy
            </Button>
            <Button variant="contained" onClick={submitEdit} disabled={editing || !editForm.title}>
            {editing ? 'Đang cập nhật...' : 'Cập nhật bài tập'}
            </Button>
            </DialogActions>
            </Dialog>
      </Box>
    </LocalizationProvider>
  );
};

export default TeacherAssignments;
