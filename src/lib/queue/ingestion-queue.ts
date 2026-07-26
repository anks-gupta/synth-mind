import { db } from '@/lib/db';
import { SourceParserFactory } from '@/lib/parsers';
import { indexSourceChunks } from '@/lib/embeddings';
import { SourceType } from '@/lib/types';
import { TaskQueue, TaskJob } from './task-queue';

export interface IngestionJobData {
  sourceId: string;
  notebookId: string;
  type: SourceType;
  title: string;
  urlOrPath: string;
  fileBuffer?: Buffer | null;
  textContent?: string;
}

async function processIngestionJob(job: TaskJob<IngestionJobData>): Promise<void> {
  const { sourceId, notebookId, type, title, urlOrPath, fileBuffer, textContent } = job.data;

  // 1. Update status to 'indexing'
  await db.source.update({
    where: { id: sourceId },
    data: { status: 'indexing', errorMessage: null },
  });

  try {
    // 2. Prepare payload for parsing
    let inputPayload: string | Buffer = urlOrPath || textContent || '';
    if (fileBuffer) {
      if (type === 'pdf') {
        inputPayload = fileBuffer;
      } else {
        inputPayload = fileBuffer.toString('utf-8');
      }
    }

    // 3. Parse source content
    const parseResult = await SourceParserFactory.parseSource({
      type,
      notebookId,
      sourceId,
      title,
      contentOrUrl: inputPayload,
    });

    if (!parseResult.chunks || parseResult.chunks.length === 0) {
      throw new Error('No readable text content extracted from source');
    }

    // 4. Index chunks into Qdrant Cloud
    await indexSourceChunks(parseResult.chunks);

    // 5. Update status to 'ready'
    await db.source.update({
      where: { id: sourceId },
      data: {
        status: 'ready',
        title: parseResult.title || title,
      },
    });
  } catch (error: any) {
    const isFinalAttempt = job.attempts >= job.maxRetries;
    if (isFinalAttempt) {
      await db.source.update({
        where: { id: sourceId },
        data: {
          status: 'error',
          errorMessage: error?.message || 'Failed to process and index source content',
        },
      });
    }
    throw error;
  }
}

// Global singleton instance for Ingestion Queue (max 3 concurrent jobs)
export const ingestionQueue = new TaskQueue<IngestionJobData>(processIngestionJob, {
  concurrency: 3,
});

export function enqueueIngestionJob(data: IngestionJobData): string {
  return ingestionQueue.enqueue(data.sourceId, data, {
    maxRetries: 3,
    initialBackoffMs: 1000,
  });
}
