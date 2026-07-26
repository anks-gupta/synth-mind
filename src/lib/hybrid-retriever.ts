import { OpenAI } from 'openai';
import { searchVectorChunks } from './embeddings';
import { withRetry } from './openai-retry';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || 'sk-dummy-key-for-build',
});

// 1. Query Deconstruction: Split compound queries into distinct sub-questions
export async function deconstructQuery(query: string): Promise<string[]> {
  if (!process.env.OPENAI_API_KEY) return [query];

  try {
    const prompt = `Analyze the user's research question and split it into 1 to 3 distinct, single-intent sub-questions.
Do not answer the question. Only split compound queries.
Return ONLY valid JSON matching this schema:
{ "queries": ["sub-question 1", "sub-question 2"] }`;

    const response = await withRetry(() =>
      openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: prompt },
          { role: 'user', content: query },
        ],
        temperature: 0.1,
        response_format: { type: 'json_object' },
      })
    );

    const parsed = JSON.parse(response.choices[0]?.message?.content || '{}');
    if (Array.isArray(parsed.queries) && parsed.queries.length > 0) {
      return parsed.queries.map((q: string) => q.trim()).filter(Boolean);
    }
  } catch (err) {
    console.warn('Query deconstruction fallback to original:', err);
  }
  return [query];
}

// 2. Multi-Query Reformulation: Generate 3 semantic variations of query
export async function generateMultiQueries(query: string): Promise<string[]> {
  if (!process.env.OPENAI_API_KEY) return [query];

  try {
    const prompt = `Generate exactly 3 different versions of the following question that capture the same intent using different vocabulary, phrasing, or technical perspective.
Return ONLY the 3 questions, one per line, no numbering.

Original question: ${query}`;

    const response = await withRetry(() =>
      openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.6,
      })
    );

    const lines = (response.choices[0]?.message?.content || '')
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);

    return lines.length > 0 ? lines : [query];
  } catch (err) {
    return [query];
  }
}

// 3. HyDE: Hypothetical Document Embedding
export async function generateHyDeAnswer(query: string): Promise<string> {
  if (!process.env.OPENAI_API_KEY) return query;

  try {
    const prompt = `Write a 2-3 sentence hypothetical excerpt from a textbook, transcript, or technical document that directly answers the following question.
Do not mention that this is hypothetical.

Question: ${query}`;

    const response = await withRetry(() =>
      openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.5,
      })
    );

    return response.choices[0]?.message?.content || query;
  } catch (err) {
    return query;
  }
}

// 4. Reciprocal Rank Fusion (RRF Algorithm)
export function applyReciprocalRankFusion(chunkLists: any[][], topK: number = 5) {
  const scoreMap = new Map<string, { chunk: any; rrfScore: number }>();
  const K = 60; // Standard RRF constant

  for (const list of chunkLists) {
    if (!Array.isArray(list)) continue;
    list.forEach((chunk, rank) => {
      if (!chunk) return;
      const snippet = typeof chunk.text === 'string' ? chunk.text.slice(0, 30) : String(chunk.text || '');
      const key = `${chunk.sourceId || 'src'}_${chunk.pageNumber || 0}_${chunk.startTime || 0}_${snippet}`;
      const current = scoreMap.get(key) || { chunk, rrfScore: 0 };
      current.rrfScore += 1 / (K + (rank + 1));
      scoreMap.set(key, current);
    });
  }

  const sorted = Array.from(scoreMap.values())
    .sort((a, b) => b.rrfScore - a.rrfScore)
    .slice(0, topK)
    .map((item, idx) => ({
      ...item.chunk,
      citationId: idx + 1,
      rrfScore: item.rrfScore,
    }));

  return sorted;
}

// 5. Main Hybrid Mix Retrieval Function
export async function retrieveHybridChunks(
  notebookId: string,
  query: string,
  topK: number = 5,
  activeSourceIds?: string[]
) {
  // Cap topK to avoid massive in-memory chunk lists
  const safeTopK = Math.min(topK, 8);

  const subQueries = await deconstructQuery(query);
  // Cap to max 2 sub-queries to prevent exponential LLM calls
  const cappedSubQueries = subQueries.slice(0, 2);

  const allChunkLists: any[][] = [];

  for (const subQuery of cappedSubQueries) {
    const [directResults, multiQueryVariants, hydeText] = await Promise.all([
      searchVectorChunks(notebookId, subQuery, safeTopK, activeSourceIds),
      generateMultiQueries(subQuery),
      generateHyDeAnswer(subQuery),
    ]);

    if (Array.isArray(directResults)) allChunkLists.push(directResults);

    // Cap to max 2 multi-query variants to prevent OOM
    const cappedVariants = multiQueryVariants.filter((v) => v !== subQuery).slice(0, 2);
    for (const variant of cappedVariants) {
      const variantResults = await searchVectorChunks(notebookId, variant, safeTopK, activeSourceIds);
      if (Array.isArray(variantResults)) allChunkLists.push(variantResults);
    }

    if (hydeText && hydeText !== subQuery) {
      const hydeResults = await searchVectorChunks(notebookId, hydeText, safeTopK, activeSourceIds);
      if (Array.isArray(hydeResults)) allChunkLists.push(hydeResults);
    }
  }

  const fusedChunks = applyReciprocalRankFusion(allChunkLists, safeTopK);
  return fusedChunks;
}
