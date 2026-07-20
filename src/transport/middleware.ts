import type { Middleware, MiddlewareContext, MiddlewareNext, HttpResponse } from './types.js';
import { RateLimitError, ServerError, ApiError } from '../errors/api.error.js';
import { NetworkError } from '../errors/network.error.js';
import { sleep, exponentialBackoff } from '../utils/index.js';

/**
 * Logging middleware configuration
 */
export interface LoggingMiddlewareConfig {
  /**
   * Log request details
   */
  logRequests?: boolean;

  /**
   * Log response details
   */
  logResponses?: boolean;

  /**
   * Log errors
   */
  logErrors?: boolean;

  /**
   * Redact sensitive headers (authorization, etc.)
   */
  redactHeaders?: string[];
}

/**
 * Create a logging middleware
 *
 * @example
 * ```typescript
 * const client = new HttpClient({
 *   baseUrl: '...',
 *   middleware: [
 *     createLoggingMiddleware({ logRequests: true, logResponses: true }),
 *   ],
 * });
 * ```
 */
export function createLoggingMiddleware(config: LoggingMiddlewareConfig = {}): Middleware {
  const {
    logRequests = true,
    logResponses = true,
    logErrors = true,
    redactHeaders = ['authorization', 'x-api-key'],
  } = config;

  const redactHeadersLower = redactHeaders.map((h) => h.toLowerCase());

  return async (context: MiddlewareContext, next: MiddlewareNext): Promise<HttpResponse> => {
    const { request, logger } = context;

    if (logRequests) {
      const headers = { ...request.headers };
      for (const key of Object.keys(headers)) {
        if (redactHeadersLower.includes(key.toLowerCase())) {
          headers[key] = '[REDACTED]';
        }
      }

      logger.debug('HTTP Request', {
        method: request.method,
        url: request.url,
        headers,
        params: request.params,
      });
    }

    try {
      const response = await next(context);

      if (logResponses) {
        logger.debug('HTTP Response', {
          status: response.status,
          statusText: response.statusText,
          responseTime: response.responseTime,
        });
      }

      return response;
    } catch (error) {
      if (logErrors) {
        logger.error('HTTP Error', {
          method: request.method,
          url: request.url,
          error: error instanceof Error ? error.message : String(error),
        });
      }
      throw error;
    }
  };
}

/**
 * Retry middleware configuration
 */
export interface RetryMiddlewareConfig {
  /**
   * Maximum number of retries (default: 3)
   */
  maxRetries?: number;

  /**
   * Initial delay in ms (default: 1000)
   */
  initialDelayMs?: number;

  /**
   * Maximum delay in ms (default: 30000)
   */
  maxDelayMs?: number;

  /**
   * Backoff multiplier (default: 2)
   */
  multiplier?: number;

  /**
   * Add random jitter (default: true)
   */
  jitter?: boolean;

  /**
   * Custom retry condition
   */
  shouldRetry?: (error: unknown, context: MiddlewareContext) => boolean;
}

/**
 * Default retry condition
 */
function defaultShouldRetry(error: unknown): boolean {
  // Retry on rate limit errors
  if (error instanceof RateLimitError) {
    return true;
  }

  // Retry on 5xx errors
  if (error instanceof ServerError) {
    return true;
  }

  // Retry on network errors
  if (error instanceof NetworkError) {
    return true;
  }

  // Don't retry on other API errors (4xx except 429)
  if (error instanceof ApiError) {
    return false;
  }

  return false;
}

/**
 * Create a retry middleware with exponential backoff
 *
 * @example
 * ```typescript
 * const client = new HttpClient({
 *   baseUrl: '...',
 *   middleware: [
 *     createRetryMiddleware({ maxRetries: 3 }),
 *   ],
 * });
 * ```
 */
export function createRetryMiddleware(config: RetryMiddlewareConfig = {}): Middleware {
  const {
    maxRetries = 3,
    initialDelayMs = 1000,
    maxDelayMs = 30000,
    multiplier = 2,
    jitter = true,
    shouldRetry = defaultShouldRetry,
  } = config;

  return async (context: MiddlewareContext, next: MiddlewareNext): Promise<HttpResponse> => {
    let lastError: unknown;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        context.retryCount = attempt;
        return await next(context);
      } catch (error) {
        lastError = error;

        // Check if we should retry
        if (attempt >= maxRetries || !shouldRetry(error, context)) {
          throw error;
        }

        // Calculate delay
        let delayMs: number;

        // Use Retry-After header if available
        if (error instanceof RateLimitError && error.retryAfter) {
          delayMs = error.retryAfter;
        } else {
          delayMs = exponentialBackoff(attempt, initialDelayMs, maxDelayMs, multiplier, jitter);
        }

        context.logger.debug('Retrying request', {
          attempt: attempt + 1,
          maxRetries,
          delayMs,
          error: error instanceof Error ? error.message : String(error),
        });

        await sleep(delayMs);
      }
    }

    throw lastError;
  };
}

