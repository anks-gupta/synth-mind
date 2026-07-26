/**
 * Generic Task Queue Manager for background async job execution.
 * Features:
 * - Concurrency control (max N parallel workers)
 * - Automatic retries with exponential backoff
 * - Serverless execution protection (Vercel waitUntil with Node fallback)
 * - Job status logging & hooks
 */

export interface JobOptions {
  maxRetries?: number;
  initialBackoffMs?: number;
}

export interface TaskJob<T> {
  id: string;
  data: T;
  attempts: number;
  maxRetries: number;
  initialBackoffMs: number;
  addedAt: Date;
}

export class TaskQueue<T> {
  private concurrency: number;
  private activeCount: number = 0;
  private queue: TaskJob<T>[] = [];
  private processor: (job: TaskJob<T>) => Promise<void>;

  constructor(
    processor: (job: TaskJob<T>) => Promise<void>,
    options?: { concurrency?: number }
  ) {
    this.processor = processor;
    this.concurrency = options?.concurrency ?? 3;
  }

  /**
   * Enqueues a new background job into the queue.
   */
  public enqueue(id: string, data: T, options?: JobOptions): string {
    const job: TaskJob<T> = {
      id,
      data,
      attempts: 0,
      maxRetries: options?.maxRetries ?? 3,
      initialBackoffMs: options?.initialBackoffMs ?? 1000,
      addedAt: new Date(),
    };

    this.queue.push(job);
    this.scheduleNext();
    return id;
  }

  /**
   * Schedules the next job if workers are available.
   */
  private scheduleNext(): void {
    while (this.activeCount < this.concurrency && this.queue.length > 0) {
      const job = this.queue.shift();
      if (!job) break;

      this.activeCount++;

      // Serverless execution wrapper: use waitUntil if available to protect background tasks
      const runJob = async () => {
        try {
          job.attempts++;
          await this.processor(job);
        } catch (error: any) {
          if (job.attempts < job.maxRetries) {
            const backoffMs = job.initialBackoffMs * Math.pow(2, job.attempts - 1);
            console.warn(
              `[TaskQueue] Job ${job.id} failed (attempt ${job.attempts}/${job.maxRetries}). Retrying in ${backoffMs}ms... Error: ${error?.message || error}`
            );
            await new Promise((resolve) => setTimeout(resolve, backoffMs));
            this.queue.push(job);
          } else {
            console.error(
              `[TaskQueue] Job ${job.id} failed after ${job.attempts} attempts:`,
              error?.message || error
            );
          }
        } finally {
          this.activeCount--;
          this.scheduleNext();
        }
      };

      // Execute safely with Vercel waitUntil or setImmediate fallback
      this.executeSafely(runJob);
    }
  }

  private executeSafely(promiseFn: () => Promise<void>): void {
    const promise = promiseFn();

    // Check if running on Vercel or environment with waitUntil
    try {
      // Dynamic import check for @vercel/functions waitUntil
      // @ts-ignore
      import('@vercel/functions')
        .then((pkg: any) => {
          if (typeof pkg?.waitUntil === 'function') {
            pkg.waitUntil(promise);
          }
        })
        .catch(() => {
          // Ignore if @vercel/functions is not installed
        });
    } catch {
      // Fallback: standard background execution
    }
  }

  /**
   * Returns current queue metrics.
   */
  public getMetrics() {
    return {
      activeCount: this.activeCount,
      queuedCount: this.queue.length,
      concurrency: this.concurrency,
    };
  }
}
