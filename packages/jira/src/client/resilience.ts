import {
  createRetryMiddleware,
  createRateLimitMiddleware,
  createCircuitBreakerMiddleware,
  CircuitBreaker,
  composeMiddleware,
  type Middleware,
  type RetryMiddlewareConfig,
  type RateLimitMiddlewareConfig,
  type CircuitBreakerConfig,
} from '@felixgeelhaar/sdk-core';

/**
 * Resilience configuration for the Jira client
 */
export interface ResilienceConfig {
  /**
   * Retry configuration
   * Set to false to disable retries
   */
  retry?: RetryMiddlewareConfig | false;

  /**
   * Client-side rate limiting configuration
   * Set to false to disable
   */
  rateLimit?: RateLimitMiddlewareConfig | false;

  /**
   * Circuit breaker configuration
   * Set to false to disable
   */
  circuitBreaker?: CircuitBreakerConfig | false;
}

/**
 * Default resilience configuration optimized for Jira API
 */
export const DEFAULT_RESILIENCE_CONFIG: ResilienceConfig = {
  retry: {
    maxRetries: 3,
    initialDelayMs: 1000,
    maxDelayMs: 30000,
    multiplier: 2,
    jitter: true,
  },
  rateLimit: {
    // Jira Cloud has a limit of ~100 requests per minute per user
    maxRequests: 90,
    windowMs: 60000,
    waitForSlot: true,
  },
  circuitBreaker: {
    failureThreshold: 5,
    resetTimeoutMs: 30000,
    failureWindowMs: 60000,
    successThreshold: 1,
  },
};

/**
 * Result of creating resilience middleware
 */
export interface ResilienceMiddlewareResult {
  /**
   * Combined middleware to add to the HTTP client
   */
  middleware: Middleware;

  /**
   * Circuit breaker instance (if enabled) for monitoring
   */
  circuitBreaker: CircuitBreaker | undefined;
}

/**
 * Create resilience middleware for the Jira client
 *
 * This function creates a composed middleware that includes:
 * - Retry with exponential backoff for transient failures
 * - Client-side rate limiting to avoid hitting Jira's limits
 * - Circuit breaker for fail-fast behavior
 *
 * @example
 * ```typescript
 * import { createJiraClient } from '@felixgeelhaar/jira-sdk';
 * import { createResilienceMiddleware } from '@felixgeelhaar/jira-sdk/client/resilience';
 *
 * const { middleware, circuitBreaker } = createResilienceMiddleware();
 *
 * const client = createJiraClient({
 *   host: 'https://your-domain.atlassian.net',
 *   auth: apiTokenAuth,
 *   middleware: [middleware],
 * });
 *
 * // Monitor circuit breaker state
 * console.log(circuitBreaker?.getStats());
 * ```
 *
 * @example Custom configuration
 * ```typescript
 * const { middleware } = createResilienceMiddleware({
 *   retry: {
 *     maxRetries: 5,
 *     initialDelayMs: 500,
 *   },
 *   rateLimit: false, // Disable rate limiting
 *   circuitBreaker: {
 *     failureThreshold: 10,
 *     resetTimeoutMs: 60000,
 *   },
 * });
 * ```
 */
export function createResilienceMiddleware(
  config: ResilienceConfig = DEFAULT_RESILIENCE_CONFIG
): ResilienceMiddlewareResult {
  const middlewares: Middleware[] = [];
  let circuitBreakerInstance: CircuitBreaker | undefined;

  // Order matters! Circuit breaker should be outermost, then rate limit, then retry
  // This ensures:
  // 1. Circuit breaker fails fast before any work
  // 2. Rate limiting prevents too many requests
  // 3. Retry handles transient failures

  // Circuit breaker (outermost)
  if (config.circuitBreaker !== false) {
    circuitBreakerInstance = new CircuitBreaker(config.circuitBreaker);
    middlewares.push(createCircuitBreakerMiddleware(circuitBreakerInstance));
  }

  // Rate limiting
  if (config.rateLimit !== false && config.rateLimit) {
    middlewares.push(createRateLimitMiddleware(config.rateLimit));
  }

  // Retry (innermost - closest to actual request)
  if (config.retry !== false) {
    middlewares.push(createRetryMiddleware(config.retry));
  }

  // Compose all middleware into one
  const middleware = middlewares.length === 1 ? middlewares[0]! : composeMiddleware(...middlewares);

  return {
    middleware,
    circuitBreaker: circuitBreakerInstance,
  };
}

/**
 * Create a Jira client option that adds resilience middleware
 *
 * @example
 * ```typescript
 * import { JiraClient, withResilience } from '@felixgeelhaar/jira-sdk';
 *
 * const client = new JiraClient(
 *   { host: '...', auth: '...' },
 *   withResilience()
 * );
 * ```
 */
export function withResilience(config?: ResilienceConfig) {
  const { middleware, circuitBreaker } = createResilienceMiddleware(
    config ?? DEFAULT_RESILIENCE_CONFIG
  );

  // Return a function that modifies the internal config
  // This will be used by the JiraClient constructor
  return (internalConfig: { middleware?: Middleware[] }): void => {
    internalConfig.middleware = [middleware, ...(internalConfig.middleware ?? [])];

    // Attach circuit breaker to config for monitoring
    (internalConfig as { circuitBreaker: CircuitBreaker | undefined }).circuitBreaker =
      circuitBreaker;
  };
}

// Re-export types for convenience
export type { RetryMiddlewareConfig, RateLimitMiddlewareConfig, CircuitBreakerConfig };

export { CircuitBreaker, CircuitBreakerOpenError, CircuitState } from '@felixgeelhaar/sdk-core';
