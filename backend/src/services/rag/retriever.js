import { embedText } from './embedder.js';
import { searchChunks } from './vectorStore.js';
import { searchChunksByKeywords, extractKeywordsFromQuery } from './keywordSearch.js';
import { rerankResults } from './reranker.js';

/**
 * Merge and deduplicate results by sourceId + chunkIndex
 */
function mergeResults(semanticResults, keywordResults, semanticWeight = 0.7, keywordWeight = 0.3) {
  const resultMap = new Map();
  
  // Add semantic results
  for (const r of semanticResults) {
    const key = `${r.sourceId}_${r.chunkIndex || 0}`;
    if (!resultMap.has(key)) {
      resultMap.set(key, {
        ...r,
        semanticScore: r.score || 0,
        keywordScore: 0,
        combinedScore: (r.score || 0) * semanticWeight,
      });
    } else {
      const existing = resultMap.get(key);
      existing.semanticScore = r.score || 0;
      existing.combinedScore = existing.semanticScore * semanticWeight + existing.keywordScore * keywordWeight;
    }
  }
  
  // Add keyword results
  for (const r of keywordResults) {
    const key = `${r.sourceId}_${r.chunkIndex || 0}`;
    if (!resultMap.has(key)) {
      resultMap.set(key, {
        ...r,
        semanticScore: 0,
        keywordScore: r.keywordScore || r.score || 0,
        combinedScore: (r.keywordScore || r.score || 0) * keywordWeight,
      });
    } else {
      const existing = resultMap.get(key);
      existing.keywordScore = r.keywordScore || r.score || 0;
      existing.combinedScore = existing.semanticScore * semanticWeight + existing.keywordScore * keywordWeight;
    }
  }
  
  return Array.from(resultMap.values());
}

/**
 * Hybrid retrieval: combines semantic (vector) and keyword search
 */
