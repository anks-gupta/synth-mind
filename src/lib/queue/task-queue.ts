/**
 * Re-exports production BullMQ + Redis abstractions from `@/queue`.
 */
export * from '@/queue';

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
