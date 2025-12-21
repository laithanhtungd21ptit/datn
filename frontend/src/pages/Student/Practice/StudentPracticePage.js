import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
} from '@mui/material';
import {
  Videocam,
  Image,
  Brush,
} from '@mui/icons-material';

const StudentPracticePage = () => {
  const navigate = useNavigate();

  const subjects = [
    {
      id: 'multimedia',
      name: 'Xử lý và truyền thông đa phương tiện',
      icon: <Image sx={{ fontSize: 60 }} />,
      color: '#388e3c',
      description: 'Thực hành xử lý hình ảnh đa phương tiện',
      games: [
        {
          id: 'image-processing-game',
          title: 'Game xử lý ảnh - Pipeline bộ lọc',
          description: 'Tạo chuỗi bộ lọc, kéo-thả thay đổi thứ tự và quan sát histogram theo thời gian thực',
        },
      ],
    },
    {
      id: 'audio',
      name: 'Xử lý âm thanh',
      icon: <Videocam sx={{ fontSize: 60 }} />,
      color: '#7b1fa2',
      description: 'Thực hành lọc âm thanh bằng EQ, high-pass/low-pass và gain',
      games: [
        {
          id: 'audio-eq-game',
          title: 'Game Audio EQ - Lọc & Khuếch đại',
          description: 'Tải file âm thanh, điều chỉnh high-pass, low-pass và gain, xem phổ tần số',
        },
      ],
    },
    {
      id: 'graphics',
      name: 'Kỹ thuật đồ họa',
      icon: <Brush sx={{ fontSize: 60 }} />,
      color: '#f57c00',
      description: 'Thực hành các kỹ thuật biến đổi tọa độ',
      games: [
        {
          id: 'color-theory-game',
          title: 'Game lý thuyết màu sắc',
          description: 'Học về bánh xe màu, phối màu, độ tương phản và tâm lý học màu sắc',
        },
        {
          id: 'vector-design-game',
          title: 'Game thiết kế vector',
          description: 'Thực hành vẽ và chỉnh sửa vector, sử dụng các công cụ path và shape',
        },
        {
          id: 'layout-game',
          title: 'Game bố cục và typography',
          description: 'Học về grid system, hierarchy, spacing và cách sử dụng typography hiệu quả',
        },
      ],
    },
  ];

  const handleStartGame = (subject, game) => {
    navigate(`/student/practice/${subject.id}/${game.id}`);
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom sx={{ mb: 3, fontWeight: 600 }}>
        Thực hành bộ môn
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
        Chọn môn học để bắt đầu thực hành và nâng cao kỹ năng của bạn
      </Typography>

      <Grid container spacing={3}>
        {subjects.map((subject) => (
          <Grid item xs={12} md={4} key={subject.id}>
            <Card
              sx={{
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                transition: 'transform 0.2s, box-shadow 0.2s',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: 4,
                },
              }}
            >
              <CardContent 
                sx={{ 
                  flexGrow: 1, 
                  textAlign: 'center', 
                  pt: 4,
                  cursor: 'pointer',
                }}
                onClick={() => handleStartGame(subject, subject.games[0])}
              >
                <Box
                  sx={{
                    color: subject.color,
                    mb: 2,
                    display: 'flex',
                    justifyContent: 'center',
                  }}
                >
                  {subject.icon}
                </Box>
                <Typography variant="h5" gutterBottom sx={{ fontWeight: 600 }}>
                  {subject.name}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {subject.description}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};

export default StudentPracticePage;

