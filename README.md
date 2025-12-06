# Jira SDK TypeScript

A type-safe, production-ready SDK for the Jira REST API with built-in resilience patterns.

## Features

- **Type-Safe**: Full TypeScript support with strict mode enabled
- **Runtime Validation**: Zod schemas for request/response validation
- **Resilience Built-In**: Circuit breaker, retry with exponential backoff, rate limiting
- **Multiple Auth Methods**: API Token, Personal Access Token, Basic Auth, OAuth 2.0
- **Middleware Architecture**: Extensible request/response processing pipeline
- **Tree-Shakeable**: ESM and CJS builds with proper exports

## Packages

| Package | Description |
|---------|-------------|
| [@felixgeelhaar/jira-sdk](./packages/jira) | Jira REST API client |
| [@felixgeelhaar/sdk-core](./packages/core) | Shared SDK infrastructure |

## Quick Start

### Installation

```bash
npm install @felixgeelhaar/jira-sdk
# or
pnpm add @felixgeelhaar/jira-sdk
# or
yarn add @felixgeelhaar/jira-sdk
```

### Basic Usage

```typescript
import { createJiraClient, createApiTokenAuth } from '@felixgeelhaar/jira-sdk';

// Create auth provider
const auth = createApiTokenAuth({
  email: 'your-email@example.com',
  apiToken: 'your-api-token',
});

// Create client
const client = createJiraClient({
  host: 'https://your-domain.atlassian.net',
  auth,
});

// Fetch an issue
const issue = await client.issues.get('PROJ-123');
console.log(issue.fields.summary);

// Search with JQL
const results = await client.search.jql('project = PROJ AND status = Open');
for (const issue of results.issues) {
  console.log(issue.key, issue.fields.summary);
}

// Create an issue
const newIssue = await client.issues.create({
  fields: {
    project: { key: 'PROJ' },
    summary: 'New issue from SDK',
    issuetype: { name: 'Task' },
  },
});
```

### With Resilience

```typescript
import {
  createJiraClient,
  createApiTokenAuth,
  createResilienceMiddleware
} from '@felixgeelhaar/jira-sdk';

const auth = createApiTokenAuth({
  email: 'your-email@example.com',
  apiToken: 'your-api-token',
});

// Create resilience middleware with circuit breaker, retry, and rate limiting
const { middleware, circuitBreaker } = createResilienceMiddleware({
  retry: {
    maxRetries: 3,
    initialDelayMs: 1000,
    maxDelayMs: 30000,
  },
  rateLimit: {
    maxRequests: 90,
    windowMs: 60000,
  },
  circuitBreaker: {
    failureThreshold: 5,
    resetTimeoutMs: 30000,
  },
});

const client = createJiraClient({
  host: 'https://your-domain.atlassian.net',
  auth,
  middleware: [middleware],
});

// Monitor circuit breaker state
console.log(circuitBreaker?.getStats());
```

## Authentication Methods

### API Token (Atlassian Cloud)

```typescript
import { createApiTokenAuth } from '@felixgeelhaar/jira-sdk';

const auth = createApiTokenAuth({
  email: 'your-email@example.com',
  apiToken: 'your-api-token', // From https://id.atlassian.com/manage-profile/security/api-tokens
});
```

### Personal Access Token (Server/Data Center)

```typescript
import { createPatAuth } from '@felixgeelhaar/jira-sdk';

const auth = createPatAuth({
  token: 'your-personal-access-token',
});
```

### OAuth 2.0

```typescript
import { createOAuth2Auth } from '@felixgeelhaar/jira-sdk';

const auth = createOAuth2Auth({
  clientId: 'your-client-id',
  clientSecret: 'your-client-secret',
  accessToken: 'current-access-token',
  refreshToken: 'refresh-token',
  expiresAt: Date.now() + 3600000, // 1 hour
});

// Automatic token refresh with callback
auth.onTokenRefresh = async (tokens) => {
  await saveTokensToDatabase(tokens);
};
```

## Available Services

- **Issues**: Get, create, update, delete, transitions, comments, attachments
- **Projects**: List, get project details
- **Search**: JQL queries with pagination
- **Users**: Get by ID/email, search users

## Error Handling

```typescript
import {
  ApiError,
  UnauthorizedError,
  NotFoundError,
  RateLimitError,
  NetworkError,
} from '@felixgeelhaar/jira-sdk';

try {
  const issue = await client.issues.get('PROJ-999');
} catch (error) {
  if (error instanceof NotFoundError) {
    console.log('Issue not found');
  } else if (error instanceof UnauthorizedError) {
    console.log('Invalid credentials');
  } else if (error instanceof RateLimitError) {
    console.log(`Rate limited. Retry after ${error.retryAfter}ms`);
  } else if (error instanceof NetworkError) {
    console.log('Network error:', error.message);
  }
}
```

## Configuration Options

```typescript
const client = createJiraClient({
  host: 'https://your-domain.atlassian.net',
  auth,
  apiVersion: '3',        // Jira API version (default: '3')
  timeout: 30000,         // Request timeout in ms (default: 30000)
  middleware: [],         // Custom middleware
  allowInsecureHttp: false, // Allow HTTP (not recommended)
});
```

## Development

### Prerequisites

- Node.js >= 18.0.0
- pnpm >= 9.0.0

### Setup

```bash
# Install dependencies
pnpm install

# Build all packages
pnpm build

# Run tests
pnpm test

# Type check
pnpm typecheck
```

### Project Structure

```
jirasdk-ts/
├── packages/
│   ├── core/           # @felixgeelhaar/sdk-core
│   │   ├── src/
│   │   │   ├── auth/       # Authentication providers
│   │   │   ├── errors/     # Error hierarchy
│   │   │   ├── logging/    # Logging abstraction
│   │   │   ├── schemas/    # Common Zod schemas
│   │   │   ├── transport/  # HTTP client & middleware
│   │   │   └── utils/      # Utility functions
│   │   └── package.json
│   └── jira/           # @felixgeelhaar/jira-sdk
│       ├── src/
│       │   ├── client/     # Jira client configuration
│       │   ├── schemas/    # Jira-specific schemas
│       │   └── services/   # Domain services
│       └── package.json
├── package.json
└── pnpm-workspace.yaml
```

## Security

- **HTTPS Required**: HTTP URLs throw in production (configurable)
- **Credential Safety**: Sensitive headers automatically redacted in logs
- **Token Refresh**: OAuth2 uses mutex to prevent concurrent refresh races

## License

MIT
