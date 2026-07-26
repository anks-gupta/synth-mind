import { BaseQueue } from './queue';
import { ILogger, DefaultLogger } from './logger';
import { getRedisConnection, closeRedisConnection, getRedisConfig } from './redis';
import { BaseWorker, JobProcessor } from './worker';
import { BaseQueueEvents } from './events';

// Re-export Queue core abstractions
export * from './logger';
export * from './redis';
export * from './queue';
export * from './worker';
export * from './events';

export interface IngestionJobPayload {
  sourceId: string;
  notebookId: string;
  type: string;
  title: string;
  urlOrPath: string;
  fileBuffer?: Buffer | null;
  textContent?: string;
}

const queueName = process.env.QUEUE_NAME || 'document-ingestion-queue';

let _documentIngestionQueueInstance: BaseQueue<IngestionJobPayload> | null = null;

export function getDocumentIngestionQueue(): BaseQueue<IngestionJobPayload> {
  if (!_documentIngestionQueueInstance) {
    _documentIngestionQueueInstance = new BaseQueue<IngestionJobPayload>(queueName);
  }
  return _documentIngestionQueueInstance;
}

/**
 * Lazy singleton production queue instance for document ingestion & processing.
 * Only connects to Redis when methods (enqueue, getMetrics, etc.) are called at runtime.
 */
export const documentIngestionQueue = new Proxy({} as BaseQueue<IngestionJobPayload>, {
  get(_target, prop, receiver) {
    const instance = getDocumentIngestionQueue();
    const value = Reflect.get(instance, prop, receiver);
    return typeof value === 'function' ? value.bind(instance) : value;
  },
});
