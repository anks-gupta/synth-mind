/**
 * Utility for retrying OpenAI API calls with exponential backoff on transient errors (500, 502, 503, 504, 429, service_auth_failure).
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  initialDelayMs: number = 600
): Promise<T> {
  let attempt = 0;
  while (true) {
    try {
      return await fn();
    } catch (error: any) {
      attempt++;
      const status = error?.status || error?.response?.status;
      const isTransient =
        status === 500 ||
        status === 502 ||
        status === 503 ||
        status === 504 ||
        status === 429 ||
        error?.message?.includes('500') ||
        error?.message?.includes('service_auth_failure') ||
        error?.message?.includes('server error') ||
        error?.message?.includes('rate limit') ||
        error?.code === 'ETIMEDOUT' ||
        error?.code === 'ECONNRESET';

      if (attempt >= maxRetries || !isTransient) {
        throw error;
      }

      const delay = initialDelayMs * Math.pow(2, attempt - 1);
      console.warn(
        `[OpenAI Transient Error] Attempt ${attempt}/${maxRetries} failed with status ${status || 'unknown'}: "${
          error?.message
        }". Retrying in ${delay}ms...`
      );
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
}
