import { retrieveRelevant } from './retriever.js';
import { generateAnswer } from './generator.js';

export async function answerQuestion({ question, filters, topK = 12, conversationHistory = [] }) {
  // Retrieve relevant chunks with enhanced processing
  const { results, queryAnalysis } = await retrieveRelevant({ question, filters, topK });

  // Map results with full metadata
  const sources = results.map((r) => ({
    id: r._id?.toString(),
    sourceId: r.sourceId,
    title: r.title || 'Không có tiêu đề',
    docType: r.docType || 'unknown',
    classId: r.classId,
    text: r.text || '',
    score: r.score || 0,
    metadata: r.metadata || {},
  }));

  // Generate answer with query analysis context
  const answer = await generateAnswer({ 
    question, 
    context: '', // Not used anymore, sources passed directly
    sources, 
    conversationHistory,
    queryAnalysis  // Pass query understanding to generator
  });

  return { answer, sources };
}


