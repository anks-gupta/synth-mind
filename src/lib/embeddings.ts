import { OpenAI } from 'openai';
import { COLLECTION_NAME, ensureQdrantCollection, qdrantRequest } from './qdrant';
import { ChunkMetadata } from './types';
import { withRetry } from './openai-retry';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || 'sk-dummy-key-for-build',
});

// Module-level singleton: only initialize Qdrant once per process startup
let qdrantInitialized = false;
async function ensureQdrantOnce() {
  if (!qdrantInitialized) {
    await ensureQdrantCollection();
    qdrantInitialized = true;
  }
}

function generatePointId(sourceId: string, chunkIndex: number): string {
  const str = `${sourceId}_${chunkIndex}`;
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  const hex = Math.abs(hash).toString(16).padStart(8, '0');
  return `${hex.slice(0, 8)}-4000-8000-8000-${hex.padEnd(12, '0').slice(0, 12)}`;
}

export async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  if (!process.env.OPENAI_API_KEY) {
    console.warn('OPENAI_API_KEY missing, using mock 1536-dim vector generator for build/testing.');
    return texts.map(() => new Array(1536).fill(0).map(() => Math.random()));
  }

  const BATCH_SIZE = 25;
  const results: number[][] = [];

  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    const batch = texts.slice(i, i + BATCH_SIZE);
    try {
      const response = await withRetry(() =>
        openai.embeddings.create({
          model: 'text-embedding-3-small',
          input: batch,
        })
      );
      const batchEmbeddings = response.data.map((item) => item.embedding);
      results.push(...batchEmbeddings);
    } catch (error: any) {
      console.error(`OpenAI Embedding Batch Error (${i}-${i + BATCH_SIZE}):`, error);
      throw new Error(`Embedding Generation Failed: ${error.message}`);
    }
  }

  return results;
}

export async function indexSourceChunks(chunks: { text: string; metadata: Partial<ChunkMetadata> }[]) {
  await ensureQdrantCollection();

  const texts = chunks.map((c) => c.text);
  const embeddings = await generateEmbeddings(texts);

  const points = chunks.map((chunk, i) => {
    const sourceId = chunk.metadata.sourceId || 'source';
    const chunkIndex = chunk.metadata.chunkIndex ?? i;
    const pointId = generatePointId(sourceId, chunkIndex);

    return {
      id: pointId,
      vector: embeddings[i],
      payload: {
        notebookId: chunk.metadata.notebookId,
        sourceId: chunk.metadata.sourceId,
        sourceTitle: chunk.metadata.sourceTitle,
        sourceType: chunk.metadata.sourceType,
        text: chunk.text,
        pageNumber: chunk.metadata.pageNumber ?? null,
        startTime: chunk.metadata.startTime ?? null,
        chunkIndex,
        videoId: chunk.metadata.videoId ?? null,
        urlOrPath: chunk.metadata.urlOrPath ?? null,
      },
    };
  });

  try {
    await qdrantRequest(`/collections/${COLLECTION_NAME}/points?wait=true`, {
      method: 'PUT',
      body: JSON.stringify({ points }),
    });
    console.log(`Successfully indexed ${points.length} chunks into Qdrant Cloud.`);
    return points.length;
  } catch (error: any) {
    console.error('Qdrant Vector Upsert Error:', error);
    throw new Error(`Qdrant Vector Storage Failed: ${error.message}`);
  }
}

export async function searchVectorChunks(
  notebookId: string,
  query: string,
  topK: number = 5,
  activeSourceIds?: string[]
) {
  await ensureQdrantOnce();

  try {
    const embeddings = await generateEmbeddings([query]);
    if (!embeddings || embeddings.length === 0) return [];
    const queryEmbedding = embeddings[0];

    const mustFilter: any[] = [
      {
        key: 'notebookId',
        match: {
          value: notebookId,
        },
      },
    ];

    if (Array.isArray(activeSourceIds) && activeSourceIds.length > 0) {
      mustFilter.push({
        key: 'sourceId',
        match: {
          any: activeSourceIds,
        },
      });
    }

    const searchRes = await qdrantRequest(`/collections/${COLLECTION_NAME}/points/search`, {
      method: 'POST',
      body: JSON.stringify({
        vector: queryEmbedding,
        limit: topK,
        with_payload: true, // CRITICAL: Tells Qdrant REST API to return chunk payload data
        filter: {
          must: mustFilter,
        },
      }),
    });

    const results = searchRes.result || [];
    return results.map((res: any, idx: number) => ({
      score: res.score,
      citationId: idx + 1,
      notebookId: res.payload?.notebookId as string,
      sourceId: res.payload?.sourceId as string,
      sourceTitle: res.payload?.sourceTitle as string,
      sourceType: res.payload?.sourceType as any,
      text: res.payload?.text as string,
      pageNumber: res.payload?.pageNumber as number | undefined,
      startTime: res.payload?.startTime as number | undefined,
      videoId: res.payload?.videoId as string | undefined,
      urlOrPath: res.payload?.urlOrPath as string | undefined,
    }));
  } catch (error: any) {
    console.error('Qdrant Search Error / Embedding Failure:', error.message || error);
    return [];
  }
}
