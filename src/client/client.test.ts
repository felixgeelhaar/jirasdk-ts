import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  JiraClient,
  createJiraClient,
  withApiVersion,
  withTimeout,
  withDebug,
  withRetry,
  withMiddleware,
  withLogger,
} from './client.js';
import { withResilience } from './resilience.js';
import { CircuitBreaker, type Middleware } from '../transport/index.js';
import type { Logger } from '../logging/index.js';
import { ApiTokenAuth } from '../auth/index.js';
import { ConfigValidationError } from '../errors/index.js';
import { TimeoutError } from '../errors/network.error.js';

// Mock fetch
const mockFetch = vi.fn<typeof fetch>();
global.fetch = mockFetch;

/** Build a JSON response with the standard content-type. */
function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

/** Make fetch resolve with a fresh clone of the same response every call. */
function respondWith(response: Response): void {
  mockFetch.mockImplementation(() => Promise.resolve(response.clone()));
}

/** A fetch that only settles once its signal aborts. */
function respondNever(): void {
  mockFetch.mockImplementation(
    (_input: RequestInfo | URL, init?: RequestInit) =>
      new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () => {
          const error = new Error('The operation was aborted.');
          error.name = 'AbortError';
          reject(error);
        });
      })
  );
}

/** URL of the nth fetch call. */
function calledUrl(index = 0): string {
  const call = mockFetch.mock.calls[index];
  expect(call).toBeDefined();
  return call![0] as string;
}

function createLogger(): Logger {
  return {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  };
}

/**
 * Every service accessor exposed by the client. The list is asserted against a
 * count so a newly added service cannot slip past this suite unnoticed.
 */
const SERVICE_ACCESSORS = [
  'issues',
  'projects',
  'search',
  'users',
  'agile',
  'fields',
  'issueTypes',
  'issueLinkTypes',
  'priorities',
  'resolutions',
  'screens',
  'workflows',
  'dashboards',
  'filters',
  'groups',
  'myself',
  'permissions',
  'securityLevels',
  'appProperties',
  'audit',
  'bulk',
  'expressions',
  'labels',
  'notifications',
  'serverInfo',
  'timeTracking',
  'webhooks',
] as const;

