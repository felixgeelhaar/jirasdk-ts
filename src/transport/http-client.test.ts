import { describe, it, expect, vi, afterEach } from 'vitest';
import { HttpClient, createHttpClient } from './http-client.js';
import type { Middleware } from './types.js';
import {
  ApiError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  RateLimitError,
  ServerError,
} from '../errors/api.error.js';
import { TimeoutError, AbortError, NetworkError } from '../errors/network.error.js';
import { ApiTokenAuth } from '../auth/index.js';

type FetchMock = ReturnType<typeof vi.fn<typeof fetch>>;

/**
 * A fetch mock that always resolves with the given response. Each call gets a
 * fresh clone so a client may be exercised more than once.
 */
function fetchReturning(response: Response): FetchMock {
  return vi.fn<typeof fetch>().mockImplementation(() => Promise.resolve(response.clone()));
}

/** Build a JSON response with the standard content-type. */
function jsonResponse(
  body: unknown,
  init: { status?: number; statusText?: string; headers?: Record<string, string> } = {}
): Response {
  const { status = 200, statusText, headers = {} } = init;
  return new Response(JSON.stringify(body), {
    status,
    ...(statusText !== undefined && { statusText }),
    headers: { 'content-type': 'application/json', ...headers },
  });
}

/**
 * A fetch mock that never resolves on its own; it only rejects with a DOM-style
 * AbortError once the signal it was handed is aborted.
 */
function hangingFetch(): FetchMock {
  return vi.fn<typeof fetch>().mockImplementation(
    (_input: RequestInfo | URL, init?: RequestInit) =>
      new Promise<Response>((_resolve, reject) => {
        const fail = (): void => {
          const error = new Error('The operation was aborted.');
          error.name = 'AbortError';
          reject(error);
        };
        if (init?.signal?.aborted === true) {
          fail();
          return;
        }
        init?.signal?.addEventListener('abort', fail);
      })
  );
}

/** Read back the URL a fetch mock was called with. */
function calledUrl(mock: FetchMock, index = 0): string {
  const call = mock.mock.calls[index];
  expect(call).toBeDefined();
  return call![0] as string;
}

/** Read back the Headers object a fetch mock was called with. */
function calledHeaders(mock: FetchMock, index = 0): Headers {
  const call = mock.mock.calls[index];
  expect(call).toBeDefined();
  return call![1]?.headers as Headers;
}

/** Read back the RequestInit a fetch mock was called with. */
function calledInit(mock: FetchMock, index = 0): RequestInit {
  const call = mock.mock.calls[index];
  expect(call).toBeDefined();
  return call![1]!;
}

