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
Dialog,
DialogTitle,
DialogContent,
DialogActions,
TextField,
Alert,
} from '@mui/material';
import {
Add,
People,
Assignment,
Visibility,
Description,
Notifications,
} from '@mui/icons-material';
import { api } from '../../../api/client';

const StudentClasses = () => {
  const navigate = useNavigate();
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');





  const [openJoinDialog, setOpenJoinDialog] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  useEffect(() => {
  (async () => {
  setLoading(true); setError('');
  try {
  const items = await api.studentClasses();
  setClasses(items);
  } catch(e) { setError(e?.message || 'Không thể tải lớp học'); }
  finally { setLoading(false); }
  })();
  }, []);




  const handleJoinClass = () => {
    setOpenJoinDialog(true);
  };

  const handleJoinSubmit = async () => {
  if (!joinCode.trim()) return;
  try {
  await api.studentJoinClass(joinCode.trim());
  const items = await api.studentClasses();
  setClasses(items);
  } catch {}
  setOpenJoinDialog(false);
  setJoinCode('');
  };



  const handleViewDetail = (classItem) => {
    navigate(`/student/classes/${classItem.id}`);
  };



  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" gutterBottom>
          Lớp học của tôi
        </Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={handleJoinClass}
        >
          Tham gia lớp học
        </Button>
      </Box>

      {/* Classes Grid */}
      <Grid container spacing={3}>
        {classes.map((classItem) => (
          <Grid item xs={12} sm={6} md={4} key={classItem.id}>
            <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              <CardContent sx={{ flexGrow: 1, cursor: 'pointer' }} onClick={() => navigate(`/student/classes/${classItem.id}`)}>
                <Typography variant="h6" component="div" sx={{ mb: 2 }}>
                {classItem.name}
                </Typography>
                
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  {classItem.code} - {classItem.teacher}
                </Typography>
                
                <Typography variant="body2" sx={{ mb: 2 }}>
                  {classItem.description}
                </Typography>

                <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                  <Chip
                    icon={<People />}
                    label={`${classItem.students} sinh viên`}
                    size="small"
                    color="primary"
                  />
                  <Chip
                    icon={<Assignment />}
                    label={`${classItem.assignments} bài tập`}
                    size="small"
                    color="secondary"
                  />
                </Box>

                {/* Removed schedule and location display per request */}

                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Chip
                    icon={<Description />}
                    label={`${classItem.documents} tài liệu`}
                    size="small"
                    variant="outlined"
                  />
                  <Chip
                    icon={<Notifications />}
                    label={`${classItem.announcements} thông báo`}
                    size="small"
                    variant="outlined"
                    color="warning"
                  />
                </Box>
              </CardContent>
              
              <CardActions>
                <Button
                  size="small"
                  startIcon={<Visibility />}
                  onClick={() => handleViewDetail(classItem)}
                >
                  Xem chi tiết
                </Button>
              </CardActions>
            </Card>
          </Grid>
        ))}
      </Grid>



      {/* Join Class Dialog */}
      <Dialog
        open={openJoinDialog}
        onClose={() => setOpenJoinDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Tham gia lớp học mới</DialogTitle>
        <DialogContent>
          <Alert severity="info" sx={{ mb: 2 }}>
            Nhập mã lớp học được cung cấp bởi giảng viên để tham gia lớp học.
          </Alert>
          <TextField
            autoFocus
            margin="dense"
            label="Mã lớp học"
            fullWidth
            variant="outlined"
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value)}
            placeholder="Ví dụ: WEB001"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenJoinDialog(false)}>
            Hủy
          </Button>
          <Button
            onClick={handleJoinSubmit}
            variant="contained"
            disabled={!joinCode.trim()}
          >
            Tham gia
          </Button>
        </DialogActions>
      </Dialog>

      
    </Box>
  );
};

export default StudentClasses;
