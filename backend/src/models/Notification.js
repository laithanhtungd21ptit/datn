import mongoose from 'mongoose';

const NotificationSchema = new mongoose.Schema(
  {
    recipientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true }, // Sinh viên nhận thông báo
    senderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // Giảng viên gửi
    classId: { type: mongoose.Schema.Types.ObjectId, ref: 'Class', required: true, index: true }, // Lớp học
    type: {
      type: String,
      enum: ['assignment_created', 'assignment_graded', 'document_uploaded', 'announcement_created', 'admin_notification'],
      required: true,
      index: true
    },
    title: { type: String, required: true },
    content: { type: String, required: true },
    isRead: { type: Boolean, default: false, index: true },
    metadata: {
      assignmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Assignment' },
      documentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Document' },
      announcementId: { type: mongoose.Schema.Types.ObjectId, ref: 'Announcement' },
      score: { type: Number }, // For graded assignments
    }
  },
  { timestamps: true }
);

// Compound indexes for efficient queries
NotificationSchema.index({ recipientId: 1, isRead: 1 });
NotificationSchema.index({ classId: 1, createdAt: -1 });

export const NotificationModel = mongoose.models.Notification || mongoose.model('Notification', NotificationSchema);
