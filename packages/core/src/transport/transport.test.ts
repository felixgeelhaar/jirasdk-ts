import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  createHttpClient,
  createUserAgentMiddleware,
  createRequestIdMiddleware,
  composeMiddleware,
} from './index.js';
import type { MiddlewareContext, MiddlewareNext, HttpResponse, Middleware } from './index.js';
import { ApiTokenAuth } from '../auth/index.js';

// Create a more complete fetch mock
function createMockResponse(options: {
  status?: number;
  data?: unknown;
  headers?: Record<string, string>;
}) {
  const { status = 200, data = {}, headers = { 'content-type': 'application/json' } } = options;
  const headersObj = new Headers(headers);

  return {
    ok: status >= 200 && status < 300,
    status,
    headers: headersObj,
    text: vi.fn().mockResolvedValue(JSON.stringify(data)),
    json: vi.fn().mockResolvedValue(data),
    clone: vi.fn().mockReturnThis(),
  };
}

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('HttpClient', () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  it('should make a GET request', async () => {
    mockFetch.mockResolvedValueOnce(
      createMockResponse({
        status: 200,
        data: { id: 1, name: 'Test' },
      })
    );

    const client = createHttpClient({
      baseUrl: 'https://api.example.com',
    });

    const response = await client.get('/test');

    expect(response.status).toBe(200);
    expect(response.data).toEqual({ id: 1, name: 'Test' });
    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.example.com/test',
      expect.objectContaining({ method: 'GET' })
    );
  });

  it('should make a POST request with body', async () => {
    mockFetch.mockResolvedValueOnce(
      createMockResponse({
        status: 201,
        data: { id: 1 },
      })
    );

    const client = createHttpClient({
      baseUrl: 'https://api.example.com',
    });

    const response = await client.post('/test', { name: 'Test' });

    expect(response.status).toBe(201);
    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.example.com/test',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ name: 'Test' }),
      })
    );
  });

  it('should include auth header when auth provided', async () => {
    mockFetch.mockResolvedValueOnce(
      createMockResponse({
        status: 200,
        data: {},
      })
    );

    const auth = new ApiTokenAuth({
      email: 'test@example.com',
      apiToken: 'token',
    });

    const client = createHttpClient({
      baseUrl: 'https://api.example.com',
      auth,
    });

    await client.get('/test');

    expect(mockFetch).toHaveBeenCalledWith('https://api.example.com/test', expect.anything());

    // Headers are passed as a Headers object, extract and check
    const fetchCall = mockFetch.mock.calls[0];
    const options = fetchCall[1] as RequestInit;
    const headers = options.headers as Headers;
    expect(headers.get('Authorization')).toMatch(/^Basic /);
  });

  it('should add query params to URL', async () => {
    mockFetch.mockResolvedValueOnce(
      createMockResponse({
        status: 200,
        data: {},
      })
    );

    const client = createHttpClient({
      baseUrl: 'https://api.example.com',
    });

    await client.get('/test', { foo: 'bar', baz: 123 });

    const calledUrl = mockFetch.mock.calls[0][0] as string;
    expect(calledUrl).toContain('foo=bar');
    expect(calledUrl).toContain('baz=123');
  });
});

describe('createUserAgentMiddleware', () => {
  it('should add user agent header', async () => {
    const middleware = createUserAgentMiddleware({
      sdkName: 'test-sdk',
      sdkVersion: '1.0.0',
    });

    const context: MiddlewareContext = {
      request: {
        url: '/test',
        method: 'GET',
        headers: {},
      },
    };

    const next: MiddlewareNext = async () => ({
      status: 200,
      headers: {},
      data: {},
    });

    await middleware(context, next);

    expect(context.request.headers?.['User-Agent']).toContain('test-sdk/1.0.0');
  });

  it('should include suffix if provided', async () => {
    const middleware = createUserAgentMiddleware({
      sdkName: 'test-sdk',
      sdkVersion: '1.0.0',
      suffix: 'custom-suffix',
    });

    const context: MiddlewareContext = {
      request: {
        url: '/test',
        method: 'GET',
        headers: {},
      },
    };

    const next: MiddlewareNext = async () => ({
      status: 200,
      headers: {},
      data: {},
    });

    await middleware(context, next);

    expect(context.request.headers?.['User-Agent']).toContain('custom-suffix');
  });
});

describe('createRequestIdMiddleware', () => {
  it('should add request ID header', async () => {
    const middleware = createRequestIdMiddleware();

    const context: MiddlewareContext = {
      request: {
        url: '/test',
        method: 'GET',
        headers: {},
      },
    };

    const next: MiddlewareNext = async () => ({
      status: 200,
      headers: {},
      data: {},
    });

    await middleware(context, next);

    // Check for any request ID header (could be X-Request-Id or X-Request-ID)
    const headers = context.request.headers ?? {};
    const hasRequestId = Object.keys(headers).some((key) =>
      key.toLowerCase().includes('request-id')
    );
    expect(hasRequestId).toBe(true);
  });
});

describe('composeMiddleware', () => {
  it('should compose multiple middleware', async () => {
    const order: string[] = [];

    const middleware1: Middleware = async (ctx, next) => {
      order.push('m1-before');
      const response = await next(ctx);
      order.push('m1-after');
      return response;
    };

    const middleware2: Middleware = async (ctx, next) => {
      order.push('m2-before');
      const response = await next(ctx);
      order.push('m2-after');
      return response;
    };

    const composed = composeMiddleware(middleware1, middleware2);

    const context: MiddlewareContext = {
      request: { url: '/test', method: 'GET', headers: {} },
    };

    const next: MiddlewareNext = async () => {
      order.push('next');
      return { status: 200, headers: {}, data: {} };
    };

    await composed(context, next);

    expect(order).toEqual(['m1-before', 'm2-before', 'next', 'm2-after', 'm1-after']);
  });
});
