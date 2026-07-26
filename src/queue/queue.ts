import { Queue, JobsOptions, QueueOptions } from 'bullmq';
import { getRedisConfig } from './redis';
import { DefaultLogger, ILogger } from './logger';

export interface BaseJobOptions {
  priority?: number;
  delayMs?: number;
  maxRetries?: number;
  initialBackoffMs?: number;
  timeoutMs?: number;
}

export interface QueueMetrics {
  waitingCount: number;
  activeCount: number;
  completedCount: number;
  failedCount: number;
  delayedCount: number;
}

/**
 * Generic Production-Ready Queue Wrapper encapsulating BullMQ Queue.
 */
export class BaseQueue<TData = unknown, TResult = unknown> {
  public readonly queueName: string;
  private bullQueue: Queue<TData, TResult>;
  private logger: ILogger;

  constructor(queueName: string, options?: Partial<QueueOptions>, customLogger?: ILogger) {
    this.queueName = queueName;
    this.logger = customLogger || new DefaultLogger(`[Queue:${queueName}]`);

    const redisConfig = getRedisConfig();

    this.bullQueue = new Queue<TData, TResult>(queueName, {
      connection: redisConfig,
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 1000,
        },
        removeOnComplete: {
          count: 50, // Keep last 50 completed jobs
          age: 3600, // 1 hour retention
        },
        removeOnFail: {
          count: 100, // Keep last 100 failed jobs for inspection
        },
      },
      ...options,
    });

    this.bullQueue.on('error', (error) => {
      this.logger.error('Queue Error:', error);
    });
  }

  /**
   * Adds/Enqueues a new typed background job into the BullMQ queue.
   */
  public async enqueue(
    jobId: string,
    data: TData,
    options?: BaseJobOptions
  ): Promise<string> {
    const jobOptions: JobsOptions = {
      jobId, // Unique ID for deduplication
      priority: options?.priority,
      delay: options?.delayMs,
    };

    if (options?.maxRetries !== undefined) {
      jobOptions.attempts = options.maxRetries;
    }

    if (options?.initialBackoffMs !== undefined) {
      jobOptions.backoff = {
        type: 'exponential',
        delay: options.initialBackoffMs,
      };
    }

    const job = await this.bullQueue.add(this.queueName as any, data as any, jobOptions);
    this.logger.info(`Enqueued job [${job.id}] into queue '${this.queueName}'`);
    return job.id || jobId;
  }

  /**
   * Returns current real-time queue metrics.
   */
  public async getMetrics(): Promise<QueueMetrics> {
    const [waitingCount, activeCount, completedCount, failedCount, delayedCount] =
      await Promise.all([
        this.bullQueue.getWaitingCount(),
        this.bullQueue.getActiveCount(),
        this.bullQueue.getCompletedCount(),
        this.bullQueue.getFailedCount(),
        this.bullQueue.getDelayedCount(),
      ]);

    return {
      waitingCount,
      activeCount,
      completedCount,
      failedCount,
      delayedCount,
    };
  }

  /**
   * Returns underlying BullMQ instance for Bull Board dashboard integration.
   */
  public getBullQueue(): Queue<TData, TResult> {
    return this.bullQueue;
  }

  /**
   * Gracefully closes the queue connection.
   */
  public async close(): Promise<void> {
    this.logger.info(`Closing queue '${this.queueName}'...`);
    await this.bullQueue.close();
    this.logger.info(`Queue '${this.queueName}' closed.`);
  }
}
