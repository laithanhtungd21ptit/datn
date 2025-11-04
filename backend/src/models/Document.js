import mongoose from 'mongoose';

const DocumentSchema = new mongoose.Schema(
  {
    classId: { type: mongoose.Schema.Types.ObjectId, ref: 'Class', required: true, index: true },
    teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true },
    description: { type: String, default: '' },
    fileUrl: { type: String, required: true },
    fileName: { type: String, required: true },
    fileSize: { type: Number, required: true },
    fileType: { type: String, required: true },
  },
  { timestamps: true }
);

export const DocumentModel = mongoose.models.Document || mongoose.model('Document', DocumentSchema);