describe('HttpClient error classification', () => {
  const cases: Array<{
    status: number;
    ctor: typeof ApiError;
    name: string;
  }> = [
    { status: 401, ctor: UnauthorizedError, name: 'UnauthorizedError' },
    { status: 403, ctor: ForbiddenError, name: 'ForbiddenError' },
    { status: 404, ctor: NotFoundError, name: 'NotFoundError' },
    { status: 429, ctor: RateLimitError, name: 'RateLimitError' },
  ];

  for (const { status, ctor, name } of cases) {
    it(`maps ${String(status)} to ${name}`, async () => {
      const fetchMock = fetchReturning(jsonResponse({ errorMessages: ['boom'] }, { status }));
      const client = createHttpClient({
        baseUrl: 'https://api.example.com',
        fetch: fetchMock,
      });

      const error = await client.get('/thing').catch((e: unknown) => e);

      expect(error).toBeInstanceOf(ctor);
      expect(error).toBeInstanceOf(ApiError);
      expect((error as ApiError).statusCode).toBe(status);
      // The Jira error body is parsed onto the error, not just stashed raw.
      expect((error as ApiError).getAllMessages()).toContain('boom');
    });
  }

  it('maps 5xx to ServerError carrying the real status code', async () => {
    const fetchMock = fetchReturning(
      jsonResponse({}, { status: 503, statusText: 'Service Unavailable' })
    );
    const client = createHttpClient({ baseUrl: 'https://api.example.com', fetch: fetchMock });

    const error = await client.get('/thing').catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ServerError);
    expect((error as ServerError).statusCode).toBe(503);
    expect((error as ServerError).message).toContain('Service Unavailable');
  });

  it('maps other 4xx to a plain ApiError', async () => {
    const fetchMock = fetchReturning(jsonResponse({}, { status: 400, statusText: 'Bad Request' }));
    const client = createHttpClient({ baseUrl: 'https://api.example.com', fetch: fetchMock });

    const error = await client.get('/thing').catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ApiError);
    expect(error).not.toBeInstanceOf(NotFoundError);
    expect(error).not.toBeInstanceOf(ServerError);
    expect((error as ApiError).statusCode).toBe(400);
  });

  it('parses an integer Retry-After header as seconds', async () => {
    const fetchMock = fetchReturning(
      jsonResponse({}, { status: 429, headers: { 'retry-after': '120' } })
    );
    const client = createHttpClient({ baseUrl: 'https://api.example.com', fetch: fetchMock });

    const error = await client.get('/thing').catch((e: unknown) => e);

    expect(error).toBeInstanceOf(RateLimitError);
    expect((error as RateLimitError).retryAfter).toBe(120_000);
  });

  it('parses an HTTP-date Retry-After header as a delay from now', async () => {
    const inSixtySeconds = new Date(Date.now() + 60_000).toUTCString();
    const fetchMock = fetchReturning(
      jsonResponse({}, { status: 429, headers: { 'retry-after': inSixtySeconds } })
    );
    const client = createHttpClient({ baseUrl: 'https://api.example.com', fetch: fetchMock });

    const error = await client.get('/thing').catch((e: unknown) => e);

    expect(error).toBeInstanceOf(RateLimitError);
    const retryAfter = (error as RateLimitError).retryAfter;
    expect(retryAfter).toBeDefined();
    // HTTP-dates have second granularity, so allow a small window.
    expect(retryAfter!).toBeGreaterThan(55_000);
    expect(retryAfter!).toBeLessThanOrEqual(60_000);
  });

  it('leaves retryAfter undefined when Retry-After is absent or unparseable', async () => {
    const noHeader = fetchReturning(jsonResponse({}, { status: 429 }));
    const client = createHttpClient({ baseUrl: 'https://api.example.com', fetch: noHeader });
    const error = await client.get('/thing').catch((e: unknown) => e);
    expect((error as RateLimitError).retryAfter).toBeUndefined();

    const garbage = fetchReturning(
      jsonResponse({}, { status: 429, headers: { 'retry-after': 'soon-ish' } })
    );
    const client2 = createHttpClient({ baseUrl: 'https://api.example.com', fetch: garbage });
    const error2 = await client2.get('/thing').catch((e: unknown) => e);
    expect((error2 as RateLimitError).retryAfter).toBeUndefined();
  });
});

