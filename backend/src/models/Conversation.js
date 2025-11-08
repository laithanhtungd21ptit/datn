import mongoose from 'mongoose';

const ConversationSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ['direct', 'group', 'class'],
      required: true,
      index: true
    },
    name: { type: String, default: '' }, // For group chats or display name
    participants: [{
      userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
      role: { type: String, enum: ['admin', 'teacher', 'student'], required: true },
      joinedAt: { type: Date, default: Date.now }
    }],
    classId: { type: mongoose.Schema.Types.ObjectId, ref: 'Class' }, // For class chats
    lastMessage: {
      senderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      content: { type: String },
      sentAt: { type: Date, default: Date.now }
    },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// Indexes for efficient queries
ConversationSchema.index({ 'participants.userId': 1 });
ConversationSchema.index({ type: 1, classId: 1 });
ConversationSchema.index({ updatedAt: -1 });

export const ConversationModel = mongoose.models.Conversation || mongoose.model('Conversation', ConversationSchema);
