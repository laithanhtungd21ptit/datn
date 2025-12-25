const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-1.5-flash';

function formatMetadata(metadata) {
  if (!metadata || typeof metadata !== 'object') return '';
  const parts = [];
  
  if (metadata.dueDate) parts.push(`Hạn nộp: ${new Date(metadata.dueDate).toLocaleString('vi-VN')}`);
  if (metadata.isExam !== undefined) parts.push(`Loại: ${metadata.isExam ? 'Kỳ thi' : 'Bài tập'}`);
  if (metadata.durationMinutes) parts.push(`Thời gian: ${metadata.durationMinutes} phút`);
  if (metadata.startTime) parts.push(`Bắt đầu: ${new Date(metadata.startTime).toLocaleString('vi-VN')}`);
  if (metadata.endTime) parts.push(`Kết thúc: ${new Date(metadata.endTime).toLocaleString('vi-VN')}`);
  if (metadata.classCode) parts.push(`Mã lớp: ${metadata.classCode}`);
  if (metadata.className) parts.push(`Lớp: ${metadata.className}`);
  if (metadata.teacherName) parts.push(`Giảng viên: ${metadata.teacherName}`);
  if (metadata.studentName) parts.push(`Sinh viên: ${metadata.studentName}`);
  if (metadata.studentCode) parts.push(`Mã SV: ${metadata.studentCode}`);
  if (metadata.score !== null && metadata.score !== undefined) parts.push(`Điểm: ${metadata.score}`);
  if (metadata.type) parts.push(`Loại: ${metadata.type}`);
  if (metadata.department) parts.push(`Khoa: ${metadata.department}`);
  if (metadata.credits) parts.push(`Tín chỉ: ${metadata.credits}`);
  
  return parts.length > 0 ? `[${parts.join(' | ')}]` : '';
}

