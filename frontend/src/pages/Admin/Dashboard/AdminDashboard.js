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
  TablePagination,
} from '@mui/material';
import { People, School, Assignment, TrendingUp, Refresh, Download, Notifications } from '@mui/icons-material';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { api } from '../../../api/client';

const AdminDashboard = () => {
  const [system, setSystem] = useState({ users: 0, teachers: 0, students: 0, admins: 0, classes: 0, assignments: 0, enrollments: 0, submissions: 0 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [reports, setReports] = useState({ users: {}, classes: {}, assignments: {} });
  const [recentActivities, setRecentActivities] = useState([]);
  const [activitiesPage, setActivitiesPage] = useState(0);
  const activitiesRowsPerPage = 10;
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

      // Load reports & recent activities
      const [usersReport, classesReport, assignmentsReport, activitiesData] = await Promise.all([
        api.adminGetReportsUsers(),
        api.adminGetReportsClasses(),
        api.adminGetReportsAssignments(),
        api.adminGetActivities()
      ]);
      setReports({
        users: usersReport || {},
        classes: classesReport || {},
        assignments: assignmentsReport || {}
      });
      setRecentActivities(
        (activitiesData || []).map(activity => ({
          id: activity._id,
          description: activity.description,
          timestamp: new Date(activity.createdAt).toLocaleString('vi-VN'),
        }))
      );

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
  const systemPerformanceData = [];

  const getLogLevelIcon = () => null;
  const getLogLevelColor = () => 'default';

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
      <Box
        sx={{
          display: 'grid',
          gap: 3,
          gridTemplateColumns: {
            xs: 'repeat(auto-fit, minmax(220px, 1fr))',
            lg: 'repeat(6, minmax(0, 1fr))',
          },
          mb: 3,
        }}
      >
        {systemStats.map((stat, index) => (
          <Card key={index} sx={{ height: '100%' }}>
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
        ))}
      </Box>

      <Grid container spacing={3}>
        {recentActivities.length > 0 && (
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 2 }}>
              <Typography variant="h6" gutterBottom>
                Hoạt động gần đây
              </Typography>
              <List>
                {recentActivities
                  .slice(
                    activitiesPage * activitiesRowsPerPage,
                    activitiesPage * activitiesRowsPerPage + activitiesRowsPerPage
                  )
                  .map((activity) => (
                    <ListItem key={activity.id} divider>
                      <ListItemText primary={activity.description} secondary={activity.timestamp} />
                    </ListItem>
                  ))}
              </List>
              {recentActivities.length > activitiesRowsPerPage && (
                <TablePagination
                  component="div"
                  count={recentActivities.length}
                  page={activitiesPage}
                  onPageChange={(_, newPage) => setActivitiesPage(newPage)}
                  rowsPerPage={activitiesRowsPerPage}
                  rowsPerPageOptions={[activitiesRowsPerPage]}
                />
              )}
            </Paper>
          </Grid>
        )}
      </Grid>
    </Box>
  );
};

export default AdminDashboard;
