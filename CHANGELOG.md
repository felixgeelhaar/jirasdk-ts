# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Initial release of the Jira SDK TypeScript monorepo
- `@felixgeelhaar/sdk-core` package with shared SDK infrastructure
- `@felixgeelhaar/jira-sdk` package for Jira REST API

### Core Package (`@felixgeelhaar/sdk-core`)

#### Authentication
- API Token authentication for Atlassian Cloud
- Personal Access Token (PAT) authentication for Server/Data Center
- Basic authentication support
- OAuth 2.0 with automatic token refresh and mutex for concurrent requests

#### HTTP Transport
- HTTP client with middleware architecture
- Automatic JSON serialization/deserialization
- Request timeout handling
- AbortSignal support for request cancellation
- HTTPS enforcement in production environments

#### Error Handling
- Hierarchical error system with specific error types
- `ApiError`, `UnauthorizedError`, `ForbiddenError`, `NotFoundError`
- `RateLimitError` with retry-after support
- `ServerError`, `NetworkError`, `TimeoutError`, `AbortError`
- `ValidationError` for Zod schema validation failures

#### Middleware
- Logging middleware with configurable logger
- Retry middleware with exponential backoff and jitter
- Rate limiting middleware with token bucket algorithm
- Circuit breaker pattern for fail-fast behavior
- Request ID middleware for correlation
- User-Agent middleware for identification
- `composeMiddleware` for combining multiple middleware

#### Circuit Breaker
- Three states: CLOSED, OPEN, HALF_OPEN
- Configurable failure threshold and reset timeout
- Stats and monitoring capabilities

#### Logging
- Pluggable logging abstraction
- ConsoleLogger with configurable log levels
- NoopLogger for silent operation

#### Schemas
- Common Zod schemas for Jira data types
- Pagination schemas
- DateTime schemas with ISO 8601 support
- ADF (Atlassian Document Format) schema
- User schema with account info

### Jira Package (`@felixgeelhaar/jira-sdk`)

#### Services
- **IssueService**: CRUD operations, transitions, comments, attachments
- **ProjectService**: List and get project details
- **SearchService**: JQL queries with pagination
- **UserService**: Get users, search, find assignable users

#### Schemas
- Issue schemas with fields, changelog, transitions
- Project schemas with components, versions, roles
- Comment and worklog schemas
- Attachment schemas

#### Resilience
- `createResilienceMiddleware` for combined resilience features
- `withResilience` helper for easy client configuration
- Default configuration optimized for Jira Cloud rate limits

### Security
- HTTPS enforcement by default (HTTP throws in production)
- OAuth2 token refresh race condition prevention
- Credential safety with redacted headers in logs

### Developer Experience
- Full TypeScript support with strict mode
- Zod runtime validation for all API responses
- Tree-shakeable ESM and CJS builds
- Subpath exports for selective imports
- Comprehensive JSDoc documentation
- 231 tests (171 core + 60 jira) with 100% pass rate

## [0.1.0] - TBD

Initial release

[unreleased]: https://github.com/felixgeelhaar/jirasdk-ts/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/felixgeelhaar/jirasdk-ts/releases/tag/v0.1.0
