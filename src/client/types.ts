import type { AuthProvider } from '../auth/index.js';
import type { Logger } from '../logging/index.js';
import type { CircuitBreaker, Middleware } from '../transport/index.js';

/**
 * Jira client configuration
 */
export interface JiraClientConfig {
  /**
   * Jira Cloud instance URL (e.g., https://your-domain.atlassian.net)
   */
  host: string;

  /**
   * Authentication provider
   */
  auth: AuthProvider;

  /**
   * Logger instance (optional)
   */
  logger?: Logger;

  /**
   * Request timeout in milliseconds (default: 30000)
   */
  timeout?: number;

  /**
   * Additional middleware to apply
   */
  middleware?: Middleware[];

  /**
   * User agent suffix (optional)
   */
  userAgent?: string;

  /**
   * API version (default: '3')
   */
  apiVersion?: '2' | '3';

  /**
   * Enable automatic retry on failures (default: true)
   */
  retryEnabled?: boolean;

  /**
   * Maximum number of retries (default: 3)
   */
  maxRetries?: number;

  /**
   * Enable request logging (default: false)
   */
  debug?: boolean;

  /**
   * Allow plain-HTTP hosts.
   *
   * The transport rejects non-HTTPS hosts when `NODE_ENV=production` and warns
   * otherwise. Set this to opt out — intended for local development against a
   * proxy or a self-hosted instance without TLS.
   *
   * @default false
   */
  allowInsecureHttp?: boolean;

  /**
   * Circuit breaker instance attached by {@link withResilience}.
   *
   * Set by the resilience option rather than by hand; read it back from
   * `client.circuitBreaker` to monitor breaker state.
   */
  circuitBreaker?: CircuitBreaker;
}

/**
 * Functional option for client configuration
 */
export type JiraClientOption = (config: JiraClientConfig) => JiraClientConfig;
