# Jira SDK TypeScript

[![security](https://raw.githubusercontent.com/felixgeelhaar/jirasdk-ts/main/.github/badges/security.svg)](https://github.com/felixgeelhaar/jirasdk-ts)

A type-safe, production-ready SDK for the Jira REST API with built-in resilience patterns.

## Features

- **Type-Safe**: Full TypeScript support with strict mode enabled
- **Runtime Validation**: Zod schemas for request/response validation
- **Resilience Built-In**: Circuit breaker, retry with exponential backoff, rate limiting
- **Multiple Auth Methods**: API Token, Personal Access Token, Basic Auth, OAuth 2.0
- **Middleware Architecture**: Extensible request/response processing pipeline
- **Tree-Shakeable**: ESM and CJS builds with proper exports

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

### From environment variables

The SDK reads the same variables as the Go SDK, so both can share a deployment's
configuration:

```typescript
import { createJiraClientFromEnv } from '@felixgeelhaar/jira-sdk';

// JIRA_BASE_URL=https://your-domain.atlassian.net
// JIRA_EMAIL=you@example.com
// JIRA_API_TOKEN=...
const client = createJiraClientFromEnv();
```

Credentials resolve in this order: `JIRA_EMAIL` + `JIRA_API_TOKEN`, then
`JIRA_PAT`, then `JIRA_USERNAME` + `JIRA_PASSWORD`, then `JIRA_OAUTH_CLIENT_ID` +
`JIRA_OAUTH_CLIENT_SECRET`. Also read: `JIRA_TIMEOUT` (seconds), `JIRA_MAX_RETRIES`,
`JIRA_USER_AGENT`.

### With Resilience

```typescript
import {
  createJiraClient,
  createApiTokenAuth,
  createResilienceMiddleware,
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

Or apply the whole stack as a client option, which also exposes the breaker on
the client:

```typescript
import { createJiraClient, withResilience } from '@felixgeelhaar/jira-sdk';

const client = createJiraClient({ host, auth }, withResilience());

console.log(client.circuitBreaker?.getStats());
```

`withResilience()` disables the client's built-in retry, since the resilience
stack supplies its own — otherwise the two would compound into
`maxRetries * maxRetries` attempts.

## Building Content and Queries

### Rich text (ADF)

Jira represents descriptions and comment bodies as Atlassian Document Format,
not plain strings:

```typescript
import { AdfBuilder } from '@felixgeelhaar/jira-sdk';

const description = new AdfBuilder()
  .addHeading('Steps to reproduce', 2)
  .addOrderedList(['Open the app', 'Click Save', 'Observe the error'])
  .addCodeBlock('TypeError: undefined is not a function', 'text')
  .toDocument();

await client.issues.create({
  fields: {
    project: { key: 'PROJ' },
    summary: 'Crash on save',
    issuetype: { name: 'Bug' },
    description,
  },
});
```

### JQL

The builder quotes and escapes every value, so user input cannot break out of a
string literal and inject JQL:

```typescript
import { JqlQueryBuilder } from '@felixgeelhaar/jira-sdk';

const jql = new JqlQueryBuilder()
  .project('PROJ')
  .status('In Progress')
  .assignee(untrustedUserInput) // safely escaped
  .orderBy('created', 'DESC')
  .build();

const results = await client.search.jql(jql);
```

### Custom fields

```typescript
import { CustomFields } from '@felixgeelhaar/jira-sdk';

const fields = new CustomFields()
  .setString('customfield_10001', 'Team Alpha')
  .setNumber('customfield_10002', 42)
  .setLabels('customfield_10003', ['backend', 'urgent']);
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

All 27 services are reachable from the client and constructed lazily on first
access, so an application that only touches issues never pays for the rest.

| Area          | Accessor                                   | Covers                                                                     |
| ------------- | ------------------------------------------ | -------------------------------------------------------------------------- |
| Work items    | `client.issues`                            | CRUD, comments, transitions, worklogs, attachments, links, votes, watchers |
|               | `client.projects`                          | CRUD, components, versions, archive/restore                                |
|               | `client.search`                            | JQL search, plus the enhanced token-paginated API                          |
|               | `client.users`                             | Lookup, search, groups, user properties, default columns                   |
| Agile         | `client.agile`                             | Boards, sprints, epics, backlog (`/rest/agile/1.0`)                        |
| Configuration | `client.fields`                            | Custom fields, contexts, options, project association                      |
|               | `client.issueTypes`                        | Issue types and issue type schemes                                         |
|               | `client.issueLinkTypes`                    | Issue link types                                                           |
|               | `client.priorities` / `client.resolutions` | Priorities and resolutions                                                 |
|               | `client.screens`                           | Screens, tabs, screen fields                                               |
|               | `client.workflows`                         | Workflows, statuses, status categories, schemes                            |
| Views         | `client.dashboards`                        | Dashboards and gadgets                                                     |
|               | `client.filters`                           | Saved filters, favourites, share permissions                               |
| Access        | `client.groups`                            | Groups and membership                                                      |
|               | `client.myself`                            | Current user and preferences                                               |
|               | `client.permissions`                       | Permissions, schemes, project roles                                        |
|               | `client.securityLevels`                    | Issue security levels and schemes                                          |
| Operations    | `client.appProperties`                     | Application properties, advanced settings                                  |
|               | `client.audit`                             | Audit records                                                              |
|               | `client.bulk`                              | Bulk create/delete with task progress polling                              |
|               | `client.expressions`                       | Jira expression evaluation and analysis                                    |
|               | `client.labels`                            | Labels and suggestions                                                     |
|               | `client.notifications`                     | Notification schemes, issue notifications                                  |
|               | `client.serverInfo`                        | Server info and instance configuration                                     |
|               | `client.timeTracking`                      | Providers, configuration, worklogs                                         |
|               | `client.webhooks`                          | Registration, refresh, delivery failures                                   |

### Pagination

Every paginated endpoint exposes an async iterator plus an `all()` collector:

```typescript
// Stream, one page fetched at a time
for await (const issue of client.search.iterate('project = PROJ')) {
  console.log(issue.key);
}

// Or collect everything
const boards = await client.agile.allBoards();
```

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
  apiVersion: '3', // Jira API version (default: '3')
  timeout: 30000, // Request timeout in ms (default: 30000)
  middleware: [], // Custom middleware
  allowInsecureHttp: false, // Allow HTTP (not recommended)
});
```

## Development

### Prerequisites

- Node.js >= 20.0.0
- pnpm >= 9.0.0

### Setup

```bash
# Install dependencies
pnpm install

# Build
pnpm build

# Run tests
pnpm test

# Type check
pnpm typecheck
```

### Project Structure

```
jirasdk-ts/
├── src/
│   ├── adf/           # Atlassian Document Format builder
│   ├── auth/          # Authentication providers
│   ├── client/        # Client, options, env configuration
│   ├── custom-fields/ # Typed custom-field accessors
│   ├── errors/        # Error hierarchy
│   ├── jql/           # JQL query builder and escaping
│   ├── logging/       # Logging abstraction
│   ├── pagination/    # Shared pagination primitives
│   ├── schemas/       # Zod schemas, one directory per domain
│   ├── services/      # 27 domain services
│   ├── transport/     # HTTP client, middleware, circuit breaker
│   └── utils/         # Utility functions
└── package.json
```

## Security

- **HTTPS Required**: HTTP URLs throw in production (configurable)
- **Credential Safety**: Sensitive headers automatically redacted in logs
- **Token Refresh**: OAuth2 uses mutex to prevent concurrent refresh races

## License

MIT
