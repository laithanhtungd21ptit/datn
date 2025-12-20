import { ExamSessionModel } from '../models/ExamSession.js';
import { MonitoringSettingsModel } from '../models/MonitoringSettings.js';
import { AssignmentModel } from '../models/Assignment.js';
import { UserModel } from '../models/User.js';
import { EnrollmentModel } from '../models/Enrollment.js';
import { ClassModel } from '../models/Class.js';

/**
 * @desc    Start exam session for student
 * @route   POST /api/monitoring/session/start
 * @access  Private (Student)
 */
export const startExamSession = async (req, res, next) => {
  try {
    const { assignmentId, deviceInfo } = req.body;
    const studentId = req.user.id;

    // Validate assignment exists and is an exam
    const assignment = await AssignmentModel.findById(assignmentId);
    if (!assignment) {
      return res.status(404).json({ error: 'ASSIGNMENT_NOT_FOUND', message: 'Bài tập không tồn tại' });
    }

    if (!assignment.isExam) {
      return res.status(400).json({ error: 'NOT_AN_EXAM', message: 'Đây không phải là bài thi' });
    }

    // Check if student is enrolled in the class
    const enrollment = await EnrollmentModel.findOne({
      classId: assignment.classId,
      studentId,
      status: 'enrolled'
    });

    if (!enrollment) {
      return res.status(403).json({ error: 'NOT_ENROLLED', message: 'Bạn chưa đăng ký lớp học này' });
    }

    // ✅ QUAN TRỌNG: End tất cả session cũ của student này cho assignment này
    // Đảm bảo chỉ có 1 session in_progress tại một thời điểm
    const oldSessions = await ExamSessionModel.updateMany(
      {
        assignmentId,
        studentId,
        status: 'in_progress'
      },
      {
        $set: {
          status: 'completed',
          endedAt: new Date(),
          terminationReason: 'New session started - previous session ended'
        }
      }
    );
    
    if (oldSessions.modifiedCount > 0) {
      console.log(`✅ Ended ${oldSessions.modifiedCount} old session(s) for student ${studentId} and assignment ${assignmentId}`);
    }

    // Get or create monitoring settings
    const settings = await MonitoringSettingsModel.getOrCreateDefault(assignmentId);

    // Create new exam session
    const session = await ExamSessionModel.create({
      assignmentId,
      studentId,
      deviceInfo: deviceInfo || {},
      monitoringEnabled: settings.enabled,
      startedAt: new Date()
    });

    res.status(201).json({
      success: true,
      continued: false, // This is a new session
      session: {
        id: session._id,
        assignmentId: session.assignmentId,
        studentId: session.studentId,
        startedAt: session.startedAt,
        status: session.status,
        monitoringEnabled: session.monitoringEnabled,
        assignment
      },
      settings: {
        requireCamera: settings.requireCamera,
        requireMicrophone: settings.requireMicrophone,
        requireFullScreen: settings.requireFullScreen,
        detectFaceTracking: settings.detectFaceTracking,
        detectMultipleFaces: settings.detectMultipleFaces,
        detectLookingAway: settings.detectLookingAway,
        detectPhoneUsage: settings.detectPhoneUsage,
        detectTabSwitch: settings.detectTabSwitch,
        detectCopyPaste: settings.detectCopyPaste,
        detectRightClick: settings.detectRightClick,
        detectDevTools: settings.detectDevTools,
        maxViolationsBeforeTerminate: settings.maxViolationsBeforeTerminate,
        heartbeatInterval: settings.heartbeatInterval
      }
    });

  } catch (error) {
    console.error('Error starting exam session:', error);
    next(error);
  }
};

/**
 * @desc    Update session heartbeat
 * @route   POST /api/monitoring/session/heartbeat
 * @access  Private (Student)
 */
export const updateHeartbeat = async (req, res, next) => {
  try {
    const { sessionId } = req.body;
    const studentId = req.user.id;

    const session = await ExamSessionModel.findOne({
      _id: sessionId,
      studentId,
      status: 'in_progress'
    });

    if (!session) {
      return res.status(404).json({ error: 'SESSION_NOT_FOUND', message: 'Phiên thi không tồn tại' });
    }

    await session.updateHeartbeat();

    res.json({
      success: true,
      lastHeartbeat: session.lastHeartbeat
    });

  } catch (error) {
    console.error('Error updating heartbeat:', error);
    next(error);
  }
};

/**
 * @desc    Report violation
 * @route   POST /api/monitoring/violation/report
 * @access  Private (Student)
 */
