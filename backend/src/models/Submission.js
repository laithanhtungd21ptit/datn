import mongoose from 'mongoose';

const SubmissionSchema = new mongoose.Schema(
  {
    assignmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Assignment', required: true, index: true },
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    submittedAt: { type: Date, default: null },
    score: { type: Number, default: null },
    contentUrl: { type: String, default: '' },
    notes: { type: String, default: '' },
  },
  { timestamps: true }
);

SubmissionSchema.index({ assignmentId: 1, studentId: 1 }, { unique: true });

export const SubmissionModel = mongoose.models.Submission || mongoose.model('Submission', SubmissionSchema);


