/**
 * @felixgeelhaar/jira-sdk
 *
 * TypeScript SDK for the Atlassian Jira Cloud REST API.
 *
 * Everything the SDK offers is exported from this entry point: auth providers,
 * the HTTP transport and its middleware, the error hierarchy, Zod schemas, and
 * the Jira service layer.
 */

// Errors
export * from './errors/index.js';

// Shared type utilities
export type * from './types/index.js';

// Logging
export * from './logging/index.js';

// General-purpose utilities
export * from './utils/index.js';

// Auth providers
export * from './auth/index.js';

// HTTP transport, middleware, circuit breaker
export * from './transport/index.js';

// ADF (Atlassian Document Format) builder
export * from './adf/index.js';

// Typed custom-field accessors
export * from './custom-fields/index.js';

// JQL query builder and issue-URL parsing
export * from './jql/index.js';

// Shared pagination primitives
export * from './pagination/index.js';

// Resilience presets
export {
  createResilienceMiddleware,
  withResilience,
  DEFAULT_RESILIENCE_CONFIG,
  type ResilienceConfig,
  type ResilienceMiddlewareResult,
} from './client/resilience.js';

// Client
export * from './client/index.js';

// Schemas
export * from './schemas/index.js';

// Services
export * from './services/index.js';
