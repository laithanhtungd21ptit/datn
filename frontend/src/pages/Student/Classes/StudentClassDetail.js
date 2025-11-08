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
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Divider,
} from '@mui/material';
import {
  ArrowBack,
  School,
  Assignment,
  People,
  Description,
  Send,
} from '@mui/icons-material';

import { api } from '../../../api/client';

const StudentClassDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [tab, setTab] = React.useState(0);
  const [classData, setClassData] = useState(null);
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [comments, setComments] = React.useState([]);
  const [newComment, setNewComment] = React.useState('');
  const [openAnnDialog, setOpenAnnDialog] = React.useState(false);
  const [selectedAnnouncement, setSelectedAnnouncement] = React.useState(null);

  useEffect(() => {
    (async () => {
      setLoading(true); setError('');
      try {
        const detail = await api.studentClassDetail(id);
        const asgs = await api.studentClassAssignments(id);
        const commentsData = await api.studentGetComments(id);
        setClassData(detail);
        setAssignments(asgs || []);
        setComments(commentsData || []);
      } catch (e) { setError(e?.message || 'Không thể tải chi tiết lớp'); }
      finally { setLoading(false); }
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
            <Typography variant="h5">{classData?.name || ''}</Typography>
            <Typography variant="body2" color="text.secondary">Mã lớp: {classData?.code || ''}</Typography>
          </Grid>
          <Grid item>
            <Chip icon={<People />} label={`${classData?.students || 0} sinh viên`} color="primary" />
          </Grid>
        </Grid>

        <Grid container spacing={2} sx={{ mt: 1 }}>
          {/* thông tin giảng viên chưa có API ở đây */}
        </Grid>
      </Paper>

      <Paper sx={{ mb: 2 }}>
        <Tabs value={tab} onChange={(e, v) => setTab(v)}>
          <Tab label="Thông báo" />
          <Tab label="Tài liệu" />
          <Tab label="Bài tập" />
          <Tab label="Bình luận" />
        </Tabs>
      </Paper>

      {tab === 0 && (
        <Paper sx={{ p: 2 }}>
          <List>
            {(classData?.announcements || []).map(a => (
              <ListItem key={a.id} divider button onClick={() => { setSelectedAnnouncement(a); setOpenAnnDialog(true); }}>
                <ListItemIcon>
                  <Description color="warning" />
                </ListItemIcon>
                <ListItemText primary={a.title} secondary={a.date} />
              </ListItem>
            ))}
          </List>
        </Paper>
      )}

      {tab === 1 && (
        <Grid container spacing={2}>
          {(classData?.documents || []).map(d => (
            <Grid item xs={12} md={6} key={d.id}>
              <Card>
                <CardContent>
                  <Typography variant="subtitle1">{d.title}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {d.fileName} • {(d.fileSize / 1024).toFixed(1)} KB
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Tải lên: {new Date(d.uploadedAt).toLocaleDateString('vi-VN')}
                  </Typography>
                  <Button
                    size="small"
                    sx={{ mt: 1 }}
                    variant="outlined"
                    component="a"
                    href={d.fileUrl.startsWith('http') ? d.fileUrl : `${process.env.REACT_APP_BACKEND_URL || 'http://localhost:4000'}${d.fileUrl}`}
                    target="_blank"
                    download
                    rel="noopener noreferrer"
                    startIcon={<Description />}
                  >
                    Tải xuống
                  </Button>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

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

      {tab === 2 && (
        <Paper sx={{ p: 2 }}>
          <List>
            {assignments.map(asg => (
              <ListItem key={asg.id} divider>
                <ListItemIcon>
                  <Assignment color="primary" />
                </ListItemIcon>
                <ListItemText
                  primary={asg.title}
                  secondary={`Hạn: ${asg.dueDate ? new Date(asg.dueDate).toLocaleDateString('vi-VN') : 'Chưa có hạn'}`}
                />
              </ListItem>
            ))}
          </List>
        </Paper>
      )}
      {tab === 3 && (
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
            startIcon={<Send />}
            disabled={!newComment.trim()}
            onClick={async () => {
            if (!newComment.trim()) return;
            try {
                const comment = await api.studentCreateComment(id, { content: newComment });
                  setComments(prev => [comment, ...prev]);
                  setNewComment('');
                } catch (e) {
                  setError(e?.message || 'Không thể gửi bình luận');
                }
              }}
            >
              Gửi
            </Button>
          </Box>
        </Paper>
      )}
    </Box>
  );
};

export default StudentClassDetail;
