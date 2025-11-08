import mongoose from 'mongoose';

const AssignmentSchema = new mongoose.Schema(
  {
    classId: { type: mongoose.Schema.Types.ObjectId, ref: 'Class', required: true, index: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    dueDate: { type: Date, required: true },
    isExam: { type: Boolean, default: false },
    durationMinutes: { type: Number, default: null },
    attachments: [{ type: String }], // File URLs for assignment attachments
    // Exam-specific fields
    startTime: { type: Date, default: null }, // When the exam starts
    endTime: { type: Date, default: null },   // When the exam ends (calculated from startTime + duration)
  },
  { timestamps: true }
);

// Indexes for efficient queries
AssignmentSchema.index({ classId: 1, dueDate: -1 });
AssignmentSchema.index({ isExam: 1, startTime: -1 }); // For exam monitoring
AssignmentSchema.index({ createdAt: -1 }); // For sorting by creation time

export const AssignmentModel = mongoose.models.Assignment || mongoose.model('Assignment', AssignmentSchema);


