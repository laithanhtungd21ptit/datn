import React from 'react';
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

const mockExams = [
  {
    id: '2',
    title: 'Kỳ thi giữa kỳ: Cơ sở dữ liệu',
    description: 'Làm bài thi giữa kỳ trong thời lượng quy định. Bật camera/micro để giám sát.',
    durationMinutes: 90,
    requireMonitoring: true,
  },
];

const StudentExamPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const exam = mockExams.find(e => e.id === id) || mockExams[0];
  const [timeLeftSec, setTimeLeftSec] = React.useState((exam?.durationMinutes || 60) * 60);
  const [stream, setStream] = React.useState(null);
  const [error, setError] = React.useState('');

  React.useEffect(() => {
    let timer = setInterval(() => {
      setTimeLeftSec(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          // Auto submit or exit could go here
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  React.useEffect(() => {
    (async () => {
      try {
        const s = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
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
      if (stream) stream.getTracks().forEach(t => t.stop());
    };
  }, []); // init once

  const handleExit = () => {
    if (stream) stream.getTracks().forEach(t => t.stop());
    navigate(-1);
  };

  const mm = Math.floor(timeLeftSec / 60);
  const ss = String(timeLeftSec % 60).padStart(2, '0');

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