describe('HttpClient request bodies', () => {
  it('deletes Content-Type for FormData so the runtime can set the boundary', async () => {
    const fetchMock = fetchReturning(jsonResponse({ ok: true }));
    const client = createHttpClient({ baseUrl: 'https://api.example.com', fetch: fetchMock });

    const form = new FormData();
    form.append('file', new Blob(['contents']), 'note.txt');

    await client.post('/attachments', form);

    expect(calledHeaders(fetchMock).get('Content-Type')).toBeNull();
    expect(calledInit(fetchMock).body).toBe(form);
  });

  it('deletes Content-Type for a Blob body', async () => {
    const fetchMock = fetchReturning(jsonResponse({ ok: true }));
    const client = createHttpClient({ baseUrl: 'https://api.example.com', fetch: fetchMock });

    const blob = new Blob(['raw bytes']);
    await client.post('/upload', blob);

    expect(calledHeaders(fetchMock).get('Content-Type')).toBeNull();
    expect(calledInit(fetchMock).body).toBe(blob);
  });

  it('passes a string body through verbatim and keeps the JSON content type', async () => {
    const fetchMock = fetchReturning(jsonResponse({ ok: true }));
    const client = createHttpClient({ baseUrl: 'https://api.example.com', fetch: fetchMock });

    await client.post('/raw', 'already-serialised');

    expect(calledInit(fetchMock).body).toBe('already-serialised');
    expect(calledHeaders(fetchMock).get('Content-Type')).toBe('application/json');
  });

  it('JSON-serialises object bodies', async () => {
    const fetchMock = fetchReturning(jsonResponse({ ok: true }));
    const client = createHttpClient({ baseUrl: 'https://api.example.com', fetch: fetchMock });

    await client.put('/thing', { name: 'value' });

    expect(calledInit(fetchMock).body).toBe(JSON.stringify({ name: 'value' }));
    expect(calledInit(fetchMock).method).toBe('PUT');
  });

  it('sends no body at all when none is supplied', async () => {
    const fetchMock = fetchReturning(jsonResponse({ ok: true }));
    const client = createHttpClient({ baseUrl: 'https://api.example.com', fetch: fetchMock });

    await client.delete('/thing');

    expect(calledInit(fetchMock).body).toBeUndefined();
    expect(calledInit(fetchMock).method).toBe('DELETE');
  });

  it('supports PATCH with a body', async () => {
    const fetchMock = fetchReturning(jsonResponse({ ok: true }));
    const client = createHttpClient({ baseUrl: 'https://api.example.com', fetch: fetchMock });

    await client.patch('/thing', { a: 1 });

    expect(calledInit(fetchMock).method).toBe('PATCH');
    expect(calledInit(fetchMock).body).toBe(JSON.stringify({ a: 1 }));
  });
});

describe('HttpClient response parsing', () => {
  it('parses JSON responses', async () => {
    const fetchMock = fetchReturning(jsonResponse({ id: 7 }));
    const client = createHttpClient({ baseUrl: 'https://api.example.com', fetch: fetchMock });

    const response = await client.get<{ id: number }>('/thing');

    expect(response.data).toEqual({ id: 7 });
    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toBe('application/json');
    expect(response.responseTime).toBeGreaterThanOrEqual(0);
    expect(response.request.method).toBe('GET');
  });

  it('yields null for an empty JSON body', async () => {
    const fetchMock = fetchReturning(
      new Response('', { status: 200, headers: { 'content-type': 'application/json' } })
    );
    const client = createHttpClient({ baseUrl: 'https://api.example.com', fetch: fetchMock });

    const response = await client.get('/thing');

    expect(response.data).toBeNull();
  });

  it('returns text for non-JSON content types', async () => {
    const fetchMock = fetchReturning(
      new Response('plain words', { status: 200, headers: { 'content-type': 'text/plain' } })
    );
    const client = createHttpClient({ baseUrl: 'https://api.example.com', fetch: fetchMock });

    const response = await client.get('/thing');

    expect(response.data).toBe('plain words');
  });

  it('returns an empty string for a 204 with no content type', async () => {
    const fetchMock = fetchReturning(new Response(null, { status: 204 }));
    const client = createHttpClient({ baseUrl: 'https://api.example.com', fetch: fetchMock });

    const response = await client.delete('/thing');

    expect(response.status).toBe(204);
    expect(response.data).toBe('');
  });

  it('returns a Blob when metadata.rawResponse is true', async () => {
    const fetchMock = fetchReturning(
      new Response('binary-ish', {
        status: 200,
        headers: { 'content-type': 'application/octet-stream' },
      })
    );
    const client = createHttpClient({ baseUrl: 'https://api.example.com', fetch: fetchMock });

    const response = await client.get('/attachment', undefined, {
      metadata: { rawResponse: true },
    });

    expect(response.data).toBeInstanceOf(Blob);
    expect(await (response.data as Blob).text()).toBe('binary-ish');
  });

  it('prefers the Blob path over JSON parsing when rawResponse is set', async () => {
    const fetchMock = fetchReturning(jsonResponse({ id: 1 }));
    const client = createHttpClient({ baseUrl: 'https://api.example.com', fetch: fetchMock });

    const response = await client.get('/attachment', undefined, {
      metadata: { rawResponse: true },
    });

    expect(response.data).toBeInstanceOf(Blob);
  });
});

