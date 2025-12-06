import type { AuthProvider } from '../auth/types.js';
import type { Logger } from '../logging/types.js';

/**
 * HTTP request method
 */
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS';

/**
 * HTTP request configuration
 */
export interface HttpRequest {
  /**
   * Request URL (can be relative to base URL)
   */
  url: string;

  /**
   * HTTP method
   */
  method: HttpMethod;

  /**
   * Request headers
   */
  headers?: Record<string, string> | undefined;

  /**
   * Request body (will be JSON stringified if object)
   */
  body?: unknown;

  /**
   * Query parameters
   */
  params?: Record<string, string | number | boolean | string[] | undefined> | undefined;

  /**
   * Request timeout in milliseconds
   */
  timeout?: number | undefined;

  /**
   * AbortSignal for request cancellation
   */
  signal?: AbortSignal | undefined;

  /**
   * Custom metadata passed through middleware
   */
  metadata?: Record<string, unknown> | undefined;
}

/**
 * HTTP response
 */
export interface HttpResponse<T = unknown> {
  /**
   * Response status code
   */
  status: number;

  /**
   * Response status text
   */
  statusText: string;

  /**
   * Response headers
   */
  headers: Headers;

  /**
   * Parsed response body
   */
  data: T;

  /**
   * Original request
   */
  request: HttpRequest;

  /**
   * Response time in milliseconds
   */
  responseTime: number;
}

/**
 * Middleware context passed through the chain
 */
export interface MiddlewareContext {
  /**
   * Current request
   */
  request: HttpRequest;

  /**
   * Auth provider (if configured)
   */
  auth?: AuthProvider | undefined;

  /**
   * Logger instance
   */
  logger: Logger;

  /**
   * Retry count (incremented by retry middleware)
   */
  retryCount: number;

  /**
   * Custom context data
   */
  [key: string]: unknown;
}

/**
 * Next function to call the next middleware or the actual request
 */
export type MiddlewareNext = (context: MiddlewareContext) => Promise<HttpResponse>;

/**
 * Middleware function type
 */
export type Middleware = (
  context: MiddlewareContext,
  next: MiddlewareNext
) => Promise<HttpResponse>;

/**
 * HTTP client configuration
 */
export interface HttpClientConfig {
  /**
   * Base URL for all requests
   */
  baseUrl: string;

  /**
   * Authentication provider
   */
  auth?: AuthProvider;

  /**
   * Logger instance
   */
  logger?: Logger;

  /**
   * Default request timeout in milliseconds
   */
  timeout?: number;

  /**
   * Default headers for all requests
   */
  defaultHeaders?: Record<string, string>;

  /**
   * Middleware chain
   */
  middleware?: Middleware[];

  /**
   * Custom fetch implementation (for testing or alternative runtimes)
   */
  fetch?: typeof fetch;

  /**
   * Allow insecure HTTP connections (not recommended for production)
   *
   * By default, HTTP URLs will throw an error in production and warn in development.
   * Set to true to disable this security check (useful for testing or internal APIs).
   *
   * @default false
   */
  allowInsecureHttp?: boolean;
}

/**
 * Request options for individual requests
 */
export interface RequestOptions {
  /**
   * Request timeout override
   */
  timeout?: number | undefined;

  /**
   * AbortSignal for cancellation
   */
  signal?: AbortSignal | undefined;

  /**
   * Additional headers for this request
   */
  headers?: Record<string, string> | undefined;

  /**
   * Custom metadata passed to middleware
   */
  metadata?: Record<string, unknown> | undefined;

  /**
   * Skip authentication for this request
   */
  skipAuth?: boolean | undefined;
}
