import type {
  HttpClientConfig,
  HttpRequest,
  HttpResponse,
  HttpMethod,
  RequestOptions,
  Middleware,
  MiddlewareContext,
  MiddlewareNext,
} from './types.js';
import type { AuthProvider } from '../auth/types.js';
import type { Logger } from '../logging/types.js';
import { NoopLogger } from '../logging/noop-logger.js';
import { NetworkError, TimeoutError, AbortError } from '../errors/network.error.js';
import {
  ApiError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  RateLimitError,
  ServerError,
} from '../errors/api.error.js';
import { buildQueryString, joinPath } from '../utils/index.js';

/**
 * Default request timeout (30 seconds)
 */
const DEFAULT_TIMEOUT_MS = 30_000;

/**
 * Validates that the URL uses HTTPS in production environments
 * @throws Error if HTTP is used in production without explicit opt-in
 */
function validateSecureUrl(url: string, allowInsecure: boolean | undefined): void {
  const isHttps = url.startsWith('https://');
  const isLocalhost = url.includes('localhost') || url.includes('127.0.0.1');
  const isProduction = typeof process !== 'undefined' && process.env?.['NODE_ENV'] === 'production';

  if (!isHttps && !isLocalhost && !allowInsecure) {
    if (isProduction) {
      throw new Error(
        `Security Error: HTTPS is required for production environments. ` +
          `URL "${url}" uses HTTP. Use HTTPS or set allowInsecureHttp: true for testing.`
      );
    }
    // Warn in non-production environments
    if (typeof console !== 'undefined' && console.warn) {
      console.warn(
        `[SDK Warning] Using insecure HTTP connection to "${url}". ` +
          `HTTPS is strongly recommended for production use.`
      );
    }
  }
}

/**
 * HTTP client for making API requests
 *
 * Features:
 * - Middleware support for request/response processing
 * - Automatic authentication header injection
 * - Request timeout handling
 * - AbortSignal support for cancellation
 * - Automatic JSON serialization/deserialization
 * - Error classification (API errors, network errors, etc.)
 *
 * @example
 * ```typescript
 * const client = new HttpClient({
 *   baseUrl: 'https://your-domain.atlassian.net',
 *   auth: new ApiTokenAuth({ email: '...', apiToken: '...' }),
 *   middleware: [loggingMiddleware, retryMiddleware],
 * });
 *
 * const response = await client.get('/rest/api/3/myself');
 * ```
 */
export class HttpClient {
  private readonly baseUrl: string;
  private readonly auth: AuthProvider | undefined;
  private readonly logger: Logger;
  private readonly timeout: number;
  private readonly defaultHeaders: Record<string, string>;
  private readonly middleware: Middleware[];
  private readonly fetchFn: typeof fetch;
  private middlewareChain: MiddlewareNext | undefined;

  constructor(config: HttpClientConfig) {
    // Validate URL security
    validateSecureUrl(config.baseUrl, config.allowInsecureHttp);

    this.baseUrl = config.baseUrl.replace(/\/$/, ''); // Remove trailing slash
    this.auth = config.auth;
    this.logger = config.logger ?? new NoopLogger();
    this.timeout = config.timeout ?? DEFAULT_TIMEOUT_MS;
    this.defaultHeaders = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...config.defaultHeaders,
    };
    this.middleware = config.middleware ?? [];
    this.fetchFn = config.fetch ?? globalThis.fetch.bind(globalThis);

