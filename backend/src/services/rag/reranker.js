/**
 * Lightweight re-ranking based on multiple signals
 * Combines: keyword overlap, metadata matching, recency, title match
 */

/**
 * Calculate keyword overlap score between query and chunk
 */
function keywordOverlapScore(queryKeywords, text, title = '') {
  if (!queryKeywords || queryKeywords.length === 0) return 0;
  if (!text && !title) return 0;
  
  const searchText = `${title} ${text}`.toLowerCase();
  let matches = 0;
  
  for (const keyword of queryKeywords) {
    if (searchText.includes(keyword.toLowerCase())) {
      matches++;
    }
  }
  
  return queryKeywords.length > 0 ? matches / queryKeywords.length : 0;
}

/**
 * Extract subject/class name from question
 */
export function extractSubjectFromQuestion(question) {
  const questionLower = question.toLowerCase();
  // Patterns: "môn X", "lớp X", "môn học X", "lớp học X"
  const patterns = [
    /môn\s+(?:học\s+)?([^?.,!]+?)(?:\s+do|\s+được|\s+của|\s+giảng|\s+dạy|$|\?)/i,
    /lớp\s+(?:học\s+)?([^?.,!]+?)(?:\s+do|\s+được|\s+của|\s+giảng|\s+dạy|$|\?)/i,
  ];
  
  for (const pattern of patterns) {
    const match = question.match(pattern);
    if (match && match[1]) {
      return match[1].trim().toLowerCase();
    }
  }
  
  return null;
}

/**
 * Calculate metadata matching score
 */
function metadataMatchScore(question, metadata = {}, docType = '', title = '') {
  if (!metadata || typeof metadata !== 'object') return 0;
  
  const questionLower = question.toLowerCase();
  let score = 0;
  
  // Extract subject from question
  const subject = extractSubjectFromQuestion(question);
  
  // Strong boost for exact class name match
  if (subject && metadata.className) {
    const classNameLower = metadata.className.toLowerCase();
    if (classNameLower.includes(subject) || subject.includes(classNameLower)) {
      score += 0.5; // Strong boost for exact match
    }
  }
  
  // Strong boost for title match with subject
  if (subject && title) {
    const titleLower = title.toLowerCase();
    if (titleLower.includes(subject) || subject.includes(titleLower)) {
      score += 0.4;
    }
  }
  
  // Check if question mentions class code
  if (metadata.classCode && questionLower.includes(metadata.classCode.toLowerCase())) {
    score += 0.3;
  }
  
  // Check if question mentions class name (even without exact match)
  if (metadata.className) {
    const classNameLower = metadata.className.toLowerCase();
    const questionWords = questionLower.split(/\s+/).filter(w => w.length > 2);
    const classNameWords = classNameLower.split(/\s+/).filter(w => w.length > 2);
    
    // Check if significant words from class name appear in question
    let matches = 0;
    for (const cnw of classNameWords) {
      if (questionWords.some(qw => qw.includes(cnw) || cnw.includes(qw))) {
        matches++;
      }
    }
    if (matches >= Math.min(2, classNameWords.length)) {
      score += 0.3;
    }
  }
  
  // Boost for Class docType when query is about "who teaches" or "instructor"
  const teacherQueryKeywords = ['ai dạy', 'giảng viên', 'thầy', 'cô', 'do ai', 'được ai', 'người dạy'];
  const isTeacherQuery = teacherQueryKeywords.some(kw => questionLower.includes(kw));
  if (isTeacherQuery && docType === 'class') {
    score += 0.4; // Strong boost for Class chunks when asking about teacher
  }
  
  // Check if question mentions teacher name
  if (metadata.teacherName && questionLower.includes(metadata.teacherName.toLowerCase())) {
    score += 0.2;
  }
  
  // Check if question mentions student name/code
  if (metadata.studentName && questionLower.includes(metadata.studentName.toLowerCase())) {
    score += 0.2;
  }
  if (metadata.studentCode && questionLower.includes(metadata.studentCode.toLowerCase())) {
    score += 0.2;
  }
  
  // Check for date-related keywords
  const dateKeywords = ['hạn', 'deadline', 'nộp', 'submit', 'bắt đầu', 'kết thúc', 'start', 'end'];
  const hasDateKeyword = dateKeywords.some(kw => questionLower.includes(kw));
  if (hasDateKeyword && (metadata.dueDate || metadata.startTime || metadata.endTime)) {
    score += 0.2;
  }
  
  return Math.min(score, 1.0);
}