describe('HttpClient URL building', () => {
  it('strips a trailing slash from the base URL', () => {
    const client = new HttpClient({ baseUrl: 'https://api.example.com/' });
    expect(client.getBaseUrl()).toBe('https://api.example.com');
  });

  it('uses an absolute request URL as-is', async () => {
    const fetchMock = fetchReturning(jsonResponse({}));
    const client = createHttpClient({ baseUrl: 'https://api.example.com', fetch: fetchMock });

    await client.get('https://other.example.org/elsewhere');

    expect(calledUrl(fetchMock)).toBe('https://other.example.org/elsewhere');
  });

  it('repeats array params and omits undefined params', async () => {
    const fetchMock = fetchReturning(jsonResponse({}));
    const client = createHttpClient({ baseUrl: 'https://api.example.com', fetch: fetchMock });

    await client.get('/search', { expand: ['names', 'schema'], jql: 'a=b', omitted: undefined });

    const url = calledUrl(fetchMock);
    expect(url).toContain('expand=names&expand=schema');
    expect(url).toContain('jql=a%3Db');
    expect(url).not.toContain('omitted');
  });

  it('does not append a query string when every param is undefined', async () => {
    const fetchMock = fetchReturning(jsonResponse({}));
    const client = createHttpClient({ baseUrl: 'https://api.example.com', fetch: fetchMock });

    await client.get('/thing', { a: undefined, b: undefined });

    expect(calledUrl(fetchMock)).toBe('https://api.example.com/thing');
  });

  it('merges positional params with params supplied via options', async () => {
    const fetchMock = fetchReturning(jsonResponse({}));
    const client = createHttpClient({ baseUrl: 'https://api.example.com', fetch: fetchMock });

    await client.get('/thing', { a: '1' }, { params: { b: '2' } });

    const url = calledUrl(fetchMock);
    expect(url).toContain('a=1');
    expect(url).toContain('b=2');
  });

  it('uses "&" when the path already carries a query string', async () => {
    const fetchMock = fetchReturning(jsonResponse({}));
    const client = createHttpClient({ baseUrl: 'https://api.example.com', fetch: fetchMock });

    await client.get('/thing?existing=1', { added: '2' });

    const url = calledUrl(fetchMock);
    expect(url).toContain('existing=1');
    expect(url).toContain('&');
    expect(url).toContain('added=2');
  });

  it('emits exactly one "?" separator before the query string', async () => {
    // Regression test: buildQueryString used to return a leading "?" while
    // executeRequest prepended its own separator. The resulting "??" made the
    // first parameter's name "?foo" rather than "foo", so Jira never received
    // it. Assert on the parsed key, not just the raw substring - the old
    // `toContain('foo=bar')` style passed even while the URL was malformed.
    const fetchMock = fetchReturning(jsonResponse({}));
    const client = createHttpClient({ baseUrl: 'https://api.example.com', fetch: fetchMock });

    await client.get('/thing', { foo: 'bar' });

    const url = calledUrl(fetchMock);
    expect(url).toBe('https://api.example.com/thing?foo=bar');
    expect([...new URL(url).searchParams.keys()]).toEqual(['foo']);
    expect(new URL(url).searchParams.get('foo')).toBe('bar');
  });
});

