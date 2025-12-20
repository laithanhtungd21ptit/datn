import { embedText } from './embedder.js';
import { upsertChunk, deleteChunksBySource } from './vectorStore.js';
import { RagChunkModel } from '../../models/RagChunk.js';

/**
 * Process items in parallel with concurrency limit
 */
export async function processInParallel(items, processor, concurrency = 5) {
  const results = [];
  const errors = [];
  
  for (let i = 0; i < items.length; i += concurrency) {
    const batch = items.slice(i, i + concurrency);
    const batchResults = await Promise.allSettled(
      batch.map(item => processor(item))
    );
    
    for (const result of batchResults) {
      if (result.status === 'fulfilled') {
        results.push(result.value);
      } else {
        errors.push(result.reason);
        console.error('Processing error:', result.reason);
      }
    }
    
    // Log progress
    if ((i + concurrency) % (concurrency * 10) === 0 || i + concurrency >= items.length) {
      console.log(`Processed ${Math.min(i + concurrency, items.length)}/${items.length} items`);
    }
  }
  
  if (errors.length > 0) {
    console.warn(`Completed with ${errors.length} errors out of ${items.length} items`);
  }
  
  return results;
}

/**
 * Check if chunk already exists and is up to date
 */
export async function shouldIngestChunk(sourceId, chunkIndex, text, updatedAt) {
  try {
    const existing = await RagChunkModel.findOne({ sourceId, chunkIndex }).lean();
    
    if (!existing) {
      return true; // Chunk doesn't exist, need to ingest
    }
    
    // If text changed, need to re-ingest
    if (existing.text !== text.trim()) {
      return true;
    }
    
    // If source was updated after chunk was created, need to re-ingest
    if (updatedAt && existing.updatedAt && new Date(updatedAt) > new Date(existing.updatedAt)) {
      return true;
    }
    
    // Chunk exists and is up to date, skip
    return false;
  } catch (err) {
    // On error, assume we need to ingest
    console.warn('Error checking existing chunk:', err.message);
    return true;
  }
}

/**
 * Ingest a single chunk with caching and duplicate checking
 */
export async function ingestChunk(chunkData, incremental = true) {
  const { sourceId, chunkIndex, text, updatedAt, ...rest } = chunkData;
  
  // If incremental mode, check if chunk already exists and is up to date
  if (incremental) {
    const needsIngest = await shouldIngestChunk(sourceId, chunkIndex, text, updatedAt);
    
    if (!needsIngest) {
      return { skipped: true, sourceId, chunkIndex };
    }
  }
  
  // Get embedding (will use cache if available)
  const embedding = await embedText(text, true);
  
  // Upsert chunk
  await upsertChunk({
    sourceId,
    chunkIndex,
    text: text.trim(),
    embedding,
    ...rest,
  });
  
  return { ingested: true, sourceId, chunkIndex };
}

/**
 * Ingest chunks for a single source item
 */
export async function ingestItemChunks(item, docType, chunkTextFn, buildChunkDataFn, incremental = true) {
  const chunks = chunkTextFn(item);
  const results = [];
  
  for (let idx = 0; idx < chunks.length; idx++) {
    const text = chunks[idx];
    const chunkData = buildChunkDataFn(item, text, idx);
    
    try {
      const result = await ingestChunk({
        ...chunkData,
        docType,
        updatedAt: item.updatedAt || item.createdAt,
      }, incremental);
      results.push(result);
    } catch (err) {
      console.error(`Failed to ingest chunk ${idx} for ${docType} ${item._id}:`, err.message);
      results.push({ error: true, sourceId: item._id, chunkIndex: idx });
    }
  }
  
  return results;
}

/**
 * Ingest items with incremental update support
 */
export async function ingestItems(
  items,
  docType,
  chunkTextFn,
  buildChunkDataFn,
  options = {}
) {
  const { 
    incremental = true, 
    concurrency = 5,
    deleteOld = false 
  } = options;
  
  let processed = 0;
  let skipped = 0;
  let ingested = 0;
  let errors = 0;
  
  // Process items in parallel batches
  for (let i = 0; i < items.length; i += concurrency) {
    const batch = items.slice(i, i + concurrency);
    
    const batchResults = await Promise.allSettled(
      batch.map(async (item) => {
        // Delete old chunks if requested (for full re-ingest)
        if (deleteOld) {
          await deleteChunksBySource(item._id);
        }
        
        const results = await ingestItemChunks(item, docType, chunkTextFn, buildChunkDataFn, incremental);
        return { itemId: item._id, results };
      })
    );
    
    for (const result of batchResults) {
      if (result.status === 'fulfilled') {
        processed++;
        const { results } = result.value;
        for (const r of results) {
          if (r.skipped) skipped++;
          else if (r.ingested) ingested++;
          else if (r.error) errors++;
        }
      } else {
        errors++;
        console.error('Item processing error:', result.reason);
      }
    }
    
    // Log progress
    if ((i + concurrency) % (concurrency * 10) === 0 || i + concurrency >= items.length) {
      console.log(
        `${docType}: Processed ${Math.min(i + concurrency, items.length)}/${items.length} items ` +
        `(ingested: ${ingested}, skipped: ${skipped}, errors: ${errors})`
      );
    }
  }
  
  return { processed, ingested, skipped, errors };
}

