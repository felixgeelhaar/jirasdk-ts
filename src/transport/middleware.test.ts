import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  createLoggingMiddleware,
  createRetryMiddleware,
  createRateLimitMiddleware,
} from './middleware.js';
import type { MiddlewareContext, MiddlewareNext, HttpResponse, Logger } from './types.js';
import { RateLimitError, ServerError, ApiError, NotFoundError } from '../errors/api.error.js';
import { NetworkError } from '../errors/network.error.js';

// Helper to create mock logger
function createMockLogger(): Logger {
  return {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  };
}

// Helper to create mock context
function createMockContext(overrides?: Partial<MiddlewareContext>): MiddlewareContext {
  return {
    request: {
      url: '/test',
      method: 'GET',
      headers: {},
    },
    logger: createMockLogger(),
    ...overrides,
  };
}

// Helper to create mock response
function createMockResponse(overrides?: Partial<HttpResponse>): HttpResponse {
  return {
    status: 200,
    statusText: 'OK',
    headers: new Headers(),
    data: {},
    responseTime: 100,
    ...overrides,
  };
}

describe('createLoggingMiddleware', () => {
  it('should log request details', async () => {
    const middleware = createLoggingMiddleware({ logRequests: true });
    const context = createMockContext({
      request: {
        url: '/api/test',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        params: { id: '123' },
      },
    });

    const next: MiddlewareNext = vi.fn().mockResolvedValue(createMockResponse());

    await middleware(context, next);

    expect(context.logger?.debug).toHaveBeenCalledWith(
      'HTTP Request',
      expect.objectContaining({
        method: 'POST',
        url: '/api/test',
        params: { id: '123' },
      })
    );
  });

  it('should log response details', async () => {
    const middleware = createLoggingMiddleware({ logResponses: true });
    const context = createMockContext();

    const mockResponse = createMockResponse({
      status: 201,
      statusText: 'Created',
      responseTime: 150,
    });
    const next: MiddlewareNext = vi.fn().mockResolvedValue(mockResponse);

    await middleware(context, next);

    expect(context.logger?.debug).toHaveBeenCalledWith(
      'HTTP Response',
      expect.objectContaining({
        status: 201,
        statusText: 'Created',
        responseTime: 150,
      })
    );
  });

  it('should log errors', async () => {
    const middleware = createLoggingMiddleware({ logErrors: true });
    const context = createMockContext();

    const error = new Error('Request failed');
    const next: MiddlewareNext = vi.fn().mockRejectedValue(error);

    await expect(middleware(context, next)).rejects.toThrow('Request failed');

    expect(context.logger?.error).toHaveBeenCalledWith(
      'HTTP Error',
      expect.objectContaining({
        method: 'GET',
        url: '/test',
        error: 'Request failed',
      })
    );
  });

  it('should redact authorization header by default', async () => {
    const middleware = createLoggingMiddleware({ logRequests: true });
    const context = createMockContext({
      request: {
        url: '/test',
        method: 'GET',
        headers: {
          Authorization: 'Bearer secret-token',
          'Content-Type': 'application/json',
        },
      },
    });

    const next: MiddlewareNext = vi.fn().mockResolvedValue(createMockResponse());

    await middleware(context, next);

    expect(context.logger?.debug).toHaveBeenCalledWith(
      'HTTP Request',
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: '[REDACTED]',
          'Content-Type': 'application/json',
        }),
      })
    );
  });

  it('should redact custom headers', async () => {
    const middleware = createLoggingMiddleware({
      logRequests: true,
      redactHeaders: ['x-secret-key'],
    });
    const context = createMockContext({
      request: {
        url: '/test',
        method: 'GET',
        headers: {
          'x-secret-key': 'super-secret',
          'Content-Type': 'application/json',
        },
      },
    });

    const next: MiddlewareNext = vi.fn().mockResolvedValue(createMockResponse());

    await middleware(context, next);

    expect(context.logger?.debug).toHaveBeenCalledWith(
      'HTTP Request',
      expect.objectContaining({
        headers: expect.objectContaining({
          'x-secret-key': '[REDACTED]',
        }),
      })
    );
  });

  it('should not log when disabled', async () => {
    const middleware = createLoggingMiddleware({
      logRequests: false,
      logResponses: false,
      logErrors: false,
    });
    const context = createMockContext();

    const next: MiddlewareNext = vi.fn().mockResolvedValue(createMockResponse());

    await middleware(context, next);

    expect(context.logger?.debug).not.toHaveBeenCalled();
  });

  it('should handle non-Error thrown values', async () => {
    const middleware = createLoggingMiddleware({ logErrors: true });
    const context = createMockContext();

    const next: MiddlewareNext = vi.fn().mockRejectedValue('string error');

    await expect(middleware(context, next)).rejects.toBe('string error');

    expect(context.logger?.error).toHaveBeenCalledWith(
      'HTTP Error',
      expect.objectContaining({
        error: 'string error',
      })
    );
  });
});