export async function retrieveRelevant({ question, filters, topK = 12 }) {
  // Extract keywords from question
  const keywords = extractKeywordsFromQuery(question);
  
  // Detect if query is about class/teacher (should prioritize Class chunks)
  const questionLower = question.toLowerCase();
  const classKeywords = ['môn', 'môn học', 'lớp', 'ai dạy', 'giảng viên', 'giáo viên', 'gv', 'thầy', 'cô', 'do ai', 'được ai', 'dạy', 'phụ trách'];
  const isClassQuery = classKeywords.some(kw => questionLower.includes(kw));
  const gradeKeywords = ['điểm', 'chấm điểm', 'đã chấm', 'lên điểm', 'điểm số', 'grade', 'điểm thi', 'điểm môn'];
  const isGradeQuery = gradeKeywords.some(kw => questionLower.includes(kw));
  
  // Get embedding first
  const embedding = await embedText(question);
  
  // For class/teacher queries, also search without classIds filter to get Class chunks
  // Class chunks should be accessible even if user hasn't enrolled
  let classChunksResults = [];
  if (isClassQuery) {
    const classFilters = { ...filters, classIds: undefined, docType: ['class'] };
    const [classSemantic, classKeyword] = await Promise.all([
      searchChunks({ embedding, filters: classFilters, topK: topK * 2 }),
      keywords.length > 0 
        ? searchChunksByKeywords({ keywords, filters: classFilters, topK: topK * 2 })
        : Promise.resolve([]),
    ]);
    classChunksResults = mergeResults(classSemantic, classKeyword, 0.6, 0.4);
  }

  // For grade queries, relax docType to include potential grade/result docs
  let gradeChunksResults = [];
  if (isGradeQuery) {
    const gradeFilters = { ...filters, docType: undefined };
    const [gradeSemantic, gradeKeyword] = await Promise.all([
      searchChunks({ embedding, filters: gradeFilters, topK: topK * 2 }),
      keywords.length > 0
        ? searchChunksByKeywords({ keywords, filters: gradeFilters, topK: topK * 2 })
        : Promise.resolve([]),
    ]);
    gradeChunksResults = mergeResults(gradeSemantic, gradeKeyword, 0.6, 0.4);
  }
  
  // Run semantic and keyword search in parallel with original filters
  const [semanticResults, keywordResults] = await Promise.all([
    searchChunks({ embedding, filters, topK: topK * 3 }),
    keywords.length > 0 
      ? searchChunksByKeywords({ keywords, filters, topK: topK * 3 })
      : Promise.resolve([]),
  ]);
  
  // Merge results with weighted scoring
  // Semantic weight: 0.7, Keyword weight: 0.3
  let mergedResults = mergeResults(semanticResults, keywordResults, 0.6, 0.4);
  
  // Add Class chunks if found (for class/teacher queries)
  if (classChunksResults.length > 0) {
    const seen = new Set(mergedResults.map(r => `${r.sourceId}_${r.chunkIndex || 0}`));
    for (const r of classChunksResults) {
      const key = `${r.sourceId}_${r.chunkIndex || 0}`;
      if (!seen.has(key)) {
        // Boost Class chunks score for class queries
        r.combinedScore = (r.combinedScore || 0) * 1.2;
        mergedResults.push(r);
        seen.add(key);
      }
    }
  }

  // Add Grade chunks if found (for grade queries)
  if (gradeChunksResults.length > 0) {
    const seen = new Set(mergedResults.map(r => `${r.sourceId}_${r.chunkIndex || 0}`));
    for (const r of gradeChunksResults) {
      const key = `${r.sourceId}_${r.chunkIndex || 0}`;
      if (!seen.has(key)) {
        r.combinedScore = (r.combinedScore || 0) * 1.1;
        mergedResults.push(r);
        seen.add(key);
      }
    }
  }
  
  // If not enough results, try with relaxed filters
  if (mergedResults.length < Math.min(topK, 5) && filters.classIds?.length) {
    const relaxedFilters = { ...filters, classIds: undefined };
    const [relaxedSemantic, relaxedKeyword] = await Promise.all([
      searchChunks({ embedding, filters: relaxedFilters, topK: topK * 3 }),
      keywords.length > 0 
        ? searchChunksByKeywords({ keywords, filters: relaxedFilters, topK: topK * 3 })
        : Promise.resolve([]),
    ]);
    
    const relaxedMerged = mergeResults(relaxedSemantic, relaxedKeyword, 0.6, 0.4);
    const seen = new Set(mergedResults.map(r => `${r.sourceId}_${r.chunkIndex || 0}`));
    
    for (const r of relaxedMerged) {
      const key = `${r.sourceId}_${r.chunkIndex || 0}`;
      if (!seen.has(key) && mergedResults.length < topK * 2) {
        mergedResults.push(r);
        seen.add(key);
      }
    }
  }
  
  // If still not enough, try without docType filter
  if (mergedResults.length < Math.min(topK, 5) && filters.docType?.length) {
    const relaxedFilters = { ...filters, docType: undefined };
    const [relaxedSemantic, relaxedKeyword] = await Promise.all([
      searchChunks({ embedding, filters: relaxedFilters, topK: topK * 3 }),
      keywords.length > 0 
        ? searchChunksByKeywords({ keywords, filters: relaxedFilters, topK: topK * 3 })
        : Promise.resolve([]),
    ]);
    
    const relaxedMerged = mergeResults(relaxedSemantic, relaxedKeyword, 0.6, 0.4);
    const seen = new Set(mergedResults.map(r => `${r.sourceId}_${r.chunkIndex || 0}`));
    
    for (const r of relaxedMerged) {
      const key = `${r.sourceId}_${r.chunkIndex || 0}`;
      if (!seen.has(key) && mergedResults.length < topK * 2) {
        mergedResults.push(r);
        seen.add(key);
      }
    }
  }
  
  // Initial sort by combined score
  let results = mergedResults
    .sort((a, b) => (b.combinedScore || 0) - (a.combinedScore || 0))
    .slice(0, topK * 2) // Get more candidates for re-ranking
    .map(r => ({
      ...r,
      score: r.combinedScore || r.semanticScore || r.keywordScore || 0,
    }));
  
  // Apply lightweight re-ranking
  results = rerankResults(question, results, topK);
  
  return {
    embedding,
    results,
  };
}


