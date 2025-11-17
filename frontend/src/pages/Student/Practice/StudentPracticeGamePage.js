import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../../auth/AuthContext';
import { Box, Typography, IconButton, AppBar, Toolbar, Container } from '@mui/material';
import { ArrowBack } from '@mui/icons-material';
import ImageProcessingGamePage from './ImageProcessingGamePage';
import ExposureGamePage from './photography/ExposureGamePage';
import FramingGamePage from './videography/FramingGamePage';
import AudioEQGamePage from './audio/AudioEQGamePage';

const subjectsData = {
  photography: {
    name: 'Kỹ thuật nhiếp ảnh',
    games: {
      'exposure-game': {
        title: 'Game điều chỉnh độ phơi sáng',
        description: 'Học cách điều chỉnh khẩu độ, tốc độ màn trập và ISO để có độ phơi sáng phù hợp',
      },
    },
  },
  videography: {
    name: 'Kỹ thuật quay phim',
    games: {
      'framing-game': {
        title: 'Game framing và góc quay',
        description: 'Học các loại shot khác nhau: close-up, medium, wide và cách sử dụng chúng',
      },
    },
  },
  multimedia: {
    name: 'Xử lý và truyền thông đa phương tiện',
    games: {
      'image-processing-game': {
        title: 'Game xử lý ảnh - Pipeline bộ lọc',
        description: 'Tạo chuỗi bộ lọc, kéo-thả thay đổi thứ tự và quan sát kết quả & histogram theo thời gian thực',
      },
    },
  },
  audio: {
    name: 'Xử lý âm thanh',
    games: {
      'audio-eq-game': {
        title: 'Game Audio EQ - Lọc & Khuếch đại',
        description: 'Điều chỉnh bộ lọc high-pass, low-pass và gain, xem phổ tần số',
      },
    },
  },
};

const StudentPracticeGamePage = () => {
  const { subjectId, gameId } = useParams();
  const navigate = useNavigate();
  const { accessToken, currentUser } = useAuth();

  const subject = subjectsData[subjectId];
  const game = subject?.games[gameId];

  useEffect(() => {
    // Check authentication
    if (!accessToken || !currentUser) {
      navigate('/login');
      return;
    }

    // Check if user is student
    if (currentUser.role !== 'student') {
      navigate('/student/practice');
      return;
    }

    // Check if subject and game exist
    if (!subject || !game) {
      navigate('/student/practice');
    }
  }, [accessToken, currentUser, subject, game, navigate]);

  if (!subject || !game) {
    return null;
  }

  const handleExit = () => {
    navigate('/student/practice');
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      {/* Top Bar */}
      <AppBar position="static" sx={{ bgcolor: 'primary.main' }}>
        <Toolbar>
          <IconButton
            edge="start"
            color="inherit"
            onClick={handleExit}
            sx={{ mr: 2 }}
          >
            <ArrowBack />
          </IconButton>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            {subject.name} - {game.title}
          </Typography>
          
        </Toolbar>
      </AppBar>

      <Container maxWidth="xl" sx={{ py: 3 }}>
        {subjectId === 'multimedia' && gameId === 'image-processing-game' && <ImageProcessingGamePage />}
        {subjectId === 'photography' && gameId === 'exposure-game' && <ExposureGamePage />}
        {subjectId === 'videography' && gameId === 'framing-game' && <FramingGamePage />}
        {subjectId === 'audio' && gameId === 'audio-eq-game' && <AudioEQGamePage />}
      </Container>
    </Box>
  );
};

export default StudentPracticeGamePage;
