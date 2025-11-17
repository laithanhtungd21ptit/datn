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
  CameraAlt,
  Videocam,
  Image,
} from '@mui/icons-material';

const StudentPracticePage = () => {
  const navigate = useNavigate();

  const subjects = [
    {
      id: 'photography',
      name: 'Kỹ thuật nhiếp ảnh',
      icon: <CameraAlt sx={{ fontSize: 60 }} />,
      color: '#1976d2',
      description: 'Thực hành các kỹ thuật chụp ảnh, điều chỉnh ánh sáng, bố cục và xử lý hậu kỳ',
      games: [
        {
          id: 'exposure-game',
          title: 'Game điều chỉnh độ phơi sáng',
          description: 'Học cách điều chỉnh khẩu độ, tốc độ màn trập và ISO để có độ phơi sáng phù hợp',
        },
        {
          id: 'composition-game',
          title: 'Game bố cục ảnh',
          description: 'Thực hành các quy tắc bố cục như quy tắc 1/3, đường dẫn, khung hình',
        },
        {
          id: 'lighting-game',
          title: 'Game ánh sáng',
          description: 'Học cách sử dụng ánh sáng tự nhiên và nhân tạo trong nhiếp ảnh',
        },
      ],
    },
    {
      id: 'videography',
      name: 'Kỹ thuật quay phim',
      icon: <Videocam sx={{ fontSize: 60 }} />,
      color: '#d32f2f',
      description: 'Thực hành kỹ thuật quay phim, chuyển động camera, framing và storytelling',
      games: [
        {
          id: 'framing-game',
          title: 'Game framing và góc quay',
          description: 'Học các loại shot khác nhau: close-up, medium, wide và cách sử dụng chúng',
        },
        {
          id: 'movement-game',
          title: 'Game chuyển động camera',
          description: 'Thực hành các kỹ thuật pan, tilt, dolly, tracking và khi nào sử dụng chúng',
        },
        {
          id: 'storytelling-game',
          title: 'Game kể chuyện bằng video',
          description: 'Học cách xây dựng cốt truyện và sử dụng video để truyền đạt thông điệp',
        },
      ],
    },
    {
      id: 'multimedia',
      name: 'Xử lý và truyền thông đa phương tiện',
      icon: <Image sx={{ fontSize: 60 }} />,
      color: '#388e3c',
      description: 'Thực hành xử lý hình ảnh, video, audio và tích hợp đa phương tiện',
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

