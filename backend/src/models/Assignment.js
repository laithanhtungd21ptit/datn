import mongoose from 'mongoose';

const AssignmentSchema = new mongoose.Schema(
  {
    classId: { type: mongoose.Schema.Types.ObjectId, ref: 'Class', required: true, index: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    dueDate: { type: Date, required: true },
    isExam: { type: Boolean, default: false },
    durationMinutes: { type: Number, default: null },
  },
  { timestamps: true }
);

AssignmentSchema.index({ classId: 1, dueDate: -1 });

export const AssignmentModel = mongoose.models.Assignment || mongoose.model('Assignment', AssignmentSchema);


