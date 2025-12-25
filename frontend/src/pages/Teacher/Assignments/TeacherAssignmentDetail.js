import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  Button,
  Grid,
  Card,
  CardContent,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Avatar,
  IconButton,
  Divider,
} from '@mui/material';
import {
  ArrowBack,
  Assignment,
  People,
  Schedule,
  Grade,
  Visibility,
  Download,
} from '@mui/icons-material';
import { api } from '../../../api/client';

const TeacherAssignmentDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [assignment, setAssignment] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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
    (async () => {
      setLoading(true);
      setError('');
      try {
        const list = await api.teacherAssignmentsList();
        const a = (list || []).find(x => String(x.id) === String(id));
        if (!a) throw new Error('Không tìm thấy bài tập');
        setAssignment({
          id: a.id,
          title: a.title,
          description: a.description || '',
          class: a.className,
          deadline: a.dueDate || '',
          isExam: !!a.isExam,
          totalStudents: a.totalStudents || 0,
          submittedStudents: a.submittedStudents || 0,
          gradedStudents: a.gradedStudents || 0,
          status: a.status,
        });

        const submissions = await api.teacherSubmissions(a.id);
        setSubmissions((submissions || []).map(s => ({
          id: s.id,
          studentName: s.studentName,
          studentId: s.studentId,
          submittedAt: s.submittedAt || '',
          score: s.score,
          status: s.score != null ? 'graded' : 'submitted',
          files: s.files || [],
        })));
      } catch (e) {
        setError(e?.message || 'Không thể tải dữ liệu bài tập');
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  return (
    <Box>
      {error && (
        <Paper sx={{ p: 2, mb: 2 }}>
          <Typography color="error">{error}</Typography>
        </Paper>
      )}
      {loading && (
        <Paper sx={{ p: 2, mb: 2 }}>
          <Typography>Đang tải...</Typography>
        </Paper>
      )}
      <Button startIcon={<ArrowBack />} onClick={() => navigate('/teacher/assignments')} sx={{ mb: 2 }}>
        Quay lại
      </Button>

      <Paper sx={{ p: 3, mb: 3 }}>
        <Grid container spacing={3}>
          <Grid item>
            <Avatar sx={{ bgcolor: 'primary.main', width: 64, height: 64 }}>
              <Assignment />
            </Avatar>
          </Grid>
          <Grid item xs>
            <Typography variant="h4" gutterBottom>
              {assignment?.title}
            </Typography>
            <Typography variant="body1" color="text.secondary" gutterBottom>
              {assignment?.class}
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
              <Chip
                icon={<Schedule />}
                label={`Hạn: ${formatDateTime(assignment?.deadline)}`}
                color="warning"
              />
              <Chip
                icon={<People />}
                label={`${assignment?.submittedStudents}/${assignment?.totalStudents} đã nộp`}
                color="primary"
              />
              <Chip
                icon={<Grade />}
                label={`${assignment?.gradedStudents} đã chấm`}
                color="success"
              />
            </Box>
          </Grid>
        </Grid>
      </Paper>

      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Mô tả bài tập
            </Typography>
            <Divider sx={{ mb: 2 }} />
            <Typography variant="body1" sx={{ whiteSpace: 'pre-line' }}>
              {assignment?.description}
            </Typography>
          </Paper>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Thống kê
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Tổng số sinh viên
                  </Typography>
                  <Typography variant="h5">
                    {assignment?.totalStudents}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Đã nộp bài
                  </Typography>
                  <Typography variant="h5" color="primary">
                    {assignment?.submittedStudents}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Đã chấm điểm
                  </Typography>
                  <Typography variant="h5" color="success.main">
                    {assignment?.gradedStudents}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Chưa chấm
                  </Typography>
                  <Typography variant="h5" color="warning.main">
                    {(assignment?.submittedStudents || 0) - (assignment?.gradedStudents || 0)}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Paper sx={{ mt: 3 }}>
        <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
          <Typography variant="h6">
            Danh sách bài nộp
          </Typography>
        </Box>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Mã SV</TableCell>
                <TableCell>Họ tên</TableCell>
                <TableCell>Thời gian nộp</TableCell>
                <TableCell>Điểm</TableCell>
                <TableCell>Trạng thái</TableCell>
                <TableCell>Hành động</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {submissions.map((submission) => (
                <TableRow key={submission.id}>
                  <TableCell>{submission.studentId}</TableCell>
                  <TableCell>{submission.studentName}</TableCell>
                  <TableCell>{formatDateTime(submission.submittedAt)}</TableCell>
                  <TableCell>
                    {submission.score ? (
                      <Chip label={submission.score} color="success" size="small" />
                    ) : (
                      <Typography variant="body2" color="text.secondary">
                        Chưa chấm
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={submission.status === 'graded' ? 'Đã chấm' : 'Chưa chấm'}
                      color={submission.status === 'graded' ? 'success' : 'warning'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <IconButton size="small" color="primary">
                      <Visibility />
                    </IconButton>
                    {(submission.files || []).map((file, idx) => {
                      // Extract original filename for tooltip
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
                      
                      return (
                      <IconButton
                        key={idx}
                        size="small"
                        color="primary"
                        title={displayName} // Show filename on hover
                        onClick={() => {
                          // Handle file viewing/preview
                          let fileUrl = file.trim();
                          
                          if (fileUrl.startsWith('http')) {
                            // Cloudinary URL - For Office files, use Google Docs Viewer
                            const ext = fileUrl.split('.').pop().toLowerCase().split('?')[0];
                            if (['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx'].includes(ext)) {
                              const viewerUrl = `https://docs.google.com/viewer?url=${encodeURIComponent(fileUrl)}&embedded=true`;
                              window.open(viewerUrl, '_blank');
                            } else {
                              window.open(fileUrl, '_blank');
                            }
                            return;
                          }
                          
                          // Fix local file path - handle various formats
                          let filePath = fileUrl.replace(/\/$/, '');
                          
                          if (!filePath.startsWith('/uploads/') && !filePath.startsWith('http')) {
                            // Extract just the filename part
                            filePath = filePath.replace(/^.*?(files-|file-|avatar-|attachments-|submission-)/, '$1');
                            filePath = `/uploads/${filePath}`;
                          }
                          
                          const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:4000';
                          const fullUrl = `${backendUrl}${filePath}`;
                          
                          // Check file extension for preview options
                          const ext = filePath.split('.').pop().toLowerCase();
                          
                          // For PDFs and images, open directly
                          if (['pdf', 'jpg', 'jpeg', 'png', 'gif', 'webp', 'txt'].includes(ext)) {
                            window.open(fullUrl, '_blank');
                          }
                          // For Office files, use Google Docs Viewer
                          else if (['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx'].includes(ext)) {
                            const viewerUrl = `https://docs.google.com/viewer?url=${encodeURIComponent(fullUrl)}&embedded=true`;
                            window.open(viewerUrl, '_blank');
                          }
                          // Other files, open directly
                          else {
                            window.open(fullUrl, '_blank');
                          }
                        }}
                      >
                        <Download />
                      </IconButton>
                      );
                    })}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Box>
  );
};

export default TeacherAssignmentDetail;
