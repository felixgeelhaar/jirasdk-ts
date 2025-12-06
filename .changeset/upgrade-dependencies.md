---
"@felixgeelhaar/sdk-core": minor
"@felixgeelhaar/jira-sdk": minor
---

Upgrade dependencies to latest versions and migrate to zod v4

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
