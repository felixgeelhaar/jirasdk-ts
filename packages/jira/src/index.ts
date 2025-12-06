// Re-export core utilities
export {
  // Auth
  ApiTokenAuth,
  PatAuth,
  BasicAuth,
  OAuth2Auth,
  createApiTokenAuth,
  createPatAuth,
  createBasicAuth,
  createOAuth2Auth,
  type AuthProvider,
  type ApiTokenAuthConfig,
  type PatAuthConfig,
  type BasicAuthConfig,
  type OAuth2AuthConfig,
  // Logging
  ConsoleLogger,
  NoopLogger,
  type Logger,
  type LogLevel,
  // Errors
  JiraSdkError,
  ApiError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  RateLimitError,
  ServerError,
  NetworkError,
  TimeoutError,
  AbortError,
  ValidationError,
  ConfigValidationError,
  ResponseValidationError,
  AuthError,
  AuthConfigError,
  TokenRefreshError,
  TokenExpiredError,
  // Middleware
  createLoggingMiddleware,
  createRetryMiddleware,
  createRateLimitMiddleware,
  createRequestIdMiddleware,
  createUserAgentMiddleware,
  composeMiddleware,
  type Middleware,
  type MiddlewareContext,
  // Circuit Breaker
  CircuitBreaker,
  CircuitState,
  CircuitBreakerOpenError,
  createCircuitBreakerMiddleware,
  createDefaultCircuitBreaker,
  type CircuitBreakerConfig,
} from '@felixgeelhaar/sdk-core';

// Resilience
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
