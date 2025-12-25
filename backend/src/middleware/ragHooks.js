import { ragEventService } from '../services/rag/ragEventService.js';

/**
 * Middleware to auto-ingest after document creation/update/deletion
 * Usage: Add this middleware BEFORE your route handler
 */
export function ragIngestMiddleware(docType) {
  return async (req, res, next) => {
    // Store original json and send methods
    const originalJson = res.json;
    const originalSend = res.send;

    // Override json method to capture successful responses
    res.json = function(data) {
      // Check if successful operation (status 200-299)
      if (res.statusCode >= 200 && res.statusCode < 300) {
        // Trigger RAG ingestion event asynchronously (don't block response)
        setImmediate(() => {
          try {
            if (req.method === 'POST' && req.ragCreatedItem) {
              ragEventService.emit(`${docType}:created`, { item: req.ragCreatedItem });
            } else if ((req.method === 'PUT' || req.method === 'PATCH') && req.ragUpdatedItem) {
              ragEventService.emit(`${docType}:updated`, { item: req.ragUpdatedItem });
            } else if (req.method === 'DELETE' && req.ragDeletedId) {
              ragEventService.emit(`${docType}:deleted`, { id: req.ragDeletedId });
            }
          } catch (err) {
            console.error('[RAG Middleware] Event emission error:', err);
          }
        });
      }
      
      // Call original json method
      return originalJson.call(this, data);
    };

    // Override send method (for cases using res.send instead of res.json)
    res.send = function(data) {
      // Check if successful operation
      if (res.statusCode >= 200 && res.statusCode < 300) {
        setImmediate(() => {
          try {
            if (req.method === 'POST' && req.ragCreatedItem) {
              ragEventService.emit(`${docType}:created`, { item: req.ragCreatedItem });
            } else if ((req.method === 'PUT' || req.method === 'PATCH') && req.ragUpdatedItem) {
              ragEventService.emit(`${docType}:updated`, { item: req.ragUpdatedItem });
            } else if (req.method === 'DELETE' && req.ragDeletedId) {
              ragEventService.emit(`${docType}:deleted`, { id: req.ragDeletedId });
            }
          } catch (err) {
            console.error('[RAG Middleware] Event emission error:', err);
          }
        });
      }
      
      return originalSend.call(this, data);
    };

    next();
  };
}

/**
 * Helper to populate and attach item to request for RAG ingestion
 * Call this AFTER creating/updating document but BEFORE sending response
 */
export async function attachItemForRAG(req, item, Model, populateFields = []) {
  try {
    // Ensure we have an item
    if (!item || !item._id) {
      console.warn('[RAG] Cannot attach item: invalid item');
      return;
    }

    // Populate necessary fields for RAG ingestion
    let populatedItem = item;
    
    if (populateFields.length > 0) {
      populatedItem = await Model.findById(item._id)
        .populate(populateFields.join(' '))
        .lean();
    } else {
      // Convert to plain object if it's a Mongoose document
      populatedItem = item.toObject ? item.toObject() : item;
    }
    
    // Attach to appropriate request property based on method
    if (req.method === 'POST') {
      req.ragCreatedItem = populatedItem;
    } else if (req.method === 'PUT' || req.method === 'PATCH') {
      req.ragUpdatedItem = populatedItem;
    }
  } catch (err) {
    console.error('[RAG] Failed to attach item for RAG:', err.message);
  }
}

/**
 * Helper to mark item for deletion in RAG
 * Call this BEFORE deleting from database
 */
export function markForRAGDeletion(req, itemId) {
  if (itemId) {
    req.ragDeletedId = itemId.toString();
  }
}

