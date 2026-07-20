import { textToAdf } from '../common/index.js';
import type { AdfDocument, AdfOrString } from '../common/index.js';

/**
 * ADF-aware setters for issue and comment inputs.
 *
 * Jira Cloud v3 rejects plain strings for rich-text fields (description,
 * environment, comment bodies) — they must be Atlassian Document Format
 * documents. These helpers mirror Go's `SetDescriptionText` / `SetDescription`
 * / `SetEnvironmentText` / `SetEnvironment` / `SetBodyText` / `SetBody`, but
 * return a new object instead of mutating in place, which fits the immutable
 * plain-object style the schemas use.
 *
 * @example
 * ```typescript
 * await client.issues.create({
 *   fields: setDescriptionText(
 *     { project: { key: 'PROJ' }, summary: 'Bug', issuetype: { name: 'Bug' } },
 *     'Steps to reproduce:\n\n1. Open the app'
 *   ),
 * });
 * ```
 */

/**
 * Set the description from plain text, converting it to an ADF document.
 *
 * @param fields - Issue fields to copy
 * @param text - Plain text (blank-line separated paragraphs)
 * @returns A new fields object with `description` set to an ADF document
 */
export function setDescriptionText<T extends object>(
  fields: T,
  text: string
): T & { description: AdfDocument } {
  return { ...fields, description: textToAdf(text) };
}

/**
 * Set the description from an existing ADF document.
 *
 * @param fields - Issue fields to copy
 * @param document - ADF document
 * @returns A new fields object with `description` set
 */
export function setDescription<T extends object>(
  fields: T,
  document: AdfDocument
): T & { description: AdfDocument } {
  return { ...fields, description: document };
}

/**
 * Set the environment field from plain text, converting it to an ADF document.
 *
 * @param fields - Issue fields to copy
 * @param text - Plain text (blank-line separated paragraphs)
 * @returns A new fields object with `environment` set to an ADF document
 */
export function setEnvironmentText<T extends object>(
  fields: T,
  text: string
): T & { environment: AdfDocument } {
  return { ...fields, environment: textToAdf(text) };
}

/**
 * Set the environment field from an existing ADF document.
 *
 * @param fields - Issue fields to copy
 * @param document - ADF document
 * @returns A new fields object with `environment` set
 */
export function setEnvironment<T extends object>(
  fields: T,
  document: AdfDocument
): T & { environment: AdfDocument } {
  return { ...fields, environment: document };
}

/**
 * Set a comment (or worklog) body from plain text, converting it to ADF.
 *
 * @param input - Comment input to copy
 * @param text - Plain text (blank-line separated paragraphs)
 * @returns A new input object with `body` set to an ADF document
 */
export function setBodyText<T extends { body: AdfOrString }>(input: T, text: string): T {
  return { ...input, body: textToAdf(text) };
}

/**
 * Set a comment body from an existing ADF document.
 *
 * @param input - Comment input to copy
 * @param document - ADF document
 * @returns A new input object with `body` set
 */
export function setBody<T extends { body: AdfOrString }>(input: T, document: AdfDocument): T {
  return { ...input, body: document };
}

/**
 * Build a comment input from plain text.
 *
 * @param text - Plain text body
 * @returns An `AddCommentInput`-shaped object with an ADF body
 */
export function commentInputFromText(text: string): { body: AdfDocument } {
  return { body: textToAdf(text) };
}
