# @felixgeelhaar/jira-sdk

Type-safe TypeScript SDK for the Atlassian Jira REST API with Zod validation and built-in resilience.

## Features

- **Type-Safe**: Full TypeScript support with strict mode
- **Runtime Validation**: Zod schemas for request/response validation
- **Resilience Built-In**: Circuit breaker, retry, rate limiting
- **Multiple Auth Methods**: API Token, PAT, Basic Auth, OAuth 2.0
- **Middleware Architecture**: Extensible request/response pipeline
- **Tree-Shakeable**: ESM and CJS builds with proper exports

## Installation

```bash
npm install @felixgeelhaar/jira-sdk
# or
pnpm add @felixgeelhaar/jira-sdk
# or
yarn add @felixgeelhaar/jira-sdk
```

## Quick Start

```typescript
import { createJiraClient, createApiTokenAuth } from '@felixgeelhaar/jira-sdk';

// Create auth provider
const auth = createApiTokenAuth({
  email: 'your-email@example.com',
  apiToken: 'your-api-token', // From https://id.atlassian.com/manage-profile/security/api-tokens
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
```

## Authentication

### API Token (Atlassian Cloud)

Recommended for Atlassian Cloud instances:

```typescript
import { createApiTokenAuth } from '@felixgeelhaar/jira-sdk';

const auth = createApiTokenAuth({
  email: 'your-email@example.com',
  apiToken: 'your-api-token',
});
```