describe('HttpClient headers and auth', () => {
  it('sends the default JSON headers', async () => {
    const fetchMock = fetchReturning(jsonResponse({}));
    const client = createHttpClient({ baseUrl: 'https://api.example.com', fetch: fetchMock });

    await client.get('/thing');

    const headers = calledHeaders(fetchMock);
    expect(headers.get('Content-Type')).toBe('application/json');
    expect(headers.get('Accept')).toBe('application/json');
  });

  it('merges configured default headers and per-request headers', async () => {
    const fetchMock = fetchReturning(jsonResponse({}));
    const client = createHttpClient({
      baseUrl: 'https://api.example.com',
      defaultHeaders: { 'X-Default': 'yes', Accept: 'text/plain' },
      fetch: fetchMock,
    });

    await client.get('/thing', undefined, { headers: { 'X-Request': 'also' } });

    const headers = calledHeaders(fetchMock);
    expect(headers.get('X-Default')).toBe('yes');
    expect(headers.get('Accept')).toBe('text/plain');
    expect(headers.get('X-Request')).toBe('also');
  });

  it('exposes the configured auth provider and applies its headers', async () => {
    const fetchMock = fetchReturning(jsonResponse({}));
    const auth = new ApiTokenAuth({ email: 'a@example.com', apiToken: 'secret' });
    const client = createHttpClient({
      baseUrl: 'https://api.example.com',
      auth,
      fetch: fetchMock,
    });

    expect(client.getAuth()).toBe(auth);

    await client.get('/thing');
    expect(calledHeaders(fetchMock).get('Authorization')).toMatch(/^Basic /);
  });

  it('omits auth headers when skipAuth is set', async () => {
    const fetchMock = fetchReturning(jsonResponse({}));
    const client = createHttpClient({
      baseUrl: 'https://api.example.com',
      auth: new ApiTokenAuth({ email: 'a@example.com', apiToken: 'secret' }),
      fetch: fetchMock,
    });

    await client.get('/thing', undefined, { skipAuth: true });

    expect(calledHeaders(fetchMock).get('Authorization')).toBeNull();
  });

  it('returns undefined from getAuth when no provider is configured', () => {
    const client = new HttpClient({ baseUrl: 'https://api.example.com' });
    expect(client.getAuth()).toBeUndefined();
  });
});

describe('HttpClient cancellation', () => {
  it('throws TimeoutError when the internal timeout fires', async () => {
    const fetchMock = hangingFetch();
    const client = createHttpClient({
      baseUrl: 'https://api.example.com',
      timeout: 10,
      fetch: fetchMock,
    });

    const error = await client.get('/slow').catch((e: unknown) => e);

    expect(error).toBeInstanceOf(TimeoutError);
    expect((error as TimeoutError).message).toContain('10ms');
  });

  it('honours a per-request timeout override', async () => {
    const fetchMock = hangingFetch();
    const client = createHttpClient({
      baseUrl: 'https://api.example.com',
      timeout: 60_000,
      fetch: fetchMock,
    });

    const error = await client.get('/slow', undefined, { timeout: 5 }).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(TimeoutError);
    expect((error as TimeoutError).message).toContain('5ms');
  });

  it('throws AbortError when the caller aborts their own signal', async () => {
    const fetchMock = hangingFetch();
    const client = createHttpClient({
      baseUrl: 'https://api.example.com',
      timeout: 60_000,
      fetch: fetchMock,
    });

    const controller = new AbortController();
    const pending = client.get('/slow', undefined, { signal: controller.signal });
    setTimeout(() => {
      controller.abort();
    }, 5);

    const error = await pending.catch((e: unknown) => e);

    expect(error).toBeInstanceOf(AbortError);
    // The signal handed to fetch is a combined signal, not the caller's own.
    const forwarded = calledInit(fetchMock).signal;
    expect(forwarded).not.toBe(controller.signal);
    expect(forwarded?.aborted).toBe(true);
  });

  it('aborts immediately when the caller signal is already aborted', async () => {
    const fetchMock = hangingFetch();
    const client = createHttpClient({ baseUrl: 'https://api.example.com', fetch: fetchMock });

    const error = await client
      .get('/slow', undefined, { signal: AbortSignal.abort() })
      .catch((e: unknown) => e);

    expect(error).toBeInstanceOf(AbortError);
  });

  it('wraps non-abort failures as NetworkError', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockRejectedValue(new Error('ECONNREFUSED'));
    const client = createHttpClient({ baseUrl: 'https://api.example.com', fetch: fetchMock });

    const error = await client.get('/thing').catch((e: unknown) => e);

    expect(error).toBeInstanceOf(NetworkError);
    expect((error as NetworkError).message).toContain('ECONNREFUSED');
  });

  it('wraps non-Error throwables as NetworkError', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockRejectedValue('just a string');
    const client = createHttpClient({ baseUrl: 'https://api.example.com', fetch: fetchMock });

    const error = await client.get('/thing').catch((e: unknown) => e);

    expect(error).toBeInstanceOf(NetworkError);
    expect((error as NetworkError).message).toBe('Unknown network error');
  });
});