describe('createRetryMiddleware', () => {
  it('should succeed on first attempt without retries', async () => {
    const middleware = createRetryMiddleware({ maxRetries: 3 });
    const context = createMockContext();

    const next: MiddlewareNext = vi.fn().mockResolvedValue(createMockResponse());

    const response = await middleware(context, next);

    expect(response.status).toBe(200);
    expect(next).toHaveBeenCalledTimes(1);
    expect(context.retryCount).toBe(0);
  });

  it('should retry on RateLimitError', async () => {
    const middleware = createRetryMiddleware({
      maxRetries: 3,
      initialDelayMs: 1,
      maxDelayMs: 10,
    });
    const context = createMockContext();

    const next: MiddlewareNext = vi
      .fn()
      .mockRejectedValueOnce(new RateLimitError('Rate limited', undefined, { retryAfter: 1 }))
      .mockResolvedValue(createMockResponse());

    const response = await middleware(context, next);

    expect(response.status).toBe(200);
    expect(next).toHaveBeenCalledTimes(2);
  });

  it('should retry on ServerError', async () => {
    const middleware = createRetryMiddleware({
      maxRetries: 3,
      initialDelayMs: 1,
      maxDelayMs: 10,
    });
    const context = createMockContext();

    const next: MiddlewareNext = vi
      .fn()
      .mockRejectedValueOnce(new ServerError('Server error', 500))
      .mockResolvedValue(createMockResponse());

    const response = await middleware(context, next);

    expect(response.status).toBe(200);
    expect(next).toHaveBeenCalledTimes(2);
  });

  it('should retry on NetworkError', async () => {
    const middleware = createRetryMiddleware({
      maxRetries: 3,
      initialDelayMs: 1,
      maxDelayMs: 10,
    });
    const context = createMockContext();

    const next: MiddlewareNext = vi
      .fn()
      .mockRejectedValueOnce(new NetworkError('Connection refused'))
      .mockResolvedValue(createMockResponse());

    const response = await middleware(context, next);

    expect(response.status).toBe(200);
    expect(next).toHaveBeenCalledTimes(2);
  });

  it('should NOT retry on NotFoundError (4xx)', async () => {
    const middleware = createRetryMiddleware({
      maxRetries: 3,
      initialDelayMs: 1,
      maxDelayMs: 10,
    });
    const context = createMockContext();

    const next: MiddlewareNext = vi.fn().mockRejectedValue(new NotFoundError('Not found'));

    await expect(middleware(context, next)).rejects.toThrow('Not found');
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('should NOT retry on generic ApiError', async () => {
    const middleware = createRetryMiddleware({
      maxRetries: 3,
      initialDelayMs: 1,
      maxDelayMs: 10,
    });
    const context = createMockContext();

    const next: MiddlewareNext = vi.fn().mockRejectedValue(new ApiError('Bad request', 400));

    await expect(middleware(context, next)).rejects.toThrow('Bad request');
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('should throw after max retries exhausted', async () => {
    const middleware = createRetryMiddleware({
      maxRetries: 2,
      initialDelayMs: 1,
      maxDelayMs: 10,
    });
    const context = createMockContext();

    const next: MiddlewareNext = vi.fn().mockRejectedValue(new ServerError('Server error', 500));

    await expect(middleware(context, next)).rejects.toThrow('Server error');
    expect(next).toHaveBeenCalledTimes(3); // Initial + 2 retries
  });

  it('should use custom shouldRetry predicate', async () => {
    const shouldRetry = vi.fn().mockReturnValue(false);
    const middleware = createRetryMiddleware({
      maxRetries: 3,
      initialDelayMs: 1,
      maxDelayMs: 10,
      shouldRetry,
    });
    const context = createMockContext();

    const error = new ServerError('Server error', 500);
    const next: MiddlewareNext = vi.fn().mockRejectedValue(error);

    await expect(middleware(context, next)).rejects.toThrow('Server error');
    expect(next).toHaveBeenCalledTimes(1);
    expect(shouldRetry).toHaveBeenCalledWith(error, context);
  });

  it('should use Retry-After header when available', async () => {
    const middleware = createRetryMiddleware({
      maxRetries: 3,
      initialDelayMs: 1000, // Default is high
      maxDelayMs: 30000,
    });
    const context = createMockContext();

    // Rate limit error with short retry-after (1ms)
    const next: MiddlewareNext = vi
      .fn()
      .mockRejectedValueOnce(new RateLimitError('Rate limited', undefined, { retryAfter: 1 }))
      .mockResolvedValue(createMockResponse());

    const startTime = Date.now();
    await middleware(context, next);
    const elapsed = Date.now() - startTime;

    // Should be quick since retryAfter is 1ms, not initialDelayMs
    expect(elapsed).toBeLessThan(100);
    expect(next).toHaveBeenCalledTimes(2);
  });

  it('should set retryCount on context', async () => {
    const middleware = createRetryMiddleware({
      maxRetries: 3,
      initialDelayMs: 1,
      maxDelayMs: 10,
    });
    const context = createMockContext();

    const retryCounts: number[] = [];
    const next: MiddlewareNext = vi.fn().mockImplementation(async (ctx: MiddlewareContext) => {
      retryCounts.push(ctx.retryCount ?? -1);
      if (retryCounts.length < 3) {
        throw new ServerError('Server error', 500);
      }
      return createMockResponse();
    });

    await middleware(context, next);

    expect(retryCounts).toEqual([0, 1, 2]);
  });

  it('should log retry attempts', async () => {
    const middleware = createRetryMiddleware({
      maxRetries: 2,
      initialDelayMs: 1,
      maxDelayMs: 10,
    });
    const context = createMockContext();

    const next: MiddlewareNext = vi
      .fn()
      .mockRejectedValueOnce(new ServerError('Server error', 500))
      .mockResolvedValue(createMockResponse());

    await middleware(context, next);

    expect(context.logger?.debug).toHaveBeenCalledWith(
      'Retrying request',
      expect.objectContaining({
        attempt: 1,
        maxRetries: 2,
      })
    );
  });
});

describe('createRateLimitMiddleware', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should allow requests under limit', async () => {
    const middleware = createRateLimitMiddleware({
      maxRequests: 5,
      windowMs: 1000,
    });

    const context = createMockContext();
    const next: MiddlewareNext = vi.fn().mockResolvedValue(createMockResponse());

    // Should allow 5 requests
    for (let i = 0; i < 5; i++) {
      await middleware(context, next);
    }

    expect(next).toHaveBeenCalledTimes(5);
  });

  it('should wait for slot when rate limit reached (waitForSlot=true)', async () => {
    const middleware = createRateLimitMiddleware({
      maxRequests: 2,
      windowMs: 1000,
      waitForSlot: true,
    });

    const context = createMockContext();
    const next: MiddlewareNext = vi.fn().mockResolvedValue(createMockResponse());

    // Make 2 requests (fills the limit)
    await middleware(context, next);
    await middleware(context, next);

    // Third request should wait
    const thirdRequestPromise = middleware(context, next);

    // Advance time to allow the oldest request to expire
    await vi.advanceTimersByTimeAsync(1000);

    await thirdRequestPromise;

    expect(next).toHaveBeenCalledTimes(3);
    expect(context.logger?.debug).toHaveBeenCalledWith(
      'Rate limit reached, waiting',
      expect.any(Object)
    );
  });

  it('should throw when rate limit reached (waitForSlot=false)', async () => {
    const middleware = createRateLimitMiddleware({
      maxRequests: 2,
      windowMs: 1000,
      waitForSlot: false,
    });

    const context = createMockContext();
    const next: MiddlewareNext = vi.fn().mockResolvedValue(createMockResponse());

    // Make 2 requests (fills the limit)
    await middleware(context, next);
    await middleware(context, next);

    // Third request should throw
    await expect(middleware(context, next)).rejects.toThrow(RateLimitError);
    expect(next).toHaveBeenCalledTimes(2);
  });

  it('should include retryAfter in error when waitForSlot=false', async () => {
    const middleware = createRateLimitMiddleware({
      maxRequests: 1,
      windowMs: 1000,
      waitForSlot: false,
    });

    const context = createMockContext();
    const next: MiddlewareNext = vi.fn().mockResolvedValue(createMockResponse());

    await middleware(context, next);

    try {
      await middleware(context, next);
      expect.fail('Should have thrown');
    } catch (error) {
      expect(error).toBeInstanceOf(RateLimitError);
      expect((error as RateLimitError).retryAfter).toBeGreaterThan(0);
      expect((error as RateLimitError).retryAfter).toBeLessThanOrEqual(1000);
    }
  });

  it('should allow requests after window expires', async () => {
    const middleware = createRateLimitMiddleware({
      maxRequests: 2,
      windowMs: 1000,
      waitForSlot: false,
    });

    const context = createMockContext();
    const next: MiddlewareNext = vi.fn().mockResolvedValue(createMockResponse());

    // Fill the limit
    await middleware(context, next);
    await middleware(context, next);

    // Should throw now
    await expect(middleware(context, next)).rejects.toThrow(RateLimitError);

    // Advance past window
    await vi.advanceTimersByTimeAsync(1001);

    // Should allow again
    await middleware(context, next);
    expect(next).toHaveBeenCalledTimes(3);
  });

  it('should use sliding window', async () => {
    const middleware = createRateLimitMiddleware({
      maxRequests: 3,
      windowMs: 1000,
      waitForSlot: false,
    });

    const context = createMockContext();
    const next: MiddlewareNext = vi.fn().mockResolvedValue(createMockResponse());

    // Make request at t=0
    await middleware(context, next);

    // Advance 500ms and make 2 more
    await vi.advanceTimersByTimeAsync(500);
    await middleware(context, next);
    await middleware(context, next);

    // Should be at limit now
    await expect(middleware(context, next)).rejects.toThrow(RateLimitError);

    // Advance 501ms (first request is now outside window)
    await vi.advanceTimersByTimeAsync(501);

    // Should allow one more
    await middleware(context, next);
    expect(next).toHaveBeenCalledTimes(4);
  });
});
