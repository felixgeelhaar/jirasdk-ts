import { z } from 'zod';
import type { HttpClient } from '@felixgeelhaar/sdk-core';
import {
  createHttpClient,
  createLoggingMiddleware,
  createRetryMiddleware,
  createUserAgentMiddleware,
  type Middleware,
  type Logger,
  ConfigValidationError,
} from '@felixgeelhaar/sdk-core';
import type { JiraClientConfig, JiraClientOption } from './types.js';

// Services (will be implemented)
import { IssueService } from '../services/issue.service.js';
import { ProjectService } from '../services/project.service.js';
import { SearchService } from '../services/search.service.js';
import { UserService } from '../services/user.service.js';

/**
 * SDK version for user agent
 */
const SDK_VERSION = '0.1.0';

/**
 * Configuration schema for validation
 */
const ConfigSchema = z.object({
  host: z.url({ error: 'Host must be a valid URL' }),
  apiVersion: z.enum(['2', '3']).default('3'),
  timeout: z.number().int().positive().default(30000),
  retryEnabled: z.boolean().default(true),
  maxRetries: z.number().int().min(0).max(10).default(3),
  debug: z.boolean().default(false),
});

/**
 * Jira API Client
 *
 * The main entry point for interacting with the Jira REST API.
 * Provides access to all Jira services through a unified interface.
 *
 * @example
 * ```typescript
 * import { JiraClient, ApiTokenAuth } from '@felixgeelhaar/jira-sdk';
 *
 * const client = new JiraClient({
 *   host: 'https://your-domain.atlassian.net',
 *   auth: new ApiTokenAuth({
 *     email: 'user@example.com',
 *     apiToken: 'your-api-token',
 *   }),
 * });
 *
 * // Get an issue
 * const issue = await client.issues.get('PROJECT-123');
 *
 * // Search issues
 * const results = await client.search.jql('project = PROJECT AND status = Open');
 * ```
 */
export class JiraClient {
  private readonly httpClient: HttpClient;
  private readonly config: Required<
    Pick<
      JiraClientConfig,
      'host' | 'apiVersion' | 'timeout' | 'retryEnabled' | 'maxRetries' | 'debug'
    >
  > &
    JiraClientConfig;

  // Services
  private _issues?: IssueService;
  private _projects?: ProjectService;
  private _search?: SearchService;
  private _users?: UserService;

  constructor(config: JiraClientConfig, ...options: JiraClientOption[]) {
    // Apply functional options
    let finalConfig = { ...config };
    for (const option of options) {
      finalConfig = option(finalConfig);
    }

    // Validate configuration
    const result = ConfigSchema.safeParse(finalConfig);
    if (!result.success) {
      throw ConfigValidationError.fromZodError(result.error);
    }

    this.config = {
      ...finalConfig,
      ...result.data,
    };

    // Build middleware stack
    const middleware: Middleware[] = [];

    // Add user agent middleware
    middleware.push(
      createUserAgentMiddleware({
        sdkName: '@felixgeelhaar/jira-sdk',
        sdkVersion: SDK_VERSION,
        ...(this.config.userAgent !== undefined && { suffix: this.config.userAgent }),
      })
    );

    // Add logging middleware if debug enabled
    if (this.config.debug) {
      middleware.push(
        createLoggingMiddleware({
          logRequests: true,
          logResponses: true,
          logErrors: true,
        })
      );
    }

    // Add retry middleware if enabled
    if (this.config.retryEnabled) {
      middleware.push(
        createRetryMiddleware({
          maxRetries: this.config.maxRetries,
        })
      );
    }

    // Add custom middleware
    if (this.config.middleware) {
      middleware.push(...this.config.middleware);
    }

    // Create HTTP client
    this.httpClient = createHttpClient({
      baseUrl: this.config.host,
      auth: this.config.auth,
      timeout: this.config.timeout,
      middleware,
      ...(this.config.logger !== undefined && { logger: this.config.logger }),
    });
  }

  /**
   * Get the API base path for the configured version
   */
  get apiBasePath(): string {
    return `/rest/api/${this.config.apiVersion}`;
  }

  /**
   * Get the Agile API base path
   */
  get agileApiBasePath(): string {
    return '/rest/agile/1.0';
  }

  /**
   * Issues service - CRUD operations for issues
   */
  get issues(): IssueService {
    this._issues ??= new IssueService(this.httpClient, this.apiBasePath);
    return this._issues;
  }

  /**
   * Projects service - CRUD operations for projects
   */
  get projects(): ProjectService {
    this._projects ??= new ProjectService(this.httpClient, this.apiBasePath);
    return this._projects;
  }

  /**
   * Search service - JQL search and filters
   */
  get search(): SearchService {
    this._search ??= new SearchService(this.httpClient, this.apiBasePath);
    return this._search;
  }

  /**
   * Users service - User management
   */
  get users(): UserService {
    this._users ??= new UserService(this.httpClient, this.apiBasePath);
    return this._users;
  }

  /**
   * Get the underlying HTTP client for advanced usage
   */
  getHttpClient(): HttpClient {
    return this.httpClient;
  }

  /**
   * Get the configured host URL
   */
  getHost(): string {
    return this.config.host;
  }
}

/**
 * Factory function to create a Jira client
 */
export function createJiraClient(
  config: JiraClientConfig,
  ...options: JiraClientOption[]
): JiraClient {
  return new JiraClient(config, ...options);
}

// Functional options

/**
 * Set the API version
 */
export function withApiVersion(version: '2' | '3'): JiraClientOption {
  return (config) => ({ ...config, apiVersion: version });
}

/**
 * Set the request timeout
 */
export function withTimeout(timeout: number): JiraClientOption {
  return (config) => ({ ...config, timeout });
}

/**
 * Enable debug logging
 */
export function withDebug(enabled = true): JiraClientOption {
  return (config) => ({ ...config, debug: enabled });
}

/**
 * Configure retry behavior
 */
export function withRetry(enabled: boolean, maxRetries?: number): JiraClientOption {
  return (config) => ({
    ...config,
    retryEnabled: enabled,
    ...(maxRetries !== undefined && { maxRetries }),
  });
}

/**
 * Add custom middleware
 */
export function withMiddleware(...middleware: Middleware[]): JiraClientOption {
  return (config) => ({
    ...config,
    middleware: [...(config.middleware ?? []), ...middleware],
  });
}

/**
 * Set custom logger
 */
export function withLogger(logger: Logger): JiraClientOption {
  return (config) => ({ ...config, logger });
}