export const reportViolation = async (req, res, next) => {
  try {
    const { sessionId, violation } = req.body;
    const studentId = req.user.id;

    // Validate violation data
    if (!violation || !violation.type) {
      return res.status(400).json({ error: 'INVALID_VIOLATION', message: 'Dữ liệu vi phạm không hợp lệ' });
    }

    const session = await ExamSessionModel.findOne({
      _id: sessionId,
      studentId,
      status: 'in_progress'
    });

    if (!session) {
      return res.status(404).json({ error: 'SESSION_NOT_FOUND', message: 'Phiên thi không tồn tại' });
    }

    // Add violation to session
    const violationData = {
      type: violation.type,
      description: violation.description || '',
      evidence: violation.evidence || '',
      timestamp: new Date(),
      details: violation.details || null
    };
    
    await session.addViolation(violationData);

    /*
    // Check if max violations exceeded
    const settings = await MonitoringSettingsModel.findOne({ assignmentId: session.assignmentId });
    const shouldTerminate = session.totalViolations >= settings.maxViolationsBeforeTerminate;

    if (shouldTerminate) {
      await session.endSession('terminated');
      
      return res.json({
        success: true,
        violation: violation,
        totalViolations: session.totalViolations,
        terminated: true,
        message: 'Bài thi đã bị kết thúc do vi phạm quá nhiều'
      });
    }
    */
    res.json({
      success: true,
      violation: violation,
      totalViolations: session.totalViolations,
      terminated: false
    });

  } catch (error) {
    console.error('Error reporting violation:', error);
    next(error);
  }
};

/**
 * @desc    End exam session
 * @route   POST /api/monitoring/session/end
 * @access  Private (Student)
 */
export const endExamSession = async (req, res, next) => {
  try {
    const { sessionId, reason } = req.body;
    const studentId = req.user.id;

    const session = await ExamSessionModel.findOne({
      _id: sessionId,
      studentId
    });

    if (!session) {
      return res.status(404).json({ error: 'SESSION_NOT_FOUND', message: 'Phiên thi không tồn tại' });
    }

    if (session.status !== 'in_progress') {
      return res.status(400).json({ error: 'SESSION_NOT_ACTIVE', message: 'Phiên thi không còn hoạt động' });
    }

    // ✅ QUAN TRỌNG: Nếu reason = 'completed', kiểm tra xem có submission không
    // Nếu có submission thì set isSubmitted = true (để tránh race condition)
    // Hoặc nếu session đã có isSubmitted = true (từ route submit) thì giữ nguyên
    if (reason === 'completed') {
      // Kiểm tra lại từ database xem có submission không
      const { SubmissionModel } = await import('../models/Submission.js');
      const submission = await SubmissionModel.findOne({
        assignmentId: session.assignmentId,
        studentId: session.studentId,
        submittedAt: { $exists: true, $ne: null }
      });

      if (submission) {
        // Có submission → đánh dấu đã nộp bài
        session.isSubmitted = true;
        console.log(`✅ Marked session ${sessionId} as submitted (found submission)`);
      } else if (!session.isSubmitted) {
        // Không có submission và chưa được đánh dấu → reload session từ DB
        // (có thể đã được update bởi route submit nhưng chưa refresh)
        const refreshedSession = await ExamSessionModel.findById(sessionId);
        if (refreshedSession && refreshedSession.isSubmitted) {
          session.isSubmitted = true;
          console.log(`✅ Session ${sessionId} already marked as submitted (from DB)`);
        }
      }
    }

    await session.endSession(reason || 'completed');

    // ✅ QUAN TRỌNG: Nếu sinh viên không nộp bài (isSubmitted = false), xóa session và violations
    // Chỉ lưu giám sát khi sinh viên nộp bài
    if (!session.isSubmitted) {
      console.log(`🗑️  Deleting exam session ${sessionId} - student did not submit`);
      await ExamSessionModel.findByIdAndDelete(sessionId);
      
      return res.json({
        success: true,
        session: null,
        deleted: true,
        message: 'Session deleted - student did not submit'
      });
    }

    res.json({
      success: true,
      session: {
        id: session._id,
        status: session.status,
        startedAt: session.startedAt,
        endedAt: session.endedAt,
        durationMinutes: session.durationMinutes,
        totalViolations: session.totalViolations
      }
    });

  } catch (error) {
    console.error('Error ending exam session:', error);
    next(error);
  }
};

/**
 * @desc    Get session details
 * @route   GET /api/monitoring/session/:sessionId
 * @access  Private (Student/Teacher)
 */
