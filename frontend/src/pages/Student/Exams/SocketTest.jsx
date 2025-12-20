/**
 * Socket Test Page
 * 
 * Test Socket.IO real-time communication cho monitoring
 * Test Student và Teacher events
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  Grid,
  TextField,
  Alert,
  List,
  ListItem,
  ListItemText,
  Chip,
  Divider,
  Card,
  CardContent,
  IconButton
} from '@mui/material';
import {
  PlayArrow,
  Stop,
  Send,
  Refresh,
  Warning,
  CheckCircle,
  Error as ErrorIcon,
  Info as InfoIcon
} from '@mui/icons-material';
import socketService from '../../../services/SocketService';

const SocketTest = () => {
  // Connection state
  const [connected, setConnected] = useState(false);
  const [socketId, setSocketId] = useState('');
  const [connectionError, setConnectionError] = useState('');
  
  // Test data
  const [examId, setExamId] = useState('test-exam-123');
  const [sessionId, setSessionId] = useState('test-session-456');
  const [role, setRole] = useState('student'); // 'student' or 'teacher'
  
  // Messages & Events log
  const [events, setEvents] = useState([]);
  
  // Test input
  const [violationType, setViolationType] = useState('looking_away');
  const [warningMessage, setWarningMessage] = useState('Vui lòng tập trung làm bài');
  const [announcementMessage, setAnnouncementMessage] = useState('Còn 10 phút nữa hết giờ');
  
  const eventLogRef = useRef(null);

  // Auto scroll to bottom of events
  useEffect(() => {
    if (eventLogRef.current) {
      eventLogRef.current.scrollTop = eventLogRef.current.scrollHeight;
    }
  }, [events]);

  // Add event to log
  const addEvent = (type, message, data = {}) => {
    setEvents(prev => [...prev, {
      type,
      message,
      data,
      timestamp: new Date().toLocaleTimeString()
    }]);
  };

  // Connect to Socket.IO
  const handleConnect = () => {
    try {
      const token = localStorage.getItem('token') || 'test-token';
      
      socketService.setConnectionCallbacks({
        onConnect: () => {
          setConnected(true);
          const status = socketService.getStatus();
          setSocketId(status.socketId);
          addEvent('success', 'Connected to Socket.IO', status);
        },
        onDisconnect: (reason) => {
          setConnected(false);
          setSocketId('');
          addEvent('error', `Disconnected: ${reason}`);
        },
        onError: (error) => {
          setConnectionError(error.message);
          addEvent('error', `Connection error: ${error.message}`);
        },
        onMonitoringError: (data) => {
          addEvent('error', `Monitoring error: ${data.message}`);
        }
      });

      socketService.connect(token);
      addEvent('info', 'Connecting to Socket.IO...');
      
    } catch (error) {
      setConnectionError(error.message);
      addEvent('error', `Failed to connect: ${error.message}`);
    }
  };

  // Disconnect
  const handleDisconnect = () => {
    socketService.disconnect();
    setConnected(false);
    setSocketId('');
    addEvent('info', 'Disconnected from Socket.IO');
  };

  // Setup Student listeners
  const setupStudentListeners = () => {
    // Listen for warnings
    socketService.onWarningReceived((data) => {
      addEvent('warning', `Warning from teacher: ${data.message}`, data);
    });

    // Listen for announcements
    socketService.onAnnouncement((data) => {
      addEvent('info', `Announcement: ${data.message}`, data);
    });

    // Listen for termination
    socketService.onExamTerminated((data) => {
      addEvent('error', `Exam terminated: ${data.reason}`, data);
    });

    // Listen for snapshot requests
    socketService.onSnapshotRequested((data) => {
      addEvent('info', 'Teacher requested snapshot', data);
      // Auto respond with mock snapshot
      socketService.sendSnapshot(examId, sessionId, {
        violations: 3,
        cameraOn: true,
        lastActivity: new Date()
      });
      addEvent('success', 'Snapshot sent to teacher');
    });

    addEvent('success', 'Student listeners setup completed');
  };

  // Setup Teacher listeners
  const setupTeacherListeners = () => {
    // Listen for students joining
    socketService.onStudentJoined((data) => {
      addEvent('success', `Student joined: ${data.studentName}`, data);
    });

    // Listen for students leaving
    socketService.onStudentLeft((data) => {
      addEvent('info', `Student left: ${data.studentName}`, data);
    });

    // Listen for heartbeats
    socketService.onStudentHeartbeat((data) => {
      addEvent('info', `Heartbeat from: ${data.studentName}`, data);
    });

    // Listen for violations
    socketService.onNewViolation((data) => {
      addEvent('warning', `Violation: ${data.violation.type} by ${data.studentName}`, data);
    });

    // Listen for status updates
    socketService.onStudentStatusUpdate((data) => {
      addEvent('info', `Status update from: ${data.studentName}`, data);
    });

    // Listen for snapshots
    socketService.onStudentSnapshot((data) => {
      addEvent('success', `Snapshot from: ${data.studentName}`, data);
    });

    // Listen for confirmations
    socketService.onWarningSent((data) => {
      addEvent('success', 'Warning sent successfully', data);
    });

    socketService.onAnnouncementSent((data) => {
      addEvent('success', 'Announcement sent successfully', data);
    });

    socketService.onTerminateSuccess((data) => {
      addEvent('success', 'Student exam terminated', data);
    });

    socketService.onTeacherJoined((data) => {
      addEvent('success', 'Joined monitoring room', data);
    });

    addEvent('success', 'Teacher listeners setup completed');
  };

  // Student: Join exam
  const handleStudentJoinExam = () => {
    socketService.joinExam(examId, sessionId);
    setupStudentListeners();
    addEvent('success', `Joined exam: ${examId}`);
  };

  // Student: Leave exam
  const handleStudentLeaveExam = () => {
    socketService.leaveExam(examId, sessionId);
    addEvent('info', `Left exam: ${examId}`);
  };

  // Student: Send heartbeat
  const handleSendHeartbeat = () => {
    socketService.sendHeartbeat(examId, sessionId, {
      cameraOn: true,
      violations: 2,
      timestamp: new Date()
    });
    addEvent('success', 'Heartbeat sent');
  };

  // Student: Report violation
  const handleReportViolation = () => {
    socketService.reportViolation(examId, sessionId, {
      type: violationType,
      severity: 'medium',
      description: `Test violation: ${violationType}`,
      timestamp: new Date()
    });
    addEvent('warning', `Violation reported: ${violationType}`);
  };

  // Teacher: Join monitoring
  const handleTeacherJoinMonitoring = () => {
    socketService.teacherJoinMonitoring(examId);
    setupTeacherListeners();
    addEvent('success', `Teacher joined monitoring: ${examId}`);
  };

  // Teacher: Leave monitoring
  const handleTeacherLeaveMonitoring = () => {
    socketService.teacherLeaveMonitoring(examId);
    addEvent('info', `Teacher left monitoring: ${examId}`);
  };

  // Teacher: Send warning
  const handleSendWarning = () => {
    socketService.sendWarningToStudent('student-id', sessionId, warningMessage);
    addEvent('success', `Warning sent: ${warningMessage}`);
  };

  // Teacher: Broadcast announcement
  const handleBroadcastAnnouncement = () => {
    socketService.broadcastAnnouncement(examId, announcementMessage);
    addEvent('success', `Announcement broadcasted: ${announcementMessage}`);
  };

  // Teacher: Request snapshot
  const handleRequestSnapshot = () => {
    socketService.requestSnapshot(examId);
    addEvent('info', 'Snapshot requested from all students');
  };

  // Teacher: Terminate exam
  const handleTerminateExam = () => {
    socketService.terminateStudentExam('student-id', sessionId, examId, 'Vi phạm nghiêm trọng');
    addEvent('error', 'Exam termination sent');
  };

  // Get event color
  const getEventColor = (type) => {
    switch (type) {
      case 'success': return 'success';
      case 'error': return 'error';
      case 'warning': return 'warning';
      case 'info': return 'info';
      default: return 'default';
    }
  };

  // Get event icon
  const getEventIcon = (type) => {
    switch (type) {
      case 'success': return <CheckCircle fontSize="small" />;
      case 'error': return <ErrorIcon fontSize="small" />;
      case 'warning': return <Warning fontSize="small" />;
      case 'info': return <InfoIcon fontSize="small" />;
      default: return null;
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        🔌 Socket.IO Real-time Test
      </Typography>
      <Typography variant="body2" color="text.secondary" gutterBottom>
        Test Socket.IO monitoring events - Student và Teacher
      </Typography>

      {connectionError && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setConnectionError('')}>
          {connectionError}
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* Connection Control */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Connection
            </Typography>
            
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2">
                Status: {connected ? 
                  <Chip label="Connected" color="success" size="small" /> : 
                  <Chip label="Disconnected" color="error" size="small" />
                }
              </Typography>
              {socketId && (
                <Typography variant="caption" display="block">
                  Socket ID: {socketId}
                </Typography>
              )}
            </Box>

            <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
              {!connected ? (
                <Button
                  variant="contained"
                  color="success"
                  startIcon={<PlayArrow />}
                  onClick={handleConnect}
                  fullWidth
                >
                  Connect
                </Button>
              ) : (
                <Button
                  variant="outlined"
                  color="error"
                  startIcon={<Stop />}
                  onClick={handleDisconnect}
                  fullWidth
                >
                  Disconnect
                </Button>
              )}
            </Box>

            <Divider sx={{ my: 2 }} />

            <Typography variant="subtitle2" gutterBottom>
              Test Configuration
            </Typography>
            
            <TextField
              label="Exam ID"
              value={examId}
              onChange={(e) => setExamId(e.target.value)}
              fullWidth
              size="small"
              sx={{ mb: 1 }}
            />
            
            <TextField
              label="Session ID"
              value={sessionId}
              onChange={(e) => setSessionId(e.target.value)}
              fullWidth
              size="small"
              sx={{ mb: 1 }}
            />

            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                variant={role === 'student' ? 'contained' : 'outlined'}
                onClick={() => setRole('student')}
                size="small"
                fullWidth
              >
                Student
              </Button>
              <Button
                variant={role === 'teacher' ? 'contained' : 'outlined'}
                onClick={() => setRole('teacher')}
                size="small"
                fullWidth
              >
                Teacher
              </Button>
            </Box>
          </Paper>

          {/* Student Actions */}
          {role === 'student' && (
            <Paper sx={{ p: 2, mt: 2 }}>
              <Typography variant="h6" gutterBottom>
                📚 Student Actions
              </Typography>
              
              <Button
                variant="contained"
                onClick={handleStudentJoinExam}
                disabled={!connected}
                fullWidth
                sx={{ mb: 1 }}
              >
                Join Exam
              </Button>
              
              <Button
                variant="outlined"
                onClick={handleStudentLeaveExam}
                disabled={!connected}
                fullWidth
                sx={{ mb: 1 }}
              >
                Leave Exam
              </Button>
              
              <Button
                variant="outlined"
                onClick={handleSendHeartbeat}
                disabled={!connected}
                fullWidth
                sx={{ mb: 1 }}
              >
                Send Heartbeat
              </Button>
              
              <TextField
                select
                label="Violation Type"
                value={violationType}
                onChange={(e) => setViolationType(e.target.value)}
                fullWidth
                size="small"
                sx={{ mb: 1 }}
                SelectProps={{ native: true }}
              >
                <option value="looking_away">Looking Away</option>
                <option value="multiple_faces">Multiple Faces</option>
                <option value="face_not_detected">No Face</option>
                <option value="phone_detected">Phone Detected</option>
                <option value="tab_switch">Tab Switch</option>
              </TextField>
              
              <Button
                variant="contained"
                color="warning"
                onClick={handleReportViolation}
                disabled={!connected}
                fullWidth
                startIcon={<Send />}
              >
                Report Violation
              </Button>
            </Paper>
          )}

          {/* Teacher Actions */}
          {role === 'teacher' && (
            <Paper sx={{ p: 2, mt: 2 }}>
              <Typography variant="h6" gutterBottom>
                👨‍🏫 Teacher Actions
              </Typography>
              
              <Button
                variant="contained"
                onClick={handleTeacherJoinMonitoring}
                disabled={!connected}
                fullWidth
                sx={{ mb: 1 }}
              >
                Join Monitoring
              </Button>
              
              <Button
                variant="outlined"
                onClick={handleTeacherLeaveMonitoring}
                disabled={!connected}
                fullWidth
                sx={{ mb: 1 }}
              >
                Leave Monitoring
              </Button>
              
              <TextField
                label="Warning Message"
                value={warningMessage}
                onChange={(e) => setWarningMessage(e.target.value)}
                fullWidth
                size="small"
                sx={{ mb: 1 }}
              />
              
              <Button
                variant="contained"
                color="warning"
                onClick={handleSendWarning}
                disabled={!connected}
                fullWidth
                startIcon={<Send />}
                sx={{ mb: 1 }}
              >
                Send Warning
              </Button>
              
              <TextField
                label="Announcement"
                value={announcementMessage}
                onChange={(e) => setAnnouncementMessage(e.target.value)}
                fullWidth
                size="small"
                sx={{ mb: 1 }}
              />
              
              <Button
                variant="outlined"
                onClick={handleBroadcastAnnouncement}
                disabled={!connected}
                fullWidth
                startIcon={<Send />}
                sx={{ mb: 1 }}
              >
                Broadcast Announcement
              </Button>
              
              <Button
                variant="outlined"
                onClick={handleRequestSnapshot}
                disabled={!connected}
                fullWidth
                sx={{ mb: 1 }}
              >
                Request Snapshot
              </Button>
              
              <Button
                variant="contained"
                color="error"
                onClick={handleTerminateExam}
                disabled={!connected}
                fullWidth
              >
                Terminate Student
              </Button>
            </Paper>
          )}
        </Grid>

        {/* Event Log */}
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">
                📜 Event Log ({events.length})
              </Typography>
              <IconButton onClick={() => setEvents([])} size="small">
                <Refresh />
              </IconButton>
            </Box>

            <List
              ref={eventLogRef}
              sx={{
                maxHeight: 600,
                overflow: 'auto',
                bgcolor: 'background.paper',
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 1
              }}
            >
              {events.length === 0 ? (
                <ListItem>
                  <ListItemText
                    primary="No events yet"
                    secondary="Connect and perform actions to see events"
                  />
                </ListItem>
              ) : (
                events.map((event, index) => (
                  <React.Fragment key={index}>
                    <ListItem>
                      <ListItemText
                        primary={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            {getEventIcon(event.type)}
                            <Typography variant="body2">
                              {event.message}
                            </Typography>
                            <Chip
                              label={event.type}
                              size="small"
                              color={getEventColor(event.type)}
                            />
                          </Box>
                        }
                        secondary={
                          <>
                            <Typography variant="caption" color="text.secondary">
                              {event.timestamp}
                            </Typography>
                            {Object.keys(event.data).length > 0 && (
                              <Typography variant="caption" display="block" sx={{ fontFamily: 'monospace', mt: 0.5 }}>
                                {JSON.stringify(event.data, null, 2)}
                              </Typography>
                            )}
                          </>
                        }
                      />
                    </ListItem>
                    {index < events.length - 1 && <Divider />}
                  </React.Fragment>
                ))
              )}
            </List>
          </Paper>

          {/* Instructions */}
          <Paper sx={{ p: 2, mt: 2, bgcolor: '#f5f5f5' }}>
            <Typography variant="h6" gutterBottom>
              📝 Test Instructions
            </Typography>
            <Typography variant="body2" component="div">
              <strong>Test real-time monitoring:</strong>
              <ol>
                <li>Connect to Socket.IO server</li>
                <li>
                  <strong>As Student:</strong>
                  <ul>
                    <li>Click "Join Exam" to join monitoring room</li>
                    <li>Send heartbeats periodically</li>
                    <li>Report violations (simulating AI detection)</li>
                    <li>Watch for warnings/announcements from teacher</li>
                  </ul>
                </li>
                <li>
                  <strong>As Teacher:</strong>
                  <ul>
                    <li>Click "Join Monitoring" to monitor exam</li>
                    <li>Watch for student joins, heartbeats, violations</li>
                    <li>Send warnings to students</li>
                    <li>Broadcast announcements</li>
                    <li>Request snapshots</li>
                    <li>Terminate student exams</li>
                  </ul>
                </li>
                <li>
                  <strong>Multi-tab test:</strong>
                  <ul>
                    <li>Open 2 tabs: one as Student, one as Teacher</li>
                    <li>Test real-time communication between them</li>
                  </ul>
                </li>
              </ol>
            </Typography>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default SocketTest;

