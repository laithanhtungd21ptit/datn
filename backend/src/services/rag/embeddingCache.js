import crypto from 'crypto';
import { RagChunkModel } from '../../models/RagChunk.js';

/**
 * Simple LRU cache for embeddings
 */
class EmbeddingCache {
  constructor(maxSize = 1000) {
    this.cache = new Map();
    this.maxSize = maxSize;
  }

  /**
   * Generate hash for text
   */
  hash(text) {
    return crypto.createHash('sha256').update(text.trim().toLowerCase()).digest('hex');
  }

  /**
   * Get embedding from cache
   */
  get(text) {
    const key = this.hash(text);
    if (this.cache.has(key)) {
      // Move to end (most recently used)
      const value = this.cache.get(key);
      this.cache.delete(key);
      this.cache.set(key, value);
      return value;
    }
    return null;
  }

  /**
   * Set embedding in cache
   */
  set(text, embedding) {
    const key = this.hash(text);
    
    // Remove oldest if at capacity
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    
    this.cache.set(key, embedding);
  }

  /**
   * Clear cache
   */
  clear() {
    this.cache.clear();
  }

  /**
   * Get cache size
   */
  size() {
    return this.cache.size;
  }
}

// Global cache instance
const embeddingCache = new EmbeddingCache(1000);

/**
 * Get embedding from cache or database
 */
export async function getCachedEmbedding(text) {
  if (!text || !text.trim()) return null;
  
  // Check in-memory cache first
  const cached = embeddingCache.get(text);
  if (cached) {
    return cached;
  }
  
  // Check database for existing chunk with same text
  // This helps when re-ingesting - reuse embeddings from previous ingest
  try {
    const existing = await RagChunkModel.findOne({ text: text.trim() })
      .select('embedding')
      .lean();
    
    if (existing && existing.embedding && Array.isArray(existing.embedding) && existing.embedding.length > 0) {
      // Cache it for future use
      embeddingCache.set(text, existing.embedding);
      return existing.embedding;
    }
  } catch (err) {
    // If query fails, continue to generate new embedding
    console.warn('Failed to check existing embedding in DB:', err.message);
  }
  
  return null;
}

/**
 * Cache embedding
 */
export function cacheEmbedding(text, embedding) {
  if (text && embedding) {
    embeddingCache.set(text, embedding);
  }
}

/**
 * Get cache stats
 */
export function getCacheStats() {
  return {
    size: embeddingCache.size(),
    maxSize: embeddingCache.maxSize,
  };
}

export default embeddingCache;

