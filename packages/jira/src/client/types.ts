import type { AuthProvider, Logger, Middleware } from '@felixgeelhaar/sdk-core';

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
}

/**
 * Functional option for client configuration
 */
export type JiraClientOption = (config: JiraClientConfig) => JiraClientConfig;
