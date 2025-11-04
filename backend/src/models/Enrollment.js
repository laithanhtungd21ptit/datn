import mongoose from 'mongoose';

const EnrollmentSchema = new mongoose.Schema(
  {
    classId: { type: mongoose.Schema.Types.ObjectId, ref: 'Class', required: true, index: true },
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    status: { type: String, enum: ['enrolled', 'dropped'], default: 'enrolled' },
  },
  { timestamps: true }
);

EnrollmentSchema.index({ classId: 1, studentId: 1 }, { unique: true });

export const EnrollmentModel = mongoose.models.Enrollment || mongoose.model('Enrollment', EnrollmentSchema);


