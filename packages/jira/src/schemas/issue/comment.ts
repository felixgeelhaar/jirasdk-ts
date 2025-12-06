import { z } from 'zod';
import {
  UserRefSchema,
  AdfOrStringSchema,
  OptionalJiraDateTimeSchema,
} from '@felixgeelhaar/sdk-core/schemas';

/**
 * Comment visibility
 */
export const CommentVisibilitySchema = z.object({
  type: z.enum(['group', 'role']),
  value: z.string(),
  identifier: z.string().optional(),
});

export type CommentVisibility = z.infer<typeof CommentVisibilitySchema>;

/**
 * Issue Comment
 */
export const CommentSchema = z.object({
  self: z.string().url(),
  id: z.string(),
  author: UserRefSchema.optional(),
  body: AdfOrStringSchema,
  updateAuthor: UserRefSchema.optional(),
  created: OptionalJiraDateTimeSchema,
  updated: OptionalJiraDateTimeSchema,
  visibility: CommentVisibilitySchema.optional(),
  jsdPublic: z.boolean().optional(),
  renderedBody: z.string().optional(),
  properties: z.array(z.record(z.unknown())).optional(),
});

export type Comment = z.infer<typeof CommentSchema>;

/**
 * Add comment input
 */
export const AddCommentInputSchema = z.object({
  body: AdfOrStringSchema,
  visibility: CommentVisibilitySchema.optional(),
  properties: z.array(z.record(z.unknown())).optional(),
});

export type AddCommentInput = z.infer<typeof AddCommentInputSchema>;

/**
 * Update comment input
 */
export const UpdateCommentInputSchema = z.object({
  body: AdfOrStringSchema,
  visibility: CommentVisibilitySchema.optional(),
});

export type UpdateCommentInput = z.infer<typeof UpdateCommentInputSchema>;

/**
 * Comments page response
 */
export const CommentsPageSchema = z.object({
  startAt: z.number(),
  maxResults: z.number(),
  total: z.number(),
  comments: z.array(CommentSchema),
});

export type CommentsPage = z.infer<typeof CommentsPageSchema>;
