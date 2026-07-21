---
'@felixgeelhaar/jira-sdk': major
---

Unify the SDK into a single package and reach feature parity with the Go SDK (jirasdk v1.7.1).

## Breaking

- **`@felixgeelhaar/sdk-core` is merged into `@felixgeelhaar/jira-sdk` and is no longer published separately.** Everything it exported is now available from `@felixgeelhaar/jira-sdk`, and the `./auth`, `./transport` and `./errors` subpaths are preserved. Consumers importing from `@felixgeelhaar/sdk-core` should change the specifier; no symbol names changed.
- **`withTimeout` is now unambiguously the client option** `withTimeout(ms)`. The unrelated promise helper that shared the name — previously reachable only from `sdk-core` — is renamed `promiseWithTimeout(promise, ms)`. The two never collided before because they lived in different packages.
- `TimeTrackingConfiguration` was defined identically in both the `serverinfo` and `timetracking` domains. The `timetracking` domain now owns it.
- **`Workflow.id` is an object, not a string.** The API returns a `PublishedWorkflowId` (`{ name, entityId? }`) and there is no top-level `name`. The previous schema would have rejected every real response from `workflows.list()`. Read `workflow.id.name` instead of `workflow.name`.
- **Read schemas are lenient about absent fields.** `self` is now optional on all read schemas, and `IssueFields`' `summary`, `issuetype`, `project` and `status` are optional. Reads go through optional chaining (`issue.fields?.status?.name`). See "Fixed" for why.
- `buildQueryString` no longer returns a leading `?`.
- `notifications.addNotification` returns `void` and accepts one notification or several.
- `fields.createOption` is joined by `fields.createOptions`; the endpoint is bulk.
- `labels.list` no longer accepts a `query` option — the endpoint ignored it.

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

## Fixed — verified against the official Jira Cloud OpenAPI spec

A review pass compared the ported surface against Atlassian's OpenAPI spec and found places where the Go SDK is itself wrong, so the faithful port inherited the bug. Each was confirmed against the spec before changing:

- **Every GET with query parameters was malformed.** `buildQueryString` returned a leading `?` while its only caller also prepended a separator, producing `??`. That makes the first parameter's name `?jql` rather than `jql`, so Jira never received it — affecting `expand`, `startAt`, `maxResults` and every filter across all 27 services. The existing tests missed it because they asserted `url.toContain('foo=bar')`, which holds either way.
- **`getIssueLinks` failed 100% of the time.** It requests `fields=issuelinks`, so the response has no `summary`/`issuetype`/`project`/`status` — which `IssueFieldsSchema` required. This was one symptom of a general problem: _any_ narrowed-`fields` request threw `ResponseValidationError` on a valid response.
- **`OptionalJiraDateTimeSchema` was nullable but not optional**, despite the name, so an omitted date key failed validation at all 16 of its use sites.
- **`self` was required on 56 read schemas.** The spec marks no property of `User`, `IssueBean`, `Project`, `Comment` and peers as required. It is still validated as a URL when present.
- **`search.iterate()` could hang forever.** Termination was `startAt < total` alone; a page with zero issues does not advance `startAt`, so the generator spun indefinitely. Jira can return fewer issues than `total` implies under permission filtering.
- **`notifications.addNotification` always returned 405.** It issued `POST .../notification?eventTypeId=N`; that operation does not exist. The path defines only `PUT`, taking a nested `notificationSchemeEvents` array.
- **`projects.list` mis-serialized its filters.** `id`, `keys` and `status` are documented as ampersand-separated (`id=10000&id=10001`) but were comma-joined, so `id` would 400 and `keys`/`status` silently filtered wrongly. `properties` and `expand` stay comma-joined, which is what those two document.
- **`permissions` sent `expand` as repeated keys** where the reference documents a comma-separated list, so all but one value was dropped.
- `dashboards.updateGadget` decoded a body from a 204 response; it now returns `void`.
- `webhooks.deleteWebhooks` sent IDs as query parameters; the endpoint requires a JSON body.
- `webhooks.create` sent the Go SDK's envelope; the real body is `{ url, webhooks: [{ jqlFilter, events }] }` with `url` top-level and no per-webhook `name`.
- `myself.getPreference`/`setPreference` treated the value as a JSON map; the endpoint takes and returns a plain string.
- `workflows.get` called `GET /workflow/{idOrName}`, which does not exist — the path defines only `delete`. Reimplemented over `GET /workflow/search`, preserving ID-or-name lookup.
- `labels.suggest` called `/label/suggest`, which does not exist. Repointed at `/jql/autocompletedata/suggestions`.
- `users.setDefaultColumns` sent a bare array; the body is `{ columns: [...] }`.
- `fields.createOption` posted a bare option; the endpoint is bulk in both directions.

## Deprecated

Duplicate accessors are kept working but marked deprecated:

- `users.getCurrentUser()` → prefer `myself.get()`, which returns the richer `CurrentUser` shape.
- `issues.listIssueLinkTypes()` / `issues.getIssueLinkType()` → prefer `issueLinkTypes.list()` / `.get()`, which also offer create/update/delete.
- The legacy `startAt`-based search methods → prefer the enhanced `searchJql` family.

## Security

The Go SDK's JQL `quote()` escapes double quotes but not backslashes, and only quotes conditionally. A value such as `a\" OR project = X` therefore terminates the string literal early and injects live JQL. `quoteJqlValue` in this SDK always quotes and escapes the backslash first; a regression test asserts the Go-vulnerable payload is neutralised. This has been reported for the Go SDK separately.

## Internal

- Tests are now included in type checking; the per-package tsconfigs excluded `**/*.test.ts`, which had allowed mock objects to drift out of sync with the types they stand in for.
- Coverage thresholds are enforced in CI (80% lines/functions/statements, 75% branches).
- Test count: 241 → 961.
- Fixed an intermittent "Body has already been read" failure in the transport tests, which cloned one shared `Response` across calls instead of building a fresh one per call.
