import { NotificationModel } from '../models/Notification.js';
import mongoose from 'mongoose';
import { EnrollmentModel } from '../models/Enrollment.js';

/**
 * Tạo notifications cho tất cả sinh viên trong một lớp
 * @param {string} teacherId - ID của giảng viên
 * @param {string} classId - ID của lớp học
 * @param {string} type - Loại thông báo
 * @param {string} title - Tiêu đề thông báo
 * @param {string} content - Nội dung thông báo
 * @param {object} metadata - Metadata bổ sung
 */
export async function createClassNotifications(teacherId, classId, type, title, content, metadata = {}) {
  try {
    // Validate inputs
    if (!teacherId || !classId || !type || !title || !content) {
      console.error('Missing required parameters for createClassNotifications');
      return;
    }

    // Lấy danh sách sinh viên đã enroll trong lớp
    const enrollments = await EnrollmentModel.find({
      classId,
      status: 'enrolled'
    }).select('studentId').lean();

    if (enrollments.length === 0) {
      console.log(`No enrolled students found for class ${classId}`);
      return; // Không có sinh viên nào trong lớp
    }

    // Tạo notifications cho từng sinh viên
    const notifications = enrollments.map(enrollment => ({
      recipientId: mongoose.Types.ObjectId.isValid(enrollment.studentId) ? enrollment.studentId : mongoose.Types.ObjectId(enrollment.studentId),
      senderId: mongoose.Types.ObjectId.isValid(teacherId) ? teacherId : mongoose.Types.ObjectId(teacherId),
      classId: mongoose.Types.ObjectId.isValid(classId) ? classId : mongoose.Types.ObjectId(classId),
      type,
      title,
      content,
      metadata: {
        ...metadata,
        assignmentId: metadata.assignmentId && mongoose.Types.ObjectId.isValid(metadata.assignmentId) ? metadata.assignmentId : (metadata.assignmentId ? mongoose.Types.ObjectId(metadata.assignmentId) : undefined),
        documentId: metadata.documentId && mongoose.Types.ObjectId.isValid(metadata.documentId) ? metadata.documentId : (metadata.documentId ? mongoose.Types.ObjectId(metadata.documentId) : undefined),
        announcementId: metadata.announcementId && mongoose.Types.ObjectId.isValid(metadata.announcementId) ? metadata.announcementId : (metadata.announcementId ? mongoose.Types.ObjectId(metadata.announcementId) : undefined),
      },
      isRead: false
    }));

    if (notifications.length > 0) {
      await NotificationModel.insertMany(notifications);
      console.log(`Created ${notifications.length} notifications for class ${classId}, type: ${type}`);
    }
  } catch (error) {
    console.error('Error creating class notifications:', error.message);
    console.error('Stack:', error.stack);
  }
}

/**
 * Tạo notification cho một sinh viên cụ thể
 * @param {string} teacherId - ID của giảng viên
 * @param {string} studentId - ID của sinh viên
 * @param {string} classId - ID của lớp học
 * @param {string} type - Loại thông báo
 * @param {string} title - Tiêu đề thông báo
 * @param {string} content - Nội dung thông báo
 * @param {object} metadata - Metadata bổ sung
 */
export async function createStudentNotification(teacherId, studentId, classId, type, title, content, metadata = {}) {
  try {
    // Validate inputs
    if (!teacherId || !studentId || !classId || !type || !title || !content) {
      console.error('Missing required parameters for createStudentNotification');
      return;
    }

    await NotificationModel.create({
      recipientId: mongoose.Types.ObjectId.isValid(studentId) ? studentId : mongoose.Types.ObjectId(studentId),
      senderId: mongoose.Types.ObjectId.isValid(teacherId) ? teacherId : mongoose.Types.ObjectId(teacherId),
      classId: mongoose.Types.ObjectId.isValid(classId) ? classId : mongoose.Types.ObjectId(classId),
      type,
      title,
      content,
      metadata: {
        ...metadata,
        assignmentId: metadata.assignmentId && mongoose.Types.ObjectId.isValid(metadata.assignmentId) ? metadata.assignmentId : (metadata.assignmentId ? mongoose.Types.ObjectId(metadata.assignmentId) : undefined),
        documentId: metadata.documentId && mongoose.Types.ObjectId.isValid(metadata.documentId) ? metadata.documentId : (metadata.documentId ? mongoose.Types.ObjectId(metadata.documentId) : undefined),
        announcementId: metadata.announcementId && mongoose.Types.ObjectId.isValid(metadata.announcementId) ? metadata.announcementId : (metadata.announcementId ? mongoose.Types.ObjectId(metadata.announcementId) : undefined),
      },
      isRead: false
    });
    console.log(`Created notification for student ${studentId}, type: ${type}`);
  } catch (error) {
    console.error('Error creating student notification:', error.message);
    console.error('Stack:', error.stack);
  }
}
