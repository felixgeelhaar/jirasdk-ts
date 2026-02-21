---
"@felixgeelhaar/sdk-core": minor
"@felixgeelhaar/jira-sdk": minor
---

Add attachment and issue link methods to IssueService

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
