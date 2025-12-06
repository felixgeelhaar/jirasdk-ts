# @felixgeelhaar/sdk-core

Shared infrastructure for Atlassian Cloud API SDKs - authentication, HTTP transport, errors, middleware, and resilience patterns.

## Overview

This package provides the foundational building blocks for creating type-safe, resilient API clients:

- **Authentication**: Multiple auth providers (API Token, PAT, Basic, OAuth2)
- **HTTP Transport**: Configurable HTTP client with middleware support
- **Error Handling**: Hierarchical error types for precise error handling
- **Middleware**: Extensible request/response processing pipeline
- **Resilience**: Circuit breaker, retry, and rate limiting patterns
- **Logging**: Pluggable logging abstraction

## Installation

```bash
npm install @felixgeelhaar/sdk-core
# or
pnpm add @felixgeelhaar/sdk-core
```

## Authentication Providers

### API Token (Atlassian Cloud)

```typescript
import { createApiTokenAuth } from '@felixgeelhaar/sdk-core';

const auth = createApiTokenAuth({
  email: 'your-email@example.com',
  apiToken: 'your-api-token',
});
```

### Personal Access Token (Server/Data Center)

```typescript
import { createPatAuth } from '@felixgeelhaar/sdk-core';

const auth = createPatAuth({
  token: 'your-personal-access-token',
});
```

### Basic Auth

```typescript
import { createBasicAuth } from '@felixgeelhaar/sdk-core';

const auth = createBasicAuth({
  username: 'your-username',
  password: 'your-password',
});
```

### OAuth 2.0

```typescript
import { createOAuth2Auth } from '@felixgeelhaar/sdk-core';

const auth = createOAuth2Auth({
  clientId: 'your-client-id',
  clientSecret: 'your-client-secret',
  accessToken: 'current-access-token',
  refreshToken: 'refresh-token',
  expiresAt: Date.now() + 3600000,
});

// Automatic token refresh with persistence callback
auth.onTokenRefresh = async (tokens) => {
  await saveTokensToDatabase(tokens);
};
```

## HTTP Client

```typescript
import { HttpClient, createApiTokenAuth } from '@felixgeelhaar/sdk-core';

const client = new HttpClient({
  baseUrl: 'https://your-domain.atlassian.net',
  auth: createApiTokenAuth({ email: '...', apiToken: '...' }),
  timeout: 30000,
});

// Make requests
const response = await client.get('/rest/api/3/myself');
const created = await client.post('/rest/api/3/issue', { fields: { ... } });
```

## Middleware

The HTTP client supports a middleware pipeline for cross-cutting concerns:

### Built-in Middleware

```typescript
import {
  HttpClient,
  createLoggingMiddleware,
  createRetryMiddleware,
  createRateLimitMiddleware,
  createRequestIdMiddleware,
  createUserAgentMiddleware,
  ConsoleLogger,
} from '@felixgeelhaar/sdk-core';

const logger = new ConsoleLogger('debug');

const client = new HttpClient({
  baseUrl: 'https://api.example.com',
  middleware: [
    createLoggingMiddleware(logger),
    createRequestIdMiddleware(),
    createUserAgentMiddleware('MyApp/1.0'),
    createRetryMiddleware({
      maxRetries: 3,
      initialDelayMs: 1000,
      maxDelayMs: 30000,
      multiplier: 2,
      jitter: true,
    }),
    createRateLimitMiddleware({
      maxRequests: 100,
      windowMs: 60000,
      waitForSlot: true,
    }),
  ],
});
```

### Custom Middleware

```typescript
import type { Middleware } from '@felixgeelhaar/sdk-core';

const customMiddleware: Middleware = async (context, next) => {
  // Pre-request processing
  console.log('Request:', context.request.url);

  const response = await next(context);

  // Post-response processing
  console.log('Response:', response.status);

  return response;
};

client.use(customMiddleware);
```

### Composing Middleware

```typescript
import { composeMiddleware } from '@felixgeelhaar/sdk-core';

const combined = composeMiddleware(
  loggingMiddleware,
  retryMiddleware,
  rateLimitMiddleware
);

const client = new HttpClient({
  baseUrl: 'https://api.example.com',
  middleware: [combined],
});
```

## Circuit Breaker

Implement fail-fast behavior for cascading failure prevention:

```typescript
import {
  CircuitBreaker,
  createCircuitBreakerMiddleware,
  CircuitState,
} from '@felixgeelhaar/sdk-core';

const circuitBreaker = new CircuitBreaker({
  failureThreshold: 5,      // Open after 5 failures
  resetTimeoutMs: 30000,    // Try again after 30 seconds
  failureWindowMs: 60000,   // Count failures within 60 seconds
  successThreshold: 1,      // Close after 1 success in half-open
});

const client = new HttpClient({
  baseUrl: 'https://api.example.com',
  middleware: [createCircuitBreakerMiddleware(circuitBreaker)],
});

// Monitor circuit state
console.log(circuitBreaker.getStats());
// { state: 'CLOSED', failures: 0, successes: 5, ... }

// Check state
if (circuitBreaker.getState() === CircuitState.OPEN) {
  console.log('Circuit is open - requests will fail fast');
}
```

