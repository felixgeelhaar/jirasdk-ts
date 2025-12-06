import { z } from 'zod';
import { IssueRefSchema } from './issue.js';

/**
 * Issue Link Type
 */
export const IssueLinkTypeSchema = z.object({
  id: z.string(),
  name: z.string(),
  inward: z.string(),
  outward: z.string(),
  self: z.string().url().optional(),
});

export type IssueLinkType = z.infer<typeof IssueLinkTypeSchema>;

/**
 * Issue Link
 */
export const IssueLinkSchema = z.object({
  id: z.string(),
  self: z.string().url().optional(),
  type: IssueLinkTypeSchema,
  inwardIssue: IssueRefSchema.optional(),
  outwardIssue: IssueRefSchema.optional(),
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
