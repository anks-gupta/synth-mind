import { Worker, Job, WorkerOptions } from 'bullmq';
import { getRedisConfig } from './redis';
import { DefaultLogger, ILogger } from './logger';

export type JobProcessor<TData = unknown, TResult = unknown> = (
  job: Job<TData, TResult>
) => Promise<TResult>;

export interface WorkerConfig {
  concurrency?: number;
  lockDurationMs?: number;
  maxStalledCount?: number;
}

/**
 * Generic Production Worker Wrapper encapsulating BullMQ Worker.
 * Features:
 * - High concurrency support
 * - Long-running job locks (for AI parsing, PDF processing, OCR, embeddings)
 * - Progress tracking & events
 * - Graceful shutdown handling on SIGTERM / SIGINT
 */
export class BaseWorker<TData = unknown, TResult = unknown> {
  public readonly queueName: string;
  private worker: Worker<TData, TResult>;
  private logger: ILogger;

  constructor(
    queueName: string,
    processor: JobProcessor<TData, TResult>,
    config?: WorkerConfig,
    options?: Partial<WorkerOptions>,
    customLogger?: ILogger
  ) {
    this.queueName = queueName;
    this.logger = customLogger || new DefaultLogger(`[Worker:${queueName}]`);

    const redisConfig = getRedisConfig();

    this.worker = new Worker<TData, TResult>(
      queueName,
      async (job) => {
        this.logger.info(`Starting job [${job.id}] (Attempt ${job.attemptsMade + 1})`);
        const startTime = Date.now();
        try {
          const result = await processor(job);
          const duration = Date.now() - startTime;
          this.logger.info(`Completed job [${job.id}] in ${duration}ms`);
          return result;
        } catch (error: any) {
          const duration = Date.now() - startTime;
          this.logger.error(`Job [${job.id}] failed after ${duration}ms:`, error?.message || error);
          throw error;
        }
      },
      {
        connection: redisConfig,
        concurrency: config?.concurrency ?? 3,
        // Long lock duration for AI / PDF / Embedding / OCR processing (5 minutes default)
        lockDuration: config?.lockDurationMs ?? 300000,
        maxStalledCount: config?.maxStalledCount ?? 2,
        ...options,
      }
    );

    this.setupListeners();
    this.setupGracefulShutdown();
  }

  private setupListeners(): void {
    this.worker.on('active', (job) => {
      this.logger.debug?.(`Job [${job.id}] is now active.`);
    });

    this.worker.on('progress', (job, progress) => {
      this.logger.info(`Job [${job.id}] progress: ${progress}%`);
    });

    this.worker.on('completed', (job) => {
      this.logger.info(`Job [${job.id}] has completed successfully.`);
    });

    this.worker.on('failed', (job, err) => {
      if (job) {
        this.logger.error(
          `Job [${job.id}] failed (Attempt ${job.attemptsMade}/${job.opts.attempts}). Reason: ${err.message}`
        );
      } else {
        this.logger.error('Worker job failed with error:', err.message);
      }
    });

    this.worker.on('error', (err) => {
      this.logger.error('Worker internal error:', err.message);
    });
  }

  private setupGracefulShutdown(): void {
    const shutdown = async (signal: string) => {
      this.logger.info(`Received ${signal}. Gracefully stopping worker for '${this.queueName}'...`);
      try {
        await this.worker.close();
        this.logger.info(`Worker for '${this.queueName}' closed cleanly.`);
      } catch (err: any) {
        this.logger.error(`Error closing worker for '${this.queueName}':`, err?.message || err);
      }
    };

    process.once('SIGTERM', () => shutdown('SIGTERM'));
    process.once('SIGINT', () => shutdown('SIGINT'));
  }

  /**
   * Returns underlying BullMQ Worker instance.
   */
  public getBullWorker(): Worker<TData, TResult> {
    return this.worker;
  }

  /**
   * Closes the worker.
   */
  public async close(): Promise<void> {
    await this.worker.close();
  }
}
