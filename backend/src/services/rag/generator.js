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

function buildPrompt({ question, context, sources, conversationHistory = [] }) {
  // Build structured sources with full text and metadata
  const sourcesText = (sources || [])
    .map((s, idx) => {
      const meta = formatMetadata(s.metadata || {});
      const metaPrefix = meta ? `${meta}\n` : '';
      return `--- NGUỒN ${idx + 1} [${s.docType || 'unknown'}] ---
${metaPrefix}Tiêu đề: ${s.title || 'không tiêu đề'}
Nội dung: ${s.text || ''}
${s.score !== undefined ? `Độ liên quan: ${(s.score * 100).toFixed(1)}%` : ''}`;
    })
    .join('\n\n');

  let historyContext = '';
  if (conversationHistory && conversationHistory.length > 0) {
    const recentHistory = conversationHistory.slice(-8); // Last 8 messages (4 turns)
    historyContext = '\n\n=== LỊCH SỬ CUỘC TRÒ CHUYỆN ===\n' + recentHistory.map((msg) => {
      const roleLabel = msg.role === 'user' ? '👤 Người dùng' : '🤖 Trợ lý';
      return `${roleLabel}: ${msg.content}`;
    }).join('\n\n') + '\n';
  }

  // Extract main subject/entity from question for better focus
  const questionLower = question.toLowerCase();
  const subjectKeywords = ['môn', 'lớp', 'bài tập', 'kỳ thi', 'giảng viên', 'thầy', 'cô', 'sinh viên', 'học sinh'];
  const hasSubject = subjectKeywords.some(kw => questionLower.includes(kw));
  
  return [
    'Bạn là trợ lý AI thông minh, thân thiện và chuyên nghiệp của hệ thống quản lý học tập.',
    'Nhiệm vụ của bạn là trả lời câu hỏi dựa trên thông tin trong NGUỒN THAM KHẢO và lịch sử cuộc trò chuyện.',
    '',
    'QUY TẮC QUAN TRỌNG:',
    '1. CHỈ TRẢ LỜI VỀ CHỦ ĐỀ ĐƯỢC HỎI. Nếu câu hỏi về "môn A", bạn CHỈ được trả lời về "môn A". KHÔNG được nói về "môn B" hoặc môn khác.',
    '2. Nếu không có thông tin về chủ đề được hỏi trong NGUỒN THAM KHẢO, hãy nói rõ: "Tôi không tìm thấy thông tin về [chủ đề cụ thể] trong hệ thống."',
    '3. KHÔNG được tự ý đề cập đến các chủ đề khác không liên quan đến câu hỏi, ngay cả khi có thông tin về chúng trong nguồn.',
    '4. Nếu câu hỏi về một môn học/lớp học cụ thể, hãy ưu tiên thông tin từ nguồn có docType="class" hoặc có metadata liên quan đến môn học đó.',
    '5. Sử dụng lịch sử cuộc trò chuyện để hiểu ngữ cảnh và trả lời chính xác hơn.',
    '6. Trả lời bằng tiếng Việt, tự nhiên, chi tiết và hữu ích.',
    '7. Khi có nhiều thông tin về cùng một chủ đề, hãy tổng hợp và trình bày rõ ràng.',
    '8. Nếu có ngày tháng, số liệu, hãy trích dẫn chính xác.',
    '9. Có thể dùng bullet points, danh sách khi phù hợp.',
    '',
    '=== NGUỒN THAM KHẢO ===',
    sourcesText || '(Không có nguồn tham khảo)',
    historyContext,
    '',
    `=== CÂU HỎI ===`,
    question,
    '',
    '=== TRẢ LỜI ===',
    hasSubject 
      ? 'Hãy trả lời CHỈ về chủ đề được hỏi trong câu hỏi. Nếu không có thông tin về chủ đề đó, hãy nói rõ là không tìm thấy, KHÔNG được nói về chủ đề khác:'
      : 'Hãy trả lời chi tiết, chính xác và hữu ích:',
  ].join('\n');
}

export async function generateAnswer({ question, context, sources, conversationHistory = [] }) {
  if (!GEMINI_API_KEY) throw new Error('MISSING_GEMINI_API_KEY');

  const prompt = buildPrompt({ question, context, sources, conversationHistory });

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(GEMINI_MODEL)}:generateContent?key=${encodeURIComponent(GEMINI_API_KEY)}`;

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 1000,
        topP: 0.95,
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
  return text;
}


