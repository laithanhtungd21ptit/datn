import React, { useEffect, useMemo, useState } from 'react';
import {
  Grid,
  Paper,
  Typography,
  Box,
  Card,
  CardContent,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Button,
  Chip,
  Avatar,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Alert,
  LinearProgress,
} from '@mui/material';
import { People, School, Assignment, TrendingUp, Refresh, Download, Warning, CheckCircle, Error, Info, Notifications } from '@mui/icons-material';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import { api } from '../../../api/client';

const AdminDashboard = () => {
  const [system, setSystem] = useState({ users: 0, teachers: 0, students: 0, admins: 0, classes: 0, assignments: 0, enrollments: 0, submissions: 0 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError('');
      try {
        const data = await api.adminDashboard();
        setSystem(data.system || {});
      } catch (e) {
        setError(e?.message || 'Không thể tải dashboard');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const systemStats = useMemo(() => ([
    { title: 'Tổng người dùng', value: system.users || 0, icon: <People />, color: '#1976d2', change: '' },
    { title: 'Giảng viên', value: system.teachers || 0, icon: <School />, color: '#388e3c', change: '' },
    { title: 'Sinh viên', value: system.students || 0, icon: <People />, color: '#f57c00', change: '' },
    { title: 'Lớp học', value: system.classes || 0, icon: <School />, color: '#7b1fa2', change: '' },
    { title: 'Bài tập', value: system.assignments || 0, icon: <Assignment />, color: '#d32f2f', change: '' },
    { title: 'Nộp bài', value: system.submissions || 0, icon: <TrendingUp />, color: '#00acc1', change: '' },
  ]), [system]);

  const [systemLogs] = useState([]);

  const [userActivityData] = useState([]);

  const [systemPerformanceData] = useState([]);

  const userRoleData = useMemo(() => ([
    { name: 'Sinh viên', value: system.students || 0, color: '#1976d2' },
    { name: 'Giảng viên', value: system.teachers || 0, color: '#388e3c' },
    { name: 'Admin', value: system.admins || 0, color: '#f57c00' },
  ]), [system]);

  const [recentActivities] = useState([
    {
      id: 1,
      type: 'user_login',
      description: 'Sinh viên Nguyễn Văn A đăng nhập',
      timestamp: '2 phút trước',
      icon: <People color="primary" />,
    },
    {
      id: 2,
      type: 'assignment_created',
      description: 'Giảng viên Trần Thị B tạo bài tập mới',
      timestamp: '5 phút trước',
      icon: <Assignment color="success" />,
    },
    {
      id: 3,
      type: 'system_alert',
      description: 'Cảnh báo: Sử dụng CPU cao',
      timestamp: '10 phút trước',
      icon: <Warning color="warning" />,
    },
    {
      id: 4,
      type: 'backup_completed',
      description: 'Sao lưu dữ liệu hoàn thành',
      timestamp: '1 giờ trước',
      icon: <CheckCircle color="success" />,
    },
  ]);

  const getLogLevelIcon = (level) => {
    switch (level) {
      case 'error': return <Error color="error" />;
      case 'warning': return <Warning color="warning" />;
      case 'success': return <CheckCircle color="success" />;
      case 'info': return <Info color="info" />;
      default: return <Notifications />;
    }
  };

  const getLogLevelColor = (level) => {
    switch (level) {
      case 'error': return 'error';
      case 'warning': return 'warning';
      case 'success': return 'success';
      case 'info': return 'info';
      default: return 'default';
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" gutterBottom>
          Dashboard Quản trị viên
        </Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button variant="outlined" startIcon={<Refresh />} onClick={async () => {
            setLoading(true); setError('');
            try { const data = await api.adminDashboard(); setSystem(data.system || {}); } catch(e){ setError(e?.message||'Không thể tải dashboard'); } finally { setLoading(false); }
          }}>
            Làm mới
          </Button>
          <Button variant="contained" startIcon={<Download />}>
            Xuất báo cáo
          </Button>
        </Box>
      </Box>

      <Typography variant="subtitle1" color="text.secondary" gutterBottom sx={{ mb: 3 }}>
        Tổng quan hệ thống và thống kê hoạt động
      </Typography>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {/* System Stats */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        {systemStats.map((stat, index) => (
          <Grid item xs={12} sm={6} md={4} lg={2} key={index}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <Avatar sx={{ bgcolor: stat.color, mr: 2 }}>
                    {stat.icon}
                  </Avatar>
                  <Box>
                    <Typography variant="h4" component="div">
                      {stat.value.toLocaleString()}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {stat.title}
                    </Typography>
                  </Box>
                </Box>
                {stat.change && (
                  <Typography variant="caption" color="success.main">
                    {stat.change}
                  </Typography>
                )}
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Grid container spacing={3}>
        {/* User Activity Chart */}
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Hoạt động người dùng trong tuần
            </Typography>
            <Box sx={{ height: 300 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={userActivityData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="users" fill="#1976d2" name="Tổng người dùng" />
                  <Bar dataKey="teachers" fill="#388e3c" name="Giảng viên" />
                  <Bar dataKey="students" fill="#f57c00" name="Sinh viên" />
                </BarChart>
              </ResponsiveContainer>
            </Box>
          </Paper>
        </Grid>

        {/* User Role Distribution */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Phân bố vai trò người dùng
            </Typography>
            <Box sx={{ height: 300 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={userRoleData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {userRoleData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </Box>
            <Box sx={{ mt: 2 }}>
              {userRoleData.map((item, index) => (
                <Box key={index} sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <Box
                    sx={{
                      width: 12,
                      height: 12,
                      backgroundColor: item.color,
                      borderRadius: '50%',
                      mr: 1,
                    }}
                  />
                  <Typography variant="body2">
                    {item.name}: {item.value}
                  </Typography>
                </Box>
              ))}
            </Box>
          </Paper>
        </Grid>

        {/* System Performance */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Hiệu suất hệ thống
            </Typography>
            <Box sx={{ height: 300 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={systemPerformanceData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis domain={[0, 100]} />
                  <Tooltip />
                  <Line type="monotone" dataKey="cpu" stroke="#d32f2f" strokeWidth={2} name="CPU %" />
                  <Line type="monotone" dataKey="memory" stroke="#1976d2" strokeWidth={2} name="Memory %" />
                  <Line type="monotone" dataKey="disk" stroke="#388e3c" strokeWidth={2} name="Disk %" />
                </LineChart>
              </ResponsiveContainer>
            </Box>
          </Paper>
        </Grid>

        {/* Recent Activities */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Hoạt động gần đây
            </Typography>
            <List>
              {recentActivities.map((activity) => (
                <ListItem key={activity.id} divider>
                  <ListItemIcon>
                    {activity.icon}
                  </ListItemIcon>
                  <ListItemText
                    primary={activity.description}
                    secondary={activity.timestamp}
                  />
                </ListItem>
              ))}
            </List>
          </Paper>
        </Grid>

        {/* System Logs */}
        <Grid item xs={12}>
          <Paper sx={{ p: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">
                Log hệ thống
              </Typography>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button size="small" variant="outlined">
                  Lọc
                </Button>
                <Button size="small" variant="outlined">
                  Xuất log
                </Button>
              </Box>
            </Box>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Thời gian</TableCell>
                    <TableCell>Mức độ</TableCell>
                    <TableCell>Thông báo</TableCell>
                    <TableCell>Người dùng</TableCell>
                    <TableCell>IP</TableCell>
                    <TableCell>Hành động</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {systemLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell>{log.timestamp}</TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          {getLogLevelIcon(log.level)}
                          <Chip
                            label={log.level}
                            color={getLogLevelColor(log.level)}
                            size="small"
                            sx={{ ml: 1 }}
                          />
                        </Box>
                      </TableCell>
                      <TableCell>{log.message}</TableCell>
                      <TableCell>{log.user}</TableCell>
                      <TableCell>{log.ip}</TableCell>
                      <TableCell>
                        <Button size="small" variant="outlined">
                          Chi tiết
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default AdminDashboard;
