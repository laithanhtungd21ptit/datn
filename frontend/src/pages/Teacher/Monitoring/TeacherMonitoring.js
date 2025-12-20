import React, { useState, useEffect, useCallback } from 'react';
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
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Pagination,
  CircularProgress,
  Alert,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Badge,
  Tooltip,
  Tabs,
  Tab,
  TextField,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Menu,
} from '@mui/material';
import {
  ArrowBack,
  Refresh,
  Visibility,
  Warning,
  Error,
  CheckCircle,
  AccessTime,
  Person,
  School,
  Monitor,
  Notifications,
  Phone,
  Book,
  Laptop,
  Keyboard,
  History,
  FilterList,
  FileDownload,
  PictureAsPdf,
  TableChart,
  MoreVert,
} from '@mui/icons-material';
import { apiRequest } from '../../../api/client.js';
import { useSnackbar } from 'notistack';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import socketService from '../../../services/SocketService';

const TeacherMonitoring = () => {
  const { enqueueSnackbar } = useSnackbar();
  
  // View states: 'exams' | 'sessions' | 'violations'
  const [currentView, setCurrentView] = useState('exams');
  const [selectedExam, setSelectedExam] = useState(null);
  const [selectedSession, setSelectedSession] = useState(null);

  // Exams list
  const [exams, setExams] = useState([]);
  const [examsLoading, setExamsLoading] = useState(false);
  const [examsPagination, setExamsPagination] = useState({
    page: 1,
    limit: 5,
    total: 0,
    totalPages: 1
  });

  // Sessions list
  const [sessions, setSessions] = useState([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [sessionsStats, setSessionsStats] = useState(null);
  const [sessionFilter, setSessionFilter] = useState('all'); // 'all' | 'in_progress' | 'completed' | 'terminated'
  const [sessionTab, setSessionTab] = useState(0); // 0: Đang diễn ra, 1: Lịch sử

  // Recently viewed history (localStorage)
  const [recentlyViewed, setRecentlyViewed] = useState([]);

  // Export menu
  const [exportMenuAnchor, setExportMenuAnchor] = useState(null);
  const [exportMenuType, setExportMenuType] = useState(null); // 'sessions' | 'violations'

  // Violations log
  const [violations, setViolations] = useState([]);
  const [violationsLoading, setViolationsLoading] = useState(false);
  const [sessionInfo, setSessionInfo] = useState(null);

  // Real-time polling
  const [pollingInterval, setPollingInterval] = useState(null);

  // Socket.IO state
  const [socketConnected, setSocketConnected] = useState(false);
  const [currentMonitoringExamId, setCurrentMonitoringExamId] = useState(null);

  // Load exams list
  const loadExams = useCallback(async (page = 1) => {
    setExamsLoading(true);
    try {
      const response = await apiRequest(`/api/monitoring/exams?page=${page}&limit=${examsPagination.limit}`);
      if (response.success) {
        setExams(response.exams);
        setExamsPagination(response.pagination);
      }
    } catch (error) {
      console.error('Error loading exams:', error);
      enqueueSnackbar('Không thể tải danh sách kỳ thi', { variant: 'error' });
    } finally {
      setExamsLoading(false);
    }
  }, [examsPagination.limit, enqueueSnackbar]);

  // Load sessions for an exam
  const loadSessions = useCallback(async (examId, status = null) => {
    setSessionsLoading(true);
    try {
      const url = status 
        ? `/api/monitoring/exam/${examId}/sessions?status=${status}`
        : `/api/monitoring/exam/${examId}/sessions`;
      const response = await apiRequest(url);
      if (response.success) {
        setSessions(response.sessions);
        setSessionsStats(response.stats);
      }
    } catch (error) {
      console.error('Error loading sessions:', error);
      enqueueSnackbar('Không thể tải danh sách sinh viên', { variant: 'error' });
    } finally {
      setSessionsLoading(false);
    }
  }, [enqueueSnackbar]);

  // Load violations for a session
  const loadViolations = useCallback(async (sessionId) => {
    setViolationsLoading(true);
    try {
      const response = await apiRequest(`/api/monitoring/session/${sessionId}/violations`);
      if (response.success) {
        setViolations(response.violations);
        setSessionInfo(response.session);
      }
    } catch (error) {
      console.error('Error loading violations:', error);
      enqueueSnackbar('Không thể tải nhật ký vi phạm', { variant: 'error' });
    } finally {
      setViolationsLoading(false);
    }
  }, [enqueueSnackbar]);

  // Start real-time polling for violations
  const startPolling = useCallback((sessionId) => {
    // Clear existing interval
    if (pollingInterval) {
      clearInterval(pollingInterval);
    }

    // Poll every 3 seconds
    const interval = setInterval(() => {
      loadViolations(sessionId);
    }, 3000);

    setPollingInterval(interval);
  }, [pollingInterval, loadViolations]);

  // Stop polling
  const stopPolling = useCallback(() => {
    if (pollingInterval) {
      clearInterval(pollingInterval);
      setPollingInterval(null);
    }
  }, [pollingInterval]);

  // Handle exam selection
  const handleExamSelect = (exam) => {
    setSelectedExam(exam);
    setCurrentView('sessions');
    setSessionTab(0); // Reset to "Đang diễn ra" tab
    loadSessions(exam.id); // Load all first
    
    // Join teacher monitoring room via Socket.IO
    if (socketService.isSocketConnected()) {
      // Leave previous exam room if exists
      if (currentMonitoringExamId) {
        socketService.teacherLeaveMonitoring(currentMonitoringExamId);
      }
      // Join new exam room
      socketService.teacherJoinMonitoring(exam.id);
      setCurrentMonitoringExamId(exam.id);
    }
  };

  // Handle session selection
  const handleSessionSelect = (session) => {
    setSelectedSession(session);
    setCurrentView('violations');
    loadViolations(session.id);
    
    // Save to recently viewed history
    saveToHistory({
      sessionId: session.id,
      studentName: session.student?.fullName || 'Unknown',
      studentId: session.student?.studentId || session.student?.email,
      examTitle: selectedExam?.title,
      examId: selectedExam?.id,
      viewedAt: new Date().toISOString(),
      status: session.status,
      totalViolations: session.totalViolations
    });
    
    // Start real-time polling if session is in progress
    if (session.status === 'in_progress') {
      startPolling(session.id);
    }
  };

  // Save to recently viewed history (localStorage)
  // KHÔNG XÓA MỤC CŨ - Lưu lại tất cả lịch sử
  const saveToHistory = (item) => {
    try {
      const key = 'teacher_monitoring_history';
      const existing = JSON.parse(localStorage.getItem(key) || '[]');
      
      // Check if this exact session was viewed before (same sessionId and similar timestamp)
      // Only add if it's a new viewing session (not duplicate within 1 minute)
      const now = new Date(item.viewedAt);
      const isDuplicate = existing.some(h => {
        if (h.sessionId !== item.sessionId) return false;
        const viewedTime = new Date(h.viewedAt);
        const diffMinutes = (now - viewedTime) / (1000 * 60);
        return diffMinutes < 1; // Same session viewed within 1 minute = duplicate
      });
      
      if (!isDuplicate) {
        // Add to beginning - KHÔNG GIỚI HẠN SỐ LƯỢNG
        const updated = [item, ...existing];
        localStorage.setItem(key, JSON.stringify(updated));
        setRecentlyViewed(updated);
      }
    } catch (error) {
      console.error('Error saving to history:', error);
      // If localStorage is full, try to handle gracefully
      if (error.name === 'QuotaExceededError') {
        enqueueSnackbar('Lưu trữ đầy. Vui lòng xóa một số lịch sử cũ.', { variant: 'warning' });
      }
    }
  };

  // Load recently viewed history
  const loadHistory = useCallback(() => {
    try {
      const key = 'teacher_monitoring_history';
      const history = JSON.parse(localStorage.getItem(key) || '[]');
      setRecentlyViewed(history);
    } catch (error) {
      console.error('Error loading history:', error);
    }
  }, []);

  // Clear history
  const clearHistory = () => {
    try {
      localStorage.removeItem('teacher_monitoring_history');
      setRecentlyViewed([]);
      enqueueSnackbar('Đã xóa lịch sử', { variant: 'success' });
    } catch (error) {
      console.error('Error clearing history:', error);
    }
  };

  // Export session violations to Excel
  const exportSessionViolations = async () => {
    if (!sessionInfo || violations.length === 0) {
      enqueueSnackbar('Không có dữ liệu để xuất', { variant: 'warning' });
      return;
    }

    try {
      // Prepare data
      const worksheetData = violations.map((v, index) => ({
        'STT': index + 1,
        'Thời gian': new Date(v.timestamp).toLocaleString('vi-VN'),
        'Loại vi phạm': v.type,
        'Mô tả': formatViolationDescription(v),
        'Chi tiết': v.details ? JSON.stringify(v.details, null, 2) : '',
      }));

      // Add header row
      const headerData = [
        {
          'STT': 'STT',
          'Thời gian': 'Thời gian',
          'Loại vi phạm': 'Loại vi phạm',
          'Mô tả': 'Mô tả',
          'Chi tiết': 'Chi tiết',
        },
        ...worksheetData
      ];

      // Create workbook
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(headerData, { skipHeader: true });

      // Set column widths
      ws['!cols'] = [
        { wch: 5 },  // STT
        { wch: 20 }, // Thời gian
        { wch: 25 }, // Loại vi phạm
        { wch: 50 }, // Mô tả
        { wch: 40 }, // Chi tiết
      ];

      // Add worksheet
      XLSX.utils.book_append_sheet(wb, ws, 'Vi phạm');

      // Add summary sheet
      const summaryData = [
        ['Thông tin phiên thi'],
        ['Sinh viên', sessionInfo.student?.fullName || 'Unknown'],
        ['Mã sinh viên', sessionInfo.student?.studentId || sessionInfo.student?.email || ''],
        ['Kỳ thi', sessionInfo.assignment?.title || ''],
        ['Trạng thái', sessionInfo.status],
        ['Thời gian bắt đầu', new Date(sessionInfo.startedAt).toLocaleString('vi-VN')],
        ['Thời gian kết thúc', sessionInfo.endedAt ? new Date(sessionInfo.endedAt).toLocaleString('vi-VN') : 'Chưa kết thúc'],
        ['Tổng số vi phạm', sessionInfo.totalViolations],
        [''],
        ['Tổng hợp theo loại vi phạm'],
      ];

      // Count violations by type
      const violationCounts = {};
      violations.forEach(v => {
        violationCounts[v.type] = (violationCounts[v.type] || 0) + 1;
      });

      summaryData.push(['Loại vi phạm', 'Số lần']);
      Object.entries(violationCounts).forEach(([type, count]) => {
        summaryData.push([type, count]);
      });

      const summaryWs = XLSX.utils.aoa_to_sheet(summaryData);
      summaryWs['!cols'] = [
        { wch: 30 },
        { wch: 30 },
      ];
      XLSX.utils.book_append_sheet(wb, summaryWs, 'Tổng hợp');

      // Generate filename
      const studentName = sessionInfo.student?.fullName?.replace(/[^a-zA-Z0-9]/g, '_') || 'Unknown';
      const examTitle = sessionInfo.assignment?.title?.replace(/[^a-zA-Z0-9]/g, '_') || 'Exam';
      const filename = `Vi_pham_${studentName}_${examTitle}_${new Date().toISOString().split('T')[0]}.xlsx`;

      // Save file
      XLSX.writeFile(wb, filename);
      enqueueSnackbar('Đã xuất file Excel thành công', { variant: 'success' });
    } catch (error) {
      console.error('Error exporting to Excel:', error);
      enqueueSnackbar('Lỗi khi xuất file Excel', { variant: 'error' });
    }
  };

  // Export all sessions of an exam to Excel
  const exportExamSessions = async () => {
    if (!selectedExam || sessions.length === 0) {
      enqueueSnackbar('Không có dữ liệu để xuất', { variant: 'warning' });
      return;
    }

    try {
      enqueueSnackbar('Đang xuất file Excel...', { variant: 'info' });

      // Load violations for all sessions
      const sessionsWithViolations = await Promise.all(
        sessions.map(async (session) => {
          try {
            const response = await apiRequest(`/api/monitoring/session/${session.id}/violations`);
            if (response.success) {
              return {
                ...session,
                violations: response.violations || []
              };
            }
            return { ...session, violations: [] };
          } catch (error) {
            console.error(`Error loading violations for session ${session.id}:`, error);
            return { ...session, violations: [] };
          }
        })
      );

      // Create workbook
      const wb = XLSX.utils.book_new();

      // Sheet 1: Summary
      const summaryData = [
        ['Tổng hợp kỳ thi'],
        ['Tên kỳ thi', selectedExam.title],
        ['Lớp', selectedExam.className],
        ['Mã lớp', selectedExam.classCode],
        ['Thời gian bắt đầu', selectedExam.startTime ? new Date(selectedExam.startTime).toLocaleString('vi-VN') : ''],
        ['Thời gian kết thúc', selectedExam.endTime ? new Date(selectedExam.endTime).toLocaleString('vi-VN') : ''],
        [''],
        ['Thống kê'],
        ['Tổng số sinh viên', sessions.length],
        ['Đang thi', sessions.filter(s => s.status === 'in_progress').length],
        ['Hoàn thành', sessions.filter(s => s.status === 'completed').length],
        ['Bị kết thúc', sessions.filter(s => s.status === 'terminated').length],
        ['Tổng số vi phạm', sessions.reduce((sum, s) => sum + s.totalViolations, 0)],
        [''],
        ['Danh sách sinh viên'],
        ['STT', 'Tên sinh viên', 'Mã sinh viên', 'Trạng thái', 'Thời gian bắt đầu', 'Thời gian kết thúc', 'Thời gian thi (phút)', 'Số vi phạm'],
      ];

      sessionsWithViolations.forEach((session, index) => {
        summaryData.push([
          index + 1,
          session.student?.fullName || 'Unknown',
          session.student?.studentId || session.student?.email || '',
          session.status === 'in_progress' ? 'Đang thi' :
          session.status === 'completed' ? 'Hoàn thành' :
          session.status === 'terminated' ? 'Bị kết thúc' : session.status,
          new Date(session.startedAt).toLocaleString('vi-VN'),
          session.endedAt ? new Date(session.endedAt).toLocaleString('vi-VN') : '',
          session.durationMinutes || '',
          session.totalViolations,
        ]);
      });

      const summaryWs = XLSX.utils.aoa_to_sheet(summaryData);
      summaryWs['!cols'] = [
        { wch: 5 }, { wch: 25 }, { wch: 15 }, { wch: 12 }, 
        { wch: 20 }, { wch: 20 }, { wch: 15 }, { wch: 12 }
      ];
      XLSX.utils.book_append_sheet(wb, summaryWs, 'Tổng hợp');

      // Sheet 2: All violations
      const allViolationsData = [
        ['STT', 'Sinh viên', 'Mã SV', 'Thời gian', 'Loại vi phạm', 'Mô tả', 'Chi tiết'],
      ];

      let violationIndex = 1;
      sessionsWithViolations.forEach((session) => {
        session.violations.forEach((violation) => {
          allViolationsData.push([
            violationIndex++,
            session.student?.fullName || 'Unknown',
            session.student?.studentId || session.student?.email || '',
            new Date(violation.timestamp).toLocaleString('vi-VN'),
            violation.type,
            formatViolationDescription(violation),
            violation.details ? JSON.stringify(violation.details, null, 2) : '',
          ]);
        });
      });

      const violationsWs = XLSX.utils.aoa_to_sheet(allViolationsData);
      violationsWs['!cols'] = [
        { wch: 5 }, { wch: 25 }, { wch: 15 }, { wch: 20 },
        { wch: 25 }, { wch: 50 }, { wch: 40 }
      ];
      XLSX.utils.book_append_sheet(wb, violationsWs, 'Tất cả vi phạm');

      // Sheet 3: Violations by student (one sheet per student with violations)
      sessionsWithViolations.forEach((session) => {
        if (session.violations.length > 0) {
          const studentName = (session.student?.fullName || 'Unknown').replace(/[^a-zA-Z0-9]/g, '_');
          const studentData = [
            [`Vi phạm của ${session.student?.fullName || 'Unknown'}`],
            ['Mã sinh viên', session.student?.studentId || session.student?.email || ''],
            ['Trạng thái', session.status],
            ['Thời gian bắt đầu', new Date(session.startedAt).toLocaleString('vi-VN')],
            ['Thời gian kết thúc', session.endedAt ? new Date(session.endedAt).toLocaleString('vi-VN') : 'Chưa kết thúc'],
            ['Tổng số vi phạm', session.totalViolations],
            [''],
            ['STT', 'Thời gian', 'Loại vi phạm', 'Mô tả', 'Chi tiết'],
          ];

          session.violations.forEach((violation, index) => {
            studentData.push([
              index + 1,
              new Date(violation.timestamp).toLocaleString('vi-VN'),
              violation.type,
              formatViolationDescription(violation),
              violation.details ? JSON.stringify(violation.details, null, 2) : '',
            ]);
          });

          const studentWs = XLSX.utils.aoa_to_sheet(studentData);
          studentWs['!cols'] = [
            { wch: 5 }, { wch: 20 }, { wch: 25 }, { wch: 50 }, { wch: 40 }
          ];
          
          // Limit sheet name to 31 characters (Excel limit)
          const sheetName = studentName.length > 31 ? studentName.substring(0, 31) : studentName;
          XLSX.utils.book_append_sheet(wb, studentWs, sheetName);
        }
      });

      // Generate filename
      const examTitle = selectedExam.title.replace(/[^a-zA-Z0-9]/g, '_');
      const filename = `Bao_cao_giam_sat_${examTitle}_${new Date().toISOString().split('T')[0]}.xlsx`;

      // Save file
      XLSX.writeFile(wb, filename);
      enqueueSnackbar('Đã xuất file Excel thành công', { variant: 'success' });
    } catch (error) {
      console.error('Error exporting exam sessions:', error);
      enqueueSnackbar('Lỗi khi xuất file Excel', { variant: 'error' });
    }
  };

  // Export session violations to PDF
  const exportSessionViolationsPDF = async () => {
    if (!sessionInfo || violations.length === 0) {
      enqueueSnackbar('Không có dữ liệu để xuất', { variant: 'warning' });
      return;
    }

    try {
      const doc = new jsPDF();
      let yPos = 20;

      // Title
      doc.setFontSize(18);
      doc.text('BÁO CÁO VI PHẠM', 105, yPos, { align: 'center' });
      yPos += 10;

      // Session info
      doc.setFontSize(12);
      doc.text(`Sinh viên: ${sessionInfo.student?.fullName || 'Unknown'}`, 14, yPos);
      yPos += 7;
      doc.text(`Mã sinh viên: ${sessionInfo.student?.studentId || sessionInfo.student?.email || ''}`, 14, yPos);
      yPos += 7;
      doc.text(`Kỳ thi: ${sessionInfo.assignment?.title || ''}`, 14, yPos);
      yPos += 7;
      doc.text(`Trạng thái: ${sessionInfo.status}`, 14, yPos);
      yPos += 7;
      doc.text(`Thời gian bắt đầu: ${new Date(sessionInfo.startedAt).toLocaleString('vi-VN')}`, 14, yPos);
      yPos += 7;
      if (sessionInfo.endedAt) {
        doc.text(`Thời gian kết thúc: ${new Date(sessionInfo.endedAt).toLocaleString('vi-VN')}`, 14, yPos);
        yPos += 7;
      }
      doc.text(`Tổng số vi phạm: ${sessionInfo.totalViolations}`, 14, yPos);
      yPos += 10;

      // Violations table
      const tableData = violations.map((v, index) => [
        index + 1,
        new Date(v.timestamp).toLocaleString('vi-VN'),
        v.type,
        formatViolationDescription(v).substring(0, 60) + (formatViolationDescription(v).length > 60 ? '...' : '')
      ]);

      doc.autoTable({
        startY: yPos,
        head: [['STT', 'Thời gian', 'Loại vi phạm', 'Mô tả']],
        body: tableData,
        styles: { fontSize: 9 },
        headStyles: { fillColor: [66, 139, 202] },
        margin: { top: yPos },
      });

      // Generate filename
      const studentName = sessionInfo.student?.fullName?.replace(/[^a-zA-Z0-9]/g, '_') || 'Unknown';
      const examTitle = sessionInfo.assignment?.title?.replace(/[^a-zA-Z0-9]/g, '_') || 'Exam';
      const filename = `Vi_pham_${studentName}_${examTitle}_${new Date().toISOString().split('T')[0]}.pdf`;

      doc.save(filename);
      enqueueSnackbar('Đã xuất file PDF thành công', { variant: 'success' });
    } catch (error) {
      console.error('Error exporting to PDF:', error);
      enqueueSnackbar('Lỗi khi xuất file PDF', { variant: 'error' });
    }
  };

  // Export session violations to CSV
  const exportSessionViolationsCSV = () => {
    if (!sessionInfo || violations.length === 0) {
      enqueueSnackbar('Không có dữ liệu để xuất', { variant: 'warning' });
      return;
    }

    try {
      // CSV header
      let csv = 'STT,Thời gian,Loại vi phạm,Mô tả,Chi tiết\n';

      // CSV rows
      violations.forEach((v, index) => {
        const row = [
          index + 1,
          `"${new Date(v.timestamp).toLocaleString('vi-VN')}"`,
          `"${v.type}"`,
          `"${formatViolationDescription(v).replace(/"/g, '""')}"`,
          `"${(v.details ? JSON.stringify(v.details) : '').replace(/"/g, '""')}"`
        ];
        csv += row.join(',') + '\n';
      });

      // Create blob and download
      const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);

      const studentName = sessionInfo.student?.fullName?.replace(/[^a-zA-Z0-9]/g, '_') || 'Unknown';
      const examTitle = sessionInfo.assignment?.title?.replace(/[^a-zA-Z0-9]/g, '_') || 'Exam';
      const filename = `Vi_pham_${studentName}_${examTitle}_${new Date().toISOString().split('T')[0]}.csv`;

      link.setAttribute('download', filename);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      enqueueSnackbar('Đã xuất file CSV thành công', { variant: 'success' });
    } catch (error) {
      console.error('Error exporting to CSV:', error);
      enqueueSnackbar('Lỗi khi xuất file CSV', { variant: 'error' });
    }
  };

  // Export exam sessions to PDF
  const exportExamSessionsPDF = async () => {
    if (!selectedExam || sessions.length === 0) {
      enqueueSnackbar('Không có dữ liệu để xuất', { variant: 'warning' });
      return;
    }

    try {
      enqueueSnackbar('Đang xuất file PDF...', { variant: 'info' });

      // Load violations for all sessions
      const sessionsWithViolations = await Promise.all(
        sessions.map(async (session) => {
          try {
            const response = await apiRequest(`/api/monitoring/session/${session.id}/violations`);
            if (response.success) {
              return {
                ...session,
                violations: response.violations || []
              };
            }
            return { ...session, violations: [] };
          } catch (error) {
            console.error(`Error loading violations for session ${session.id}:`, error);
            return { ...session, violations: [] };
          }
        })
      );

      const doc = new jsPDF();
      let pageNumber = 1;

      // Helper function to add new page
      const addNewPage = () => {
        doc.addPage();
        pageNumber++;
        return 20;
      };

      let yPos = 20;

      // Title page
      doc.setFontSize(20);
      doc.text('BÁO CÁO GIÁM SÁT KỲ THI', 105, yPos, { align: 'center' });
      yPos += 15;

      doc.setFontSize(14);
      doc.text(selectedExam.title, 105, yPos, { align: 'center' });
      yPos += 10;

      doc.setFontSize(12);
      doc.text(`Lớp: ${selectedExam.className} (${selectedExam.classCode})`, 14, yPos);
      yPos += 7;
      if (selectedExam.startTime) {
        doc.text(`Thời gian bắt đầu: ${new Date(selectedExam.startTime).toLocaleString('vi-VN')}`, 14, yPos);
        yPos += 7;
      }
      if (selectedExam.endTime) {
        doc.text(`Thời gian kết thúc: ${new Date(selectedExam.endTime).toLocaleString('vi-VN')}`, 14, yPos);
        yPos += 7;
      }
      yPos += 5;

      // Statistics
      doc.setFontSize(14);
      doc.text('Thống kê', 14, yPos);
      yPos += 10;

      doc.setFontSize(11);
      const stats = [
        `Tổng số sinh viên: ${sessions.length}`,
        `Đang thi: ${sessions.filter(s => s.status === 'in_progress').length}`,
        `Hoàn thành: ${sessions.filter(s => s.status === 'completed').length}`,
        `Bị kết thúc: ${sessions.filter(s => s.status === 'terminated').length}`,
        `Tổng số vi phạm: ${sessions.reduce((sum, s) => sum + s.totalViolations, 0)}`
      ];

      stats.forEach(stat => {
        if (yPos > 270) yPos = addNewPage();
        doc.text(stat, 14, yPos);
        yPos += 7;
      });

      yPos += 10;

      // Sessions table
      if (yPos > 200) yPos = addNewPage();
      doc.setFontSize(14);
      doc.text('Danh sách sinh viên', 14, yPos);
      yPos += 10;

      const sessionsTableData = sessionsWithViolations.map((session, index) => [
        index + 1,
        session.student?.fullName || 'Unknown',
        session.student?.studentId || session.student?.email || '',
        session.status === 'in_progress' ? 'Đang thi' :
        session.status === 'completed' ? 'Hoàn thành' :
        session.status === 'terminated' ? 'Bị kết thúc' : session.status,
        session.totalViolations.toString()
      ]);

      doc.autoTable({
        startY: yPos,
        head: [['STT', 'Tên sinh viên', 'Mã SV', 'Trạng thái', 'Số vi phạm']],
        body: sessionsTableData,
        styles: { fontSize: 9 },
        headStyles: { fillColor: [66, 139, 202] },
        margin: { top: yPos },
        didDrawPage: (data) => {
          yPos = data.cursor.y;
        }
      });

      yPos = doc.lastAutoTable.finalY + 15;

      // Violations by student
      sessionsWithViolations.forEach((session, sessionIndex) => {
        if (session.violations.length > 0) {
          if (yPos > 200) yPos = addNewPage();

          doc.setFontSize(14);
          doc.text(`Vi phạm của ${session.student?.fullName || 'Unknown'}`, 14, yPos);
          yPos += 10;

          doc.setFontSize(10);
          doc.text(`Mã SV: ${session.student?.studentId || session.student?.email || ''}`, 14, yPos);
          yPos += 6;
          doc.text(`Trạng thái: ${session.status}`, 14, yPos);
          yPos += 6;
          doc.text(`Số vi phạm: ${session.totalViolations}`, 14, yPos);
          yPos += 10;

          const violationsTableData = session.violations.map((v, index) => [
            index + 1,
            new Date(v.timestamp).toLocaleString('vi-VN'),
            v.type,
            formatViolationDescription(v).substring(0, 50) + (formatViolationDescription(v).length > 50 ? '...' : '')
          ]);

          doc.autoTable({
            startY: yPos,
            head: [['STT', 'Thời gian', 'Loại vi phạm', 'Mô tả']],
            body: violationsTableData,
            styles: { fontSize: 8 },
            headStyles: { fillColor: [108, 117, 125] },
            margin: { top: yPos },
            didDrawPage: (data) => {
              yPos = data.cursor.y;
            }
          });

          yPos = doc.lastAutoTable.finalY + 15;
        }
      });

      // Generate filename
      const examTitle = selectedExam.title.replace(/[^a-zA-Z0-9]/g, '_');
      const filename = `Bao_cao_giam_sat_${examTitle}_${new Date().toISOString().split('T')[0]}.pdf`;

      doc.save(filename);
      enqueueSnackbar('Đã xuất file PDF thành công', { variant: 'success' });
    } catch (error) {
      console.error('Error exporting exam sessions to PDF:', error);
      enqueueSnackbar('Lỗi khi xuất file PDF', { variant: 'error' });
    }
  };

  // Export exam sessions to CSV
  const exportExamSessionsCSV = async () => {
    if (!selectedExam || sessions.length === 0) {
      enqueueSnackbar('Không có dữ liệu để xuất', { variant: 'warning' });
      return;
    }

    try {
      enqueueSnackbar('Đang xuất file CSV...', { variant: 'info' });

      // Load violations for all sessions
      const sessionsWithViolations = await Promise.all(
        sessions.map(async (session) => {
          try {
            const response = await apiRequest(`/api/monitoring/session/${session.id}/violations`);
            if (response.success) {
              return {
                ...session,
                violations: response.violations || []
              };
            }
            return { ...session, violations: [] };
          } catch (error) {
            console.error(`Error loading violations for session ${session.id}:`, error);
            return { ...session, violations: [] };
          }
        })
      );

      // CSV for sessions
      let csv = 'STT,Tên sinh viên,Mã SV,Trạng thái,Thời gian bắt đầu,Thời gian kết thúc,Thời gian thi (phút),Số vi phạm\n';

      sessionsWithViolations.forEach((session, index) => {
        const row = [
          index + 1,
          `"${(session.student?.fullName || 'Unknown').replace(/"/g, '""')}"`,
          `"${(session.student?.studentId || session.student?.email || '').replace(/"/g, '""')}"`,
          `"${session.status}"`,
          `"${new Date(session.startedAt).toLocaleString('vi-VN')}"`,
          `"${session.endedAt ? new Date(session.endedAt).toLocaleString('vi-VN') : ''}"`,
          session.durationMinutes || '',
          session.totalViolations
        ];
        csv += row.join(',') + '\n';
      });

      csv += '\n\nTất cả vi phạm\n';
      csv += 'STT,Sinh viên,Mã SV,Thời gian,Loại vi phạm,Mô tả,Chi tiết\n';

      let violationIndex = 1;
      sessionsWithViolations.forEach((session) => {
        session.violations.forEach((violation) => {
          const row = [
            violationIndex++,
            `"${(session.student?.fullName || 'Unknown').replace(/"/g, '""')}"`,
            `"${(session.student?.studentId || session.student?.email || '').replace(/"/g, '""')}"`,
            `"${new Date(violation.timestamp).toLocaleString('vi-VN')}"`,
            `"${violation.type.replace(/"/g, '""')}"`,
            `"${formatViolationDescription(violation).replace(/"/g, '""')}"`,
            `"${(violation.details ? JSON.stringify(violation.details) : '').replace(/"/g, '""')}"`
          ];
          csv += row.join(',') + '\n';
        });
      });

      // Create blob and download
      const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);

      const examTitle = selectedExam.title.replace(/[^a-zA-Z0-9]/g, '_');
      const filename = `Bao_cao_giam_sat_${examTitle}_${new Date().toISOString().split('T')[0]}.csv`;

      link.setAttribute('download', filename);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      enqueueSnackbar('Đã xuất file CSV thành công', { variant: 'success' });
    } catch (error) {
      console.error('Error exporting exam sessions to CSV:', error);
      enqueueSnackbar('Lỗi khi xuất file CSV', { variant: 'error' });
    }
  };

  // Handle export menu
  const handleExportMenuOpen = (event, type) => {
    setExportMenuAnchor(event.currentTarget);
    setExportMenuType(type);
  };

  const handleExportMenuClose = () => {
    setExportMenuAnchor(null);
    setExportMenuType(null);
  };

  const handleExport = (format) => {
    handleExportMenuClose();
    
    if (exportMenuType === 'violations') {
      if (format === 'excel') {
        exportSessionViolations();
      } else if (format === 'pdf') {
        exportSessionViolationsPDF();
      } else if (format === 'csv') {
        exportSessionViolationsCSV();
      }
    } else if (exportMenuType === 'sessions') {
      if (format === 'excel') {
        exportExamSessions();
      } else if (format === 'pdf') {
        exportExamSessionsPDF();
      } else if (format === 'csv') {
        exportExamSessionsCSV();
      }
    }
  };

  // Handle back navigation
  const handleBack = () => {
    if (currentView === 'violations') {
      stopPolling();
      setCurrentView('sessions');
      setSelectedSession(null);
    } else if (currentView === 'sessions') {
      // Leave monitoring room when going back
      if (currentMonitoringExamId && socketService.isSocketConnected()) {
        socketService.teacherLeaveMonitoring(currentMonitoringExamId);
        setCurrentMonitoringExamId(null);
      }
      setCurrentView('exams');
      setSelectedExam(null);
      setSessions([]);
    }
  };

  // Handle session tab change
  const handleSessionTabChange = (event, newValue) => {
    setSessionTab(newValue);
    // Sessions are already loaded, just filter them
    // No need to reload from API
  };

  // Filter sessions based on tab
  const filteredSessions = sessionTab === 0
    ? sessions.filter(s => s.status === 'in_progress')
    : sessions.filter(s => s.status === 'completed' || s.status === 'terminated');

  // Initial load
  useEffect(() => {
    loadExams(1);
    loadHistory();
  }, [loadExams, loadHistory]);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      stopPolling();
    };
  }, [stopPolling]);

  // Setup Socket.IO connection and listeners
  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      console.warn('No token found, skipping Socket.IO connection');
      return;
    }

    // Connect Socket.IO
    try {
      socketService.connect(token);
      setSocketConnected(true);

      // Setup connection callbacks
      socketService.setConnectionCallbacks({
        onConnect: () => {
          console.log('✅ Socket.IO connected for teacher monitoring');
          setSocketConnected(true);
          
          // Rejoin monitoring room if we have a selected exam
          if (selectedExam && currentMonitoringExamId === selectedExam.id) {
            socketService.teacherJoinMonitoring(selectedExam.id);
          }
        },
        onDisconnect: (reason) => {
          console.log('❌ Socket.IO disconnected:', reason);
          setSocketConnected(false);
        },
        onError: (error) => {
          console.error('Socket.IO error:', error);
          setSocketConnected(false);
        }
      });

      // Listen for new violations (real-time)
      socketService.onNewViolation((data) => {
        console.log('🔔 Real-time violation received:', data);
        
        // Show notification
        const violationType = data.violation?.type || 'unknown';
        const studentName = data.studentName || 'Sinh viên';
        enqueueSnackbar(
          `🚨 Vi phạm mới: ${studentName} - ${violationType}`,
          { 
            variant: 'warning',
            autoHideDuration: 5000,
            anchorOrigin: { vertical: 'top', horizontal: 'right' }
          }
        );

        // If we're viewing violations of this session, reload violations
        if (selectedSession && data.sessionId === selectedSession.id) {
          loadViolations(selectedSession.id);
        }

        // If we're viewing sessions of this exam, reload sessions to update violation count
        if (selectedExam && data.examId === selectedExam.id) {
          loadSessions(selectedExam.id);
        }
      });

      // Listen for student joined
      socketService.onStudentJoined((data) => {
        console.log('Student joined:', data.studentName);
        if (selectedExam && data.examId === selectedExam.id) {
          // Reload sessions to show new student
          loadSessions(selectedExam.id);
        }
      });

      // Listen for student left
      socketService.onStudentLeft((data) => {
        console.log('Student left:', data.studentName);
        if (selectedExam && data.examId === selectedExam.id) {
          loadSessions(selectedExam.id);
        }
      });

      // Listen for student heartbeat (optional - for showing active status)
      socketService.onStudentHeartbeat((data) => {
        // Could update last activity time in UI if needed
      });

    } catch (error) {
      console.error('Error setting up Socket.IO:', error);
      setSocketConnected(false);
    }

    // Cleanup on unmount
    return () => {
      if (currentMonitoringExamId) {
        socketService.teacherLeaveMonitoring(currentMonitoringExamId);
      }
      // Don't disconnect socket completely as it might be used elsewhere
      // socketService.disconnect();
    };
  }, [selectedExam, selectedSession, currentMonitoringExamId, enqueueSnackbar, loadSessions, loadViolations]);

  // Get violation icon
  const getViolationIcon = (type) => {
    switch (type) {
      case 'object_detected':
        return <Phone color="error" />;
      case 'multiple_faces':
      case 'multiple_people_detected':
        return <Person color="error" />;
      case 'looking_away':
        return <Warning color="warning" />;
      case 'face_not_detected':
        return <Error color="error" />;
      case 'tab_switch':
      case 'tab_hidden':
        return <Monitor color="warning" />;
      default:
        return <Notifications color="info" />;
    }
  };

  // Get violation color
  const getViolationColor = (type) => {
    if (type === 'object_detected' || type === 'multiple_faces' || type === 'face_not_detected') {
      return 'error';
    }
    if (type === 'looking_away' || type === 'tab_switch') {
      return 'warning';
    }
    return 'info';
  };

  // Format violation description
  const formatViolationDescription = (violation) => {
    if (violation.type === 'object_detected' && violation.details) {
      const obj = violation.details;
      return `${violation.description} (${obj.object_class_vi || obj.object_class}, độ tin cậy: ${(obj.confidence * 100).toFixed(1)}%)`;
    }
    return violation.description;
  };

  // Render Exams List View
  const renderExamsList = () => (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">
          Giám sát Kỳ Thi
        </Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          {recentlyViewed.length > 0 && (
            <Button
              variant="outlined"
              startIcon={<History />}
              onClick={() => {
                // Show history dialog or navigate to history view
                enqueueSnackbar(`Có ${recentlyViewed.length} mục trong lịch sử`, { variant: 'info' });
              }}
            >
              Lịch sử ({recentlyViewed.length})
            </Button>
          )}
          <Button
            variant="outlined"
            startIcon={<Refresh />}
            onClick={() => loadExams(examsPagination.page)}
            disabled={examsLoading}
          >
            Làm mới
          </Button>
        </Box>
      </Box>

      {recentlyViewed.length > 0 && (
        <Card sx={{ mb: 3, bgcolor: 'background.default' }}>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">
                <History sx={{ verticalAlign: 'middle', mr: 1 }} />
                Đã xem gần đây
              </Typography>
              <Button size="small" onClick={clearHistory}>
                Xóa lịch sử
              </Button>
            </Box>
            <List dense>
              {recentlyViewed.slice(0, 10).map((item, index) => (
                <ListItem
                  key={index}
                  button
                  onClick={() => {
                    // Navigate to the session
                    const exam = exams.find(e => e.id === item.examId);
                    if (exam) {
                      handleExamSelect(exam);
                      // After sessions load, find and select the session
                      setTimeout(() => {
                        const session = sessions.find(s => s.id === item.sessionId);
                        if (session) {
                          handleSessionSelect(session);
                        }
                      }, 1000);
                    }
                  }}
                >
                  <ListItemIcon>
                    <Visibility />
                  </ListItemIcon>
                  <ListItemText
                    primary={`${item.studentName} - ${item.examTitle}`}
                    secondary={`${item.totalViolations} phát hiện • ${new Date(item.viewedAt).toLocaleString('vi-VN')}`}
                  />
                </ListItem>
              ))}
            </List>
          </CardContent>
        </Card>
      )}

      {examsLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <CircularProgress />
        </Box>
      ) : exams.length === 0 ? (
        <Alert severity="info">
          Chưa có kỳ thi nào có giám sát. Các kỳ thi có bật giám sát sẽ xuất hiện ở đây.
        </Alert>
      ) : (
        <>
          <Grid container spacing={3}>
            {exams.map((exam) => (
              <Grid item xs={12} key={exam.id}>
                <Card 
                  sx={{ 
                    cursor: 'pointer',
                    '&:hover': { boxShadow: 4 }
                  }}
                  onClick={() => handleExamSelect(exam)}
                >
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="h6" gutterBottom>
                          {exam.title}
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
                          <Chip 
                            icon={<School />} 
                            label={exam.className} 
                            size="small" 
                            variant="outlined" 
                          />
                          {exam.startTime && (
                            <Chip 
                              icon={<AccessTime />} 
                              label={`Bắt đầu: ${new Date(exam.startTime).toLocaleString('vi-VN')}`}
                              size="small" 
                              variant="outlined" 
                            />
                          )}
                        </Box>
                        <Grid container spacing={2} sx={{ mt: 1 }}>
                          <Grid item xs={12} sm={4}>
                            <Box sx={{ textAlign: 'center' }}>
                              <Typography variant="h4" color="primary">
                                {exam.stats.totalSessions}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                Tổng sinh viên
                              </Typography>
                            </Box>
                          </Grid>
                          <Grid item xs={12} sm={4}>
                            <Box sx={{ textAlign: 'center' }}>
                              <Typography variant="h4" color={exam.stats.activeSessions > 0 ? 'success' : 'text.secondary'}>
                                {exam.stats.activeSessions}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                Đang thi
                              </Typography>
                            </Box>
                          </Grid>
                          <Grid item xs={12} sm={4}>
                            <Box sx={{ textAlign: 'center' }}>
                              <Typography variant="h4" color={exam.stats.totalViolations > 0 ? 'error' : 'text.secondary'}>
                                {exam.stats.totalViolations}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                Phát hiện
                              </Typography>
                            </Box>
                          </Grid>
                        </Grid>
                      </Box>
                      <Button
                        variant="contained"
                        startIcon={<Visibility />}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleExamSelect(exam);
                        }}
                      >
                        Xem chi tiết
                      </Button>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>

          {examsPagination.totalPages > 1 && (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
              <Pagination
                count={examsPagination.totalPages}
                page={examsPagination.page}
                onChange={(e, page) => loadExams(page)}
                color="primary"
              />
            </Box>
          )}
        </>
      )}
    </Box>
  );

  // Render Sessions List View
  const renderSessionsList = () => (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
        <IconButton onClick={handleBack}>
          <ArrowBack />
        </IconButton>
        <Box sx={{ flex: 1 }}>
          <Typography variant="h4">
            {selectedExam?.title}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {selectedExam?.className} • {selectedExam?.classCode}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="contained"
            color="success"
            startIcon={<FileDownload />}
            onClick={(e) => handleExportMenuOpen(e, 'sessions')}
            disabled={sessionsLoading || sessions.length === 0}
          >
            Xuất dữ liệu
          </Button>
          <Button
            variant="outlined"
            startIcon={<Refresh />}
            onClick={() => loadSessions(selectedExam.id)}
            disabled={sessionsLoading}
          >
            Làm mới
          </Button>
        </Box>
      </Box>

      <Paper sx={{ mb: 3 }}>
        <Tabs value={sessionTab} onChange={handleSessionTabChange}>
          <Tab 
            icon={<Monitor />} 
            label="Đang diễn ra" 
            iconPosition="start"
          />
          <Tab 
            icon={<History />} 
            label="Lịch sử" 
            iconPosition="start"
          />
        </Tabs>
      </Paper>

      {sessionsStats && (
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={3}>
            <Card>
              <CardContent>
                <Typography variant="h6" color="primary">
                  {sessionsStats.total}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Tổng sinh viên
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={3}>
            <Card>
              <CardContent>
                <Typography variant="h6" color="success.main">
                  {sessionsStats.inProgress}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Đang thi
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={3}>
            <Card>
              <CardContent>
                <Typography variant="h6" color="default">
                  {sessionsStats.completed}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Hoàn thành
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={3}>
            <Card>
              <CardContent>
                <Typography variant="h6" color="error.main">
                  {sessionsStats.totalViolations}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Tổng số giám sát
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {sessionsLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <CircularProgress />
        </Box>
      ) : filteredSessions.length === 0 ? (
        <Alert severity="info">
          {sessionTab === 0 
            ? 'Không có sinh viên nào đang thi.' 
            : 'Chưa có lịch sử thi nào.'}
        </Alert>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Sinh viên</TableCell>
                <TableCell>Trạng thái</TableCell>
                <TableCell>Thời gian bắt đầu</TableCell>
                <TableCell>Giám sát</TableCell>
                <TableCell>Hành động</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredSessions.map((session) => (
                <TableRow key={session.id} hover>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Avatar>
                        {session.student?.fullName?.charAt(0) || 'S'}
                      </Avatar>
                      <Box>
                        <Typography variant="body2">
                          {session.student?.fullName || 'Unknown'}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {session.student?.studentId || session.student?.email}
                        </Typography>
                      </Box>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={
                        session.status === 'in_progress' ? 'Đang thi' :
                        session.status === 'completed' ? 'Hoàn thành' :
                        session.status === 'terminated' ? 'Bị kết thúc' : session.status
                      }
                      color={
                        session.status === 'in_progress' ? 'success' :
                        session.status === 'completed' ? 'default' :
                        session.status === 'terminated' ? 'error' : 'default'
                      }
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Box>
                      <Typography variant="body2">
                        {new Date(session.startedAt).toLocaleString('vi-VN')}
                      </Typography>
                      {session.endedAt && (
                        <Typography variant="caption" color="text.secondary">
                          Kết thúc: {new Date(session.endedAt).toLocaleString('vi-VN')}
                        </Typography>
                      )}
                      {session.durationMinutes && (
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                          Thời gian: {session.durationMinutes} phút
                        </Typography>
                      )}
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Badge badgeContent={session.totalViolations} color="error">
                      <Warning color="action" />
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Button
                      size="small"
                      variant="outlined"
                      startIcon={<Visibility />}
                      onClick={() => handleSessionSelect(session)}
                    >
                      Xem nhật ký
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );

  // Render Violations Log View
  const renderViolationsLog = () => (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
        <IconButton onClick={handleBack}>
          <ArrowBack />
        </IconButton>
        <Box sx={{ flex: 1 }}>
          <Typography variant="h4">
            Nhật Ký Giám Sát
          </Typography>
          {sessionInfo && (
            <Typography variant="body2" color="text.secondary">
              {sessionInfo.student?.fullName} • {sessionInfo.assignment?.title}
            </Typography>
          )}
        </Box>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          {sessionInfo?.status === 'in_progress' && (
            <Chip
              icon={<Monitor />}
              label="Đang giám sát trực tiếp"
              color="success"
              sx={{ animation: 'pulse 2s infinite' }}
            />
          )}
          <Button
            variant="contained"
            color="success"
            startIcon={<FileDownload />}
            onClick={(e) => handleExportMenuOpen(e, 'violations')}
            disabled={violationsLoading || violations.length === 0}
          >
            Xuất dữ liệu
          </Button>
        </Box>
      </Box>

      {sessionInfo && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <Typography variant="body2" color="text.secondary">
                  Trạng thái
                </Typography>
                <Chip
                  label={
                    sessionInfo.status === 'in_progress' ? 'Đang thi' :
                    sessionInfo.status === 'completed' ? 'Hoàn thành' :
                    sessionInfo.status === 'terminated' ? 'Bị kết thúc' : sessionInfo.status
                  }
                  color={
                    sessionInfo.status === 'in_progress' ? 'success' :
                    sessionInfo.status === 'completed' ? 'default' :
                    sessionInfo.status === 'terminated' ? 'error' : 'default'
                  }
                  sx={{ mt: 0.5 }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="body2" color="text.secondary">
                  Tổng số giám sát
                </Typography>
                <Typography variant="h6" color="error">
                  {sessionInfo.totalViolations}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="body2" color="text.secondary">
                  Bắt đầu
                </Typography>
                <Typography variant="body2">
                  {new Date(sessionInfo.startedAt).toLocaleString('vi-VN')}
                </Typography>
              </Grid>
              {sessionInfo.endedAt && (
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2" color="text.secondary">
                    Kết thúc
                  </Typography>
                  <Typography variant="body2">
                    {new Date(sessionInfo.endedAt).toLocaleString('vi-VN')}
                  </Typography>
                </Grid>
              )}
            </Grid>
          </CardContent>
        </Card>
      )}

      {violationsLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <CircularProgress />
        </Box>
      ) : violations.length === 0 ? (
        <Alert severity="success">
          Không có vi phạm nào được ghi nhận. Sinh viên đang làm bài tốt!
        </Alert>
      ) : (
        <Paper>
          <Box sx={{ p: 2, bgcolor: 'background.default' }}>
            <Typography variant="h6">
              Danh sách giám sát ({violations.length})
            </Typography>
          </Box>
          <Divider />
          <List>
            {violations.map((violation, index) => (
              <React.Fragment key={violation.id}>
                <ListItem>
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="body1">
                          {formatViolationDescription(violation)}
                        </Typography>
                        <Chip
                          label={violation.type}
                          color={getViolationColor(violation.type)}
                          size="small"
                        />
                      </Box>
                    }
                    secondary={
                      <Typography variant="caption" color="text.secondary">
                        {new Date(violation.timestamp).toLocaleString('vi-VN')}
                      </Typography>
                    }
                  />
                </ListItem>
                {index < violations.length - 1 && <Divider />}
              </React.Fragment>
            ))}
          </List>
        </Paper>
      )}
    </Box>
  );

  return (
    <Box sx={{ p: 3 }}>
      {currentView === 'exams' && renderExamsList()}
      {currentView === 'sessions' && renderSessionsList()}
      {currentView === 'violations' && renderViolationsLog()}

      {/* Export Menu */}
      <Menu
        anchorEl={exportMenuAnchor}
        open={Boolean(exportMenuAnchor)}
        onClose={handleExportMenuClose}
      >
        <MenuItem onClick={() => handleExport('excel')}>
          <ListItemIcon>
            <TableChart fontSize="small" />
          </ListItemIcon>
          <ListItemText>Xuất Excel (.xlsx)</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => handleExport('pdf')}>
          <ListItemIcon>
            <PictureAsPdf fontSize="small" />
          </ListItemIcon>
          <ListItemText>Xuất PDF (.pdf)</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => handleExport('csv')}>
          <ListItemIcon>
            <FileDownload fontSize="small" />
          </ListItemIcon>
          <ListItemText>Xuất CSV (.csv)</ListItemText>
        </MenuItem>
      </Menu>
    </Box>
  );
};

export default TeacherMonitoring;
