import Redis, { RedisOptions } from 'ioredis';
import { DefaultLogger, ILogger } from './logger';

const logger: ILogger = new DefaultLogger('[Redis]');

/**
 * Returns Redis configuration parameters from environment variables.
 */
export function getRedisConfig(): RedisOptions {
  const rawUrl = process.env.REDIS_URL;
  const redisUrl = rawUrl ? rawUrl.replace(/^["']|["']$/g, '').trim() : undefined;

  if (redisUrl) {
    try {
      const parsed = new URL(redisUrl);
      const isTls = parsed.protocol === 'rediss:';
      const host = parsed.hostname;
      const port = parseInt(parsed.port || '6379', 10);
      const password = parsed.password ? decodeURIComponent(parsed.password) : undefined;
      const username = parsed.username ? decodeURIComponent(parsed.username) : undefined;

      return {
        host,
        port,
        password,
        username,
        tls: isTls ? { rejectUnauthorized: false } : undefined,
        maxRetriesPerRequest: null, // REQUIRED by BullMQ
        enableReadyCheck: false,
        reconnectOnError: (err) => {
          const targetErrors = ['READONLY', 'ETIMEDOUT', 'ECONNRESET'];
          if (targetErrors.some((e) => err.message.includes(e))) {
            logger.warn(`Redis connection error encountered (${err.message}). Forcing reconnect...`);
            return true;
          }
          return false;
        },
        retryStrategy: (times: number) => {
          const delay = Math.min(times * 500, 10000);
          return delay;
        },
      };
    } catch (err: any) {
      logger.error('Failed to parse REDIS_URL string:', err?.message || err);
    }
  }

  const host = process.env.REDIS_HOST || 'localhost';
  const port = parseInt(process.env.REDIS_PORT || '6379', 10);
  const password = process.env.REDIS_PASSWORD || undefined;
  const tls = process.env.REDIS_TLS === 'true' ? {} : undefined;

  return {
    host,
    port,
    password,
    tls,
    maxRetriesPerRequest: null, // REQUIRED by BullMQ
    enableReadyCheck: false,
    retryStrategy: (times: number) => {
      const delay = Math.min(times * 500, 10000);
      return delay;
    },
  };
}

let redisConnectionInstance: Redis | null = null;

/**
 * Creates or retrieves a shared Redis connection singleton instance.
 */
export function getRedisConnection(): Redis {
  if (!redisConnectionInstance) {
    const config = getRedisConfig();
    redisConnectionInstance = new Redis(config);

    redisConnectionInstance.on('connect', () => {
      logger.info('Successfully connected to Redis instance.');
    });

    redisConnectionInstance.on('error', (err) => {
      logger.error('Redis Client Error:', err?.message || err);
    });

    redisConnectionInstance.on('ready', () => {
      logger.info('Redis client ready for operations.');
    });
  }

  return redisConnectionInstance;
}

/**
 * Gracefully closes shared Redis connection.
 */
export async function closeRedisConnection(): Promise<void> {
  if (redisConnectionInstance) {
    logger.info('Closing Redis connection...');
    await redisConnectionInstance.quit().catch(() => {});
    redisConnectionInstance = null;
    logger.info('Redis connection closed.');
  }
}