export const getSessionDetails = async (req, res, next) => {
  try {
    const { sessionId } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    const session = await ExamSessionModel.findById(sessionId)
      .populate('assignmentId', 'title dueDate isExam durationMinutes')
      .populate('studentId', 'fullName email studentId avatar');

    if (!session) {
      return res.status(404).json({ error: 'SESSION_NOT_FOUND', message: 'Phiên thi không tồn tại' });
    }

    // Check permissions
    if (userRole === 'student' && session.studentId._id.toString() !== userId) {
      return res.status(403).json({ error: 'FORBIDDEN', message: 'Bạn không có quyền xem phiên thi này' });
    }

    res.json({
      success: true,
      session: {
        id: session._id,
        assignment: session.assignmentId,
        student: session.studentId,
        startedAt: session.startedAt,
        endedAt: session.endedAt,
        status: session.status,
        violations: session.violations,
        totalViolations: session.totalViolations,
        highSeverityViolations: session.highSeverityViolations,
        durationMinutes: session.durationMinutes,
        lastHeartbeat: session.lastHeartbeat,
        autoTerminated: session.autoTerminated,
        terminationReason: session.terminationReason
      }
    });

  } catch (error) {
    console.error('Error getting session details:', error);
    next(error);
  }
};

/**
 * @desc    Get all sessions for an exam (Teacher)
 * @route   GET /api/monitoring/exam/:examId/sessions
 * @access  Private (Teacher)
 */
export const getExamSessions = async (req, res, next) => {
  try {
    const { examId } = req.params;
    const { status } = req.query; // Optional filter by status

    // Validate assignment exists
    const assignment = await AssignmentModel.findById(examId);
    if (!assignment) {
      return res.status(404).json({ error: 'ASSIGNMENT_NOT_FOUND', message: 'Bài tập không tồn tại' });
    }

    // Check if teacher owns this class
    if (req.user.role === 'teacher') {
      const classInfo = await AssignmentModel.findById(examId).populate('classId');
      if (classInfo.classId.teacherId.toString() !== req.user.id) {
        return res.status(403).json({ error: 'FORBIDDEN', message: 'Bạn không có quyền xem giám sát lớp này' });
      }
    }

    // Build query
    // ✅ CHỈ LẤY SESSIONS ĐÃ NỘP BÀI (isSubmitted = true) HOẶC ĐANG THI (in_progress)
    // Vì khi đang thi thì chưa nộp, nhưng vẫn cần giám sát real-time
    const query = { assignmentId: examId };
    
    if (status) {
      if (status === 'in_progress') {
        // Đang thi: lấy tất cả in_progress (chưa cần nộp)
        query.status = 'in_progress';
      } else {
        // Đã kết thúc: chỉ lấy sessions đã nộp bài
        query.status = status;
        query.isSubmitted = true;
      }
    } else {
      // Không filter status: lấy cả đang thi và đã nộp bài
      query.$or = [
        { isSubmitted: true },
        { status: 'in_progress' }
      ];
    }

    const sessions = await ExamSessionModel.find(query)
      .populate('studentId', 'fullName email studentId avatar')
      .sort({ startedAt: -1 });

    // Calculate statistics
    const stats = {
      total: sessions.length,
      inProgress: sessions.filter(s => s.status === 'in_progress').length,
      completed: sessions.filter(s => s.status === 'completed').length,
      terminated: sessions.filter(s => s.status === 'terminated').length,
      totalViolations: sessions.reduce((sum, s) => sum + s.totalViolations, 0),
      avgViolationsPerStudent: sessions.length > 0 
        ? (sessions.reduce((sum, s) => sum + s.totalViolations, 0) / sessions.length).toFixed(2) 
        : 0
    };

    res.json({
      success: true,
      stats,
      sessions: sessions.map(s => ({
        id: s._id,
        student: s.studentId,
        startedAt: s.startedAt,
        endedAt: s.endedAt,
        status: s.status,
        totalViolations: s.totalViolations,
        highSeverityViolations: s.highSeverityViolations,
        lastHeartbeat: s.lastHeartbeat,
        durationMinutes: s.durationMinutes
      }))
    });

  } catch (error) {
    console.error('Error getting exam sessions:', error);
    next(error);
  }
};

/**
 * @desc    Get live monitoring data for an exam
 * @route   GET /api/monitoring/exam/:examId/live
 * @access  Private (Teacher)
 */