describe('JiraClient', () => {
  const validConfig = {
    host: 'https://example.atlassian.net',
    auth: new ApiTokenAuth({
      email: 'test@example.com',
      apiToken: 'test-token',
    }),
  };

  beforeEach(() => {
    mockFetch.mockReset();
    respondWith(jsonResponse({}));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('construction', () => {
    it('should create client with valid config', () => {
      const client = new JiraClient(validConfig);
      expect(client).toBeInstanceOf(JiraClient);
      expect(client.getHost()).toBe('https://example.atlassian.net');
    });

    it('should throw on invalid host', () => {
      expect(
        () =>
          new JiraClient({
            ...validConfig,
            host: 'not-a-url',
          })
      ).toThrow(ConfigValidationError);
    });

    it('should use default API version 3', () => {
      const client = new JiraClient(validConfig);
      expect(client.apiBasePath).toBe('/rest/api/3');
    });

    it('exposes the underlying HTTP client with the host as its base URL', () => {
      const client = new JiraClient(validConfig);
      expect(client.getHttpClient().getBaseUrl()).toBe('https://example.atlassian.net');
      expect(client.getHttpClient().getAuth()).toBe(validConfig.auth);
    });

    it('has no circuit breaker unless one is configured', () => {
      expect(new JiraClient(validConfig).circuitBreaker).toBeUndefined();
    });
  });

  describe('config validation', () => {
    it('rejects maxRetries above 10', () => {
      expect(() => new JiraClient({ ...validConfig, maxRetries: 11 })).toThrow(
        ConfigValidationError
      );
    });

    it('rejects negative maxRetries', () => {
      expect(() => new JiraClient({ ...validConfig, maxRetries: -1 })).toThrow(
        ConfigValidationError
      );
    });

    it('accepts maxRetries at the boundaries', () => {
      expect(() => new JiraClient({ ...validConfig, maxRetries: 0 })).not.toThrow();
      expect(() => new JiraClient({ ...validConfig, maxRetries: 10 })).not.toThrow();
    });

    it('rejects a non-positive timeout', () => {
      expect(() => new JiraClient({ ...validConfig, timeout: 0 })).toThrow(ConfigValidationError);
      expect(() => new JiraClient({ ...validConfig, timeout: -5 })).toThrow(ConfigValidationError);
    });

    it('rejects a non-integer timeout', () => {
      expect(() => new JiraClient({ ...validConfig, timeout: 1.5 })).toThrow(ConfigValidationError);
    });

    it('reports the offending field in the error message', () => {
      const error = ((): unknown => {
        try {
          new JiraClient({ ...validConfig, host: 'not-a-url' });
          return undefined;
        } catch (e) {
          return e;
        }
      })();

      expect(error).toBeInstanceOf(ConfigValidationError);
      expect((error as ConfigValidationError).message).toContain('host');
    });
  });

  describe('services', () => {
    it('covers every service accessor on the client', () => {
      expect(SERVICE_ACCESSORS).toHaveLength(27);
      expect(new Set(SERVICE_ACCESSORS).size).toBe(SERVICE_ACCESSORS.length);
    });

    it('resolves and memoises every service accessor', () => {
      const client = new JiraClient(validConfig);

      for (const name of SERVICE_ACCESSORS) {
        const first = client[name];
        const second = client[name];
        expect(first, `${name} should resolve`).toBeDefined();
        expect(second, `${name} should be memoised`).toBe(first);
      }
    });

    it('gives each accessor its own distinct instance', () => {
      const client = new JiraClient(validConfig);
      const instances = SERVICE_ACCESSORS.map((name) => client[name]);
      expect(new Set(instances).size).toBe(SERVICE_ACCESSORS.length);
    });

    it('does not share service instances between clients', () => {
      const a = new JiraClient(validConfig);
      const b = new JiraClient(validConfig);
      expect(a.issues).not.toBe(b.issues);
    });
  });

  describe('base paths', () => {
    it('routes API services through /rest/api/{version}', async () => {
      const client = new JiraClient(validConfig);

      await client.issues.deleteIssue('TEST-1');

      expect(calledUrl()).toContain('https://example.atlassian.net/rest/api/3/issue/TEST-1');
    });

    it('routes agile through /rest/agile/1.0 rather than the versioned API path', async () => {
      const client = new JiraClient(validConfig);

      expect(client.agileApiBasePath).toBe('/rest/agile/1.0');

      await client.agile.deleteBoard(42);

      expect(calledUrl()).toContain('https://example.atlassian.net/rest/agile/1.0/board/42');
      expect(calledUrl()).not.toContain('/rest/api/');
    });

    it('agile keeps its own base path even when apiVersion is 2', async () => {
      const client = new JiraClient(validConfig, withApiVersion('2'));

      await client.agile.deleteBoard(7);

      expect(calledUrl()).toContain('/rest/agile/1.0/board/7');
    });
  });

  describe('functional options', () => {
    it('withApiVersion should set API version', () => {
      const client = new JiraClient(validConfig, withApiVersion('2'));
      expect(client.apiBasePath).toBe('/rest/api/2');
    });

    it('withApiVersion(2) produces /rest/api/2 request URLs', async () => {
      const client = new JiraClient(validConfig, withApiVersion('2'));

      await client.issues.deleteIssue('TEST-1');

      expect(calledUrl()).toContain('/rest/api/2/issue/TEST-1');
    });

    it('withTimeout applies the timeout to real requests', async () => {
      respondNever();
      const client = new JiraClient(validConfig, withTimeout(10), withRetry(false));

      const error = await client.issues.deleteIssue('TEST-1').catch((e: unknown) => e);

      expect(error).toBeInstanceOf(TimeoutError);
      expect((error as TimeoutError).message).toContain('10ms');
    });

    it('withDebug enables request/response logging on the configured logger', async () => {
      const logger = createLogger();
      const client = new JiraClient(validConfig, withDebug(true), withLogger(logger));

      await client.issues.deleteIssue('TEST-1');

      const messages = vi.mocked(logger.debug).mock.calls.map((call) => call[0]);
      expect(messages).toContain('HTTP Request');
      expect(messages).toContain('HTTP Response');
    });

    it('withDebug(false) leaves logging off', async () => {
      const logger = createLogger();
      const client = new JiraClient(validConfig, withDebug(false), withLogger(logger));

      await client.issues.deleteIssue('TEST-1');

      const messages = vi.mocked(logger.debug).mock.calls.map((call) => call[0]);
      expect(messages).not.toContain('HTTP Request');
    });

    it('withLogger routes SDK logs to the supplied logger', async () => {
      const logger = createLogger();
      const client = new JiraClient(validConfig, withDebug(), withLogger(logger));

      await client.issues.deleteIssue('TEST-1');

      expect(logger.debug).toHaveBeenCalled();
    });

    it('withRetry(false) issues exactly one request for a 5xx', async () => {
      respondWith(jsonResponse({ errorMessages: ['boom'] }, 500));
      const client = new JiraClient(validConfig, withRetry(false));

      await expect(client.issues.deleteIssue('TEST-1')).rejects.toThrow();

      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('withRetry(true, n) retries a 5xx n times', async () => {
      vi.useFakeTimers();
      respondWith(jsonResponse({ errorMessages: ['boom'] }, 500));
      const client = new JiraClient(validConfig, withRetry(true, 2));

      const pending = client.issues.deleteIssue('TEST-1').catch((e: unknown) => e);
      await vi.advanceTimersByTimeAsync(30_000);
      const error = await pending;

      expect(error).toBeInstanceOf(Error);
      // 1 initial attempt + 2 retries
      expect(mockFetch).toHaveBeenCalledTimes(3);
    });

    it('withMiddleware inserts custom middleware into the request path', async () => {
      const seen: string[] = [];
      const spyMiddleware: Middleware = async (ctx, next) => {
        seen.push(`${ctx.request.method} ${ctx.request.url}`);
        ctx.request.headers = { ...ctx.request.headers, 'X-Custom': 'applied' };
        return next(ctx);
      };

      const client = new JiraClient(validConfig, withMiddleware(spyMiddleware));

      await client.issues.deleteIssue('TEST-1');

      expect(seen).toEqual(['DELETE /rest/api/3/issue/TEST-1']);
      const headers = mockFetch.mock.calls[0]?.[1]?.headers as Headers;
      expect(headers.get('X-Custom')).toBe('applied');
    });

    it('withMiddleware appends to middleware already on the config', () => {
      const first: Middleware = async (ctx, next) => next(ctx);
      const second: Middleware = async (ctx, next) => next(ctx);

      const config = withMiddleware(second)({ ...validConfig, middleware: [first] });

      expect(config.middleware).toEqual([first, second]);
    });

    it('should support multiple options', () => {
      const client = new JiraClient(
        validConfig,
        withApiVersion('2'),
        withTimeout(60000),
        withDebug(true)
      );
      expect(client.apiBasePath).toBe('/rest/api/2');
    });

    it('applies options left to right so the last one wins', () => {
      const client = new JiraClient(validConfig, withApiVersion('2'), withApiVersion('3'));
      expect(client.apiBasePath).toBe('/rest/api/3');
    });
  });

  describe('withResilience', () => {
    it('disables the built-in retry and attaches a circuit breaker', () => {
      const config = withResilience()(validConfig);

      expect(config.retryEnabled).toBe(false);
      expect(config.circuitBreaker).toBeInstanceOf(CircuitBreaker);
      expect(config.middleware).toHaveLength(1);
    });

    it('exposes the circuit breaker on the constructed client', () => {
      const client = new JiraClient(validConfig, withResilience());

      expect(client.circuitBreaker).toBeInstanceOf(CircuitBreaker);
      expect(client.circuitBreaker?.getStats()).toBeDefined();
    });

    it('leaves the built-in retry alone when resilience retry is disabled', () => {
      const config = withResilience({ retry: false })(validConfig);

      expect(config.retryEnabled).toBeUndefined();
    });

    it('omits the circuit breaker when it is disabled', () => {
      const client = new JiraClient(
        validConfig,
        withResilience({ circuitBreaker: false, rateLimit: false })
      );

      expect(client.circuitBreaker).toBeUndefined();
    });

    it('keeps user middleware, running resilience outermost', () => {
      const custom: Middleware = async (ctx, next) => next(ctx);
      const config = withResilience()({ ...validConfig, middleware: [custom] });

      expect(config.middleware).toHaveLength(2);
      expect(config.middleware?.[1]).toBe(custom);
    });
  });

  describe('user agent', () => {
    it('sends an SDK user agent, including a configured suffix', async () => {
      const client = new JiraClient({ ...validConfig, userAgent: 'my-app/2.0' });

      await client.issues.deleteIssue('TEST-1');

      const headers = mockFetch.mock.calls[0]?.[1]?.headers as Headers;
      expect(headers.get('User-Agent')).toContain('@felixgeelhaar/jira-sdk');
      expect(headers.get('User-Agent')).toContain('my-app/2.0');
    });
  });

  describe('allowInsecureHttp', () => {
    const originalNodeEnv = process.env['NODE_ENV'];

    afterEach(() => {
      if (originalNodeEnv === undefined) {
        delete process.env['NODE_ENV'];
      } else {
        process.env['NODE_ENV'] = originalNodeEnv;
      }
      vi.restoreAllMocks();
    });

    it('rejects a plain-HTTP host in production unless opted in', () => {
      process.env['NODE_ENV'] = 'production';
      const auth = new ApiTokenAuth({ email: 'test@example.com', apiToken: 'test-token' });

      expect(() => new JiraClient({ host: 'http://jira.internal', auth })).toThrow(
        /HTTPS is required/
      );
      expect(
        () => new JiraClient({ host: 'http://jira.internal', auth, allowInsecureHttp: true })
      ).not.toThrow();
    });
  });
});

describe('createJiraClient', () => {
  it('should create client via factory function', () => {
    const auth = new ApiTokenAuth({
      email: 'test@example.com',
      apiToken: 'test-token',
    });

    const client = createJiraClient({
      host: 'https://example.atlassian.net',
      auth,
    });

    expect(client).toBeInstanceOf(JiraClient);
  });

  it('forwards functional options to the constructor', () => {
    const auth = new ApiTokenAuth({
      email: 'test@example.com',
      apiToken: 'test-token',
    });

    const client = createJiraClient(
      { host: 'https://example.atlassian.net', auth },
      withApiVersion('2')
    );

    expect(client.apiBasePath).toBe('/rest/api/2');
  });
});
