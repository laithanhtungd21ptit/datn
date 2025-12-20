import React, { useCallback, useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSnackbar } from 'notistack';
import {
  Box,
  Typography,
  Grid,
  Paper,
  Chip,
  Button,
  TextField,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
} from '@mui/material';
import {
  AttachFile,
  Videocam,
  VideocamOff,
  Warning,
  Close,
} from '@mui/icons-material';
import { api, apiRequest } from '../../../api/client';

// Services
import BrowserMonitoringService from '../../../services/BrowserMonitoringService';
import socketService from '../../../services/SocketService';
import ObjectDetectionService from '../../../services/ObjectDetectionService';

// AI Monitoring
import useAIMonitoring from '../../../hooks/useAIMonitoring';

// Components
import ViolationsPanel from '../../../components/ViolationsPanel';
import AIMonitoringPanel from '../../../components/AIMonitoringPanel';

// Helper function to format description with teacher name
const formatDescriptionWithTeacher = (description, teacher) => {
  if (!description) return '';
  if (!teacher || teacher === 'Giảng viên') return description;
  
  // Remove trailing " - " or " -" if exists
  const cleanedDesc = description.replace(/\s*-\s*$/, '');
  // Add teacher name after dash
  return `${cleanedDesc} - ${teacher}`;
};

const StudentExamPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  
  // Original states
  const [exam, setExam] = useState(null);
  const [status, setStatus] = useState('loading'); // waiting | in_progress | ended
  const [timeLeftSec, setTimeLeftSec] = useState(0);
  const [waitingCountdown, setWaitingCountdown] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  
  // Monitoring states (only used when requireMonitoring = true)
  const [session, setSession] = useState(null);
  const [monitoringSettings, setMonitoringSettings] = useState(null);
  const [violations, setViolations] = useState([]);
  const [warningMessage, setWarningMessage] = useState('');
  const [showWarning, setShowWarning] = useState(false);
  const [terminated, setTerminated] = useState(false);
  const [terminationReason, setTerminationReason] = useState('');
  const [answer, setAnswer] = useState('');
  const [examFiles, setExamFiles] = useState([]); 

  // Refs
  const browserMonitorRef = useRef(null);
  const heartbeatIntervalRef = useRef(null);
  const lastViolationRef = useRef({ type: null, timestamp: 0 });
  const handleViolationRef = useRef(null);
  const objectDetectionRef = useRef(null);
  const violationsRef = useRef([]); // For heartbeat to access latest violations

  // AI Monitoring Hook
  const handleViolationWrapper = useCallback((violation) => {
    if (handleViolationRef.current) {
      handleViolationRef.current(violation);
    }
  }, []);

  const aiMonitoring = useAIMonitoring({
    autoStart: false,
    detectionInterval: 500,
    enableFaceDetection: false,
    enableGazeDetection: true,
    onViolation: handleViolationWrapper,
    onError: (err) => {
      console.error('AI Monitoring error:', err);
    },
    onCameraReady: (videoElement) => {
      console.log('✅ AI Camera ready');
    }
  });

  // Utility functions (defined before monitoring functions)
  const getBrowserName = () => {
    const ua = navigator.userAgent;
    if (ua.includes('Chrome')) return 'Chrome';
    if (ua.includes('Firefox')) return 'Firefox';
    if (ua.includes('Safari')) return 'Safari';
    if (ua.includes('Edge')) return 'Edge';
    return 'Unknown';
  };

  const getOSName = () => {
    const ua = navigator.userAgent;
    if (ua.includes('Win')) return 'Windows';
    if (ua.includes('Mac')) return 'MacOS';
    if (ua.includes('Linux')) return 'Linux';
    return 'Unknown';
  };

  // Monitoring functions (defined before loadExam)
  const startMonitoringSession = async (examData) => {
    try {
      console.log('🚀 Starting monitoring session...');
      
      const sessionResponse = await apiRequest('/api/monitoring/session/start', {
        method: 'POST',
        body: JSON.stringify({
          assignmentId: id,
          deviceInfo: {
            userAgent: navigator.userAgent,
            browser: getBrowserName(),
            os: getOSName(),
            screenResolution: `${window.screen.width}x${window.screen.height}`
          }
        })
      });

      console.log('✅ Session started:', sessionResponse.session);
      
      setSession(sessionResponse.session);
      setMonitoringSettings(sessionResponse.settings);
      
      if (sessionResponse.continued) {
        const existingViolations = sessionResponse.session.violations || [];
        setViolations(existingViolations);
        violationsRef.current = existingViolations; // Initialize ref
      }

      if (sessionResponse.settings.requireCamera) {
        console.log('🤖 Starting AI Monitoring...');
        try {
          await aiMonitoring.startMonitoring();
          console.log('✅ AI Monitoring started successfully');
        } catch (aiError) {
          console.error('❌ AI Monitoring start failed:', aiError);
          enqueueSnackbar('Cảnh báo: AI giám sát không khởi động được', { variant: 'warning' });
          // Không block exam nếu AI fail - vẫn tiếp tục với các monitoring khác
        }
      }

      const s = sessionResponse.settings || {};
      const hasBrowserDetection =
        s.detectTabSwitch ||
        s.detectCopyPaste ||
        s.detectRightClick ||
        s.detectDevTools ||
        s.requireFullScreen;

      if (hasBrowserDetection) {
        console.log('🌐 Starting Browser Monitoring...');
        startBrowserMonitoring(s);
      }

      connectSocket(id, sessionResponse.session.id);
      startHeartbeat(id, sessionResponse.session.id);

      console.log('✅ Monitoring initialized');
    } catch (err) {
      console.error('❌ Failed to start monitoring:', err);
      enqueueSnackbar('Cảnh báo: Hệ thống giám sát không khởi động được', { variant: 'warning' });
    }
  };

  const loadExam = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await api.studentExamDetail(id);
      setExam(data);
      setStatus(data.status);
      
      // Kiểm tra xem đã nộp bài chưa - nếu đã nộp thì không cho vào
      if (data.hasSubmitted) {
        setError('Bạn đã nộp bài thi này rồi, không thể vào lại.');
        setLoading(false);
        return;
      }
      
      if (data.status === 'in_progress') {
        // ✅ FIX: Calculate time from endTime (synced with teacher/admin setup)
        const endTime = new Date(data.endTime);
        const now = new Date();
        const seconds = Math.max(0, Math.floor((endTime - now) / 1000));
        setTimeLeftSec(seconds);
        
        // ✅ Only start monitoring if requireMonitoring = true
        if (data.requireMonitoring) {
          await startMonitoringSession(data);
        }
      } else {
        setTimeLeftSec(0);
      }
    } catch (e) {
      setError(e?.message || 'Không thể tải thông tin kỳ thi');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadExam();
  }, [loadExam]);

  useEffect(() => {
    if (status !== 'waiting' || !exam?.startTime) {
      setWaitingCountdown('');
      return;
    }
    const updateCountdown = () => {
      const diff = Math.max(0, new Date(exam.startTime) - new Date());
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      setWaitingCountdown(`${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`);
    };
    updateCountdown();
    const timer = setInterval(updateCountdown, 1000);
    return () => clearInterval(timer);
  }, [status, exam]);

  // Hàm endSession tập trung - Đảm bảo session được end trong mọi trường hợp
  const endSession = useCallback(async (reason = 'exited', useKeepalive = false) => {
    if (!session?.id) return true;
    
    try {
      console.log(`🛑 Ending exam session (reason: ${reason})...`);
      
      const token = localStorage.getItem('accessToken');
      const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:4000';
      
      const options = {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          sessionId: session.id,
          reason: reason
        })
      };
      
      // Sử dụng keepalive nếu cần (cho beforeunload)
      if (useKeepalive) {
        options.keepalive = true;
      }
      
      await fetch(`${backendUrl}/api/monitoring/session/end`, options);
      
      console.log('✅ Session ended successfully');
      
      // Cleanup tất cả monitoring services
      if (aiMonitoring.isMonitoring) {
        aiMonitoring.stopMonitoring();
      }
      if (browserMonitorRef.current) {
        browserMonitorRef.current.stopMonitoring();
        browserMonitorRef.current = null;
      }
      if (objectDetectionRef.current) {
        objectDetectionRef.current.stop();
        objectDetectionRef.current = null;
      }
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
        heartbeatIntervalRef.current = null;
      }
      if (socketService.isSocketConnected()) {
        socketService.leaveExam(id, session.id);
        socketService.disconnect();
      }
      
      // Clear session state
      setSession(null);
      
      return true;
    } catch (err) {
      console.error('❌ Error ending session:', err);
      // Vẫn cleanup local services dù API fail
      if (browserMonitorRef.current) {
        browserMonitorRef.current.stopMonitoring();
        browserMonitorRef.current = null;
      }
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
        heartbeatIntervalRef.current = null;
      }
      return false;
    }
  }, [session?.id, id, aiMonitoring]);

  // Handlers (defined before useEffect that uses them)
  const handleSubmit = useCallback(async () => {
    try {
      const formData = new FormData();
      formData.append('assignmentId', id);
      formData.append('notes', ''); // có thể dùng làm ghi chú ngắn nếu muốn
  
      // 1. Nếu có text trong ô Bài làm, đóng gói thành 1 file .txt
      if (answer && answer.trim().length > 0) {
        const blob = new Blob(
          [answer],
          { type: 'text/plain;charset=utf-8' }
        );
        const safeTitle = (exam?.title || `exam-${id}`).replace(/[^\w\-]+/g, '_');
        const textFile = new File(
          [blob],
          `${safeTitle}_bai_lam.txt`,
          { type: 'text/plain;charset=utf-8' }
        );
        formData.append('files', textFile);
      }
  
      // 2. Thêm các file đính kèm khác (nếu có)
      (examFiles || []).forEach(file => {
        formData.append('files', file);
      });
  
      // 3. Gửi lên backend
      await api.studentSubmit(formData);
  
      // 4. Kết thúc session
      await endSession('completed', false);
  
      enqueueSnackbar('Đã nộp bài thành công!', { variant: 'success' });
      navigate('/student/assignments');
    } catch (err) {
      console.error('Submit exam error:', err);
      setError('Không thể nộp bài. Vui lòng thử lại.');
    }
  }, [id, answer, exam, examFiles, endSession, navigate, enqueueSnackbar]);

  const handleAutoSubmit = useCallback(async () => {
    await handleSubmit();
  }, [handleSubmit]);

  // Handlers (defined before useEffect and other functions that use them)
  const handleTermination = useCallback(async () => {
    await endSession('terminated', false);
    setTimeout(() => navigate('/student/assignments'), 5000);
  }, [endSession, navigate]);

  // ✅ Timer: luôn sync theo thời gian phiên thi do giảng viên setup (startTime + durationMinutes hoặc endTime từ backend)
  useEffect(() => {
    if (!exam) return;

    // Tính endTime giống hệt backend để đảm bảo đồng bộ
    const startTime = new Date(exam.startTime || exam.dueDate);
    const duration = exam.durationMinutes || 0;
    const calculatedEndTime =
      exam.endTime
        ? new Date(exam.endTime)
        : (duration ? new Date(startTime.getTime() + duration * 60000) : new Date(startTime));

    const tick = () => {
      const now = new Date();
      const seconds = Math.max(0, Math.floor((calculatedEndTime - now) / 1000));
      setTimeLeftSec(seconds);

      // Hết giờ thì auto-submit một lần và dừng timer
      if (seconds === 0) {
        clearInterval(intervalId);
        handleAutoSubmit();
      }
    };

    let intervalId;
    tick(); // Cập nhật ngay lập tức khi vào màn
    intervalId = setInterval(tick, 1000);

    return () => clearInterval(intervalId);
  }, [exam, handleAutoSubmit]);


  const startBrowserMonitoring = (settings) => {
    try {
      if (browserMonitorRef.current) {
        browserMonitorRef.current.stopMonitoring();
        browserMonitorRef.current = null;
      }
      
      browserMonitorRef.current = new BrowserMonitoringService();
      browserMonitorRef.current.setCallbacks({
        onViolation: handleViolation
      });

      browserMonitorRef.current.startMonitoring({
        detectTabSwitch: settings?.detectTabSwitch !== false,
        detectFullscreenExit: settings?.requireFullScreen !== false,
        detectCopyPaste: settings?.detectCopyPaste !== false,
        detectRightClick: settings?.detectRightClick !== false,
        detectDevTools: settings?.detectDevTools !== false,
        requireFullScreen: false,
        preventContextMenu: false,
        preventCopyPaste: false
      });
    } catch (err) {
      console.error('Browser monitoring error:', err);
    }
  };

  const connectSocket = (examId, sessionId) => {
    try {
      const token = localStorage.getItem('accessToken');
      
      socketService.setConnectionCallbacks({
        onConnect: () => {
          socketService.joinExam(examId, sessionId);
        },
        onDisconnect: () => {},
        onError: (error) => console.error('Socket error:', error)
      });

      socketService.connect(token);

      socketService.onWarningReceived((data) => {
        setWarningMessage(data.message);
        setShowWarning(true);
      });

      socketService.onExamTerminated((data) => {
        setTerminated(true);
        setTerminationReason(data.reason);
        handleTermination();
      });

      socketService.onAnnouncement((data) => {
        enqueueSnackbar(`Thông báo: ${data.message}`, { variant: 'info' });
      });
    } catch (err) {
      console.error('Socket connection error:', err);
    }
  };

  const startHeartbeat = (examId, sessionId) => {
    heartbeatIntervalRef.current = setInterval(async () => {
      try {
        await apiRequest('/api/monitoring/session/heartbeat', {
          method: 'POST',
          body: JSON.stringify({ sessionId })
        });
        
        if (socketService.isSocketConnected()) {
          socketService.sendHeartbeat(examId, sessionId, {
            cameraOn: aiMonitoring.cameraReady,
            aiMonitoring: aiMonitoring.isMonitoring,
            violations: violationsRef.current.length, // Use ref to get latest violations
            timestamp: new Date()
          });
        }
      } catch (err) {
        console.error('Heartbeat error:', err);
      }
    }, 5000);
  };

  const handleViolation = async (violation) => {
    try {
      const now = Date.now();
      const timeSinceLastViolation = now - lastViolationRef.current.timestamp;
      const isSameType = lastViolationRef.current.type === violation.type;
      
      if (isSameType && timeSinceLastViolation < 1000) {
        return;
      }
      
      lastViolationRef.current = { type: violation.type, timestamp: now };
      setViolations(prev => {
        const updated = [...prev, violation];
        violationsRef.current = updated; // Update ref for heartbeat
        return updated;
      });

      if (session?.id) {
        await apiRequest('/api/monitoring/violation/report', {
          method: 'POST',
          body: JSON.stringify({
            sessionId: session.id,
            violation
          })
        });

        if (socketService.isSocketConnected()) {
          socketService.reportViolation(id, session.id, violation);
        }
      }
    } catch (err) {
      console.error('Error reporting violation:', err);
    }
  };
  
  handleViolationRef.current = handleViolation;

  // Fetch violations from backend
  const fetchViolations = useCallback(async () => {
    if (!session?.id) return;
    
    try {
      const response = await apiRequest(`/api/monitoring/session/${session.id}`);
      if (response.session?.violations) {
        setViolations(prev => {
          const backendViolations = response.session.violations || [];
          const violationMap = new Map();
          
          prev.forEach(v => {
            const key = v._id || `${v.type}_${new Date(v.timestamp).getTime()}`;
            violationMap.set(key, v);
          });
          
          backendViolations.forEach(v => {
            const key = v._id || `${v.type}_${new Date(v.timestamp).getTime()}`;
            violationMap.set(key, v);
          });
          
          const updated = Array.from(violationMap.values()).sort((a, b) => {
            return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
          });
          
          violationsRef.current = updated; // Update ref for heartbeat
          return updated;
        });
      }
    } catch (err) {
      console.error('Error fetching violations:', err);
    }
  }, [session?.id]);

  // Object Detection
  useEffect(() => {
    if (exam?.requireMonitoring && aiMonitoring?.isMonitoring && aiMonitoring?.cameraReady && session?.id) {
      if (!objectDetectionRef.current) {
        objectDetectionRef.current = new ObjectDetectionService();
      }

      const videoElement = aiMonitoring.getVideoElement();
      if (!videoElement) return;

      objectDetectionRef.current.start(
        videoElement,
        {
          sessionId: session.id,
          intervalMs: 4000, // Base interval: 4 giây
          framesPerInterval: 2, // Capture 2 frame mỗi interval
          frameDelayMs: 2000, // Delay 2 giây giữa các frame
          confThreshold: 0.6,
          useCoco: true,
          adaptiveInterval: true, // Bật adaptive interval
          onDetection: (result) => {
            if (result.count > 0) {
              const itemsList = result.detections.map(d => d.class_vi).join(', ');
              enqueueSnackbar(`🔍 Phát hiện vật thể: ${itemsList}`, { variant: 'info' });
              
              setTimeout(() => {
                fetchViolations();
              }, 500);
            }
          },
          onError: (error) => console.error('Object detection error:', error)
        }
      );

      return () => {
        if (objectDetectionRef.current) {
          objectDetectionRef.current.stop();
        }
      };
    }
  }, [exam?.requireMonitoring, aiMonitoring?.isMonitoring, aiMonitoring?.cameraReady, session?.id, fetchViolations, enqueueSnackbar]);

  // Cleanup khi unmount - End session ngay lập tức
  useEffect(() => {
    return () => {
      // End session khi component unmount (user navigate away)
      if (session?.id && status === 'in_progress') {
        const token = localStorage.getItem('accessToken');
        const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:4000';
        
        // Sử dụng fetch với keepalive để đảm bảo request được gửi
        fetch(`${backendUrl}/api/monitoring/session/end`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            sessionId: session.id,
            reason: 'exited'
          }),
          keepalive: true // Đảm bảo request được gửi ngay cả khi page unload
        }).catch(() => {}); // Ignore errors
      }
      
      // Cleanup local services
      if (aiMonitoring.isMonitoring) {
        aiMonitoring.stopMonitoring();
      }
      if (browserMonitorRef.current) {
        browserMonitorRef.current.stopMonitoring();
        browserMonitorRef.current = null;
      }
      if (objectDetectionRef.current) {
        objectDetectionRef.current.stop();
        objectDetectionRef.current = null;
      }
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
      }
      if (socketService.isSocketConnected()) {
        socketService.leaveExam(id, session?.id);
        socketService.disconnect();
      }
    };
  }, []); // Empty array - chỉ chạy khi unmount

  // Thêm beforeunload handler để end session khi đóng tab/refresh
  useEffect(() => {
    if (!session?.id || status !== 'in_progress') return;
    
    const handleBeforeUnload = (e) => {
      // End session trước khi page unload
      const token = localStorage.getItem('accessToken');
      const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:4000';
      
      // Sử dụng fetch với keepalive (sendBeacon không hỗ trợ custom headers)
      // Gửi token trong body vì không thể dùng Authorization header với keepalive
      fetch(`${backendUrl}/api/monitoring/session/end`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          sessionId: session.id,
          reason: 'exited',
          token: token // Backup token trong body nếu header không được gửi
        }),
        keepalive: true // Đảm bảo request được gửi ngay cả khi page unload
      }).catch(() => {}); // Ignore errors
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [session?.id, status]);

  const handleExit = useCallback(async () => {
    if (window.confirm('Bạn có chắc muốn thoát? Bài thi sẽ kết thúc.')) {
      await endSession('exited', false);
      navigate(-1);
    }
  }, [endSession, navigate]);

  const mm = Math.floor(timeLeftSec / 60);
  const ss = String(timeLeftSec % 60).padStart(2, '0');

  if (loading) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', gap: 2 }}>
        <CircularProgress size={60} />
        <Typography variant="h6">Đang tải thông tin kỳ thi...</Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 2 }}>
        <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>
        <Button variant="contained" onClick={loadExam}>Thử lại</Button>
      </Box>
    );
  }

  if (!exam) {
    return (
      <Box sx={{ p: 2 }}>
        <Alert severity="warning">Không tìm thấy kỳ thi.</Alert>
      </Box>
    );
  }

  if (status === 'waiting') {
    return (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <Typography variant="h4" gutterBottom>{exam.title}</Typography>
        <Typography variant="subtitle1" color="text.secondary" gutterBottom>
          Kỳ thi sẽ bắt đầu lúc {new Date(exam.startTime).toLocaleString('vi-VN')}
        </Typography>
        <Typography variant="h2" color="primary" sx={{ mb: 3 }}>
          {waitingCountdown || '00:00:00'}
        </Typography>
        {exam.requireMonitoring && (
          <Alert severity="info" sx={{ mb: 2, maxWidth: 600, mx: 'auto' }}>
            ⚠️ Kỳ thi này yêu cầu giám sát. Hệ thống sẽ tự động bật camera và giám sát khi bắt đầu.
          </Alert>
        )}
        <Button variant="contained" onClick={loadExam}>
          Làm mới
        </Button>
        <Button sx={{ ml: 2 }} onClick={handleExit}>
          Quay lại
        </Button>
      </Box>
    );
  }

  if (status === 'ended') {
    return (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <Alert severity="warning" sx={{ mb: 2 }}>
          Kỳ thi này đã kết thúc. Bạn không thể tham gia nữa.
        </Alert>
        <Button variant="contained" onClick={() => navigate(-1)}>
          Quay lại
        </Button>
      </Box>
    );
  }

  // Kiểm tra xem đã nộp bài chưa
  if (exam?.hasSubmitted) {
    return (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <Alert severity="info" sx={{ mb: 2 }}>
          Bạn đã nộp bài thi này rồi. Không thể vào lại.
        </Alert>
        <Button variant="contained" onClick={() => navigate(-1)}>
          Quay lại
        </Button>
      </Box>
    );
  }

  if (terminated) {
    return (
      <Box sx={{ p: 3, maxWidth: 600, mx: 'auto', mt: 4 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          <Typography variant="h6" gutterBottom>Bài thi đã bị kết thúc</Typography>
          <Typography variant="body2">{terminationReason}</Typography>
        </Alert>
        <Typography variant="body2" color="text.secondary">
          Bạn sẽ được chuyển về trang danh sách bài tập trong 5 giây...
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h5">{exam?.title || 'Kỳ thi'}</Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Chip 
            label={`Thời gian còn lại: ${mm}:${ss}`} 
            color={timeLeftSec < 300 ? 'error' : 'primary'}
          />
          <Chip 
            label={exam?.requireMonitoring ? 'Giám sát: Bắt buộc' : 'Giám sát: Không bắt buộc'} 
            color={exam?.requireMonitoring ? 'warning' : 'default'} 
          />
        </Box>
      </Box>

      {/* Monitoring Status (only if requireMonitoring) */}
      {exam?.requireMonitoring && session && (
        <Paper sx={{ p: 1, mb: 2, display: 'flex', gap: 1, alignItems: 'center', bgcolor: '#f5f5f5', flexWrap: 'wrap' }}>
          <Chip
            size="small"
            icon={aiMonitoring.cameraReady ? <Videocam /> : <VideocamOff />}
            label={aiMonitoring.cameraReady ? 'Camera: ON' : 'Camera: OFF'}
            color={aiMonitoring.cameraReady ? 'success' : 'error'}
          />
          {aiMonitoring.gazeDirection && (
            <Chip
              size="small"
              label={`Hướng nhìn: ${aiMonitoring.gazeDirection === 'center' ? ' Trong vùng hợp lệ' : '⚠️ ' + aiMonitoring.gazeDirection}`}
              color={aiMonitoring.gazeDirection === 'center' ? 'success' : 'warning'}
            />
          )}
        </Paper>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>
      )}
      {exam?.requireMonitoring && aiMonitoring.error && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          AI Monitoring: {aiMonitoring.error}
        </Alert>
      )}

      <Grid container spacing={2}>
        {/* Left: Camera + Violations (only if requireMonitoring) */}
        {exam?.requireMonitoring && session && (
          <Grid item xs={12} md={4}>
            <AIMonitoringPanel
              aiMonitoring={aiMonitoring.getService()}
              isActive={aiMonitoring.cameraReady || aiMonitoring.isMonitoring}
              showVideo={true}
              showStats={false}
            />
            <ViolationsPanel 
              violations={violations}
              maxAllowed={monitoringSettings?.maxViolationsBeforeTerminate || 10}
            />
          </Grid>
        )}

        {/* Right: Exam Content */}
        <Grid item xs={12} md={exam?.requireMonitoring && session ? 8 : 12}>
          <Paper sx={{ p: 2, mb: 2 }}>
            <Typography variant="subtitle1" gutterBottom>Đề thi</Typography>
            <Typography variant="body2" color="text.secondary">
              {exam?.description || 'Đề thi sẽ hiển thị tại đây.'}
            </Typography>
          </Paper>
          <Paper sx={{ p: 2 }}>
            <Typography variant="subtitle1" gutterBottom>Bài làm</Typography>
            <TextField 
              fullWidth 
              multiline 
              minRows={10}
              placeholder="Nhập câu trả lời hoặc dán link..." 
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
            />
            <Box sx={{ mt: 2, display: 'flex', gap: 1, alignItems: 'center' }}>
              <Button
                variant="outlined"
                startIcon={<AttachFile />}
                component="label"
              >
                Đính kèm file
                <input
                  type="file"
                  hidden
                  multiple
                  onChange={(e) => {
                    const files = Array.from(e.target.files || []);
                    setExamFiles(files);
                  }}
                />
              </Button>
              <Typography variant="caption" color="text.secondary">
                Chấp nhận: PDF, DOC, DOCX, ZIP
              </Typography>

              {/* Hiển thị danh sách file đã chọn */}
              {examFiles && examFiles.length > 0 && (
                <Box sx={{ display: 'flex', flexDirection: 'column', ml: 1 }}>
                  <Typography variant="caption" color="text.secondary">
                    Đã chọn: {examFiles.length} file
                  </Typography>
                  {examFiles.map((file, idx) => (
                    <Box
                      key={idx}
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        maxWidth: 320,
                        whiteSpace: 'nowrap',
                        textOverflow: 'ellipsis',
                        overflow: 'hidden',
                      }}
                    >
                      <Typography
                        variant="caption"
                        sx={{ flex: 1, whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}
                      >
                        • {file.name}
                      </Typography>
                      <Close
                        sx={{
                          fontSize: 16,
                          ml: 0.5,
                          cursor: 'pointer',
                          color: 'text.secondary',
                          '&:hover': { color: 'error.main' },
                        }}
                        onClick={() => {
                          setExamFiles(prev => prev.filter((_, i) => i !== idx));
                        }}
                      />
                    </Box>
                  ))}
                </Box>
              )}
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, mt: 2 }}>
              <Button onClick={handleExit}>Thoát</Button>
              <Button 
                variant="contained" 
                color="primary"
                onClick={handleSubmit}
                disabled={
                  !answer.trim() && (!examFiles || examFiles.length === 0)
                  }
              >
                Nộp bài
              </Button>
            </Box>
          </Paper>
        </Grid>
      </Grid>

      {/* Warning Dialog */}
      <Dialog open={showWarning} onClose={() => setShowWarning(false)}>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Warning color="warning" />
            Cảnh báo từ giáo viên
          </Box>
        </DialogTitle>
        <DialogContent>
          <Typography>{warningMessage}</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowWarning(false)} variant="contained">
            Đã hiểu
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default StudentExamPage;