function buildSmartPrompt({ question, context, sources, conversationHistory = [], queryAnalysis }) {
  // Prioritize sources by docType relevance to query intent
  let prioritizedSources = [...sources];
  
  if (queryAnalysis) {
    const intentDocTypeMap = {
      classInfo: ['class'],
      assignmentInfo: ['assignment'],
      examInfo: ['assignment', 'exam_session'],
      gradeInfo: ['submission', 'assignment'],
      scheduleInfo: ['assignment', 'class'],  // ✅ THÊM DÒNG NÀY
      documentInfo: ['document'],
      announcementInfo: ['announcement'],
    };
    
    // Reorder sources: relevant docTypes first
    const relevantDocTypes = new Set();
    for (const intent of queryAnalysis.detectedIntents) {
      const types = intentDocTypeMap[intent] || [];
      types.forEach(t => relevantDocTypes.add(t));
    }
    
    prioritizedSources.sort((a, b) => {
      const aRelevant = relevantDocTypes.has(a.docType) ? 1 : 0;
      const bRelevant = relevantDocTypes.has(b.docType) ? 1 : 0;
      if (aRelevant !== bRelevant) return bRelevant - aRelevant;
      return (b.score || 0) - (a.score || 0); // Then by score
    });
  }
  
  // Build sources text with relevance indicators
  const sourcesText = prioritizedSources
    .slice(0, 12) // Limit to top 8 to fit in context window
    .map((s, idx) => {
      const meta = formatMetadata(s.metadata || {});
      const metaPrefix = meta ? `${meta}\n` : '';
      const relevanceEmoji = s.score > 0.8 ? '🔥' : s.score > 0.6 ? '✓' : '→';
      return `--- ${relevanceEmoji} NGUỒN ${idx + 1} [${s.docType || 'unknown'}] ---
${metaPrefix}Tiêu đề: ${s.title || 'không tiêu đề'}
Nội dung: ${s.text || ''}
${s.score !== undefined ? `Độ liên quan: ${(s.score * 100).toFixed(1)}%` : ''}`;
    })
    .join('\n\n');

  // Conversation history (last 6 messages = 3 turns)
  let historyContext = '';
  if (conversationHistory && conversationHistory.length > 0) {
    const recentHistory = conversationHistory.slice(-6);
    historyContext = '\n\n=== LỊCH SỬ CUỘC TRÒ CHUYỆN ===\n' + recentHistory.map((msg) => {
      const roleLabel = msg.role === 'user' ? '👤 Người dùng' : '🤖 Trợ lý';
      return `${roleLabel}: ${msg.content.slice(0, 200)}${msg.content.length > 200 ? '...' : ''}`; // Truncate long messages
    }).join('\n\n') + '\n';
  }

  // Extract entities from question for focused response
  const questionLower = question.toLowerCase();
  const subjectKeywords = ['môn', 'lớp', 'bài tập', 'kỳ thi', 'giảng viên', 'thầy', 'cô', 'sinh viên'];
  const hasSubject = subjectKeywords.some(kw => questionLower.includes(kw));
  
  // Detect if this is a follow-up question
  const isFollowUp = conversationHistory.length > 0 && 
    (questionLower.includes('còn') || questionLower.includes('vậy') || 
     questionLower.includes('thế') || questionLower.includes('nữa'));
  
     return [
      'Bạn là trợ lý AI thông minh, thân thiện và chuyên nghiệp của hệ thống quản lý học tập.',
      'Nhiệm vụ của bạn là trả lời câu hỏi một cách NGẮN GỌN, CHÍNH XÁC và TRỌNG TÂM.',
      '',
      '🎯 NGUYÊN TẮC TRẢ LỜI:',
      '1. **NGẮN GỌN**: Chỉ đưa thông tin CHÍNH xác trả lời câu hỏi. KHÔNG dump tất cả metadata.',
      '2. **TRỌNG TÂM**: ',
      '   - "Ai dạy?" → CHỈ cần TÊN giảng viên (không cần mã GV, email, khoa, tín chỉ)',
      '   - "Hạn nộp khi nào?" → CHỈ cần NGÀY THÁNG',
      '   - "Có những bài nào?" → Liệt kê TÊN bài tập + deadline',
      '3. **THÔNG TIN BỔ SUNG**: Chỉ thêm chi tiết nếu người dùng HỎI CỤ THỂ.',
      '4. **TỔNG HỢP**: Khi có nhiều items, liệt kê dạng danh sách ngắn gọn.',
      '5. **KHÔNG TÌM THẤY**: Nếu không có thông tin → nói rõ ràng.',
      '',
      '💡 VÍ DỤ TRẢ LỜI TỐT:',
      '- "Môn Cơ sở dữ liệu do ai dạy?" → "Giảng viên Đặng Văn Hanh"',
      '- "Bài tập 1 hạn nộp khi nào?" → "Hạn nộp: 25/12/2024, 23:59"',
      '- "Có những bài tập nào?" → "• Bài tập 1 - Hạn: 25/12\\n• Bài tập 2 - Hạn: 30/12"',
      '',
      '❌ TRÁNH:',
      '- Đưa quá nhiều metadata (mã lớp, mã GV, email, khoa, tín chỉ) khi không cần',
      '- Viết câu dài dòng khi có thể ngắn gọn',
      '- Lặp lại thông tin từ câu hỏi',
      '',
      '=== NGUỒN THAM KHẢO ===',
      sourcesText || '(Không có nguồn tham khảo)',
      historyContext,
      '',
      `=== CÂU HỎI ===`,
      question,
      '',
      '=== TRẢ LỜI ===',
      'Trả lời NGẮN GỌN và ĐÚNG TRỌNG TÂM:',
    ].filter(Boolean).join('\n');
}

export async function generateAnswer({ question, context, sources, conversationHistory = [], queryAnalysis }) {
  if (!GEMINI_API_KEY) throw new Error('MISSING_GEMINI_API_KEY');

  const prompt = buildSmartPrompt({ question, context, sources, conversationHistory, queryAnalysis });

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(GEMINI_MODEL)}:generateContent?key=${encodeURIComponent(GEMINI_API_KEY)}`;

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.7, // Lower temp for more factual responses
        maxOutputTokens: 1500, // Increased for detailed answers
        topP: 0.9, // Slightly more focused
        topK: 40,
      },
    }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => res.statusText);
    throw new Error(`GENERATION_FAILED: ${res.status} ${detail}`);
  }

  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('EMPTY_GEMINI_RESPONSE');
  return text.trim();
}


