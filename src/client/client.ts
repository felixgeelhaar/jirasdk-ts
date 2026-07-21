import { z } from 'zod';
import {
  createHttpClient,
  createLoggingMiddleware,
  createRetryMiddleware,
  createUserAgentMiddleware,
  type CircuitBreaker,
  type HttpClient,
  type Middleware,
} from '../transport/index.js';
import type { Logger } from '../logging/index.js';
import { ConfigValidationError } from '../errors/index.js';
import { SDK_VERSION } from '../version.js';
import type { JiraClientConfig, JiraClientOption } from './types.js';

// Services
import type { BaseService } from '../services/base.service.js';
import { AgileService } from '../services/agile.service.js';
import { AppPropertiesService } from '../services/appproperties.service.js';
import { AuditService } from '../services/audit.service.js';
import { BulkService } from '../services/bulk.service.js';
import { DashboardService } from '../services/dashboard.service.js';
import { ExpressionService } from '../services/expression.service.js';
import { FieldService } from '../services/field.service.js';
import { FilterService } from '../services/filter.service.js';
import { GroupService } from '../services/group.service.js';
import { IssueService } from '../services/issue.service.js';
import { IssueLinkTypeService } from '../services/issuelinktype.service.js';
import { IssueTypeService } from '../services/issuetype.service.js';
import { LabelService } from '../services/label.service.js';
import { MyselfService } from '../services/myself.service.js';
import { NotificationService } from '../services/notification.service.js';
import { PermissionService } from '../services/permission.service.js';
import { PriorityService } from '../services/priority.service.js';
import { ProjectService } from '../services/project.service.js';
import { ResolutionService } from '../services/resolution.service.js';
import { ScreenService } from '../services/screen.service.js';
import { SearchService } from '../services/search.service.js';
import { SecurityLevelService } from '../services/securitylevel.service.js';
import { ServerInfoService } from '../services/serverinfo.service.js';
import { TimeTrackingService } from '../services/timetracking.service.js';
import { UserService } from '../services/user.service.js';
import { WebhookService } from '../services/webhook.service.js';
import { WorkflowService } from '../services/workflow.service.js';

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
  allowInsecureHttp: z.boolean().default(false),
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
      | 'host'
      | 'apiVersion'
      | 'timeout'
      | 'retryEnabled'
      | 'maxRetries'
      | 'debug'
      | 'allowInsecureHttp'
    >
  > &
    JiraClientConfig;

  // Services are constructed lazily on first access, so an application that
  // only touches issues never pays for the other 26.
  private readonly serviceCache = new Map<string, BaseService>();

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
      allowInsecureHttp: this.config.allowInsecureHttp,
      ...(this.config.logger !== undefined && { logger: this.config.logger }),
    });
  }

  /**
   * Circuit breaker attached by {@link withResilience}, for monitoring.
   *
   * Returns `undefined` unless the client was constructed with the resilience
   * option and the breaker is enabled.
   */
  get circuitBreaker(): CircuitBreaker | undefined {
    return this.config.circuitBreaker;
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
   * Resolve a service from the cache, constructing it on first access.
   */
  private service<T extends BaseService>(
    key: string,
    create: (http: HttpClient, basePath: string) => T,
    basePath: string = this.apiBasePath
  ): T {
    let instance = this.serviceCache.get(key);
    if (instance === undefined) {
      instance = create(this.httpClient, basePath);
      this.serviceCache.set(key, instance);
    }
    return instance as T;
  }

  // --- Core work-item domains -------------------------------------------

  /** Issues - CRUD, comments, transitions, worklogs, attachments, links. */
  get issues(): IssueService {
    return this.service('issues', (h, p) => new IssueService(h, p));
  }

  /** Projects - CRUD plus components and versions. */
  get projects(): ProjectService {
    return this.service('projects', (h, p) => new ProjectService(h, p));
  }

  /** Search - JQL search, including the enhanced token-paginated API. */
  get search(): SearchService {
    return this.service('search', (h, p) => new SearchService(h, p));
  }

  /** Users - lookup, search and user properties. */
  get users(): UserService {
    return this.service('users', (h, p) => new UserService(h, p));
  }

  // --- Agile -------------------------------------------------------------

  /** Agile boards, sprints, epics and backlog (`/rest/agile/1.0`). */
  get agile(): AgileService {
    return this.service('agile', (h, p) => new AgileService(h, p), this.agileApiBasePath);
  }

  // --- Configuration and metadata ---------------------------------------

  /** Custom fields, field contexts and context options. */
  get fields(): FieldService {
    return this.service('fields', (h, p) => new FieldService(h, p));
  }

  /** Issue types and issue type schemes. */
  get issueTypes(): IssueTypeService {
    return this.service('issueTypes', (h, p) => new IssueTypeService(h, p));
  }

  /** Issue link types. */
  get issueLinkTypes(): IssueLinkTypeService {
    return this.service('issueLinkTypes', (h, p) => new IssueLinkTypeService(h, p));
  }

  /** Priorities. */
  get priorities(): PriorityService {
    return this.service('priorities', (h, p) => new PriorityService(h, p));
  }

  /** Resolutions. */
  get resolutions(): ResolutionService {
    return this.service('resolutions', (h, p) => new ResolutionService(h, p));
  }

  /** Screens, screen tabs and screen fields. */
  get screens(): ScreenService {
    return this.service('screens', (h, p) => new ScreenService(h, p));
  }

  /** Workflows, statuses, status categories and workflow schemes. */
  get workflows(): WorkflowService {
    return this.service('workflows', (h, p) => new WorkflowService(h, p));
  }

  // --- Views and saved queries ------------------------------------------

  /** Dashboards and dashboard gadgets. */
  get dashboards(): DashboardService {
    return this.service('dashboards', (h, p) => new DashboardService(h, p));
  }

  /** Saved filters, favourites and share permissions. */
  get filters(): FilterService {
    return this.service('filters', (h, p) => new FilterService(h, p));
  }

  // --- Identity, access and permissions ---------------------------------

  /** Groups and group membership. */
  get groups(): GroupService {
    return this.service('groups', (h, p) => new GroupService(h, p));
  }

  /** The current user and their preferences. */
  get myself(): MyselfService {
    return this.service('myself', (h, p) => new MyselfService(h, p));
  }

  /** Permissions, permission schemes and project roles. */
  get permissions(): PermissionService {
    return this.service('permissions', (h, p) => new PermissionService(h, p));
  }

  /** Issue security levels and schemes. */
  get securityLevels(): SecurityLevelService {
    return this.service('securityLevels', (h, p) => new SecurityLevelService(h, p));
  }

  // --- Operations and administration ------------------------------------

  /** Application properties and advanced settings. */
  get appProperties(): AppPropertiesService {
    return this.service('appProperties', (h, p) => new AppPropertiesService(h, p));
  }

  /** Audit records. */
  get audit(): AuditService {
    return this.service('audit', (h, p) => new AuditService(h, p));
  }

  /** Bulk issue create/delete and task progress polling. */
  get bulk(): BulkService {
    return this.service('bulk', (h, p) => new BulkService(h, p));
  }

  /** Jira expression evaluation and analysis. */
  get expressions(): ExpressionService {
    return this.service('expressions', (h, p) => new ExpressionService(h, p));
  }

  /** Labels. */
  get labels(): LabelService {
    return this.service('labels', (h, p) => new LabelService(h, p));
  }

  /** Notification schemes and issue notifications. */
  get notifications(): NotificationService {
    return this.service('notifications', (h, p) => new NotificationService(h, p));
  }

  /** Server info and instance configuration. */
  get serverInfo(): ServerInfoService {
    return this.service('serverInfo', (h, p) => new ServerInfoService(h, p));
  }

  /** Time tracking providers, configuration and worklogs. */
  get timeTracking(): TimeTrackingService {
    return this.service('timeTracking', (h, p) => new TimeTrackingService(h, p));
  }

  /** Webhook registration and delivery status. */
  get webhooks(): WebhookService {
    return this.service('webhooks', (h, p) => new WebhookService(h, p));
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