/**
 * Calculate recency boost (newer content gets slight boost)
 */
function recencyBoost(createdAt, updatedAt) {
  if (!createdAt && !updatedAt) return 0;
  
  const date = updatedAt || createdAt;
  if (!date) return 0;
  
  const daysSinceUpdate = (Date.now() - new Date(date).getTime()) / (1000 * 60 * 60 * 24);
  
  // Boost for content updated in last 30 days
  if (daysSinceUpdate <= 30) {
    return 0.1 * (1 - daysSinceUpdate / 30);
  }
  
  return 0;
}

/**
 * Calculate title match boost
 */
function titleMatchBoost(question, title = '') {
  if (!title) return 0;
  
  const questionLower = question.toLowerCase();
  const titleLower = title.toLowerCase();
  
  // Exact title match
  if (questionLower.includes(titleLower) || titleLower.includes(questionLower)) {
    return 0.3;
  }
  
  // Partial match (at least 3 words)
  const questionWords = questionLower.split(/\s+/).filter(w => w.length > 2);
  const titleWords = titleLower.split(/\s+/).filter(w => w.length > 2);
  
  let matches = 0;
  for (const qw of questionWords) {
    if (titleWords.some(tw => tw.includes(qw) || qw.includes(tw))) {
      matches++;
    }
  }
  
  if (questionWords.length > 0 && matches >= Math.min(3, questionWords.length)) {
    return 0.15;
  }
  
  return 0;
}

/**
 * Re-rank results using multiple signals
 */
export function rerankResults(question, results, topK = 12) {
  if (!results || results.length === 0) return results;
  
  const queryKeywords = question
    .toLowerCase()
    .replace(/[^\w\sàáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 1);
  
  const questionLower = question.toLowerCase();
  const isTeacherQuery = ['ai dạy', 'giảng viên', 'thầy', 'cô', 'do ai', 'được ai', 'người dạy'].some(kw => questionLower.includes(kw));
  const subject = extractSubjectFromQuestion(question);
  
  const reranked = results.map((r, idx) => {
    const baseScore = r.score || r.combinedScore || 0;
    
    // Calculate additional signals
    const keywordOverlap = keywordOverlapScore(queryKeywords, r.text || '', r.title || '');
    const metadataMatch = metadataMatchScore(question, r.metadata || {}, r.docType || '', r.title || '');
    const recency = recencyBoost(r.createdAt, r.updatedAt);
    const titleMatch = titleMatchBoost(question, r.title || '');
    
    // Special boost for Class chunks when asking about teacher
    let classBoost = 0;
    if (isTeacherQuery && r.docType === 'class') {
      classBoost = 0.3;
    }
    
    // Special boost for exact subject match in title or metadata
    let subjectBoost = 0;
    if (subject) {
      const titleLower = (r.title || '').toLowerCase();
      const classNameLower = (r.metadata?.className || '').toLowerCase();
      if (titleLower.includes(subject) || subject.includes(titleLower) || 
          classNameLower.includes(subject) || subject.includes(classNameLower)) {
        subjectBoost = 0.4;
      }
    }
    
    // Combined re-ranking score
    // Base score (50%) + signals (50%) for better re-ranking impact
    const rerankScore = baseScore * 0.5 + 
      (keywordOverlap * 0.15 + 
       metadataMatch * 0.25 + // Increased weight for metadata match
       recency * 0.05 + 
       titleMatch * 0.15 +
       classBoost +
       subjectBoost);
    
    return {
      ...r,
      rerankScore,
      signals: {
        keywordOverlap,
        metadataMatch,
        recency,
        titleMatch,
        classBoost,
        subjectBoost,
      },
    };
  });
  
  // Sort by rerank score and return topK
  return reranked
    .sort((a, b) => (b.rerankScore || 0) - (a.rerankScore || 0))
    .slice(0, topK)
    .map(r => ({
      ...r,
      score: r.rerankScore || r.score || 0, // Use rerank score as final score
    }));
}