export const getLiveMonitoring = async (req, res, next) => {
  try {
    const { examId } = req.params;

    // Validate assignment exists
    const assignment = await AssignmentModel.findById(examId);
    if (!assignment) {
      return res.status(404).json({ error: 'ASSIGNMENT_NOT_FOUND', message: 'Bài tập không tồn tại' });
    }

    // Get all active sessions
    const activeSessions = await ExamSessionModel.find({
      assignmentId: examId,
      status: 'in_progress'
    })
      .populate('studentId', 'fullName email studentId avatar')
      .sort({ lastHeartbeat: -1 });

    // Calculate real-time stats
    const now = new Date();
    const activeCount = activeSessions.filter(s => 
      (now - new Date(s.lastHeartbeat)) < 30000 // Active if heartbeat within 30s
    ).length;

    const recentViolations = activeSessions
      .flatMap(s => s.violations.map(v => ({
        ...v.toObject(),
        sessionId: s._id,
        studentName: s.studentId.fullName,
        studentId: s.studentId.studentId
      })))
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, 20); // Last 20 violations

    res.json({
      success: true,
      liveData: {
        activeStudents: activeCount,
        totalSessions: activeSessions.length,
        recentViolations,
        sessions: activeSessions.map(s => ({
          id: s._id,
          student: s.studentId,
          startedAt: s.startedAt,
          totalViolations: s.totalViolations,
          lastHeartbeat: s.lastHeartbeat,
          isActive: (now - new Date(s.lastHeartbeat)) < 30000,
          latestViolation: s.violations.length > 0 
            ? s.violations[s.violations.length - 1] 
            : null
        }))
      }
    });

  } catch (error) {
    console.error('Error getting live monitoring:', error);
    next(error);
  }
};

/**
 * @desc    Send warning to student (Teacher)
 * @route   POST /api/monitoring/session/:sessionId/warn
 * @access  Private (Teacher)
 */
export const sendWarningToStudent = async (req, res, next) => {
  try {
    const { sessionId } = req.params;
    const { message } = req.body;

    const session = await ExamSessionModel.findById(sessionId);
    if (!session) {
      return res.status(404).json({ error: 'SESSION_NOT_FOUND', message: 'Phiên thi không tồn tại' });
    }

    // Add warning as a special violation
    await session.addViolation({
      type: 'teacher_warning',
      description: message || 'Cảnh báo từ giảng viên',
      timestamp: new Date()
    });

    res.json({
      success: true,
      message: 'Đã gửi cảnh báo đến sinh viên'
    });

  } catch (error) {
    console.error('Error sending warning:', error);
    next(error);
  }
};

/**
 * @desc    Terminate student exam (Teacher)
 * @route   POST /api/monitoring/session/:sessionId/terminate
 * @access  Private (Teacher)
 */
export const terminateStudentExam = async (req, res, next) => {
  try {
    const { sessionId } = req.params;
    const { reason } = req.body;

    const session = await ExamSessionModel.findById(sessionId);
    if (!session) {
      return res.status(404).json({ error: 'SESSION_NOT_FOUND', message: 'Phiên thi không tồn tại' });
    }

    if (session.status !== 'in_progress') {
      return res.status(400).json({ error: 'SESSION_NOT_ACTIVE', message: 'Phiên thi không còn hoạt động' });
    }

    session.terminationReason = reason || 'Bị giảng viên kết thúc';
    await session.endSession('terminated');

    res.json({
      success: true,
      message: 'Đã kết thúc phiên thi của sinh viên'
    });

  } catch (error) {
    console.error('Error terminating exam:', error);
    next(error);
  }
};

/**
 * @desc    Get monitoring settings for exam
 * @route   GET /api/monitoring/settings/:examId
 * @access  Private (Teacher/Student)
 */
export const getMonitoringSettings = async (req, res, next) => {
  try {
    const { examId } = req.params;

    const settings = await MonitoringSettingsModel.getOrCreateDefault(examId);

    res.json({
      success: true,
      settings
    });

  } catch (error) {
    console.error('Error getting monitoring settings:', error);
    next(error);
  }
};

/**
 * @desc    Update monitoring settings for exam
 * @route   PUT /api/monitoring/settings/:examId
 * @access  Private (Teacher)
 */
export const updateMonitoringSettings = async (req, res, next) => {
  try {
    const { examId } = req.params;
    const updates = req.body;

    let settings = await MonitoringSettingsModel.findOne({ assignmentId: examId });
    
    if (!settings) {
      settings = await MonitoringSettingsModel.create({
        assignmentId: examId,
        ...updates
      });
    } else {
      await settings.updateSettings(updates);
    }

    res.json({
      success: true,
      settings,
      message: 'Đã cập nhật cài đặt giám sát'
    });

  } catch (error) {
    console.error('Error updating monitoring settings:', error);
    next(error);
  }
};

