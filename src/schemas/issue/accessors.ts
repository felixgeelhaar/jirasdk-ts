import { adfToText } from '../common/index.js';
import type { Issue } from './issue.js';
import type { Comment } from './comment.js';
import type { Worklog } from './worklog.js';
import type { Attachment, AttachmentMetadata } from './attachment.js';

/**
 * Nil-safe accessors for issue data.
 *
 * Most of Go's `issue.Get*()` helpers exist only to avoid nil-pointer panics
 * (`GetStatusName`, `GetAssigneeName`, ...). In TypeScript optional chaining
 * already does that job — `issue.fields?.status?.name` is safe, shorter and
 * fully typed — so those are deliberately not re-implemented here.
 *
 * What optional chaining does *not* give you is:
 *   - flattening Atlassian Document Format (ADF) rich text to plain text
 *   - turning Jira's date strings into real `Date` objects
 *
 * Those are the helpers below.
 */

/**
 * Jira serialises datetimes as `2024-01-15T10:30:00.000+0000` — an ISO 8601
 * string with a numeric offset that omits the colon. Some engines reject that
 * form, so normalise `+HHMM` to `+HH:MM` before parsing.
 */
function toDate(value: string | null | undefined): Date | undefined {
  if (!value) {
    return undefined;
  }

  const normalized = value.replace(/([+-]\d{2})(\d{2})$/, '$1:$2');
  const date = new Date(normalized);

  return Number.isNaN(date.getTime()) ? undefined : date;
}

/**
 * Get the issue description as plain text.
 *
 * Handles ADF documents, plain strings, `null` and missing fields alike.
 *
 * @param issue - Issue to read from
 * @returns Plain-text description, or an empty string when unset
 */
export function getDescriptionText(issue: Issue | null | undefined): string {
  return adfToText(issue?.fields.description);
}

/**
 * Get the issue environment field as plain text.
 *
 * @param issue - Issue to read from
 * @returns Plain-text environment, or an empty string when unset
 */
export function getEnvironmentText(issue: Issue | null | undefined): string {
  return adfToText(issue?.fields.environment);
}

/**
 * Get a comment body as plain text.
 *
 * @param comment - Comment to read from
 * @returns Plain-text body, or an empty string when unset
 */
export function getCommentBodyText(comment: Comment | null | undefined): string {
  return adfToText(comment?.body);
}

/**
 * Get a worklog comment as plain text.
 *
 * @param worklog - Worklog to read from
 * @returns Plain-text comment, or an empty string when unset
 */
export function getWorklogCommentText(worklog: Worklog | null | undefined): string {
  return adfToText(worklog?.comment);
}

/**
 * Get the issue creation timestamp as a `Date`.
 *
 * @param issue - Issue to read from
 * @returns Creation date, or `undefined` when unset or unparseable
 */
export function getCreatedDate(issue: Issue | null | undefined): Date | undefined {
  return toDate(issue?.fields.created);
}

/**
 * Get the issue last-updated timestamp as a `Date`.
 *
 * @param issue - Issue to read from
 * @returns Updated date, or `undefined` when unset or unparseable
 */
export function getUpdatedDate(issue: Issue | null | undefined): Date | undefined {
  return toDate(issue?.fields.updated);
}

/**
 * Get the issue resolution timestamp as a `Date`.
 *
 * @param issue - Issue to read from
 * @returns Resolution date, or `undefined` when the issue is unresolved
 */
export function getResolutionDate(issue: Issue | null | undefined): Date | undefined {
  return toDate(issue?.fields.resolutiondate);
}

/**
 * Get the issue due date as a `Date`.
 *
 * Jira stores `duedate` as a bare `YYYY-MM-DD` string, which JavaScript parses
 * as UTC midnight.
 *
 * @param issue - Issue to read from
 * @returns Due date, or `undefined` when unset
 */
export function getDueDate(issue: Issue | null | undefined): Date | undefined {
  return toDate(issue?.fields.duedate);
}

/**
 * Get a comment's creation timestamp as a `Date`.
 *
 * @param comment - Comment to read from
 * @returns Creation date, or `undefined` when unset
 */
export function getCommentCreatedDate(comment: Comment | null | undefined): Date | undefined {
  return toDate(comment?.created);
}

/**
 * Get a comment's last-updated timestamp as a `Date`.
 *
 * @param comment - Comment to read from
 * @returns Updated date, or `undefined` when unset
 */
export function getCommentUpdatedDate(comment: Comment | null | undefined): Date | undefined {
  return toDate(comment?.updated);
}

/**
 * Get an attachment's creation timestamp as a `Date`.
 *
 * @param attachment - Attachment (or attachment metadata) to read from
 * @returns Creation date, or `undefined` when unset
 */
export function getAttachmentCreatedDate(
  attachment: Attachment | AttachmentMetadata | null | undefined
): Date | undefined {
  return toDate(attachment?.created);
}

/**
 * Get a worklog's start timestamp as a `Date`.
 *
 * @param worklog - Worklog to read from
 * @returns Start date, or `undefined` when unset
 */
export function getWorklogStartedDate(worklog: Worklog | null | undefined): Date | undefined {
  return toDate(worklog?.started);
}
