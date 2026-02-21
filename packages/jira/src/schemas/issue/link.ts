import { z } from 'zod';
import { IssueStatusSchema, IssuePrioritySchema, IssueTypeSchema } from './types.js';

/**
 * Issue Link Type
 */
export const IssueLinkTypeSchema = z.object({
  id: z.string(),
  name: z.string(),
  inward: z.string(),
  outward: z.string(),
  self: z.url().optional(),
});

export type IssueLinkType = z.infer<typeof IssueLinkTypeSchema>;

/**
 * Linked Issue Fields (nested fields in linked issues)
 */
export const LinkedIssueFieldsSchema = z.object({
  summary: z.string().optional(),
  status: IssueStatusSchema.optional(),
  priority: IssuePrioritySchema.nullable().optional(),
  issuetype: IssueTypeSchema.optional(),
});

export type LinkedIssueFields = z.infer<typeof LinkedIssueFieldsSchema>;

/**
 * Linked Issue (issue reference in a link)
 */
export const LinkedIssueSchema = z.object({
  id: z.string(),
  key: z.string(),
  self: z.url().optional(),
  fields: LinkedIssueFieldsSchema.optional(),
});

export type LinkedIssue = z.infer<typeof LinkedIssueSchema>;

/**
 * Issue Link
 */
export const IssueLinkSchema = z.object({
  id: z.string(),
  self: z.url().optional(),
  type: IssueLinkTypeSchema,
  inwardIssue: LinkedIssueSchema.optional(),
  outwardIssue: LinkedIssueSchema.optional(),
});

export type IssueLink = z.infer<typeof IssueLinkSchema>;

/**
 * Create issue link input
 */
export const CreateIssueLinkInputSchema = z.object({
  type: z.object({
    name: z.string().optional(),
    id: z.string().optional(),
  }),
  inwardIssue: z.object({ key: z.string() }).optional(),
  outwardIssue: z.object({ key: z.string() }).optional(),
  comment: z
    .object({
      body: z.unknown(),
      visibility: z
        .object({
          type: z.enum(['group', 'role']),
          value: z.string(),
        })
        .optional(),
    })
    .optional(),
});

export type CreateIssueLinkInput = z.infer<typeof CreateIssueLinkInputSchema>;

/**
 * Issue Link Types response
 */
export const IssueLinkTypesResponseSchema = z.object({
  issueLinkTypes: z.array(IssueLinkTypeSchema),
});

export type IssueLinkTypesResponse = z.infer<typeof IssueLinkTypesResponseSchema>;

// ============================================
// Helper factory functions for common link types
// ============================================

/**
 * Creates a "Blocks" link type reference
 * Use this when issue A blocks issue B
 */
export function blocksLinkType(): Partial<IssueLinkType> {
  return {
    name: 'Blocks',
    inward: 'is blocked by',
    outward: 'blocks',
  };
}

/**
 * Creates a "Duplicates" link type reference
 * Use this when issue A duplicates issue B
 */
export function duplicatesLinkType(): Partial<IssueLinkType> {
  return {
    name: 'Duplicate',
    inward: 'is duplicated by',
    outward: 'duplicates',
  };
}

/**
 * Creates a "Relates to" link type reference
 * Use this when issue A relates to issue B
 */
export function relatesToLinkType(): Partial<IssueLinkType> {
  return {
    name: 'Relates',
    inward: 'relates to',
    outward: 'relates to',
  };
}

/**
 * Creates a "Causes" link type reference
 * Use this when issue A causes issue B
 */
export function causesLinkType(): Partial<IssueLinkType> {
  return {
    name: 'Causes',
    inward: 'is caused by',
    outward: 'causes',
  };
}

/**
 * Creates a "Clones" link type reference
 * Use this when issue A is a clone of issue B
 */
export function clonesLinkType(): Partial<IssueLinkType> {
  return {
    name: 'Cloners',
    inward: 'is cloned by',
    outward: 'clones',
  };
}
