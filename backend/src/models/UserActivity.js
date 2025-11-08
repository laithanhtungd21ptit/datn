import mongoose from 'mongoose';

const UserActivitySchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    role: { type: String, enum: ['admin', 'teacher', 'student'], required: true, index: true },
    actionType: {
      type: String,
      enum: [
        // Common actions
        'login', 'logout',
        // Student actions
        'submit_assignment', 'join_class', 'update_profile',
        // Teacher actions
        'create_assignment', 'grade_submission', 'remove_student', 'create_announcement',
        // Admin actions
        'create_user', 'update_user', 'delete_user', 'create_class', 'delete_class', 'export_report'
      ],
      required: true,
      index: true
    },
    targetEntityId: { type: mongoose.Schema.Types.ObjectId, default: null, index: true }, // assignment_id, class_id, user_id, etc.
    targetEntityType: { type: String, enum: ['assignment', 'class', 'user', 'announcement', 'report'], default: null },
    description: { type: String, default: '' },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} }, // Additional data like scores, class codes, etc.
    ipAddress: { type: String, default: '' },
    userAgent: { type: String, default: '' },
  },
  { timestamps: true }
);

// Compound indexes for efficient queries
UserActivitySchema.index({ userId: 1, createdAt: -1 });
UserActivitySchema.index({ actionType: 1, createdAt: -1 });
UserActivitySchema.index({ role: 1, createdAt: -1 });

export const UserActivityModel = mongoose.models.UserActivity || mongoose.model('UserActivity', UserActivitySchema);
