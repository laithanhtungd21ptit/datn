import { retrieveRelevant } from './retriever.js';
import { generateAnswer } from './generator.js';

export async function answerQuestion({ question, filters, topK = 12, conversationHistory = [] }) {
  const { results } = await retrieveRelevant({ question, filters, topK });

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

  // Build context with structured format
  const context = sources
    .map((s, idx) => {
      const metaParts = [];
      if (s.metadata.dueDate) metaParts.push(`Hạn: ${new Date(s.metadata.dueDate).toLocaleString('vi-VN')}`);
      if (s.metadata.isExam !== undefined) metaParts.push(s.metadata.isExam ? 'Kỳ thi' : 'Bài tập');
      if (s.metadata.className) metaParts.push(`Lớp: ${s.metadata.className}`);
      if (s.metadata.teacherName) metaParts.push(`GV: ${s.metadata.teacherName}`);
      
      const metaStr = metaParts.length > 0 ? `[${metaParts.join(', ')}]` : '';
      return `[${s.docType}] ${s.title} ${metaStr}\n${s.text}`;
    })
    .join('\n\n---\n\n');

  const answer = await generateAnswer({ question, context, sources, conversationHistory });

  return { answer, sources };
}


