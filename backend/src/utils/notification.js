import mongoose from 'mongoose';
import { NotificationModel } from '../models/Notification.js';
import { EnrollmentModel } from '../models/Enrollment.js';
import { UserModel } from '../models/User.js';
import { ClassModel } from '../models/Class.js';
import { shouldDeliverNotification } from '../constants/notificationSettings.js';
import { emitNotificationToUser, emitNotificationToUsers } from '../services/socketService.js';

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

    const studentIds = enrollments.map(enrollment => enrollment.studentId);
    const students = await UserModel.find({ _id: { $in: studentIds } })
      .select('_id notificationSettings')
      .lean();

    const allowedStudentIds = students
      .filter(student => shouldDeliverNotification(student.notificationSettings, type))
      .map(student => student._id.toString());

    if (allowedStudentIds.length === 0) {
      console.log(`No students opted in for notification type ${type} in class ${classId}`);
      return;
    }

    const notifications = allowedStudentIds.map(studentId => ({
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
      isRead: false,
      readAt: null
    }));

    if (notifications.length > 0) {
      const createdNotifications = await NotificationModel.insertMany(notifications);
      console.log(`Created ${notifications.length} notifications for class ${classId}, type: ${type}`);
      
      // Emit notifications via Socket.IO
      try {
        const classInfo = await ClassModel.findById(classId).populate('teacherId', 'fullName').lean();
        const senderInfo = await UserModel.findById(teacherId).select('fullName').lean();
        
        createdNotifications.forEach((notification, index) => {
          const notificationData = {
            ...notification.toObject(),
            senderId: { fullName: senderInfo?.fullName || 'Giảng viên' },
            classId: { name: classInfo?.name || 'Unknown Class' }
          };
          emitNotificationToUser(allowedStudentIds[index], notificationData);
        });
      } catch (socketError) {
        console.error('Error emitting notifications via Socket.IO:', socketError);
        // Don't fail the notification creation if Socket.IO fails
      }
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

    const student = await UserModel.findById(studentId).select('notificationSettings').lean();
    if (!student) {
      console.warn(`Student ${studentId} not found for notification`);
      return;
    }

    if (!shouldDeliverNotification(student.notificationSettings, type)) {
      console.log(`Student ${studentId} opted out of notification type ${type}`);
      return;
    }

    const notification = await NotificationModel.create({
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
      isRead: false,
      readAt: null
    });
    console.log(`Created notification for student ${studentId}, type: ${type}`);
    
    // Emit notification via Socket.IO
    try {
      const classInfo = await ClassModel.findById(classId).populate('teacherId', 'fullName').lean();
      const senderInfo = await UserModel.findById(teacherId).select('fullName').lean();
      
      const notificationData = {
        ...notification.toObject(),
        senderId: { fullName: senderInfo?.fullName || 'Giảng viên' },
        classId: { name: classInfo?.name || 'Unknown Class' }
      };
      emitNotificationToUser(studentId, notificationData);
    } catch (socketError) {
      console.error('Error emitting notification via Socket.IO:', socketError);
      // Don't fail the notification creation if Socket.IO fails
    }
  } catch (error) {
    console.error('Error creating student notification:', error.message);
    console.error('Stack:', error.stack);
  }
}