Get your API token from [Atlassian Account Settings](https://id.atlassian.com/manage-profile/security/api-tokens).

### Personal Access Token (Server/Data Center)

For Jira Server or Data Center:

```typescript
import { createPatAuth } from '@felixgeelhaar/jira-sdk';

const auth = createPatAuth({
  token: 'your-personal-access-token',
});
```

### Basic Auth

```typescript
import { createBasicAuth } from '@felixgeelhaar/jira-sdk';

const auth = createBasicAuth({
  username: 'your-username',
  password: 'your-password',
});
```

### OAuth 2.0

For OAuth 2.0 3LO (three-legged OAuth):

```typescript
import { createOAuth2Auth } from '@felixgeelhaar/jira-sdk';

const auth = createOAuth2Auth({
  clientId: 'your-client-id',
  clientSecret: 'your-client-secret',
  accessToken: 'current-access-token',
  refreshToken: 'refresh-token',
  expiresAt: Date.now() + 3600000,
});

// Automatic token refresh with persistence
auth.onTokenRefresh = async (tokens) => {
  await saveTokensToDatabase(tokens);
};
```

## Services

### Issues

```typescript
// Get an issue
const issue = await client.issues.get('PROJ-123');
const issue = await client.issues.get('PROJ-123', {
  fields: ['summary', 'status', 'assignee'],
  expand: ['changelog', 'renderedFields'],
});

// Create an issue
const newIssue = await client.issues.create({
  fields: {
    project: { key: 'PROJ' },
    summary: 'New issue from SDK',
    description: 'Detailed description here',
    issuetype: { name: 'Task' },
    priority: { name: 'High' },
    assignee: { accountId: 'user-account-id' },
  },
});

// Update an issue
await client.issues.update('PROJ-123', {
  fields: {
    summary: 'Updated summary',
    description: 'New description',
  },
});

// Delete an issue
await client.issues.delete('PROJ-123');

// Transition an issue
await client.issues.transition('PROJ-123', {
  transition: { id: '31' }, // Transition ID
});

// Get available transitions
const transitions = await client.issues.getTransitions('PROJ-123');
```

### Comments

```typescript
// Get comments
const comments = await client.issues.getComments('PROJ-123');

// Add a comment
await client.issues.addComment('PROJ-123', {
  body: 'This is a comment from the SDK',
});

// Update a comment
await client.issues.updateComment('PROJ-123', 'comment-id', {
  body: 'Updated comment text',
});

// Delete a comment
await client.issues.deleteComment('PROJ-123', 'comment-id');
```

### Search (JQL)

```typescript
// Simple JQL search
const results = await client.search.jql('project = PROJ');

// Advanced search with options
const results = await client.search.jql(
  'project = PROJ AND status = "In Progress" ORDER BY created DESC',
  {
    startAt: 0,
    maxResults: 50,
    fields: ['summary', 'status', 'assignee'],
    expand: ['changelog'],
  }
);

// Iterate through all results
for (const issue of results.issues) {
  console.log(`${issue.key}: ${issue.fields.summary}`);
}

// Pagination info
console.log(`Showing ${results.startAt + 1} to ${results.startAt + results.issues.length} of ${results.total}`);
```

### Projects

```typescript
// List all projects
const projects = await client.projects.list();

// Get a project
const project = await client.projects.get('PROJ');
const project = await client.projects.get('PROJ', {
  expand: ['description', 'lead', 'issueTypes'],
});
```

### Users

```typescript
// Get current user
const myself = await client.users.getCurrentUser();

// Get user by account ID
const user = await client.users.get('account-id');

// Search users
const users = await client.users.search({
  query: 'john',
  maxResults: 10,
});

// Find users assignable to a project
const assignable = await client.users.findAssignable({
  project: 'PROJ',
  query: 'jane',
});
```

## Resilience

### Built-in Resilience Middleware

Add retry, rate limiting, and circuit breaker with one call:

```typescript
import { createJiraClient, createResilienceMiddleware } from '@felixgeelhaar/jira-sdk';

const { middleware, circuitBreaker } = createResilienceMiddleware({
  retry: {
    maxRetries: 3,
    initialDelayMs: 1000,
    maxDelayMs: 30000,
    multiplier: 2,
    jitter: true,
  },
  rateLimit: {
    maxRequests: 90,    // Jira Cloud limit is ~100/min
    windowMs: 60000,
    waitForSlot: true,
  },
  circuitBreaker: {
    failureThreshold: 5,
    resetTimeoutMs: 30000,
    failureWindowMs: 60000,
  },
});

const client = createJiraClient({
  host: 'https://your-domain.atlassian.net',
  auth,
  middleware: [middleware],
});

// Monitor circuit breaker
setInterval(() => {
  const stats = circuitBreaker?.getStats();
  console.log('Circuit state:', stats?.state);
}, 10000);
```

### Using Default Configuration

```typescript
import { createJiraClient, withResilience } from '@felixgeelhaar/jira-sdk';

// Apply default resilience configuration
const options = withResilience();

const client = createJiraClient({
  host: 'https://your-domain.atlassian.net',
  auth,
  ...options,
});
```

### Disable Specific Features

```typescript
const { middleware } = createResilienceMiddleware({
  retry: {
    maxRetries: 5,
    initialDelayMs: 500,
  },
  rateLimit: false,      // Disable rate limiting
  circuitBreaker: false, // Disable circuit breaker
});
```

## Error Handling

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
  ValidationError,
  CircuitBreakerOpenError,
} from '@felixgeelhaar/jira-sdk';

try {
  const issue = await client.issues.get('PROJ-999');
} catch (error) {
  if (error instanceof NotFoundError) {
    console.log('Issue not found');
  } else if (error instanceof UnauthorizedError) {
    console.log('Invalid credentials - check your API token');
  } else if (error instanceof ForbiddenError) {
    console.log('You do not have permission to access this issue');
  } else if (error instanceof RateLimitError) {
    console.log(`Rate limited. Retry after ${error.retryAfter}ms`);
  } else if (error instanceof ServerError) {
    console.log('Jira server error - try again later');
  } else if (error instanceof NetworkError) {
    console.log('Network error:', error.message);
  } else if (error instanceof TimeoutError) {
    console.log('Request timed out');
  } else if (error instanceof CircuitBreakerOpenError) {
    console.log('Circuit breaker open - Jira may be unavailable');
  } else if (error instanceof ValidationError) {
    console.log('Invalid data:', error.errors);
  } else if (error instanceof ApiError) {
    console.log(`API error ${error.statusCode}:`, error.responseBody);
  }
}
```

## Configuration Options

```typescript
const client = createJiraClient({
  // Required
  host: 'https://your-domain.atlassian.net',
  auth,

  // Optional
  apiVersion: '3',           // Jira API version (default: '3')
  timeout: 30000,            // Request timeout in ms (default: 30000)
  middleware: [],            // Custom middleware
  allowInsecureHttp: false,  // Allow HTTP (not recommended)
});
```

## Request Cancellation

```typescript
const controller = new AbortController();

