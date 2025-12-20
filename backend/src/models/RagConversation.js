import mongoose from 'mongoose';

const RagMessageSchema = new mongoose.Schema({
  role: { type: String, enum: ['user', 'assistant'], required: true },
  content: { type: String, required: true },
  sources: { type: [mongoose.Schema.Types.Mixed], default: [] },
  timestamp: { type: Date, default: Date.now },
}, { _id: true });

const RagConversationSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    role: { type: String, enum: ['admin', 'teacher', 'student'], required: true, index: true },
    title: { type: String, default: '' }, // First question or user-defined title
    messages: [RagMessageSchema],
    metadata: { type: Object, default: {} }, // Store filters, preferences, etc.
  },
  { timestamps: true }
);

RagConversationSchema.index({ userId: 1, updatedAt: -1 });
RagConversationSchema.index({ userId: 1, role: 1 });

export const RagConversationModel = mongoose.models.RagConversation || mongoose.model('RagConversation', RagConversationSchema);

