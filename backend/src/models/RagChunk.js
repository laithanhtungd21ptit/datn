import mongoose from 'mongoose';

const RagChunkSchema = new mongoose.Schema(
  {
    text: { type: String, required: true },
    embedding: { type: [Number], required: true },
    docType: { type: String, default: 'generic', index: true }, // e.g., announcement, document, assignment
    sourceId: { type: mongoose.Schema.Types.ObjectId, index: true }, // reference to original document/record
    title: { type: String, default: '' },
    classId: { type: mongoose.Schema.Types.ObjectId, ref: 'Class', index: true },
    rolesAllowed: { type: [String], default: ['student', 'teacher', 'admin'], index: true },
    language: { type: String, default: 'vi' },
    chunkIndex: { type: Number, default: 0 },
    metadata: { type: Object, default: {} },
  },
  { timestamps: true }
);

RagChunkSchema.index({ docType: 1, classId: 1 });
// Note: Text index is not created here to avoid language override issues
// Keyword search will use regex-based search which works well for Vietnamese
// If you want to use MongoDB text search, create the index manually:
// db.ragchunks.createIndex({ text: "text", title: "text" }, { default_language: "none" })

export const RagChunkModel = mongoose.models.RagChunk || mongoose.model('RagChunk', RagChunkSchema);


