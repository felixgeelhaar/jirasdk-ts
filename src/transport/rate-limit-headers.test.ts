import { describe, it, expect, vi } from 'vitest';
import {
  parseBetaRateLimitPolicy,
  parseBetaRateLimit,
  parseRetryAfterSeconds,
  readRateLimitHeaders,
  createRateLimitHeaderMiddleware,
} from './rate-limit-headers.js';
import type { HttpResponse, MiddlewareContext } from './types.js';

describe('parseBetaRateLimitPolicy', () => {
  it('parses a limit and window', () => {
    expect(parseBetaRateLimitPolicy('100;w=60')).toEqual({ limit: 100, windowSeconds: 60 });
  });

  it('tolerates surrounding whitespace', () => {
    expect(parseBetaRateLimitPolicy(' 250 ; w=30 ')).toEqual({ limit: 250, windowSeconds: 30 });
  });

  it('defaults the window to 0 when the w parameter is absent', () => {
    expect(parseBetaRateLimitPolicy('100')).toEqual({ limit: 100, windowSeconds: 0 });
  });

  it('ignores unknown parameters', () => {
    expect(parseBetaRateLimitPolicy('100;x=5;w=60')).toEqual({ limit: 100, windowSeconds: 60 });
  });

  it.each([undefined, null, '', 'not-a-number', ';w=60'])('returns undefined for %p', (input) => {
    expect(parseBetaRateLimitPolicy(input)).toBeUndefined();
  });
});

describe('parseBetaRateLimit', () => {
  it('extracts the remaining points', () => {
    expect(parseBetaRateLimit('r=85;policy="100;w=60"')).toBe(85);
  });

  it('handles zero remaining', () => {
    expect(parseBetaRateLimit('r=0')).toBe(0);
  });

  it('finds r regardless of position', () => {
    expect(parseBetaRateLimit('policy="100;w=60";r=12')).toBe(12);
  });

  it.each([undefined, null, '', 'policy="100;w=60"', 'r=abc'])(
    'returns undefined for %p',
    (input) => {
      expect(parseBetaRateLimit(input)).toBeUndefined();
    }
  );
});

describe('parseRetryAfterSeconds', () => {
  it('parses integer seconds', () => {
    expect(parseRetryAfterSeconds('120')).toBe(120);
  });

  it('parses an HTTP-date relative to now', () => {
    const now = Date.parse('2026-01-01T00:00:00Z');
    expect(parseRetryAfterSeconds('Thu, 01 Jan 2026 00:00:30 GMT', now)).toBe(30);
  });

  it('clamps a past HTTP-date to zero', () => {
    const now = Date.parse('2026-01-01T00:01:00Z');
    expect(parseRetryAfterSeconds('Thu, 01 Jan 2026 00:00:00 GMT', now)).toBe(0);
  });

  it.each([undefined, null, '', 'soon'])('returns undefined for %p', (input) => {
    expect(parseRetryAfterSeconds(input)).toBeUndefined();
  });
});

describe('readRateLimitHeaders', () => {
  it('reads every signal when all are present', () => {
    const headers = new Headers({
      'X-RateLimit-Remaining': '42',
      'Retry-After': '5',
      'Beta-RateLimit-Policy': '100;w=60',
      'Beta-RateLimit': 'r=85;policy="100;w=60"',
    });

    expect(readRateLimitHeaders(headers)).toEqual({
      remainingRequests: 42,
      retryAfterSeconds: 5,
      policy: { limit: 100, windowSeconds: 60 },
      remainingPoints: 85,
    });
  });

  it('returns an empty snapshot when no rate-limit headers are present', () => {
    expect(readRateLimitHeaders(new Headers({ 'Content-Type': 'application/json' }))).toEqual({});
  });

  it('omits fields whose headers are malformed', () => {
    const headers = new Headers({
      'X-RateLimit-Remaining': 'lots',
      'Beta-RateLimit-Policy': '100;w=60',
    });

    expect(readRateLimitHeaders(headers)).toEqual({ policy: { limit: 100, windowSeconds: 60 } });
  });
});

describe('createRateLimitHeaderMiddleware', () => {
  const respondWith = (headers: Headers): HttpResponse => ({
    status: 200,
    statusText: 'OK',
    headers,
    data: {},
    request: { url: 'https://example.atlassian.net/rest/api/3/myself', method: 'GET' },
    responseTime: 1,
  });

  const ctx = (): MiddlewareContext => ({
    request: { url: 'https://example.atlassian.net/rest/api/3/myself', method: 'GET' },
    logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
    retryCount: 0,
  });

  it('invokes the callback with the parsed snapshot', async () => {
    const onRateLimit = vi.fn();
    const middleware = createRateLimitHeaderMiddleware({ onRateLimit });
    const headers = new Headers({ 'Beta-RateLimit': 'r=7;policy="100;w=60"' });

    await middleware(ctx(), () => Promise.resolve(respondWith(headers)));

    expect(onRateLimit).toHaveBeenCalledWith({ remainingPoints: 7 });
  });

  it('does not invoke the callback when no headers are present', async () => {
    const onRateLimit = vi.fn();
    const middleware = createRateLimitHeaderMiddleware({ onRateLimit });

    await middleware(ctx(), () => Promise.resolve(respondWith(new Headers())));

    expect(onRateLimit).not.toHaveBeenCalled();
  });

  it('swallows callback errors so observability cannot fail a request', async () => {
    const middleware = createRateLimitHeaderMiddleware({
      onRateLimit: () => {
        throw new Error('metrics backend down');
      },
    });
    const headers = new Headers({ 'Beta-RateLimit': 'r=7' });

    const response = await middleware(ctx(), () => Promise.resolve(respondWith(headers)));

    expect(response.status).toBe(200);
  });

  it('passes the response through unchanged', async () => {
    const middleware = createRateLimitHeaderMiddleware({ onRateLimit: vi.fn() });
    const expected = respondWith(new Headers({ 'X-RateLimit-Remaining': '3' }));

    await expect(middleware(ctx(), () => Promise.resolve(expected))).resolves.toBe(expected);
  });
});
