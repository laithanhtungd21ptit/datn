import mongoose from 'mongoose';

const ClassSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    code: { type: String, required: true, trim: true, unique: true },
    teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    department: { type: String, default: '' },
    description: { type: String, default: '' },
    credits: { type: Number, default: 3, min: 1 }, // Số tín chỉ của lớp học
  },
  { timestamps: true }
);

ClassSchema.index({ teacherId: 1, code: 1 });

export const ClassModel = mongoose.models.Class || mongoose.model('Class', ClassSchema);


