import mongoose from 'mongoose';

const AnnouncementSchema = new mongoose.Schema(
  {
    classId: { type: mongoose.Schema.Types.ObjectId, ref: 'Class', required: true, index: true },
    teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true },
    content: { type: String, required: true },
    type: { type: String, enum: ['general', 'assignment', 'exam', 'important'], default: 'general' },
  },
  { timestamps: true }
);

export const AnnouncementModel = mongoose.models.Announcement || mongoose.model('Announcement', AnnouncementSchema);
