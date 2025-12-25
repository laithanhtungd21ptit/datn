/**
 * SocketService
 * 
 * Service để quản lý Socket.IO connection cho monitoring
 * Wrapper around socket.io-client với các methods tiện lợi
 */

import { io } from 'socket.io-client';

class SocketService {
  constructor() {
    this.socket = null;
    this.isConnected = false;
    this.listeners = new Map();
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
  }

  /**
   * Connect to Socket.IO server
   */
  connect(token) {
    if (this.socket && this.isConnected) {
      console.warn('Socket already connected');
      return this.socket;
    }

    const serverUrl = process.env.REACT_APP_API_URL || 'http://localhost:4000';

    try {
      this.socket = io(serverUrl, {
        auth: {
          token: token || localStorage.getItem('token')
        },
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        reconnectionAttempts: this.maxReconnectAttempts,
        transports: ['websocket', 'polling']
      });

      this.setupConnectionHandlers();
      
      console.log('✅ Socket.IO connecting...');
      
      return this.socket;
    } catch (error) {
      console.error('❌ Socket connection error:', error);
      throw error;
    }
  }

  /**
   * Setup connection event handlers
   */
  setupConnectionHandlers() {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      this.isConnected = true;
      this.reconnectAttempts = 0;
      console.log('✅ Socket connected:', this.socket.id);
      
      // Join user room to receive notifications
      // Get userId from JWT token
      try {
        const token = localStorage.getItem('accessToken');
        if (token) {
          // Decode JWT to get user ID (simple base64 decode, no verification needed for client)
          const payload = JSON.parse(atob(token.split('.')[1]));
          const userId = payload.id || payload.userId || payload.sub;
          if (userId) {
            this.socket.emit('join', userId);
            console.log('✅ Joined user room:', userId);
          } else {
            console.warn('⚠️ No userId found in token');
          }
        }
      } catch (error) {
        console.error('❌ Failed to join user room:', error);
      }
      
      // Trigger custom callback if set
      if (this.listeners.has('onConnect')) {
        this.listeners.get('onConnect')();
      }
    });

    this.socket.on('disconnect', (reason) => {
      this.isConnected = false;
      console.log('❌ Socket disconnected:', reason);
      
      if (this.listeners.has('onDisconnect')) {
        this.listeners.get('onDisconnect')(reason);
      }
    });

    this.socket.on('connect_error', (error) => {
      this.reconnectAttempts++;
      console.error('❌ Socket connection error:', error.message);
      
      if (this.listeners.has('onError')) {
        this.listeners.get('onError')(error);
      }

      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        console.error('Max reconnection attempts reached');
        this.disconnect();
      }
    });

    this.socket.on('monitoring:error', (data) => {
      console.error('Monitoring error:', data.message);
      if (this.listeners.has('onMonitoringError')) {
        this.listeners.get('onMonitoringError')(data);
      }
    });
  }

  /**
   * Set connection callbacks
   */
  setConnectionCallbacks(callbacks) {
    if (callbacks.onConnect) this.listeners.set('onConnect', callbacks.onConnect);
    if (callbacks.onDisconnect) this.listeners.set('onDisconnect', callbacks.onDisconnect);
    if (callbacks.onError) this.listeners.set('onError', callbacks.onError);
    if (callbacks.onMonitoringError) this.listeners.set('onMonitoringError', callbacks.onMonitoringError);
  }

  /**
   * Disconnect from server
   */
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
      this.listeners.clear();
      console.log('✅ Socket disconnected');
    }
  }

  /**
   * Check if connected
   */
  isSocketConnected() {
    return this.socket && this.isConnected;
  }

  // =============================================================================
  // STUDENT METHODS
  // =============================================================================

  /**
   * Student joins exam monitoring
   */
  joinExam(examId, sessionId) {
    if (!this.isSocketConnected()) {
      console.error('Socket not connected');
      return;
    }

    this.socket.emit('monitoring:join_exam', {
      examId,
      sessionId
    });

    console.log(`Joined exam monitoring: ${examId}`);
  }

  /**
   * Student leaves exam
   */
  leaveExam(examId, sessionId) {
    if (!this.isSocketConnected()) return;

    this.socket.emit('monitoring:leave_exam', {
      examId,
      sessionId
    });

    console.log(`Left exam monitoring: ${examId}`);
  }

  /**
   * Send heartbeat
   */
  sendHeartbeat(examId, sessionId, status = {}) {
    if (!this.isSocketConnected()) return;

    this.socket.emit('monitoring:heartbeat', {
      examId,
      sessionId,
      status
    });
  }

  /**
   * Report violation
   */
  reportViolation(examId, sessionId, violation) {
    if (!this.isSocketConnected()) {
      console.error('Socket not connected, cannot report violation');
      return;
    }

    this.socket.emit('monitoring:violation_detected', {
      examId,
      sessionId,
      violation
    });

    console.log(`Violation reported: ${violation.type}`);
  }

  /**
   * Update monitoring status (camera on/off, etc.)
   */
  updateStatus(examId, sessionId, status) {
    if (!this.isSocketConnected()) return;

    this.socket.emit('monitoring:status_update', {
      examId,
      sessionId,
      status
    });
  }

  /**
   * Respond to snapshot request
   */
  sendSnapshot(examId, sessionId, snapshot) {
    if (!this.isSocketConnected()) return;

    this.socket.emit('monitoring:snapshot_response', {
      examId,
      sessionId,
      snapshot
    });
  }

  /**
   * Listen for teacher warnings
   */
  onWarningReceived(callback) {
    if (!this.isSocketConnected()) return;

    this.socket.on('monitoring:warning_received', (data) => {
      console.log('Warning received:', data.message);
      callback(data);
    });
  }

  /**
   * Listen for teacher announcements
   */
  onAnnouncement(callback) {
    if (!this.isSocketConnected()) return;

    this.socket.on('monitoring:announcement', (data) => {
      console.log('Announcement received:', data.message);
      callback(data);
    });
  }

  /**
   * Listen for exam termination
   */
  onExamTerminated(callback) {
    if (!this.isSocketConnected()) return;

    this.socket.on('monitoring:exam_terminated', (data) => {
      console.log('Exam terminated:', data.reason);
      callback(data);
    });
  }

  /**
   * Listen for snapshot requests from teacher
   */
  onSnapshotRequested(callback) {
    if (!this.isSocketConnected()) return;

    this.socket.on('monitoring:snapshot_requested', (data) => {
      console.log('Snapshot requested');
      callback(data);
    });
  }

  // =============================================================================
  // TEACHER METHODS
  // =============================================================================

  /**
   * Teacher joins monitoring room
   */
  teacherJoinMonitoring(examId) {
    if (!this.isSocketConnected()) {
      console.error('Socket not connected');
      return;
    }

    this.socket.emit('monitoring:teacher_join', {
      examId
    });

    console.log(`Teacher joined monitoring: ${examId}`);
  }

  /**
   * Teacher leaves monitoring
   */
  teacherLeaveMonitoring(examId) {
    if (!this.isSocketConnected()) return;

    this.socket.emit('monitoring:teacher_leave', {
      examId
    });

    console.log(`Teacher left monitoring: ${examId}`);
  }

  /**
   * Teacher sends warning to student
   */
  sendWarningToStudent(studentId, sessionId, message) {
    if (!this.isSocketConnected()) {
      console.error('Socket not connected');
      return;
    }

    this.socket.emit('monitoring:send_warning', {
      studentId,
      sessionId,
      message
    });

    console.log(`Warning sent to student ${studentId}`);
  }

  /**
   * Teacher broadcasts announcement to all students
   */
  broadcastAnnouncement(examId, message) {
    if (!this.isSocketConnected()) {
      console.error('Socket not connected');
      return;
    }

    this.socket.emit('monitoring:broadcast_announcement', {
      examId,
      message
    });

    console.log(`Announcement broadcasted to exam ${examId}`);
  }

  /**
   * Teacher terminates student's exam
   */
  terminateStudentExam(studentId, sessionId, examId, reason) {
    if (!this.isSocketConnected()) {
      console.error('Socket not connected');
      return;
    }

    this.socket.emit('monitoring:terminate_exam', {
      studentId,
      sessionId,
      examId,
      reason
    });

    console.log(`Terminating exam for student ${studentId}`);
  }

  /**
   * Teacher requests snapshot from all students
   */
  requestSnapshot(examId) {
    if (!this.isSocketConnected()) return;

    this.socket.emit('monitoring:request_snapshot', {
      examId
    });

    console.log(`Snapshot requested for exam ${examId}`);
  }

  /**
   * Listen for student joining
   */
  onStudentJoined(callback) {
    if (!this.isSocketConnected()) return;

    this.socket.on('monitoring:student_joined', (data) => {
      console.log('Student joined:', data.studentName);
      callback(data);
    });
  }

  /**
   * Listen for student leaving
   */
  onStudentLeft(callback) {
    if (!this.isSocketConnected()) return;

    this.socket.on('monitoring:student_left', (data) => {
      console.log('Student left:', data.studentName);
      callback(data);
    });
  }

  /**
   * Listen for student heartbeat
   */
  onStudentHeartbeat(callback) {
    if (!this.isSocketConnected()) return;

    this.socket.on('monitoring:student_heartbeat', (data) => {
      callback(data);
    });
  }

  /**
   * Listen for new violations
   */
  onNewViolation(callback) {
    if (!this.isSocketConnected()) return;

    this.socket.on('monitoring:new_violation', (data) => {
      console.log('New violation:', data.violation.type, 'from', data.studentName);
      callback(data);
    });
  }

  /**
   * Listen for student status updates
   */
  onStudentStatusUpdate(callback) {
    if (!this.isSocketConnected()) return;

    this.socket.on('monitoring:student_status_update', (data) => {
      callback(data);
    });
  }

  /**
   * Listen for student snapshot responses
   */
  onStudentSnapshot(callback) {
    if (!this.isSocketConnected()) return;

    this.socket.on('monitoring:student_snapshot', (data) => {
      callback(data);
    });
  }

  /**
   * Listen for warning sent confirmation
   */
  onWarningSent(callback) {
    if (!this.isSocketConnected()) return;

    this.socket.on('monitoring:warning_sent', (data) => {
      console.log('Warning sent confirmation');
      callback(data);
    });
  }

  /**
   * Listen for announcement sent confirmation
   */
  onAnnouncementSent(callback) {
    if (!this.isSocketConnected()) return;

    this.socket.on('monitoring:announcement_sent', (data) => {
      console.log('Announcement sent confirmation');
      callback(data);
    });
  }

  /**
   * Listen for terminate success
   */
  onTerminateSuccess(callback) {
    if (!this.isSocketConnected()) return;

    this.socket.on('monitoring:terminate_success', (data) => {
      console.log('Terminate success');
      callback(data);
    });
  }

  /**
   * Listen for student terminated notification
   */
  onStudentTerminated(callback) {
    if (!this.isSocketConnected()) return;

    this.socket.on('monitoring:student_terminated', (data) => {
      console.log('Student terminated:', data.studentId);
      callback(data);
    });
  }

  /**
   * Listen for teacher joined confirmation
   */
  onTeacherJoined(callback) {
    if (!this.isSocketConnected()) return;

    this.socket.on('monitoring:teacher_joined', (data) => {
      console.log('Teacher joined monitoring:', data.examId);
      callback(data);
    });
  }

  // =============================================================================
  // NOTIFICATION METHODS
  // =============================================================================

  /**
   * Listen for new notifications
   */
  onNewNotification(callback) {
    if (!this.socket) {
      console.warn('⚠️ Socket not initialized, cannot listen for notifications');
      return;
    }

    console.log('📬 Setting up new_notification listener');
    this.socket.on('new_notification', (notification) => {
      console.log('📬 New notification received:', notification.title);
      console.log('📬 Notification type:', notification.type);
      console.log('📬 Full notification:', notification);
      callback(notification);
    });
  }

  /**
   * Remove notification listener
   */
  offNewNotification() {
    if (this.socket) {
      this.socket.off('new_notification');
    }
  }

  // =============================================================================
  // UTILITY METHODS
  // =============================================================================

  /**
   * Remove specific event listener
   */
  off(eventName) {
    if (this.socket) {
      this.socket.off(eventName);
    }
  }

  /**
   * Remove all event listeners
   */
  removeAllListeners() {
    if (this.socket) {
      this.socket.removeAllListeners();
    }
  }

  /**
   * Get socket ID
   */
  getSocketId() {
    return this.socket ? this.socket.id : null;
  }

  /**
   * Get connection status
   */
  getStatus() {
    return {
      connected: this.isConnected,
      socketId: this.getSocketId(),
      reconnectAttempts: this.reconnectAttempts
    };
  }
}

// Export singleton instance
const socketService = new SocketService();
export default socketService;

