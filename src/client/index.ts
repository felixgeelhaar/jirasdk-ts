// Client types
export type * from './types.js';

// Main client
export {
  JiraClient,
  createJiraClient,
  withApiVersion,
  withTimeout,
  withDebug,
  withRetry,
  withMiddleware,
  withLogger,
} from './client.js';

// Environment-variable configuration
export {
  ENV_VARS,
  createAuthFromEnv,
  loadConfigFromEnv,
  createJiraClientFromEnv,
  withEnv,
  type EnvSource,
} from './env.js';
