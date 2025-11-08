import mongoose from 'mongoose';

const SystemLogSchema = new mongoose.Schema(
  {
    level: { type: String, enum: ['error', 'warn', 'info', 'debug'], required: true, index: true },
    message: { type: String, required: true },
    source: { type: String, default: 'server', index: true }, // server, database, email, etc.
    stackTrace: { type: String, default: '' },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
    requestId: { type: String, default: '' },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    ipAddress: { type: String, default: '' },
    endpoint: { type: String, default: '' },
  },
  { timestamps: true }
);

// Indexes for efficient querying
SystemLogSchema.index({ level: 1, createdAt: -1 });
SystemLogSchema.index({ source: 1, createdAt: -1 });
SystemLogSchema.index({ requestId: 1 });

export const SystemLogModel = mongoose.models.SystemLog || mongoose.model('SystemLog', SystemLogSchema);
