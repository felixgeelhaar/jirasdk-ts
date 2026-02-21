# @felixgeelhaar/jira-sdk

## 0.3.0

### Minor Changes

- 3df6a59: Add attachment and issue link methods to IssueService

  **HTTP Client enhancements:**
  - Add FormData/Blob body support for multipart file uploads
  - Add `rawResponse` metadata flag for returning Blob responses

  **New IssueService attachment methods:**
  - `addAttachment(issueIdOrKey, file, filename?)` - Upload file attachments with CSRF bypass
  - `getAttachment(attachmentId)` - Get attachment metadata
  - `downloadAttachment(attachmentId)` - Download attachment content as Blob
  - `deleteAttachment(attachmentId)` - Remove attachment

  **New IssueService link methods:**
  - `getIssueLinks(issueIdOrKey)` - Get all links for an issue
  - `createIssueLink(input)` - Create link between issues
  - `getIssueLink(linkId)` - Get specific link by ID
  - `deleteIssueLink(linkId)` - Remove link
  - `listIssueLinkTypes()` - List available link types
  - `getIssueLinkType(linkTypeId)` - Get specific link type

  **Link schema enhancements:**
  - Add `LinkedIssueSchema` with nested fields (summary, status, priority, issuetype)
  - Add helper factory functions: `blocksLinkType()`, `duplicatesLinkType()`, `relatesToLinkType()`, `causesLinkType()`, `clonesLinkType()`

### Patch Changes

- Updated dependencies [3df6a59]
  - @felixgeelhaar/sdk-core@0.3.0

## 0.2.0

### Minor Changes

- c2c1f6c: Upgrade dependencies to latest versions and migrate to zod v4

  **Dependency Updates:**
  - Update @types/node from 22.19.1 to 24.10.1
  - Update vitest from 2.1.9 to 4.0.15
  - Update zod from 3.25.76 to 4.1.13 (major version)

  **Zod v4 Migration:**
  - Replace `z.string().url()` with `z.url()` across all schema files
  - Replace `z.string().email()` with `z.email()` in auth and user schemas
  - Replace `z.string().uuid()` with `z.uuid()` in project schema
  - Update `ZodIssue` type to `z.core.$ZodIssue` in error classes
  - Replace `z.ZodTypeAny` with `z.ZodType` in pagination helper
  - Replace `.passthrough()` with `.loose()` in issue schemas
  - Update error message syntax to use `{ error: "..." }` format
  - Replace `ZodError.errors` with `ZodError.issues`
  - Update `z.record()` calls to require explicit key type parameter

  All tests passing (231 total), build and typecheck successful.

### Patch Changes

- Updated dependencies [c2c1f6c]
  - @felixgeelhaar/sdk-core@0.2.0