describe('HttpClient middleware', () => {
  it('runs configured middleware around the request', async () => {
    const order: string[] = [];
    const outer: Middleware = async (ctx, next) => {
      order.push('outer-in');
      const response = await next(ctx);
      order.push('outer-out');
      return response;
    };
    const inner: Middleware = async (ctx, next) => {
      order.push('inner-in');
      const response = await next(ctx);
      order.push('inner-out');
      return response;
    };

    const fetchMock = fetchReturning(jsonResponse({}));
    const client = createHttpClient({
      baseUrl: 'https://api.example.com',
      middleware: [outer, inner],
      fetch: fetchMock,
    });

    await client.get('/thing');

    expect(order).toEqual(['outer-in', 'inner-in', 'inner-out', 'outer-out']);
  });

  it('use() rebuilds the chain so middleware added after construction runs', async () => {
    const fetchMock = fetchReturning(jsonResponse({}));
    const client = createHttpClient({ baseUrl: 'https://api.example.com', fetch: fetchMock });

    await client.get('/before');
    expect(calledHeaders(fetchMock, 0).get('X-Added')).toBeNull();

    const added: Middleware = async (ctx, next) => {
      ctx.request.headers = { ...ctx.request.headers, 'X-Added': 'yes' };
      return next(ctx);
    };

    expect(client.use(added)).toBe(client);

    await client.get('/after');
    expect(calledHeaders(fetchMock, 1).get('X-Added')).toBe('yes');
  });

  it('lets middleware short-circuit the request entirely', async () => {
    const fetchMock = fetchReturning(jsonResponse({}));
    const client = createHttpClient({
      baseUrl: 'https://api.example.com',
      middleware: [
        async (ctx) =>
          Promise.resolve({
            status: 200,
            statusText: 'OK',
            headers: new Headers(),
            data: { cached: true },
            request: ctx.request,
            responseTime: 0,
          }),
      ],
      fetch: fetchMock,
    });

    const response = await client.get('/thing');

    expect(response.data).toEqual({ cached: true });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('validateSecureUrl', () => {
  const originalNodeEnv = process.env['NODE_ENV'];

  afterEach(() => {
    if (originalNodeEnv === undefined) {
      delete process.env['NODE_ENV'];
    } else {
      process.env['NODE_ENV'] = originalNodeEnv;
    }
    vi.restoreAllMocks();
  });

  it('throws for a plain-HTTP host when NODE_ENV=production', () => {
    process.env['NODE_ENV'] = 'production';

    expect(() => new HttpClient({ baseUrl: 'http://jira.internal' })).toThrow(/HTTPS is required/);
  });

  it('warns instead of throwing outside production', () => {
    process.env['NODE_ENV'] = 'development';
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    const client = new HttpClient({ baseUrl: 'http://jira.internal' });

    expect(client.getBaseUrl()).toBe('http://jira.internal');
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0]?.[0]).toContain('insecure HTTP connection');
  });

  it('is bypassed by allowInsecureHttp, even in production', () => {
    process.env['NODE_ENV'] = 'production';
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    expect(
      () => new HttpClient({ baseUrl: 'http://jira.internal', allowInsecureHttp: true })
    ).not.toThrow();
    expect(warn).not.toHaveBeenCalled();
  });

  it('allows plain HTTP for localhost and 127.0.0.1 without warning', () => {
    process.env['NODE_ENV'] = 'production';
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    expect(() => new HttpClient({ baseUrl: 'http://localhost:8080' })).not.toThrow();
    expect(() => new HttpClient({ baseUrl: 'http://127.0.0.1:8080' })).not.toThrow();
    expect(warn).not.toHaveBeenCalled();
  });

  it('accepts HTTPS hosts silently', () => {
    process.env['NODE_ENV'] = 'production';
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    expect(() => new HttpClient({ baseUrl: 'https://example.atlassian.net' })).not.toThrow();
    expect(warn).not.toHaveBeenCalled();
  });
});
