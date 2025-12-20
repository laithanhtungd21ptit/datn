/**
 * Embedding client for Google Gemini with caching.
 * Requires GEMINI_API_KEY, GEMINI_EMBED_MODEL (default text-embedding-004).
 */
import { getCachedEmbedding, cacheEmbedding } from './embeddingCache.js';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const GEMINI_EMBED_MODEL = process.env.GEMINI_EMBED_MODEL || 'text-embedding-004';

// Rate limiting: max requests per second
const MAX_REQUESTS_PER_SECOND = 10;
let requestQueue = [];
let lastRequestTime = 0;

/**
 * Rate-limited API call
 */
async function rateLimitedFetch(endpoint, body) {
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;
  const minInterval = 1000 / MAX_REQUESTS_PER_SECOND; // e.g., 100ms for 10 req/s
  
  if (timeSinceLastRequest < minInterval) {
    await new Promise(resolve => setTimeout(resolve, minInterval - timeSinceLastRequest));
  }
  
  lastRequestTime = Date.now();
  
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  
  return res;
}

export async function embedText(text, useCache = true) {
  if (!text || !text.trim()) throw new Error('EMPTY_TEXT');
  if (!GEMINI_API_KEY) throw new Error('MISSING_GEMINI_API_KEY');

  // Check cache first
  if (useCache) {
    const cached = await getCachedEmbedding(text);
    if (cached) {
      return cached;
    }
  }

  // Generate new embedding
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(GEMINI_EMBED_MODEL)}:embedContent?key=${encodeURIComponent(GEMINI_API_KEY)}`;

  const body = {
    model: `models/${GEMINI_EMBED_MODEL}`,
    content: { parts: [{ text }] },
  };

  const res = await rateLimitedFetch(endpoint, body);

  if (!res.ok) {
    const detail = await res.text().catch(() => res.statusText);
    throw new Error(`EMBEDDING_FAILED: ${res.status} ${detail}`);
  }

  const data = await res.json();
  const values = data?.embedding?.values;
  if (!Array.isArray(values)) {
    throw new Error('INVALID_EMBEDDING_RESPONSE');
  }

  // Cache the result
  if (useCache) {
    cacheEmbedding(text, values);
  }

  return values;
}