/**
 * @desc    Get all exams with monitoring for teacher
 * @route   GET /api/monitoring/exams
 * @access  Private (Teacher)
 */
export const getTeacherExamsWithMonitoring = async (req, res, next) => {
  try {
    const teacherId = req.user.id;
    const { page = 1, limit = 5 } = req.query;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Get all classes of teacher
    const classes = await ClassModel.find({ teacherId }).select('_id name code');
    const classIds = classes.map(c => c._id);

    // Get all exams with monitoring enabled
    const exams = await AssignmentModel.find({
      classId: { $in: classIds },
      isExam: true,
      requireMonitoring: true
    })
      .populate('classId', 'name code')
      .sort({ startTime: -1, createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean();

    // Get session counts for each exam
    // ✅ ĐẾM SESSIONS ĐÃ NỘP BÀI (isSubmitted = true) HOẶC ĐANG THI (in_progress)
    // Vì khi đang thi thì chưa nộp, nhưng vẫn cần hiển thị để giám sát real-time
    const examIds = exams.map(e => e._id);
    const sessionCounts = await ExamSessionModel.aggregate([
      { 
        $match: { 
          assignmentId: { $in: examIds },
          $or: [
            { isSubmitted: true },
            { status: 'in_progress' }
          ]
        } 
      },
      { $group: { 
        _id: '$assignmentId', 
        total: { $sum: 1 },
        inProgress: { $sum: { $cond: [{ $eq: ['$status', 'in_progress'] }, 1, 0] } },
        totalViolations: { $sum: '$totalViolations' }
      }}
    ]);

    const sessionCountMap = new Map(
      sessionCounts.map(s => [String(s._id), s])
    );

    // Format response
    const examsWithStats = exams.map(exam => {
      const stats = sessionCountMap.get(String(exam._id)) || { total: 0, inProgress: 0, totalViolations: 0 };
      return {
        id: String(exam._id),
        title: exam.title,
        description: exam.description,
        startTime: exam.startTime,
        endTime: exam.endTime,
        dueDate: exam.dueDate,
        durationMinutes: exam.durationMinutes,
        className: exam.classId?.name || 'Unknown',
        classCode: exam.classId?.code || 'Unknown',
        stats: {
          totalSessions: stats.total,
          activeSessions: stats.inProgress,
          totalViolations: stats.totalViolations
        }
      };
    });

    // Get total count for pagination
    const total = await AssignmentModel.countDocuments({
      classId: { $in: classIds },
      isExam: true,
      requireMonitoring: true
    });

    res.json({
      success: true,
      exams: examsWithStats,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum)
      }
    });

  } catch (error) {
    console.error('Error getting teacher exams with monitoring:', error);
    next(error);
  }
};

/**
 * @desc    Get violations for a session
 * @route   GET /api/monitoring/session/:sessionId/violations
 * @access  Private (Teacher)
 */
export const getSessionViolations = async (req, res, next) => {
  try {
    const { sessionId } = req.params;

    const session = await ExamSessionModel.findById(sessionId)
      .populate('studentId', 'fullName email studentId avatar')
      .populate('assignmentId', 'title');

    if (!session) {
      return res.status(404).json({ 
        error: 'SESSION_NOT_FOUND', 
        message: 'Phiên thi không tồn tại' 
      });
    }

    // Check if teacher has access (through class ownership)
    if (req.user.role === 'teacher') {
      const assignment = await AssignmentModel.findById(session.assignmentId)
        .populate('classId');
      
      if (!assignment || String(assignment.classId.teacherId) !== String(req.user.id)) {
        return res.status(403).json({ 
          error: 'FORBIDDEN', 
          message: 'Bạn không có quyền xem phiên thi này' 
        });
      }
    }

    // Sort violations by timestamp (newest first)
    const violations = session.violations
      .map(v => ({
        id: String(v._id),
        type: v.type,
        timestamp: v.timestamp,
        description: v.description,
        details: v.details,
        evidence: v.evidence
      }))
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    res.json({
      success: true,
      session: {
        id: String(session._id),
        student: session.studentId,
        assignment: {
          id: String(session.assignmentId._id),
          title: session.assignmentId.title
        },
        startedAt: session.startedAt,
        endedAt: session.endedAt,
        status: session.status,
        totalViolations: session.totalViolations
      },
      violations
    });

  } catch (error) {
    console.error('Error getting session violations:', error);
    next(error);
  }
};

