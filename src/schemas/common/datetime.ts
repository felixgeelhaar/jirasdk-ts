import { z } from 'zod';

/**
 * Jira datetime format: "2024-01-15T10:30:00.000+0000"
 * Also supports standard ISO 8601 format.
 *
 * Note: Returns the datetime as a string to avoid timezone issues.
 * Use `parseJiraDateTime()` to convert to a Date object when needed.
 */
export const JiraDateTimeSchema = z.string();

export type JiraDateTime = z.infer<typeof JiraDateTimeSchema>;

/**
 * Jira date format (YYYY-MM-DD)
 *
 * Note: Returns the date as a string to avoid timezone issues.
 * Use `parseJiraDate()` to convert to a Date object when needed.
 */
export const JiraDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format');

export type JiraDate = z.infer<typeof JiraDateSchema>;

/**
 * A datetime that may be null or absent entirely.
 *
 * Both are needed. Jira returns `null` for an unset date (an unresolved issue
 * has `"resolutiondate": null`), and omits the key altogether when the caller
 * narrows `fields`. This was previously only `.nullable()`, so any response
 * that omitted a date key failed validation — which is every narrowed-`fields`
 * request, across the 16 places this schema is used.
 */
export const OptionalJiraDateTimeSchema = z.string().nullable().optional();

export type OptionalJiraDateTime = z.infer<typeof OptionalJiraDateTimeSchema>;

/**
 * Convert a Date to Jira datetime string
 */
export function toJiraDateTime(date: Date): string {
  return date.toISOString();
}

/**
 * Convert a Date to Jira date string (YYYY-MM-DD)
 */
export function toJiraDate(date: Date): string {
  return date.toISOString().split('T')[0]!;
}
