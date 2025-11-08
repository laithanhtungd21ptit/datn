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
  const [userActivities, setUserActivities] = useState([]);
  const [systemLogs, setSystemLogs] = useState([]);
  const [reports, setReports] = useState({ users: {}, classes: {}, assignments: {} });
  const [selectedReportType, setSelectedReportType] = useState('users');
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setLoading(true);
    setError('');
    try {
      // Load system stats
      const dashboardData = await api.adminDashboard();
      setSystem(dashboardData.system || {});

      // Load user activities
      const activitiesData = await api.adminGetActivities();
      setUserActivities(activitiesData || []);

      // Load system logs
      const logsData = await api.adminGetSystemLogs();
      setSystemLogs(logsData || []);

      // Load reports
      const [usersReport, classesReport, assignmentsReport] = await Promise.all([
        api.adminGetReportsUsers(),
        api.adminGetReportsClasses(),
        api.adminGetReportsAssignments()
      ]);
      setReports({
        users: usersReport || {},
        classes: classesReport || {},
        assignments: assignmentsReport || {}
      });

    } catch (e) {
      setError(e?.message || 'Không thể tải dashboard');
    } finally {
      setLoading(false);
    }
  };

  const systemStats = useMemo(() => ([
    { title: 'Tổng người dùng', value: system.users || 0, icon: <People />, color: '#1976d2', change: '' },
    { title: 'Giảng viên', value: system.teachers || 0, icon: <School />, color: '#388e3c', change: '' },
    { title: 'Sinh viên', value: system.students || 0, icon: <People />, color: '#f57c00', change: '' },
    { title: 'Lớp học', value: system.classes || 0, icon: <School />, color: '#7b1fa2', change: '' },
    { title: 'Bài tập', value: system.assignments || 0, icon: <Assignment />, color: '#d32f2f', change: '' },
    { title: 'Nộp bài', value: system.submissions || 0, icon: <TrendingUp />, color: '#00acc1', change: '' },
  ]), [system]);

  const userRoleData = useMemo(() => ([
    { name: 'Sinh viên', value: system.students || 0, color: '#1976d2' },
    { name: 'Giảng viên', value: system.teachers || 0, color: '#388e3c' },
    { name: 'Admin', value: system.admins || 0, color: '#f57c00' },
  ]), [system]);

  const getActivityIcon = (actionType) => {
    switch (actionType) {
    case 'login':
  case 'logout':
    return <People color="primary" />;
  case 'create_assignment':
  case 'submit_assignment':
  case 'grade_submission':
    return <Assignment color="success" />;
  case 'join_class':
    case 'create_class':
        return <School color="info" />;
      case 'create_user':
      case 'update_user':
        return <People color="secondary" />;
    default:
      return <Info color="default" />;
  }
  };

  // Process user activities for display with Vietnamese descriptions
  const recentActivities = useMemo(() => {
  return userActivities.slice(0, 10).map(activity => {
  let vietnameseDescription = activity.description;

    // Convert English descriptions to Vietnamese
  if (activity.description.includes('logged in')) {
      const userId = activity.role === 'student' ? (activity.userId?.studentId || 'Unknown') : activity.role === 'teacher' ? (activity.userId?.teacherId || 'Unknown') : activity.userId?.username || 'Unknown';
    const roleText = activity.role === 'student' ? 'Sinh viên' : activity.role === 'teacher' ? 'Giảng viên' : 'Admin';
    vietnameseDescription = `${roleText} ${userId} đã đăng nhập`;
    } else if (activity.description.includes('logged out')) {
        const userId = activity.role === 'student' ? (activity.userId?.studentId || 'Unknown') : activity.role === 'teacher' ? (activity.userId?.teacherId || 'Unknown') : activity.userId?.username || 'Unknown';
        const roleText = activity.role === 'student' ? 'Sinh viên' : activity.role === 'teacher' ? 'Giảng viên' : 'Admin';
        vietnameseDescription = `${roleText} ${userId} đã đăng xuất`;
      } else if (activity.description.includes('Created assignment')) {
        vietnameseDescription = activity.description.replace('Created assignment:', 'Đã tạo bài tập:');
      } else if (activity.description.includes('Submitted assignment')) {
        vietnameseDescription = activity.description.replace('Submitted assignment:', 'Đã nộp bài tập:');
      } else if (activity.description.includes('Graded submission')) {
        vietnameseDescription = activity.description.replace('Graded submission for', 'Đã chấm bài nộp của');
      } else if (activity.description.includes('Created user account')) {
        vietnameseDescription = activity.description.replace('Created user account:', 'Đã tạo tài khoản:');
      } else if (activity.description.includes('Joined class')) {
        vietnameseDescription = activity.description.replace('Joined class:', 'Đã tham gia lớp:');
      } else if (activity.description.includes('Created class')) {
        vietnameseDescription = activity.description.replace('Created class:', 'Đã tạo lớp học:');
      }

      return {
        id: activity._id,
        type: activity.actionType,
        description: vietnameseDescription,
        timestamp: new Date(activity.createdAt).toLocaleString('vi-VN'),
        icon: getActivityIcon(activity.actionType),
        user: activity.userId?.fullName || 'Unknown User',
        role: activity.role
      };
    });
  }, [userActivities]);

  const handleExportReport = async (reportType) => {
    try {
      let csvData = '';
      let filename = '';

      switch (reportType) {
        case 'users':
          // Get users data
          const userStats = reports.users;
          if (!userStats.usersByRole) {
            throw new Error('Không có dữ liệu người dùng để xuất');
          }

          const usersData = [
            ['Vai trò', 'Số lượng'],
            ...userStats.usersByRole.map(role => [role.role, role.count])
          ];

          if (userStats.usersByPeriod && userStats.usersByPeriod.length > 0) {
            usersData.push([]);
            usersData.push(['Ngày', 'Số người dùng đăng ký']);
            usersData.push(...userStats.usersByPeriod.map(period => [period.date, period.count]));
          }

          csvData = usersData.map(row => row.map(cell => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
          filename = `bao_cao_nguoi_dung_${new Date().toISOString().split('T')[0]}.csv`;
          break;

        case 'classes':
          const classStats = reports.classes;
          if (!classStats) {
            throw new Error('Không có dữ liệu lớp học để xuất');
          }

          csvData = [
            ['Tổng số lớp học', classStats.totalClasses],
            ['Lớp học đang hoạt động', classStats.activeClasses]
          ].map(row => row.map(cell => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
          filename = `bao_cao_lop_hoc_${new Date().toISOString().split('T')[0]}.csv`;
          break;

        case 'assignments':
          const assignmentStats = reports.assignments;
          if (!assignmentStats) {
            throw new Error('Không có dữ liệu bài tập để xuất');
          }

          csvData = [
            ['Tổng số bài tập', assignmentStats.totalAssignments],
            ['Bài tập đã nộp', assignmentStats.submittedAssignments],
            ['Bài tập chưa nộp', assignmentStats.notSubmittedAssignments]
          ].map(row => row.map(cell => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
          filename = `bao_cao_bai_tap_${new Date().toISOString().split('T')[0]}.csv`;
          break;

        default:
          throw new Error('Loại báo cáo không hợp lệ');
      }

      // Create and download CSV file
      const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      // Log export activity (call API but don't wait for it)
      try {
        await api.adminExportReport(reportType);
      } catch (logError) {
        console.warn('Failed to log export activity:', logError);
      }

    } catch (error) {
      console.error('Export error:', error);
      throw error;
    }
  };

  // Sample system performance data
  const systemPerformanceData = useMemo(() => ([
    { name: '00:00', cpu: 45, memory: 62, disk: 23 },
    { name: '04:00', cpu: 52, memory: 68, disk: 25 },
  { name: '08:00', cpu: 78, memory: 75, disk: 28 },
  { name: '12:00', cpu: 85, memory: 82, disk: 32 },
  { name: '16:00', cpu: 72, memory: 78, disk: 29 },
  { name: '20:00', cpu: 65, memory: 71, disk: 26 },
  ]), []);

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
          <Button variant="outlined" startIcon={<Refresh />} onClick={loadDashboardData} disabled={loading}>
          Làm mới
          </Button>
          <Button
          variant="contained"
            startIcon={<Download />}
            onClick={async () => {
              setExporting(true);
              try {
                // Simple CSV export for now
                let csvData = 'Tên,Số lượng\nTổng số,100\nĐã hoạt động,95';
                let filename = `bao_cao_${selectedReportType}_${new Date().toISOString().split('T')[0]}.csv`;

                const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = filename;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);

                await api.adminExportReport(selectedReportType);
              } catch (e) {
                setError('Không thể xuất báo cáo: ' + e?.message);
              } finally {
                setExporting(false);
              }
            }}
            disabled={exporting}
          >
            {exporting ? 'Đang xuất...' : 'Xuất báo cáo'}
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
                  <TableRow key={log._id}>
                  <TableCell>{new Date(log.createdAt).toLocaleString('vi-VN')}</TableCell>
                  <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  {getLogLevelIcon(log.level)}
                  <Chip
                  label={log.level.toUpperCase()}
                  color={getLogLevelColor(log.level)}
                  size="small"
                  sx={{ ml: 1 }}
                  />
                  </Box>
                  </TableCell>
                  <TableCell>{log.message}</TableCell>
                  <TableCell>{log.userId ? 'User' : 'System'}</TableCell>
                  <TableCell>{log.ipAddress || 'N/A'}</TableCell>
                  <TableCell>
                  <Button size="small" variant="outlined" disabled>
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
