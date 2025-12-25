import { embedText } from './embedder.js';
import { searchChunks } from './vectorStore.js';
import { searchChunksByKeywords, extractKeywordsFromQuery } from './keywordSearch.js';
import { rerankResults } from './reranker.js';
import { analyzeQuery, expandQueryWithSynonyms } from './queryProcessor.js';

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
 * Hybrid retrieval: combines semantic (vector) and keyword search with query understanding
 */
export async function retrieveRelevant({ question, filters, topK = 12 }) {
  // Analyze query to understand intent
  const queryAnalysis = analyzeQuery(question);
  console.log('[RAG Retriever] Query analysis:', JSON.stringify(queryAnalysis));
  
  // Expand query with synonyms for better recall
  const expandedQuery = expandQueryWithSynonyms(question);
  
  // Extract keywords from expanded query
  const keywords = extractKeywordsFromQuery(expandedQuery);
  
  // Detect specific query types
  const questionLower = question.toLowerCase();
  const classKeywords = ['môn', 'môn học', 'lớp', 'ai dạy', 'giảng viên', 'giáo viên', 'gv', 'thầy', 'cô', 'do ai', 'được ai', 'dạy', 'phụ trách'];
  const isClassQuery = classKeywords.some(kw => questionLower.includes(kw)) || queryAnalysis.detectedIntents.includes('classInfo');
  const gradeKeywords = ['điểm', 'chấm điểm', 'đã chấm', 'lên điểm', 'điểm số', 'grade', 'điểm thi', 'điểm môn'];
  const isGradeQuery = gradeKeywords.some(kw => questionLower.includes(kw)) || queryAnalysis.detectedIntents.includes('gradeInfo');
  
  // Get embedding for expanded query (better semantic matching)
  const embedding = await embedText(expandedQuery);
  
  // Adjust topK based on query complexity
  const adjustedTopK = queryAnalysis.isAmbiguous ? Math.ceil(topK * 1.5) : topK;
  
  // For class/teacher queries, also search without classIds filter to get Class chunks
  // Class chunks should be accessible even if user hasn't enrolled
  let classChunksResults = [];
  if (isClassQuery) {
    const classFilters = { ...filters, classIds: undefined, docType: ['class'] };
    const [classSemantic, classKeyword] = await Promise.all([
      searchChunks({ embedding, filters: classFilters, topK: adjustedTopK * 2 }),
      keywords.length > 0 
        ? searchChunksByKeywords({ keywords, filters: classFilters, topK: adjustedTopK * 2 })
        : Promise.resolve([]),
    ]);
    classChunksResults = mergeResults(classSemantic, classKeyword, 0.65, 0.35);
  }

  // For grade queries, focus on submission and assignment docs
  let gradeChunksResults = [];
  if (isGradeQuery) {
    const gradeFilters = { ...filters, docType: ['submission', 'assignment'] };
    const [gradeSemantic, gradeKeyword] = await Promise.all([
      searchChunks({ embedding, filters: gradeFilters, topK: adjustedTopK * 2 }),
      keywords.length > 0
        ? searchChunksByKeywords({ keywords, filters: gradeFilters, topK: adjustedTopK * 2 })
        : Promise.resolve([]),
    ]);
    gradeChunksResults = mergeResults(gradeSemantic, gradeKeyword, 0.6, 0.4);
  }
  
  // Run semantic and keyword search in parallel with original filters
  const [semanticResults, keywordResults] = await Promise.all([
    searchChunks({ embedding, filters, topK: adjustedTopK * 3 }),
    keywords.length > 0 
      ? searchChunksByKeywords({ keywords, filters, topK: adjustedTopK * 3 })
      : Promise.resolve([]),
  ]);
  
  // Merge results with adjusted weights (slightly favor semantic for Vietnamese)
  let mergedResults = mergeResults(semanticResults, keywordResults, 0.65, 0.35);
  
  // Add Class chunks if found (for class/teacher queries)
  if (classChunksResults.length > 0) {
    const seen = new Set(mergedResults.map(r => `${r.sourceId}_${r.chunkIndex || 0}`));
    for (const r of classChunksResults) {
      const key = `${r.sourceId}_${r.chunkIndex || 0}`;
      if (!seen.has(key)) {
        // Boost Class chunks score for class queries
        r.combinedScore = (r.combinedScore || 0) * 1.3;
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
        r.combinedScore = (r.combinedScore || 0) * 1.2;
        mergedResults.push(r);
        seen.add(key);
      }
    }
  }
  
  // Fallback strategies for low recall
  if (mergedResults.length < Math.min(topK, 5)) {
    console.log('[RAG] Low recall, applying relaxed filters');
    
    // Try without classIds filter
    if (filters.classIds?.length) {
      const relaxedFilters = { ...filters, classIds: undefined };
      const [relaxedSemantic, relaxedKeyword] = await Promise.all([
        searchChunks({ embedding, filters: relaxedFilters, topK: adjustedTopK * 3 }),
        keywords.length > 0 
          ? searchChunksByKeywords({ keywords, filters: relaxedFilters, topK: adjustedTopK * 3 })
          : Promise.resolve([]),
      ]);
      
      const relaxedMerged = mergeResults(relaxedSemantic, relaxedKeyword, 0.65, 0.35);
      const seen = new Set(mergedResults.map(r => `${r.sourceId}_${r.chunkIndex || 0}`));
      
      for (const r of relaxedMerged) {
        const key = `${r.sourceId}_${r.chunkIndex || 0}`;
        if (!seen.has(key) && mergedResults.length < topK * 2) {
          mergedResults.push(r);
          seen.add(key);
        }
      }
    }
  }
  
  // Sort by combined score
  let results = mergedResults
    .sort((a, b) => (b.combinedScore || 0) - (a.combinedScore || 0))
    .slice(0, topK * 2) // Get more candidates for re-ranking
    .map(r => ({
      ...r,
      score: r.combinedScore || r.semanticScore || r.keywordScore || 0,
    }));
  
  // Apply intelligent re-ranking
  results = rerankResults(question, results, topK);
  
  console.log(`[RAG] Retrieved ${results.length} results (top score: ${results[0]?.score.toFixed(3) || 'N/A'})`);
  
  return {
    embedding,
    results,
    queryAnalysis, // Return analysis for downstream use
  };
}


