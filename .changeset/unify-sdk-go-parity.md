---
'@felixgeelhaar/jira-sdk': major
---

Unify the SDK into a single package and reach feature parity with the Go SDK (jirasdk v1.7.1).

## Breaking

- **`@felixgeelhaar/sdk-core` is merged into `@felixgeelhaar/jira-sdk` and is no longer published separately.** Everything it exported is now available from `@felixgeelhaar/jira-sdk`, and the `./auth`, `./transport` and `./errors` subpaths are preserved. Consumers importing from `@felixgeelhaar/sdk-core` should change the specifier; no symbol names changed.
- **`withTimeout` is now unambiguously the client option** `withTimeout(ms)`. The unrelated promise helper that shared the name — previously reachable only from `sdk-core` — is renamed `promiseWithTimeout(promise, ms)`. The two never collided before because they lived in different packages.
- `TimeTrackingConfiguration` was defined identically in both the `serverinfo` and `timetracking` domains. The `timetracking` domain now owns it.

## Added — 23 new services

The SDK covered 4 Jira domains; it now covers all 27, matching the Go SDK: `agile`, `appProperties`, `audit`, `bulk`, `dashboards`, `expressions`, `fields`, `filters`, `groups`, `issueLinkTypes`, `issueTypes`, `labels`, `myself`, `notifications`, `permissions`, `priorities`, `resolutions`, `screens`, `securityLevels`, `serverInfo`, `timeTracking`, `webhooks`, `workflows`.

Every service is reachable from the client (`client.agile`, `client.webhooks`, …) and constructed lazily on first access. Paginated endpoints expose an async iterator plus an `all()` collector.

Includes the two v1.6.0 feature groups that motivated the Go release:

- **Field context ↔ project association** (Atlassian CHANGE-3033) — `associateContextProjects`, `removeContextProjects`, `getContextProjectMappings`. Needed because creating a custom field no longer auto-associates it with projects.
- **Issue type scheme management** (CHANGE-2999/3000) — the seven `*IssueTypeScheme*` methods. Needed because creating an issue type no longer auto-adds it to the default scheme.

## Added — existing services extended to parity

- `ProjectService`: components and versions (10 methods)
- `UserService`: bulk get, user properties, groups, default columns, permission-scoped search (11 methods)
- `SearchService`: the **Enhanced JQL Search API** (`searchJql`, `iterateJql`, `allJql`) with `nextPageToken` pagination and `maxResults` up to 5000. The legacy `startAt`-based methods are kept and marked deprecated.
- `IssueService`: ADF-flattening and date-parsing accessors, and immutable ADF-aware setters.

## Added — developer experience

- `AdfBuilder` — fluent, immutable Atlassian Document Format construction.
- `JqlQueryBuilder` — fluent JQL with automatic escaping, plus `parseIssueUrl`.
- `CustomFields` — typed get/set for `customfield_*` values.
- `paginate` / `paginateByToken` — shared async-iterator primitives for both Jira pagination styles.
- `parseDuration` / `formatDuration` — Jira duration strings (`"3h 30m"`) to and from seconds. Note the Go SDK's `ParseDuration` is an unimplemented stub; this is a real implementation.
- Environment-variable configuration (`createJiraClientFromEnv`, `withEnv`, `loadConfigFromEnv`) reading the same `JIRA_*` variables as the Go SDK, with the same credential resolution order.
- Beta rate-limit header parsing (CHANGE-3045). Where the Go SDK only logs these, `createRateLimitHeaderMiddleware` surfaces them through a callback so consumers can throttle before Jira starts returning 429s.

## Fixed

- **`withResilience()` did nothing.** It returned `(config) => void` while `JiraClientOption` is `(config) => config`, so folding it into the constructor replaced the config with `undefined`. It now returns a real option, and disables the client's built-in retry so the two retry layers do not compound into `maxRetries * maxRetries` attempts. The circuit breaker is exposed as `client.circuitBreaker`.
- **The User-Agent advertised a stale version.** `SDK_VERSION` was hardcoded at `0.1.0` while the package shipped `0.3.0`. It is now injected from `package.json` at build time.
- **`allowInsecureHttp` was documented but not implemented.** The README described it as a client option, but it was absent from `JiraClientConfig` and never forwarded to the transport.
- **`RequestOptions` did not declare `params`.** Query parameters did reach the wire (the options spread carried them), so this was a type-safety hole rather than a runtime bug — but it defeated type checking at roughly 20 call sites, which used `{ params } as never` to get past the compiler. `params` is now declared and the casts are gone.
- `ValidationError`'s `ZodError` argument is now optional, so configuration failures that are not schema-driven can use the same error type.
- `Logger` is re-exported from `transport/types.ts`; it appears in `MiddlewareContext` and `HttpClientConfig`, so the `./transport` subpath was not self-contained without it.

## Security

The Go SDK's JQL `quote()` escapes double quotes but not backslashes, and only quotes conditionally. A value such as `a\" OR project = X` therefore terminates the string literal early and injects live JQL. `quoteJqlValue` in this SDK always quotes and escapes the backslash first; a regression test asserts the Go-vulnerable payload is neutralised. This has been reported for the Go SDK separately.

## Internal

- Tests are now included in type checking; the per-package tsconfigs excluded `**/*.test.ts`, which had allowed mock objects to drift out of sync with the types they stand in for.
- Coverage thresholds are enforced in CI (80% lines/functions/statements, 75% branches).
- Test count: 241 → 877.
