import mongoose from 'mongoose';

const NotificationSchema = new mongoose.Schema(
  {
    recipientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true }, // Sinh viên nhận thông báo
    senderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // Giảng viên gửi
     classId: { type: mongoose.Schema.Types.ObjectId, ref: 'Class', index: true }, // Lớp học (optional for admin notifications)
    type: {
      type: String,
      enum: [
        'assignment_created',
        'assignment_graded',
        'document_uploaded',
        'announcement_created',
        'comment_created',
        'admin_notification'
      ],
      required: true,
      index: true
    },
    title: { type: String, required: true },
    content: { type: String, required: true },
    isRead: { type: Boolean, default: false, index: true },
    readAt: { type: Date, default: null },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} } // Flexible metadata for different notification types
  },
  { timestamps: true }
);

// Compound indexes for efficient queries
NotificationSchema.index({ recipientId: 1, isRead: 1 });
NotificationSchema.index({ classId: 1, createdAt: -1 });

export const NotificationModel = mongoose.models.Notification || mongoose.model('Notification', NotificationSchema);