// Start request
const promise = client.search.jql('project = PROJ', {
  signal: controller.signal,
});

// Cancel after 5 seconds
setTimeout(() => controller.abort(), 5000);

try {
  const results = await promise;
} catch (error) {
  if (error instanceof AbortError) {
    console.log('Request was cancelled');
  }
}
```

## Custom Middleware

```typescript
import type { Middleware } from '@felixgeelhaar/jira-sdk';

// Timing middleware
const timingMiddleware: Middleware = async (context, next) => {
  const start = Date.now();
  const response = await next(context);
  console.log(`${context.request.method} ${context.request.url} - ${Date.now() - start}ms`);
  return response;
};

// Add custom headers
const headerMiddleware: Middleware = async (context, next) => {
  context.request.headers = {
    ...context.request.headers,
    'X-Custom-Header': 'value',
  };
  return next(context);
};

const client = createJiraClient({
  host: 'https://your-domain.atlassian.net',
  auth,
  middleware: [timingMiddleware, headerMiddleware],
});
```

## Logging

```typescript
import { createJiraClient, createLoggingMiddleware, ConsoleLogger } from '@felixgeelhaar/jira-sdk';

const logger = new ConsoleLogger('debug');

const client = createJiraClient({
  host: 'https://your-domain.atlassian.net',
  auth,
  middleware: [createLoggingMiddleware(logger)],
});
```

## Subpath Exports

Import specific modules for better tree-shaking:

```typescript
// Schemas only
import { IssueSchema, ProjectSchema } from '@felixgeelhaar/jira-sdk/schemas';

// Services only
import { IssueService, SearchService } from '@felixgeelhaar/jira-sdk/services';
```

## TypeScript Support

Full TypeScript support with strict mode:

```typescript
import type {
  Issue,
  Project,
  User,
  SearchResults,
  JiraClientConfig,
  ResilienceConfig,
} from '@felixgeelhaar/jira-sdk';

// Type-safe issue fields
const issue: Issue = await client.issues.get('PROJ-123');
console.log(issue.fields.summary); // Type-safe access
```

## Examples

### Bulk Operations

```typescript
// Create multiple issues
const issues = await Promise.all([
  client.issues.create({
    fields: {
      project: { key: 'PROJ' },
      summary: 'Task 1',
      issuetype: { name: 'Task' },
    },
  }),
  client.issues.create({
    fields: {
      project: { key: 'PROJ' },
      summary: 'Task 2',
      issuetype: { name: 'Task' },
    },
  }),
]);
```

### Iterate All Issues

```typescript
async function* getAllIssues(client: JiraClient, jql: string) {
  let startAt = 0;
  const maxResults = 100;

  while (true) {
    const results = await client.search.jql(jql, { startAt, maxResults });

    for (const issue of results.issues) {
      yield issue;
    }

    startAt += results.issues.length;
    if (startAt >= results.total) break;
  }
}

// Usage
for await (const issue of getAllIssues(client, 'project = PROJ')) {
  console.log(issue.key);
}
```

### Webhook Handler

```typescript
import express from 'express';
import { IssueSchema } from '@felixgeelhaar/jira-sdk/schemas';

const app = express();

app.post('/webhook/jira', express.json(), (req, res) => {
  const result = IssueSchema.safeParse(req.body.issue);

  if (result.success) {
    console.log('Issue updated:', result.data.key);
    res.sendStatus(200);
  } else {
    console.error('Invalid webhook payload:', result.error);
    res.sendStatus(400);
  }
});
```

## License

MIT
