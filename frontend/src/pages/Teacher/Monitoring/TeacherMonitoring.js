import React, { useState } from 'react';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Button,
  Chip,
  Avatar,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Switch,
  FormControlLabel,
  Alert,
  LinearProgress,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Tabs,
  Tab,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
} from '@mui/material';
import {
  VideoCall,
  Stop,
  Warning,
  CheckCircle,
  Error,
  Visibility,
  Refresh,
  Settings,
  Notifications,
  CameraAlt,
  Mic,
  MicOff,
  VideocamOff,
  Person,
  Group,
  Monitor,
} from '@mui/icons-material';

const TeacherMonitoring = () => {
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [monitoringMode, setMonitoringMode] = useState('general'); // 'general' or 'specific'
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [isSpecificMonitoring, setIsSpecificMonitoring] = useState(false);
  const [currentExam, setCurrentExam] = useState({
    id: 1,
    title: 'Giữa kỳ Lập trình Web',
    startTime: '2024-01-15T14:00:00',
    endTime: '2024-01-15T16:00:00',
    isActive: true,
    duration: 120 // phút
  });
  const [activeStudents, setActiveStudents] = useState([
    {
      id: 1,
      name: 'Nguyễn Văn A',
      studentId: 'IT001',
      status: 'active',
      cameraOn: true,
      micOn: true,
      warnings: 2,
      lastActivity: '2 phút trước',
      violations: ['Nhìn ra ngoài màn hình', 'Có tiếng động lạ'],
    },
    {
      id: 2,
      name: 'Trần Thị B',
      studentId: 'IT002',
      status: 'active',
      cameraOn: true,
      micOn: false,
      warnings: 0,
      lastActivity: '30 giây trước',
      violations: [],
    },
    {
      id: 3,
      name: 'Lê Văn C',
      studentId: 'IT003',
      status: 'inactive',
      cameraOn: false,
      micOn: false,
      warnings: 1,
      lastActivity: '5 phút trước',
      violations: ['Không có camera'],
    },
  ]);

  const [monitoringLogs] = useState([
    {
      id: 1,
      studentName: 'Nguyễn Văn A',
      timestamp: '2024-01-15 14:30:25',
      event: 'Nhìn ra ngoài màn hình',
      severity: 'warning',
      description: 'Phát hiện sinh viên nhìn ra ngoài màn hình trong 10 giây',
    },
    {
      id: 2,
      studentName: 'Lê Văn C',
      timestamp: '2024-01-15 14:25:10',
      event: 'Camera bị tắt',
      severity: 'error',
      description: 'Sinh viên đã tắt camera trong khi làm bài',
    },
    {
      id: 3,
      studentName: 'Trần Thị B',
      timestamp: '2024-01-15 14:20:45',
      event: 'Hoạt động bình thường',
      severity: 'success',
      description: 'Sinh viên tập trung làm bài',
    },
  ]);

  const [openStudentDialog, setOpenStudentDialog] = useState(false);
  const [openSettingsDialog, setOpenSettingsDialog] = useState(false);
  const [settings, setSettings] = useState({
    autoDetectViolations: true,
    sendNotifications: true,
    recordSessions: false,
    sensitivity: 'medium',
  });

  const [alertCount, setAlertCount] = useState(3);

  const handleStartMonitoring = () => {
    setIsMonitoring(true);
    setAlertCount(0);
  };

  const handleStopMonitoring = () => {
    setIsMonitoring(false);
  };

  const handleViewStudent = (student) => {
    setSelectedStudent(student);
    setOpenStudentDialog(true);
  };

  const handleStartSpecificMonitoring = (student) => {
    setSelectedStudent(student);
    setMonitoringMode('specific');
    setIsSpecificMonitoring(true);
    setIsMonitoring(true);
  };

  const handleStopSpecificMonitoring = () => {
    setIsSpecificMonitoring(false);
    setIsMonitoring(false);
    setSelectedStudent(null);
    setMonitoringMode('general');
  };

  const handleTabChange = (event, newValue) => {
    setMonitoringMode(newValue === 0 ? 'general' : 'specific');
  };

  const isExamTime = () => {
    if (!currentExam) return false;
    const now = new Date();
    const startTime = new Date(currentExam.startTime);
    const endTime = new Date(currentExam.endTime);
    return now >= startTime && now <= endTime;
  };

  const handleSettingsChange = (setting, value) => {
    setSettings(prev => ({
      ...prev,
      [setting]: value
    }));
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'success';
      case 'inactive': return 'error';
      case 'warning': return 'warning';
      default: return 'default';
    }
  };

  const getSeverityIcon = (severity) => {
    switch (severity) {
      case 'error': return <Error color="error" />;
      case 'warning': return <Warning color="warning" />;
      case 'success': return <CheckCircle color="success" />;
      default: return <Notifications />;
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'active': return <CheckCircle color="success" />;
      case 'inactive': return <Error color="error" />;
      default: return <Warning color="warning" />;
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" gutterBottom>
          Giám sát học tập AI
        </Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="outlined"
            startIcon={<Settings />}
            onClick={() => setOpenSettingsDialog(true)}
          >
            Cài đặt
          </Button>
          {!isMonitoring ? (
            <Button
              variant="contained"
              color="success"
              startIcon={<VideoCall />}
              onClick={handleStartMonitoring}
            >
              Bắt đầu giám sát
            </Button>
          ) : (
            <Button
              variant="contained"
              color="error"
              startIcon={<Stop />}
              onClick={handleStopMonitoring}
            >
              Dừng giám sát
            </Button>
          )}
        </Box>
      </Box>

      {isExamTime() && (
        <Alert severity="success" sx={{ mb: 3 }}>
          📝 <strong>Kỳ thi đang diễn ra:</strong> {currentExam?.title}
          <br />
          Thời gian: {new Date(currentExam?.startTime).toLocaleTimeString()} - {new Date(currentExam?.endTime).toLocaleTimeString()}
          {isMonitoring && (
            <>
              <br />
              {monitoringMode === 'general' 
                ? `Hệ thống đang giám sát ${activeStudents.length} sinh viên.` 
                : `Đang giám sát sinh viên: ${selectedStudent?.name || 'Chưa chọn sinh viên'}.`
              }
              {alertCount > 0 && ` Có ${alertCount} cảnh báo mới.`}
            </>
          )}
        </Alert>
      )}

      {!isExamTime() && currentExam && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          ⏰ <strong>Chưa đến giờ thi:</strong> {currentExam?.title}
          <br />
          Thời gian bắt đầu: {new Date(currentExam?.startTime).toLocaleString()}
          <br />
          <em>Giám sát chỉ được kích hoạt trong thời gian thi</em>
        </Alert>
      )}

      <Paper sx={{ mb: 3 }}>
        <Tabs value={monitoringMode === 'general' ? 0 : 1} onChange={handleTabChange}>
          <Tab 
            icon={<Group />} 
            label="Giám sát tổng quát" 
            iconPosition="start"
          />
          <Tab 
            icon={<Person />} 
            label="Giám sát sinh viên cụ thể" 
            iconPosition="start"
          />
        </Tabs>
      </Paper>

      {monitoringMode === 'general' ? (
        <Grid container spacing={3}>
          {/* Active Students */}
          <Grid item xs={12} md={8}>
          <Paper sx={{ p: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">
                Sinh viên đang hoạt động ({activeStudents.length})
              </Typography>
              <IconButton onClick={() => setActiveStudents([...activeStudents])}>
                <Refresh />
              </IconButton>
            </Box>
            
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Sinh viên</TableCell>
                    <TableCell>Trạng thái</TableCell>
                    <TableCell>Camera</TableCell>
                    <TableCell>Mic</TableCell>
                    <TableCell>Cảnh báo</TableCell>
                    <TableCell>Hoạt động cuối</TableCell>
                    <TableCell>Hành động</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {activeStudents.map((student) => (
                    <TableRow key={student.id}>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <Avatar sx={{ mr: 2, width: 32, height: 32 }}>
                            {student.name.charAt(0)}
                          </Avatar>
                          <Box>
                            <Typography variant="body2">{student.name}</Typography>
                            <Typography variant="caption" color="text.secondary">
                              {student.studentId}
                            </Typography>
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          {getStatusIcon(student.status)}
                          <Chip
                            label={student.status === 'active' ? 'Hoạt động' : 'Không hoạt động'}
                            color={getStatusColor(student.status)}
                            size="small"
                            sx={{ ml: 1 }}
                          />
                        </Box>
                      </TableCell>
                      <TableCell>
                        {student.cameraOn ? (
                          <CameraAlt color="success" />
                        ) : (
                          <VideocamOff color="error" />
                        )}
                      </TableCell>
                      <TableCell>
                        {student.micOn ? (
                          <Mic color="success" />
                        ) : (
                          <MicOff color="error" />
                        )}
                      </TableCell>
                      <TableCell>
                        {student.warnings > 0 ? (
                          <Chip
                            label={student.warnings}
                            color="warning"
                            size="small"
                          />
                        ) : (
                          <CheckCircle color="success" />
                        )}
                      </TableCell>
                      <TableCell>{student.lastActivity}</TableCell>
                      <TableCell>
                        <Button
                          size="small"
                          startIcon={<Visibility />}
                          onClick={() => handleViewStudent(student)}
                        >
                          Xem chi tiết
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Grid>

        {/* Monitoring Stats */}
        <Grid item xs={12} md={4}>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Thống kê giám sát
                  </Typography>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" color="text.secondary">
                      Sinh viên hoạt động: {activeStudents.filter(s => s.status === 'active').length}
                    </Typography>
                    <LinearProgress
                      variant="determinate"
                      value={(activeStudents.filter(s => s.status === 'active').length / activeStudents.length) * 100}
                      sx={{ mt: 1 }}
                    />
                  </Box>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" color="text.secondary">
                      Camera bật: {activeStudents.filter(s => s.cameraOn).length}
                    </Typography>
                    <LinearProgress
                      variant="determinate"
                      value={(activeStudents.filter(s => s.cameraOn).length / activeStudents.length) * 100}
                      sx={{ mt: 1 }}
                    />
                  </Box>
                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      Cảnh báo: {activeStudents.reduce((sum, s) => sum + s.warnings, 0)}
                    </Typography>
                    <LinearProgress
                      variant="determinate"
                      value={Math.min((activeStudents.reduce((sum, s) => sum + s.warnings, 0) / activeStudents.length) * 10, 100)}
                      sx={{ mt: 1 }}
                      color="warning"
                    />
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Cảnh báo gần đây
                  </Typography>
                  <List dense>
                    {monitoringLogs.slice(0, 5).map((log) => (
                      <ListItem key={log.id} divider>
                        <ListItemIcon>
                          {getSeverityIcon(log.severity)}
                        </ListItemIcon>
                        <ListItemText
                          primary={log.event}
                          secondary={`${log.studentName} - ${log.timestamp}`}
                        />
                      </ListItem>
                    ))}
                  </List>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Grid>

        {/* Monitoring Logs */}
        <Grid item xs={12}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Log giám sát
            </Typography>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Thời gian</TableCell>
                    <TableCell>Sinh viên</TableCell>
                    <TableCell>Sự kiện</TableCell>
                    <TableCell>Mức độ</TableCell>
                    <TableCell>Mô tả</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {monitoringLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell>{log.timestamp}</TableCell>
                      <TableCell>{log.studentName}</TableCell>
                      <TableCell>{log.event}</TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          {getSeverityIcon(log.severity)}
                          <Chip
                            label={log.severity}
                            color={getStatusColor(log.severity)}
                            size="small"
                            sx={{ ml: 1 }}
                          />
                        </Box>
                      </TableCell>
                      <TableCell>{log.description}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Grid>
      </Grid>
      ) : (
        /* Specific Student Monitoring */
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 2 }}>
              <Typography variant="h6" gutterBottom>
                Chọn sinh viên để giám sát
              </Typography>
              {isExamTime() ? (
                <>
                  <FormControl fullWidth sx={{ mb: 2 }}>
                    <InputLabel>Chọn sinh viên</InputLabel>
                    <Select
                      value={selectedStudent?.id || ''}
                      label="Chọn sinh viên"
                      onChange={(e) => {
                        const student = activeStudents.find(s => s.id === e.target.value);
                        setSelectedStudent(student);
                        if (student) {
                          handleStartSpecificMonitoring(student);
                        }
                      }}
                    >
                      {activeStudents.map((student) => (
                        <MenuItem key={student.id} value={student.id}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Avatar sx={{ width: 24, height: 24 }}>
                              {student.name.charAt(0)}
                            </Avatar>
                            <span>{student.name} ({student.studentId})</span>
                          </Box>
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </>
              ) : (
                <Alert severity="info" sx={{ mb: 2 }}>
                  Giám sát sinh viên chỉ được kích hoạt trong thời gian thi
                </Alert>
              )}
              {selectedStudent && (
                <Box sx={{ display: 'flex', gap: 2 }}>
                  {isSpecificMonitoring && (
                    <Button
                      variant="contained"
                      color="error"
                      startIcon={<Stop />}
                      onClick={handleStopSpecificMonitoring}
                    >
                      Dừng giám sát
                    </Button>
                  )}
                </Box>
              )}
            </Paper>
          </Grid>

          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 2 }}>
              <Typography variant="h6" gutterBottom>
                Thông tin sinh viên được giám sát
              </Typography>
              {selectedStudent ? (
                <Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                    <Avatar sx={{ width: 48, height: 48 }}>
                      {selectedStudent.name.charAt(0)}
                    </Avatar>
                    <Box>
                      <Typography variant="h6">{selectedStudent.name}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        {selectedStudent.studentId}
                      </Typography>
                    </Box>
                  </Box>
                  <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                    <Chip
                      label={selectedStudent.status === 'active' ? 'Hoạt động' : 'Không hoạt động'}
                      color={getStatusColor(selectedStudent.status)}
                      size="small"
                    />
                    <Chip
                      icon={selectedStudent.cameraOn ? <CameraAlt /> : <VideocamOff />}
                      label={selectedStudent.cameraOn ? 'Camera bật' : 'Camera tắt'}
                      color={selectedStudent.cameraOn ? 'success' : 'error'}
                      size="small"
                    />
                    <Chip
                      icon={selectedStudent.micOn ? <Mic /> : <MicOff />}
                      label={selectedStudent.micOn ? 'Mic bật' : 'Mic tắt'}
                      color={selectedStudent.micOn ? 'success' : 'error'}
                      size="small"
                    />
                  </Box>
                  <Typography variant="body2" color="text.secondary">
                    Hoạt động cuối: {selectedStudent.lastActivity}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Số cảnh báo: {selectedStudent.warnings}
                  </Typography>
                </Box>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  Chưa chọn sinh viên để giám sát
                </Typography>
              )}
            </Paper>
          </Grid>

          {isSpecificMonitoring && selectedStudent && (
            <Grid item xs={12}>
              <Paper sx={{ p: 2 }}>
                <Typography variant="h6" gutterBottom>
                  📋 Log giám sát - {selectedStudent.name}
                </Typography>
                <Box sx={{ 
                  width: '100%', 
                  height: 400, 
                  backgroundColor: '#f8f9fa',
                  border: '1px solid #e0e0e0',
                  borderRadius: 1,
                  overflow: 'auto',
                  p: 2
                }}>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    {/* Mock monitoring logs */}
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, p: 1, bgcolor: '#e8f5e8', borderRadius: 1 }}>
                      <Box sx={{ width: 8, height: 8, bgcolor: '#4caf50', borderRadius: '50%' }}></Box>
                      <Typography variant="caption" color="text.secondary">14:30:15</Typography>
                      <Typography variant="body2">✅ Sinh viên đang làm bài tập bình thường</Typography>
                    </Box>
                    
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, p: 1, bgcolor: '#fff3e0', borderRadius: 1 }}>
                      <Box sx={{ width: 8, height: 8, bgcolor: '#ff9800', borderRadius: '50%' }}></Box>
                      <Typography variant="caption" color="text.secondary"> accumulated: 14:32:45</Typography>
                      <Typography variant="body2">⚠️ Phát hiện sinh viên nhìn ra ngoài màn hình</Typography>
                    </Box>
                    
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, p: 1, bgcolor: '#e8f5e8', borderRadius: 1 }}>
                      <Box sx={{ width: 8, height: 8, bgcolor: '#4caf50', borderRadius: '50%' }}></Box>
                      <Typography variant="caption" color="text.secondary">14:33:12</Typography>
                      <Typography variant="body2">✅ Sinh viên quay lại làm bài tập</Typography>
                    </Box>
                    
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, p: 1, bgcolor: '#ffebee', borderRadius: 1 }}>
                      <Box sx={{ width: 8, height: 8, bgcolor: '#f44336', borderRadius: '50%' }}></Box>
                      <Typography variant="caption" color="text.secondary">14:35:20</Typography>
                      <Typography variant="body2">🚨 Cảnh báo: Phát hiện sinh viên sử dụng điện thoại</Typography>
                    </Box>
                    
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, p: 1, bgcolor: '#e8f5e8', borderRadius: 1 }}>
                      <Box sx={{ width: 8, height: 8, bgcolor: '#4caf50', borderRadius: '50%' }}></Box>
                      <Typography variant="caption" color="text.secondary">14:36:05</Typography>
                      <Typography variant="body2">✅ Sinh viên đã cất điện thoại và tiếp tục làm bài</Typography>
                    </Box>
                    
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, p: 1, bgcolor: '#fff3e0', borderRadius: 1 }}>
                      <Box sx={{ width: 8, height: 8, bgcolor: '#ff9800', borderRadius: '50%' }}></Box>
                      <Typography variant="caption" color="text.secondary">14:38:30</Typography>
                      <Typography variant="body2">⚠️ Sinh viên đang suy nghĩ, không có hoạt động trong 30 giây</Typography>
                    </Box>
                    
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, p: 1, bgcolor: '#e8f5e8', borderRadius: 1 }}>
                      <Box sx={{ width: 8, height: 8, bgcolor: '#4caf50', borderRadius: '50%' }}></Box>
                      <Typography variant="caption" color="text.secondary">14:39:15</Typography>
                      <Typography variant="body2">✅ Sinh viên tiếp tục làm bài tập</Typography>
                    </Box>
                  </Box>
                </Box>
              </Paper>
            </Grid>
          )}
        </Grid>
      )}

      {/* Student Detail Dialog */}
      <Dialog
        open={openStudentDialog}
        onClose={() => setOpenStudentDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Chi tiết sinh viên - {selectedStudent?.name}
        </DialogTitle>
        <DialogContent>
          {selectedStudent && (
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <Typography variant="h6" gutterBottom>
                  Thông tin cơ bản
                </Typography>
                <Typography variant="body2">
                  <strong>Mã sinh viên:</strong> {selectedStudent.studentId}
                </Typography>
                <Typography variant="body2">
                  <strong>Trạng thái:</strong> {selectedStudent.status}
                </Typography>
                <Typography variant="body2">
                  <strong>Camera:</strong> {selectedStudent.cameraOn ? 'Bật' : 'Tắt'}
                </Typography>
                <Typography variant="body2">
                  <strong>Microphone:</strong> {selectedStudent.micOn ? 'Bật' : 'Tắt'}
                </Typography>
                <Typography variant="body2">
                  <strong>Hoạt động cuối:</strong> {selectedStudent.lastActivity}
                </Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="h6" gutterBottom>
                  Vi phạm phát hiện
                </Typography>
                {selectedStudent.violations.length > 0 ? (
                  <List>
                    {selectedStudent.violations.map((violation, index) => (
                      <ListItem key={index}>
                        <ListItemIcon>
                          <Warning color="warning" />
                        </ListItemIcon>
                        <ListItemText primary={violation} />
                      </ListItem>
                    ))}
                  </List>
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    Không có vi phạm nào được phát hiện
                  </Typography>
                )}
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenStudentDialog(false)}>
            Đóng
          </Button>
        </DialogActions>
      </Dialog>

      {/* Settings Dialog */}
      <Dialog
        open={openSettingsDialog}
        onClose={() => setOpenSettingsDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Cài đặt giám sát</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <FormControlLabel
              control={
                <Switch
                  checked={settings.autoDetectViolations}
                  onChange={(e) => handleSettingsChange('autoDetectViolations', e.target.checked)}
                />
              }
              label="Tự động phát hiện vi phạm"
            />
          </Box>
          <Box sx={{ mt: 2 }}>
            <FormControlLabel
              control={
                <Switch
                  checked={settings.sendNotifications}
                  onChange={(e) => handleSettingsChange('sendNotifications', e.target.checked)}
                />
              }
              label="Gửi thông báo cảnh báo"
            />
          </Box>
          <Box sx={{ mt: 2 }}>
            <FormControlLabel
              control={
                <Switch
                  checked={settings.recordSessions}
                  onChange={(e) => handleSettingsChange('recordSessions', e.target.checked)}
                />
              }
              label="Ghi lại phiên giám sát"
            />
          </Box>
          <Box sx={{ mt: 2 }}>
            <Typography variant="body2" gutterBottom>
              Độ nhạy phát hiện:
            </Typography>
            <Button
              variant={settings.sensitivity === 'low' ? 'contained' : 'outlined'}
              size="small"
              onClick={() => handleSettingsChange('sensitivity', 'low')}
              sx={{ mr: 1 }}
            >
              Thấp
            </Button>
            <Button
              variant={settings.sensitivity === 'medium' ? 'contained' : 'outlined'}
              size="small"
              onClick={() => handleSettingsChange('sensitivity', 'medium')}
              sx={{ mr: 1 }}
            >
              Trung bình
            </Button>
            <Button
              variant={settings.sensitivity === 'high' ? 'contained' : 'outlined'}
              size="small"
              onClick={() => handleSettingsChange('sensitivity', 'high')}
            >
              Cao
            </Button>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenSettingsDialog(false)}>
            Hủy
          </Button>
          <Button variant="contained">
            Lưu cài đặt
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default TeacherMonitoring;
