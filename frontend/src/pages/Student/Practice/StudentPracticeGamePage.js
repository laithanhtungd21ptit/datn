import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../../auth/AuthContext';
import { Box, Typography, IconButton, AppBar, Toolbar, Container } from '@mui/material';
import { ArrowBack } from '@mui/icons-material';
import ImageProcessingGamePage from './ImageProcessingGamePage';
import AudioEQGamePage from './audio/AudioEQGamePage';
import Graphics3DGamePage from './graphics/Graphics3DGamePage';

const subjectsData = {
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
  graphics: {
    name: 'Kỹ thuật đồ họa',
    games: {
      'color-theory-game': {
        title: 'Game lý thuyết màu sắc',
        description: 'Học về bánh xe màu, phối màu, độ tương phản và tâm lý học màu sắc',
      },
      'vector-design-game': {
        title: 'Game thiết kế vector',
        description: 'Thực hành vẽ và chỉnh sửa vector, sử dụng các công cụ path và shape',
      },
      'layout-game': {
        title: 'Game bố cục và typography',
        description: 'Học về grid system, hierarchy, spacing và cách sử dụng typography hiệu quả',
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

      {subjectId === 'graphics' && (gameId === 'color-theory-game' || gameId === 'vector-design-game' || gameId === 'layout-game') ? (
        <Graphics3DGamePage />
      ) : (
        <Container maxWidth="xl" sx={{ py: 3 }}>
          {subjectId === 'multimedia' && gameId === 'image-processing-game' && <ImageProcessingGamePage />}
          {subjectId === 'audio' && gameId === 'audio-eq-game' && <AudioEQGamePage />}
        </Container>
      )}
    </Box>
  );
};

export default StudentPracticeGamePage;