    // Pre-build middleware chain for better performance
    this.middlewareChain = this.buildMiddlewareChain();
  }

  /**
   * Make a GET request
   */
  async get<T = unknown>(
    path: string,
    params?: Record<string, string | number | boolean | string[] | undefined>,
    options?: RequestOptions
  ): Promise<HttpResponse<T>> {
    return this.request<T>({
      method: 'GET',
      url: path,
      params,
      ...options,
    });
  }

  /**
   * Make a POST request
   */
  async post<T = unknown>(
    path: string,
    body?: unknown,
    options?: RequestOptions
  ): Promise<HttpResponse<T>> {
    return this.request<T>({
      method: 'POST',
      url: path,
      body,
      ...options,
    });
  }

  /**
   * Make a PUT request
   */
  async put<T = unknown>(
    path: string,
    body?: unknown,
    options?: RequestOptions
  ): Promise<HttpResponse<T>> {
    return this.request<T>({
      method: 'PUT',
      url: path,
      body,
      ...options,
    });
  }

  /**
   * Make a PATCH request
   */
  async patch<T = unknown>(
    path: string,
    body?: unknown,
    options?: RequestOptions
  ): Promise<HttpResponse<T>> {
    return this.request<T>({
      method: 'PATCH',
      url: path,
      body,
      ...options,
    });
  }

  /**
   * Make a DELETE request
   */
  async delete<T = unknown>(path: string, options?: RequestOptions): Promise<HttpResponse<T>> {
    return this.request<T>({
      method: 'DELETE',
      url: path,
      ...options,
    });
  }

  /**
   * Make a request with full control over the configuration
   */
  async request<T = unknown>(
    requestConfig: Omit<HttpRequest, 'method'> & {
      method?: HttpMethod;
    } & RequestOptions
  ): Promise<HttpResponse<T>> {
    const {
      method = 'GET',
      url,
      headers,
      body,
      params,
      timeout,
      signal,
      metadata,
      skipAuth,
    } = requestConfig;

    const httpRequest: HttpRequest = {
      method,
      url,
      headers: { ...this.defaultHeaders, ...headers },
      body,
      params,
      timeout: timeout ?? this.timeout,
      signal,
      metadata,
    };

    const context: MiddlewareContext = {
      request: httpRequest,
      auth: skipAuth ? undefined : this.auth,
      logger: this.logger,
      retryCount: 0,
    };

    // Use pre-built middleware chain for better performance
    const chain = this.middlewareChain ?? this.buildMiddlewareChain();

    return chain(context) as Promise<HttpResponse<T>>;
  }

  /**
   * Build the middleware chain with the final request handler
   */
  private buildMiddlewareChain(): MiddlewareNext {
    // The final handler that actually makes the HTTP request
    const finalHandler: MiddlewareNext = async (context) => {
      return this.executeRequest(context);
    };

    // Build chain from right to left
    return this.middleware.reduceRight<MiddlewareNext>((next, middleware) => {
      return async (ctx) => middleware(ctx, next);
    }, finalHandler);
  }

  /**
   * Execute the actual HTTP request
   */
  private async executeRequest(context: MiddlewareContext): Promise<HttpResponse> {
    const { request, auth } = context;
    const startTime = Date.now();

    // Build full URL
    let fullUrl = request.url.startsWith('http')
      ? request.url
      : joinPath(this.baseUrl, request.url);

    // Add query parameters
    if (request.params) {
      const queryString = buildQueryString(request.params);
      if (queryString) {
        fullUrl += (fullUrl.includes('?') ? '&' : '?') + queryString;
      }
    }

    // Build headers
    const headers = new Headers(request.headers);

    // Add auth headers if provider is available
    if (auth) {
      const authHeaders = await auth.getAuthHeaders();
      for (const [key, value] of Object.entries(authHeaders)) {
        headers.set(key, value);
      }
    }

    // Prepare request body
    let bodyContent: BodyInit | undefined;
    if (request.body !== undefined) {
      if (request.body instanceof FormData || request.body instanceof Blob) {
        bodyContent = request.body;
        // Remove Content-Type so browser/runtime sets it with boundary for FormData
        headers.delete('Content-Type');
      } else if (typeof request.body === 'string') {
        bodyContent = request.body;
      } else {
        bodyContent = JSON.stringify(request.body);
      }
    }

    // Create AbortController for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
    }, request.timeout ?? this.timeout);

    // Combine with external signal if provided
    const combinedSignal = request.signal
      ? this.combineSignals(request.signal, controller.signal)
      : controller.signal;

    try {
      const response = await this.fetchFn(fullUrl, {
        method: request.method,
        headers,
        ...(bodyContent !== undefined && { body: bodyContent }),
        signal: combinedSignal,
      });

      clearTimeout(timeoutId);

      const responseTime = Date.now() - startTime;

      // Parse response body
      const contentType = response.headers.get('content-type');
      let data: unknown;

      // Check if raw blob response is requested
      const wantBlob = request.metadata?.['rawResponse'] === true;

      if (wantBlob) {
        data = await response.blob();
      } else if (contentType?.includes('application/json')) {
        const text = await response.text();
        data = text ? JSON.parse(text) : null;
      } else {
        data = await response.text();
      }

      // Handle error responses
      if (!response.ok) {
        this.handleErrorResponse(response, data);
      }

      return {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
        data,
        request,
        responseTime,
      };
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof ApiError) {
        throw error;
      }

      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          if (request.signal?.aborted) {
            throw new AbortError('Request was aborted', { cause: error });
          }
          throw new TimeoutError(`Request timed out after ${request.timeout ?? this.timeout}ms`, {
            cause: error,
          });
        }

        throw new NetworkError(`Network error: ${error.message}`, {
          cause: error,
        });
      }

      throw new NetworkError('Unknown network error', { cause: error });
    }
  }

  /**
   * Handle error responses and throw appropriate errors
   */
  private handleErrorResponse(response: Response, data: unknown): never {
    const status = response.status;

    switch (status) {
      case 401:
        throw new UnauthorizedError('Authentication required', data);
      case 403:
        throw new ForbiddenError('Access denied', data);
      case 404:
        throw new NotFoundError('Resource not found', data);
      case 429: {
        const retryAfter = this.parseRetryAfter(response.headers);
        throw new RateLimitError(
          'Rate limit exceeded',
          data,
          retryAfter !== undefined ? { retryAfter } : undefined
        );
      }
      default:
        if (status >= 500) {
          throw new ServerError(`Server error: ${response.statusText}`, data, status);
        }
        throw new ApiError(`API error: ${response.statusText}`, status, data);
    }
  }

  /**
   * Parse Retry-After header
   */
  private parseRetryAfter(headers: Headers): number | undefined {
    const retryAfter = headers.get('retry-after');
    if (!retryAfter) return undefined;

    const seconds = parseInt(retryAfter, 10);
    if (!isNaN(seconds)) {
      return seconds * 1000;
    }

    // Try parsing as date
    const date = Date.parse(retryAfter);
    if (!isNaN(date)) {
      return Math.max(0, date - Date.now());
    }

    return undefined;
  }

  /**
   * Combine multiple AbortSignals
   */
  private combineSignals(signal1: AbortSignal, signal2: AbortSignal): AbortSignal {
    const controller = new AbortController();

    const abort = (): void => {
      controller.abort();
    };

    if (signal1.aborted || signal2.aborted) {
      controller.abort();
      return controller.signal;
    }

    signal1.addEventListener('abort', abort);
    signal2.addEventListener('abort', abort);

    return controller.signal;
  }

  /**
   * Add middleware to the chain
   * Note: This rebuilds the middleware chain for the new configuration
   */
  use(middleware: Middleware): this {
    this.middleware.push(middleware);
    // Rebuild middleware chain to include new middleware
    this.middlewareChain = this.buildMiddlewareChain();
    return this;
  }

  /**
   * Get the base URL
   */
  getBaseUrl(): string {
    return this.baseUrl;
  }

  /**
   * Get the auth provider
   */
  getAuth(): AuthProvider | undefined {
    return this.auth;
  }
}

/**
 * Factory function to create HTTP client
 */
export function createHttpClient(config: HttpClientConfig): HttpClient {
  return new HttpClient(config);
}
