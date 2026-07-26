import { QueueEvents, QueueEventsOptions } from 'bullmq';
import { getRedisConfig } from './redis';
import { DefaultLogger, ILogger } from './logger';

/**
 * Generic QueueEvents Listener Wrapper for global job status monitoring.
 */
export class BaseQueueEvents {
  public readonly queueName: string;
  private queueEvents: QueueEvents;
  private logger: ILogger;

  constructor(queueName: string, options?: Partial<QueueEventsOptions>, customLogger?: ILogger) {
    this.queueName = queueName;
    this.logger = customLogger || new DefaultLogger(`[Events:${queueName}]`);

    const redisConfig = getRedisConfig();

    this.queueEvents = new QueueEvents(queueName, {
      connection: redisConfig,
      ...options,
    });

    this.setupListeners();
  }

  private setupListeners(): void {
    this.queueEvents.on('completed', ({ jobId }) => {
      this.logger.debug?.(`[QueueEvents] Job [${jobId}] completed.`);
    });

    this.queueEvents.on('failed', ({ jobId, failedReason }) => {
      this.logger.error(`[QueueEvents] Job [${jobId}] failed: ${failedReason}`);
    });

    this.queueEvents.on('progress', ({ jobId, data }) => {
      this.logger.debug?.(`[QueueEvents] Job [${jobId}] progress:`, data);
    });

    this.queueEvents.on('stalled', ({ jobId }) => {
      this.logger.warn(`[QueueEvents] Job [${jobId}] stalled.`);
    });

    this.queueEvents.on('error', (err) => {
      this.logger.error('[QueueEvents] Error:', err);
    });
  }

  public getQueueEvents(): QueueEvents {
    return this.queueEvents;
  }

  public async close(): Promise<void> {
    await this.queueEvents.close();
  }
}
