/**
 * Query processing utilities for better query understanding and retrieval
 */

/**
 * Extract intent and entities from user query
 */
export function normalizeAssignmentTitle(title) {
  // Normalize để match tốt hơn
  return title
    .toLowerCase()
    .replace(/bài tập\s*/gi, '')
    .replace(/kiểm tra\s*/gi, 'kt ')
    .replace(/giữa kỳ/gi, 'gk')
    .replace(/cuối kỳ/gi, 'ck')
    .trim();
}

export function analyzeQuery(query) {
  const queryLower = query.toLowerCase();
  
  const intents = {
    classInfo: ['môn', 'lớp', 'ai dạy', 'giảng viên nào', 'thầy nào', 'cô nào', 'phụ trách', 'môn học'],
    assignmentInfo: ['bài tập', 'deadline', 'hạn nộp', 'assignment', 'homework', 'bài về nhà', 'bài nào', 'có những bài'], 
    examInfo: ['kỳ thi', 'thi', 'kiểm tra', 'exam', 'test', 'bài kiểm tra', 'bài tập'],
    gradeInfo: ['điểm', 'grade', 'kết quả', 'chấm', 'điểm số', 'đã chấm', 'score', 'được chấm', 'đã nộp'], 
    scheduleInfo: ['lịch', 'thời gian', 'khi nào', 'ngày nào', 'schedule', 'lịch học', 'lịch thi', 'lịch nộp'], 
    documentInfo: ['tài liệu', 'file', 'document', 'slides', 'bài giảng'],
    announcementInfo: ['thông báo', 'announcement', 'notice', 'tin tức'],
  };
  
  const detectedIntents = [];
  for (const [intent, keywords] of Object.entries(intents)) {
    if (keywords.some(kw => queryLower.includes(kw))) {
      detectedIntents.push(intent);
    }
  }
  
  // Extract potential class names/codes (e.g., "CNTT101", "Cơ sở dữ liệu")
  const classCodePattern = /\b[A-Z]{2,4}\d{2,4}\b/g;
  const classNamePattern = /\b[A-ZĐẾÓÔƠƯĂÂ][a-zđếíóôơưăâđ]+(?:\s+[a-zđếíóôơưăâđ]+){0,4}\b/g;
  
  const classCodes = query.match(classCodePattern) || [];
  const classNames = query.match(classNamePattern) || [];
  
  const entities = [...classCodes, ...classNames.slice(0, 2)]; // Limit to avoid noise
  
  return {
    originalQuery: query,
    detectedIntents,
    entities,
    isAmbiguous: detectedIntents.length > 2,
  };
}

/**
 * Expand query with synonyms for better recall
 */
export function expandQueryWithSynonyms(query) {
  const synonyms = {
    'giảng viên': ['thầy', 'cô', 'giáo viên'],
    'sinh viên': ['học sinh', 'sv'],
    'bài tập': ['assignment', 'homework'],
    'kỳ thi': ['exam', 'test', 'kiểm tra'],
    'điểm': ['grade', 'score', 'điểm số'],
    'lớp': ['môn', 'class', 'môn học'],
    'hạn nộp': ['deadline', 'thời hạn'],
    'tài liệu': ['document', 'file', 'bài giảng'],
    'thông báo': ['announcement', 'notice'],
  };
  
  let expandedQuery = query;
  const queryLower = query.toLowerCase();
  
  for (const [term, syns] of Object.entries(synonyms)) {
    if (queryLower.includes(term)) {
      // Add first synonym to expand query (not all to avoid noise)
      expandedQuery += ` ${syns[0]}`;
    }
  }
  
  return expandedQuery;
}

/**
 * Normalize Vietnamese text for better matching
 */
export function normalizeVietnameseText(text) {
  if (!text) return '';
  
  // Normalize whitespace
  let normalized = text.trim().replace(/\s+/g, ' ');
  
  // Lowercase for case-insensitive matching
  normalized = normalized.toLowerCase();
  
  return normalized;
}

/**
 * Extract keywords from query for hybrid search
 */
export function extractImportantKeywords(query) {
  // Remove Vietnamese stopwords
  const stopwords = new Set([
    'là', 'của', 'và', 'có', 'trong', 'được', 'cho', 'với', 'các', 'một',
    'từ', 'để', 'này', 'đó', 'không', 'thì', 'về', 'như', 'đã', 'sẽ',
    'vào', 'bởi', 'theo', 'đến', 'trên', 'khi', 'hay', 'nào', 'gì', 'ai',
    'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'have', 'has'
  ]);
  
  const words = query.toLowerCase().split(/\s+/);
  const keywords = words.filter(w => w.length > 2 && !stopwords.has(w));
  
  return keywords;
}

