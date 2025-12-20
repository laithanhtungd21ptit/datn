import { Router } from 'express';
import { authRequired } from '../../middleware/auth.js';
import {
  startExamSession,
  updateHeartbeat,
  reportViolation,
  endExamSession,
  getSessionDetails,
  getExamSessions,
  getLiveMonitoring,
  sendWarningToStudent,
  terminateStudentExam,
  getMonitoringSettings,
  updateMonitoringSettings,
  getTeacherExamsWithMonitoring,
  getSessionViolations
} from '../../controllers/monitoringController.js';

export const monitoringRouter = Router();

/**
 * Student endpoints
 */
// Start exam session
monitoringRouter.post(
  '/session/start',
  authRequired(['student']),
  startExamSession
);

// Update heartbeat
monitoringRouter.post(
  '/session/heartbeat',
  authRequired(['student']),
  updateHeartbeat
);

// Report violation
monitoringRouter.post(
  '/violation/report',
  authRequired(['student']),
  reportViolation
);

// End exam session
monitoringRouter.post(
  '/session/end',
  authRequired(['student']),
  endExamSession
);

// Get session details (Student can only see their own)
monitoringRouter.get(
  '/session/:sessionId',
  authRequired(), // All authenticated users
  getSessionDetails
);

// Get violations for a session (Teacher)
monitoringRouter.get(
  '/session/:sessionId/violations',
  authRequired(['teacher', 'admin']),
  getSessionViolations
);

/**
 * Teacher endpoints
 */
// Get all exams with monitoring for teacher
monitoringRouter.get(
  '/exams',
  authRequired(['teacher', 'admin']),
  getTeacherExamsWithMonitoring
);

// Get all sessions for an exam
monitoringRouter.get(
  '/exam/:examId/sessions',
  authRequired(['teacher', 'admin']),
  getExamSessions
);

// Get live monitoring data
monitoringRouter.get(
  '/exam/:examId/live',
  authRequired(['teacher', 'admin']),
  getLiveMonitoring
);

// Send warning to student
monitoringRouter.post(
  '/session/:sessionId/warn',
  authRequired(['teacher', 'admin']),
  sendWarningToStudent
);

// Terminate student exam
monitoringRouter.post(
  '/session/:sessionId/terminate',
  authRequired(['teacher', 'admin']),
  terminateStudentExam
);

// Get monitoring settings
monitoringRouter.get(
  '/settings/:examId',
  authRequired(), // All authenticated users
  getMonitoringSettings
);

// Update monitoring settings
monitoringRouter.put(
  '/settings/:examId',
  authRequired(['teacher', 'admin']),
  updateMonitoringSettings
);

// Object Detection endpoint
monitoringRouter.post(
  '/detect-objects',
  authRequired(['student']),
  async (req, res) => {
    try {
      // Import ES modules
      const objectDetectionService = (await import('../../services/ObjectDetectionService.js')).default;
      const { ExamSessionModel } = await import('../../models/ExamSession.js');
      const { sessionId, imageData } = req.body;

      if (!imageData) {
        return res.status(400).json({
          success: false,
          message: 'Image data is required'
        });
      }

      // Check if imageData is valid base64
      if (typeof imageData !== 'string' || imageData.length < 100) {
        return res.status(400).json({
          success: false,
          message: 'Invalid image data format'
        });
      }

      // Detect objects
      let result;
      try {
        result = await objectDetectionService.detectFromBase64(imageData);
      } catch (detectionError) {
        console.error('Object detection error:', detectionError);
        return res.status(503).json({
          success: false,
          message: `Detection service error: ${detectionError.message}`,
          error: detectionError.message
        });
      }

      // Tạo violation cho TẤT CẢ vật thể detect được (không phân biệt cấm / không cấm)
      if (result && Array.isArray(result.detections) && result.detections.length > 0 && sessionId) {
        try {
          const session = await ExamSessionModel.findById(sessionId);
          
          if (session && session.status === 'in_progress') {
            // Lấy toàn bộ detections từ YOLO (COCO + custom)
            const allDetections = result.detections;

            for (const detection of allDetections) {
              session.violations.push({
                type: 'object_detected',
                timestamp: new Date(),
                // Không gọi là "vật thể cấm" nữa, chỉ ghi chung
                description: `Phát hiện vật thể: ${detection.class_vi || detection.class}`,
                details: {
                  object_class: detection.class,
                  object_class_vi: detection.class_vi,
                  confidence: detection.confidence,
                  bbox: detection.bbox,
                  source: detection.source,
                  severity: detection.severity || 'unknown'
                },
                evidence: {
                  browserInfo: req.headers['user-agent']
                }
              });
            }

            // Cập nhật tổng số vi phạm
            session.totalViolations = session.violations.length;
            await session.save();

            console.log(
              `🔍 Object detection log - Session: ${sessionId}, ` +
              `Detected objects: ${allDetections.length}, ` +
              `Total violations: ${session.totalViolations}`
            );
          }
        } catch (error) {
          console.error('Error creating object detection violations:', error);
        }
      }

      res.json(result);
    } catch (error) {
      console.error('Object detection endpoint error:', error);
      console.error('Error stack:', error.stack);
      
      // Log to app logger if available
      if (req.app.locals && req.app.locals.logger) {
        req.app.locals.logger.error('Object detection endpoint error:', error);
      }
      
      res.status(500).json({
        success: false,
        message: error.message || 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  }
);

// Get object detection service status
monitoringRouter.get(
  '/object-detection/status',
  authRequired(['teacher', 'admin']),
  async (req, res) => {
    try {
      // Import ES module
      const objectDetectionService = (await import('../../services/ObjectDetectionService.js')).default;
      const status = objectDetectionService.getStatus();
      res.json({
        success: true,
        ...status
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }
);

export default monitoringRouter;