/**
 * Rate limit middleware configuration
 */
export interface RateLimitMiddlewareConfig {
  /**
   * Maximum requests per window
   */
  maxRequests: number;

  /**
   * Window duration in ms
   */
  windowMs: number;

  /**
   * Wait for slot instead of throwing error
   */
  waitForSlot?: boolean;
}

/**
 * Create a client-side rate limiting middleware
 *
 * @example
 * ```typescript
 * const client = new HttpClient({
 *   baseUrl: '...',
 *   middleware: [
 *     createRateLimitMiddleware({ maxRequests: 100, windowMs: 60000 }),
 *   ],
 * });
 * ```
 */
export function createRateLimitMiddleware(config: RateLimitMiddlewareConfig): Middleware {
  const { maxRequests, windowMs, waitForSlot = true } = config;
  const timestamps: number[] = [];

  return async (context: MiddlewareContext, next: MiddlewareNext): Promise<HttpResponse> => {
    const now = Date.now();

    // Remove old timestamps outside the window
    while (timestamps.length > 0 && timestamps[0]! < now - windowMs) {
      timestamps.shift();
    }

    // Check if we're at the limit
    if (timestamps.length >= maxRequests) {
      if (waitForSlot) {
        const oldestTimestamp = timestamps[0]!;
        const waitTime = oldestTimestamp + windowMs - now;

        if (waitTime > 0) {
          context.logger.debug('Rate limit reached, waiting', { waitTime });
          await sleep(waitTime);
        }

        // Remove the oldest after waiting
        timestamps.shift();
      } else {
        throw new RateLimitError('Client-side rate limit exceeded', undefined, {
          retryAfter: timestamps[0]! + windowMs - now,
        });
      }
    }

    timestamps.push(now);
    return next(context);
  };
}

/**
 * Request ID middleware - adds a unique ID to each request
 */
export function createRequestIdMiddleware(headerName = 'X-Request-ID'): Middleware {
  return async (context: MiddlewareContext, next: MiddlewareNext): Promise<HttpResponse> => {
    const requestId = generateRequestId();
    context.request.headers = {
      ...context.request.headers,
      [headerName]: requestId,
    };
    context.requestId = requestId;
    return next(context);
  };
}

/**
 * Generate a unique request ID
 */
function generateRequestId(): string {
  // Use crypto.randomUUID if available
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }

  // Fallback for older environments
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 11)}`;
}

/**
 * User-Agent middleware configuration
 */
export interface UserAgentMiddlewareConfig {
  /**
   * SDK name
   */
  sdkName: string;

  /**
   * SDK version
   */
  sdkVersion: string;

  /**
   * Additional user agent suffix
   */
  suffix?: string;
}

/**
 * Create a User-Agent middleware
 */
export function createUserAgentMiddleware(config: UserAgentMiddlewareConfig): Middleware {
  const { sdkName, sdkVersion, suffix } = config;
  let userAgent = `${sdkName}/${sdkVersion}`;

  // Add runtime info
  if (typeof process !== 'undefined' && process.version) {
    userAgent += ` Node.js/${process.version.slice(1)}`;
  } else if (typeof navigator !== 'undefined') {
    userAgent += ' Browser';
  }

  if (suffix) {
    userAgent += ` ${suffix}`;
  }

  return async (context: MiddlewareContext, next: MiddlewareNext): Promise<HttpResponse> => {
    context.request.headers = {
      ...context.request.headers,
      'User-Agent': userAgent,
    };
    return next(context);
  };
}

/**
 * Compose multiple middleware into a single middleware
 */
export function composeMiddleware(...middlewares: Middleware[]): Middleware {
  return async (context: MiddlewareContext, next: MiddlewareNext): Promise<HttpResponse> => {
    // Build chain from right to left
    const chain = middlewares.reduceRight<MiddlewareNext>((nextFn, middleware) => {
      return async (ctx) => middleware(ctx, nextFn);
    }, next);

    return chain(context);
  };
}
