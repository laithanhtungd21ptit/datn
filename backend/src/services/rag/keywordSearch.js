import { RagChunkModel } from '../../models/RagChunk.js';
import mongoose from 'mongoose';

/**
 * Extract keywords from Vietnamese text
 * Removes stop words and common words, preserves important terms like codes, IDs
 */
function extractKeywords(text) {
  if (!text || typeof text !== 'string') return [];
  
  // Vietnamese stop words
  const stopWords = new Set([
    'của', 'và', 'với', 'cho', 'từ', 'trong', 'trên', 'về', 'đến', 'được',
    'là', 'có', 'một', 'những', 'các', 'này', 'đó', 'khi', 'nào', 'gì',
    'ai', 'đâu', 'sao', 'thế', 'bạn', 'tôi', 'chúng', 'ta', 'họ',
    'a', 'an', 'the', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
    'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'should',
    'can', 'could', 'may', 'might', 'must', 'shall', 'this', 'that', 'these', 'those',
    'đã', 'sẽ', 'đang', 'vẫn', 'cũng', 'rất', 'quá', 'lắm', 'nhiều', 'ít'
  ]);
  
  // Extract codes/IDs first (e.g., B21DCPT129, MUL1320, GVPTIT001)
  const codePattern = /\b[A-Z0-9]{6,}\b/g;
  const codes = text.match(codePattern) || [];
  
  // Normalize: lowercase, remove punctuation, split by spaces
  const normalized = text
    .toLowerCase()
    .replace(/[^\w\sàáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/g, ' ')
    .split(/\s+/)
    .filter(word => {
      // Keep words longer than 1 char
      if (word.length <= 1) return false;
      // Keep if it's a number or contains numbers
      if (/^\d+$/.test(word) || /\d/.test(word)) return true;
      // Keep if it's not a stop word
      return !stopWords.has(word);
    });
  
  // Combine codes and normalized words, remove duplicates
  const allKeywords = [...codes.map(c => c.toLowerCase()), ...normalized];
  return [...new Set(allKeywords)];
}

/**
 * Calculate BM25-like score for keyword matching
 */
function calculateKeywordScore(keywords, text, title = '') {
  if (!keywords || keywords.length === 0) return 0;
  if (!text && !title) return 0;
  
  const searchText = `${title} ${text}`.toLowerCase();
  let score = 0;
  const termFreq = {};
  
  // Count term frequency
  for (const keyword of keywords) {
    const regex = new RegExp(keyword, 'gi');
    const matches = searchText.match(regex);
    const tf = matches ? matches.length : 0;
    termFreq[keyword] = tf;
    
    if (tf > 0) {
      // Boost if in title
      const inTitle = title.toLowerCase().includes(keyword) ? 2 : 1;
      // BM25-like scoring (simplified)
      score += tf * inTitle;
    }
  }
  
  // Normalize by number of keywords
  return keywords.length > 0 ? score / keywords.length : 0;
}

/**
 * Search chunks by keywords using MongoDB text search or regex fallback
 */
export async function searchChunksByKeywords({ keywords, filters = {}, topK = 10 }) {
  if (!keywords || keywords.length === 0) return [];
  
  // Build base query with filters
  const query = {};
  if (filters.docType?.length) query.docType = { $in: filters.docType };
  if (filters.classIds?.length) {
    query.classId = { $in: filters.classIds.map(id => typeof id === 'string' ? new mongoose.Types.ObjectId(id) : id) };
  }
  if (filters.rolesAllowed?.length) query.rolesAllowed = { $in: filters.rolesAllowed };
  if (filters.sourceIds?.length) {
    query.sourceId = { $in: filters.sourceIds.map(id => typeof id === 'string' ? new mongoose.Types.ObjectId(id) : id) };
  }
  
  // Try MongoDB text search first (if text index exists)
  // Note: Text index may not exist if language 'vi' is not supported
  // We'll primarily use regex-based search which works well for Vietnamese
  try {
    const textSearchQuery = { ...query, $text: { $search: keywords.join(' ') } };
    const textResults = await RagChunkModel.find(textSearchQuery, { score: { $meta: 'textScore' } })
      .sort({ score: { $meta: 'textScore' } })
      .limit(topK * 2)
      .lean();
    
    if (textResults && textResults.length > 0) {
      return textResults.map(r => ({
        ...r,
        _id: r._id,
        score: (r.score || 0) / 10, // Normalize text score to 0-1 range
        keywordScore: r.score || 0,
      }));
    }
  } catch (err) {
    // Text index might not exist or language not supported, use regex search
    // This is expected and fine - regex search works well for Vietnamese
  }
  
  // Fallback: regex-based keyword search
  const keywordRegex = keywords.map(k => `(?=.*${k})`).join('');
  const regexQuery = {
    ...query,
    $or: [
      { text: { $regex: keywordRegex, $options: 'i' } },
      { title: { $regex: keywordRegex, $options: 'i' } },
    ],
  };
  
  const candidates = await RagChunkModel.find(regexQuery)
    .limit(Math.min(topK * 3, 500))
    .lean();
  
  // Score each candidate by keyword matching
  const scored = candidates.map((c) => {
    const keywordScore = calculateKeywordScore(keywords, c.text || '', c.title || '');
    return {
      ...c,
      score: keywordScore,
      keywordScore,
    };
  });
  
  // Sort by score and return topK
  return scored
    .sort((a, b) => (b.score || 0) - (a.score || 0))
    .slice(0, topK);
}

/**
 * Extract keywords from query text
 */
export function extractKeywordsFromQuery(query) {
  return extractKeywords(query);
}