## Error Handling

The package provides a hierarchical error system:

```typescript
import {
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
  CircuitBreakerOpenError,
} from '@felixgeelhaar/sdk-core';

try {
  await client.get('/resource');
} catch (error) {
  if (error instanceof NotFoundError) {
    // 404 - Resource doesn't exist
  } else if (error instanceof UnauthorizedError) {
    // 401 - Invalid or expired credentials
  } else if (error instanceof ForbiddenError) {
    // 403 - Insufficient permissions
  } else if (error instanceof RateLimitError) {
    // 429 - Rate limit exceeded
    console.log(`Retry after ${error.retryAfter}ms`);
  } else if (error instanceof ServerError) {
    // 5xx - Server error
  } else if (error instanceof TimeoutError) {
    // Request timed out
  } else if (error instanceof NetworkError) {
    // Network connectivity issue
  } else if (error instanceof CircuitBreakerOpenError) {
    // Circuit breaker is open
  } else if (error instanceof ApiError) {
    // Other API errors
    console.log(error.statusCode, error.responseBody);
  }
}
```

## Logging

Pluggable logging with multiple implementations:

```typescript
import { ConsoleLogger, NoopLogger, type Logger } from '@felixgeelhaar/sdk-core';

// Console logger with configurable level
const logger = new ConsoleLogger('info'); // 'debug' | 'info' | 'warn' | 'error'

// Silent logger for tests
const silent = new NoopLogger();

// Custom logger
const customLogger: Logger = {
  debug: (message, context) => myLogger.debug(message, context),
  info: (message, context) => myLogger.info(message, context),
  warn: (message, context) => myLogger.warn(message, context),
  error: (message, context) => myLogger.error(message, context),
};
```

## Security Features

### HTTPS Enforcement

By default, the HTTP client enforces HTTPS in production:

```typescript
// This will throw in production (NODE_ENV=production)
const client = new HttpClient({
  baseUrl: 'http://insecure-api.com', // Error!
});

// Allow HTTP for testing (not recommended for production)
const client = new HttpClient({
  baseUrl: 'http://internal-api.local',
  allowInsecureHttp: true,
});

// Localhost is always allowed for development
const client = new HttpClient({
  baseUrl: 'http://localhost:3000', // OK
});
```

### OAuth2 Thread Safety

The OAuth2 provider uses a mutex pattern to prevent concurrent token refresh races:

```typescript
const auth = createOAuth2Auth({ ... });

// Multiple concurrent requests won't cause multiple refresh calls
await Promise.all([
  client.get('/api/resource1'),
  client.get('/api/resource2'),
  client.get('/api/resource3'),
]);
```

## Subpath Exports

Import specific modules for better tree-shaking:

```typescript
// Auth only
import { createApiTokenAuth } from '@felixgeelhaar/sdk-core/auth';

// Transport only
import { HttpClient } from '@felixgeelhaar/sdk-core/transport';

// Errors only
import { ApiError, NotFoundError } from '@felixgeelhaar/sdk-core/errors';

// Schemas only
import { PaginationSchema } from '@felixgeelhaar/sdk-core/schemas';
```

## TypeScript Support

Full TypeScript support with strict mode enabled:

```typescript
import type {
  AuthProvider,
  HttpRequest,
  HttpResponse,
  Middleware,
  MiddlewareContext,
  Logger,
  LogLevel,
} from '@felixgeelhaar/sdk-core';
```

## API Reference

### HttpClient

| Method | Description |
|--------|-------------|
| `get(path, params?, options?)` | Make a GET request |
| `post(path, body?, options?)` | Make a POST request |
| `put(path, body?, options?)` | Make a PUT request |
| `patch(path, body?, options?)` | Make a PATCH request |
| `delete(path, options?)` | Make a DELETE request |
| `request(config)` | Make a request with full control |
| `use(middleware)` | Add middleware to the chain |

### CircuitBreaker

| Method | Description |
|--------|-------------|
| `execute(fn)` | Execute function through circuit breaker |
| `getState()` | Get current state (CLOSED, OPEN, HALF_OPEN) |
| `getStats()` | Get statistics and metrics |
| `reset()` | Reset to closed state |

### AuthProvider Interface

| Method | Description |
|--------|-------------|
| `getAuthHeaders()` | Get authentication headers |
| `isValid()` | Check if credentials are valid |
| `refresh()` | Refresh credentials (OAuth2 only) |

## License

MIT
