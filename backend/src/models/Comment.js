import mongoose from 'mongoose';

const CommentSchema = new mongoose.Schema(
  {
    classId: { type: mongoose.Schema.Types.ObjectId, ref: 'Class', required: true, index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    userRole: { type: String, enum: ['teacher', 'student'], required: true },
    content: { type: String, required: true },
  },
  { timestamps: true }
);

// Add index for efficient queries
CommentSchema.index({ classId: 1, createdAt: -1 });

export const CommentModel = mongoose.models.Comment || mongoose.model('Comment', CommentSchema);
