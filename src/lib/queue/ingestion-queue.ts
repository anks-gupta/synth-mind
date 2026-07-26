import { db } from '@/lib/db';
import { SourceParserFactory } from '@/lib/parsers';
import { indexSourceChunks } from '@/lib/embeddings';
import { SourceType } from '@/lib/types';
import { documentIngestionQueue, BaseWorker, BaseQueueEvents, IngestionJobPayload } from '@/queue';
import { Job } from 'bullmq';

export interface IngestionJobData {
  sourceId: string;
  notebookId: string;
  type: SourceType;
  title: string;
  urlOrPath: string;
  fileBuffer?: Buffer | null;
  textContent?: string;
}

async function processIngestionJob(job: Job<IngestionJobPayload>): Promise<void> {
  const { sourceId, notebookId, type, title, urlOrPath, fileBuffer, textContent } = job.data;

  // 1. Update status to 'indexing'
  await db.source.update({
    where: { id: sourceId },
    data: { status: 'indexing', errorMessage: null },
  });

  try {
    await job.updateProgress(10);

    // 2. Prepare payload for parsing
    let inputPayload: string | Buffer = urlOrPath || textContent || '';
    if (fileBuffer) {
      if (type === 'pdf') {
        inputPayload = Buffer.from(fileBuffer);
      } else {
        inputPayload = Buffer.from(fileBuffer).toString('utf-8');
      }
    }

    // 3. Parse source content
    const parseResult = await SourceParserFactory.parseSource({
      type: type as SourceType,
      notebookId,
      sourceId,
      title,
      contentOrUrl: inputPayload,
    });

    await job.updateProgress(50);

    if (!parseResult.chunks || parseResult.chunks.length === 0) {
      throw new Error('No readable text content extracted from source');
    }

    // 4. Index chunks into Qdrant Cloud
    await indexSourceChunks(parseResult.chunks);

    await job.updateProgress(90);

    // 5. Update status to 'ready'
    await db.source.update({
      where: { id: sourceId },
      data: {
        status: 'ready',
        title: parseResult.title || title,
      },
    });

    await job.updateProgress(100);
  } catch (error: any) {
    const isFinalAttempt = job.attemptsMade + 1 >= (job.opts.attempts || 3);
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

const isBuildPhase = process.env.NEXT_PHASE === 'phase-production-build';

let _ingestionWorker: BaseWorker<IngestionJobPayload> | null = null;
let _ingestionEvents: BaseQueueEvents | null = null;

export function getIngestionWorker(): BaseWorker<IngestionJobPayload> | null {
  if (isBuildPhase) return null;
  if (!_ingestionWorker) {
    _ingestionWorker = new BaseWorker<IngestionJobPayload>(
      documentIngestionQueue.queueName,
      processIngestionJob,
      {
        concurrency: 3,
        lockDurationMs: 300000, // 5 minutes lock duration for large PDFs/OCR/Videos
      }
    );
  }
  return _ingestionWorker;
}

export function getIngestionEvents(): BaseQueueEvents | null {
  if (isBuildPhase) return null;
  if (!_ingestionEvents) {
    _ingestionEvents = new BaseQueueEvents(documentIngestionQueue.queueName);
  }
  return _ingestionEvents;
}

// Auto-start worker at server runtime (outside build phase)
if (!isBuildPhase && typeof window === 'undefined') {
  getIngestionWorker();
  getIngestionEvents();
}

/**
 * Enqueues a new document ingestion job into the persistent BullMQ Redis queue.
 */
export async function enqueueIngestionJob(data: IngestionJobData): Promise<string> {
  return documentIngestionQueue.enqueue(data.sourceId, data, {
    maxRetries: 3,
    initialBackoffMs: 1000,
    timeoutMs: 600000, // 10 minutes timeout
  });
}
