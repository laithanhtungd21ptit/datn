import { RagChunkModel } from '../../models/RagChunk.js';
import mongoose from 'mongoose';

function cosineSimilarity(a, b) {
  let dot = 0;
  let na = 0;
  let nb = 0;
  const len = Math.min(a.length, b.length);
  for (let i = 0; i < len; i++) {
    const x = a[i];
    const y = b[i];
    dot += x * y;
    na += x * x;
    nb += y * y;
  }
  const denom = Math.sqrt(na) * Math.sqrt(nb);
  if (!denom) return 0;
  return dot / denom;
}

const USE_VECTOR_SEARCH = process.env.USE_VECTOR_SEARCH === 'true';
const VECTOR_INDEX_NAME = process.env.VECTOR_INDEX_NAME || 'rag_vector_index';

export async function searchChunks({ embedding, filters = {}, topK = 5, limit = 200 }) {
  // Try MongoDB Atlas Vector Search first if enabled
  if (USE_VECTOR_SEARCH) {
    try {
      const db = mongoose.connection.db;
      const collection = db.collection('ragchunks');

      // Build filter for vector search
      const vectorFilter = {};
      if (filters.docType?.length) vectorFilter.docType = { $in: filters.docType };
      if (filters.classIds?.length) {
        vectorFilter.classId = { $in: filters.classIds.map(id => typeof id === 'string' ? new mongoose.Types.ObjectId(id) : id) };
      }
      if (filters.rolesAllowed?.length) vectorFilter.rolesAllowed = { $in: filters.rolesAllowed };
      if (filters.sourceIds?.length) {
        vectorFilter.sourceId = { $in: filters.sourceIds.map(id => typeof id === 'string' ? new mongoose.Types.ObjectId(id) : id) };
      }
      // Support studentId filter for personal queries
      if (filters.studentId) {
        vectorFilter['metadata.studentId'] = typeof filters.studentId === 'string' 
          ? new mongoose.Types.ObjectId(filters.studentId) 
          : filters.studentId;
      }

      const pipeline = [
        {
          $vectorSearch: {
            index: VECTOR_INDEX_NAME,
            path: 'embedding',
            queryVector: embedding,
            numCandidates: Math.max(topK * 15, 150), // Increased for better recall
            limit: topK,
            ...(Object.keys(vectorFilter).length > 0 ? { filter: vectorFilter } : {}),
          },
        },
        {
          $project: {
            text: 1,
            title: 1,
            docType: 1,
            classId: 1,
            sourceId: 1,
            rolesAllowed: 1,
            chunkIndex: 1,
            metadata: 1,
            createdAt: 1,
            updatedAt: 1,
            score: { $meta: 'vectorSearchScore' },
          },
        },
      ];

      const results = await collection.aggregate(pipeline).toArray();
      
      if (results && results.length > 0) {
        return results.map(r => ({
          ...r,
          _id: r._id,
          score: r.score || 0,
        }));
      }
    } catch (err) {
      console.warn('Vector search failed, falling back to cosine similarity:', err.message);
      // Fall through to cosine similarity fallback
    }
  }

  // Fallback: cosine similarity in-memory (for local MongoDB or if vector search fails)
  const query = {};
  if (filters.docType?.length) query.docType = { $in: filters.docType };
  if (filters.classIds?.length) {
    query.classId = { $in: filters.classIds.map(id => typeof id === 'string' ? new mongoose.Types.ObjectId(id) : id) };
  }
  if (filters.rolesAllowed?.length) query.rolesAllowed = { $in: filters.rolesAllowed };
  if (filters.sourceIds?.length) {
    query.sourceId = { $in: filters.sourceIds.map(id => typeof id === 'string' ? new mongoose.Types.ObjectId(id) : id) };
  }
  // Support studentId filter for personal queries
  if (filters.studentId) {
    query['metadata.studentId'] = typeof filters.studentId === 'string' 
      ? new mongoose.Types.ObjectId(filters.studentId) 
      : filters.studentId;
  }

  // Increase limit for better recall when using cosine similarity
  const candidates = await RagChunkModel.find(query)
    .sort({ updatedAt: -1 })
    .limit(Math.max(limit, 300))
    .lean();

  const scored = candidates.map((c) => ({
    ...c,
    score: cosineSimilarity(embedding, c.embedding || []),
  }));

  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);
}

export async function upsertChunk(chunk) {
  const { sourceId, chunkIndex = 0 } = chunk;
  const key = { sourceId, chunkIndex };
  await RagChunkModel.updateOne(key, { $set: chunk }, { upsert: true });
}

export async function deleteChunksBySource(sourceId) {
  await RagChunkModel.deleteMany({ sourceId });
}


