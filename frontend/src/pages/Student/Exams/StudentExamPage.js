import React, { useCallback, useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Grid,
  Paper,
  Chip,
  Button,
  TextField,
  Alert,
} from '@mui/material';
import { AttachFile } from '@mui/icons-material';
import { api } from '../../../api/client';

const StudentExamPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [exam, setExam] = useState(null);
  const [status, setStatus] = useState('loading'); // waiting | in_progress | ended
  const [timeLeftSec, setTimeLeftSec] = useState(0);
  const [waitingCountdown, setWaitingCountdown] = useState('');
  const [stream, setStream] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const loadExam = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await api.studentExamDetail(id);
      setExam(data);
      setStatus(data.status);
      if (data.status === 'in_progress') {
        const seconds = Math.max(0, Math.floor((new Date(data.endTime) - new Date()) / 1000));
        setTimeLeftSec(seconds);
      } else {
        setTimeLeftSec(0);
      }
    } catch (e) {
      setError(e?.message || 'Không thể tải thông tin kỳ thi');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadExam();
  }, [loadExam]);

  useEffect(() => {
    if (status !== 'waiting' || !exam?.startTime) {
      setWaitingCountdown('');
      return;
    }
    const updateCountdown = () => {
      const diff = Math.max(0, new Date(exam.startTime) - new Date());
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      setWaitingCountdown(`${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`);
    };
    updateCountdown();
    const timer = setInterval(updateCountdown, 1000);
    return () => clearInterval(timer);
  }, [status, exam]);

  useEffect(() => {
    if (status !== 'in_progress' || timeLeftSec <= 0) return;
    const timer = setInterval(() => {
      setTimeLeftSec(prev => Math.max(prev - 1, 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [status, timeLeftSec]);

  useEffect(() => {
    if (status !== 'in_progress') {
      if (stream) {
        stream.getTracks().forEach(t => t.stop());
        setStream(null);
      }
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const s = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        if (cancelled) {
          s.getTracks().forEach(t => t.stop());
          return;
        }
        setStream(s);
        const videoEl = document.getElementById('exam-page-video');
        if (videoEl) {
          videoEl.srcObject = s;
        }
      } catch (e) {
        setError('Không thể truy cập camera/micro. Vui lòng cấp quyền.');
      }
    })();
    return () => {
      cancelled = true;
      setStream(prev => {
        if (prev) prev.getTracks().forEach(t => t.stop());
        return null;
      });
    };
  }, [status]);

  const handleExit = () => {
    if (stream) stream.getTracks().forEach(t => t.stop());
    navigate(-1);
  };

  const mm = Math.floor(timeLeftSec / 60);
  const ss = String(timeLeftSec % 60).padStart(2, '0');

  if (loading) {
    return (
      <Box sx={{ p: 2 }}>
        <Alert severity="info">Đang tải thông tin kỳ thi...</Alert>
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 2 }}>
        <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>
        <Button variant="contained" onClick={loadExam}>Thử lại</Button>
      </Box>
    );
  }

  if (!exam) {
    return (
      <Box sx={{ p: 2 }}>
        <Alert severity="warning">Không tìm thấy kỳ thi.</Alert>
      </Box>
    );
  }

  if (status === 'waiting') {
    return (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <Typography variant="h4" gutterBottom>{exam.title}</Typography>
        <Typography variant="subtitle1" color="text.secondary" gutterBottom>
          Kỳ thi sẽ bắt đầu lúc {new Date(exam.startTime).toLocaleString('vi-VN')}
        </Typography>
        <Typography variant="h2" color="primary" sx={{ mb: 3 }}>
          {waitingCountdown || '00:00:00'}
        </Typography>
        <Button variant="contained" onClick={loadExam}>
          Làm mới
        </Button>
        <Button sx={{ ml: 2 }} onClick={handleExit}>
          Quay lại
        </Button>
      </Box>
    );
  }

  if (status === 'ended') {
    return (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <Alert severity="warning" sx={{ mb: 2 }}>
          Kỳ thi này đã kết thúc. Bạn không thể tham gia nữa.
        </Alert>
        <Button variant="contained" onClick={handleExit}>
          Quay lại
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h5">{exam?.title || 'Kỳ thi'}</Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Chip label={`Còn lại: ${mm}:${ss}`} color="error" />
          <Chip label={exam?.requireMonitoring ? 'Giám sát: Bắt buộc' : 'Giám sát: Không bắt buộc'} color={exam?.requireMonitoring ? 'warning' : 'default'} />
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>
      )}

      <Grid container spacing={2}>
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="subtitle1" gutterBottom>Giám sát (Camera/Micro)</Typography>
            <video id="exam-page-video" autoPlay playsInline muted style={{ width: '100%', borderRadius: 8, background: '#000' }} />
          </Paper>
        </Grid>
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 2, mb: 2 }}>
            <Typography variant="subtitle1" gutterBottom>Đề thi</Typography>
            <Typography variant="body2" color="text.secondary">
              {exam?.description || 'Đề thi sẽ hiển thị tại đây.'}
            </Typography>
          </Paper>
          <Paper sx={{ p: 2 }}>
            <Typography variant="subtitle1" gutterBottom>Bài làm</Typography>
            <TextField fullWidth multiline minRows={10} placeholder="Nhập câu trả lời hoặc dán link..." />
            <Box sx={{ mt: 2, display: 'flex', gap: 1, alignItems: 'center' }}>
              <Button variant="outlined" startIcon={<AttachFile />} component="label">
                Đính kèm file
                <input type="file" hidden multiple />
              </Button>
              <Typography variant="caption" color="text.secondary">Chấp nhận: PDF, DOC, DOCX, ZIP</Typography>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, mt: 2 }}>
              <Button onClick={handleExit}>Thoát</Button>
              <Button variant="contained" color="error">Nộp bài</Button>
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default StudentExamPage;
