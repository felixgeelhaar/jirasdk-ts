import { z } from 'zod';
import {
  UserRefSchema,
  AdfOrStringSchema,
  OptionalJiraDateTimeSchema,
  JiraDateTimeSchema,
} from '@felixgeelhaar/sdk-core/schemas';

/**
 * Worklog visibility
 */
export const WorklogVisibilitySchema = z.object({
  type: z.enum(['group', 'role']),
  value: z.string(),
  identifier: z.string().optional(),
});

export type WorklogVisibility = z.infer<typeof WorklogVisibilitySchema>;

/**
 * Issue Worklog
 */
export const WorklogSchema = z.object({
  self: z.string().url(),
  id: z.string(),
  author: UserRefSchema.optional(),
  updateAuthor: UserRefSchema.optional(),
  comment: AdfOrStringSchema.optional(),
  created: OptionalJiraDateTimeSchema,
  updated: OptionalJiraDateTimeSchema,
  started: JiraDateTimeSchema,
  timeSpent: z.string(), // e.g., "1h 30m"
  timeSpentSeconds: z.number().int().min(0),
  visibility: WorklogVisibilitySchema.optional(),
  issueId: z.string().optional(),
  properties: z.array(z.record(z.string(), z.unknown())).optional(),
});

export type Worklog = z.infer<typeof WorklogSchema>;

/**
 * Add worklog input
 */
export const AddWorklogInputSchema = z.object({
  comment: AdfOrStringSchema.optional(),
  started: z.string(), // ISO date-time
  timeSpent: z.string().optional(), // e.g., "1h 30m"
  timeSpentSeconds: z.number().int().min(0).optional(),
  visibility: WorklogVisibilitySchema.optional(),
  properties: z.array(z.record(z.string(), z.unknown())).optional(),
});

export type AddWorklogInput = z.infer<typeof AddWorklogInputSchema>;

/**
 * Update worklog input
 */
export const UpdateWorklogInputSchema = AddWorklogInputSchema;

export type UpdateWorklogInput = z.infer<typeof UpdateWorklogInputSchema>;

/**
 * Worklogs page response
 */
export const WorklogsPageSchema = z.object({
  startAt: z.number(),
  maxResults: z.number(),
  total: z.number(),
  worklogs: z.array(WorklogSchema),
});

export type WorklogsPage = z.infer<typeof WorklogsPageSchema>;
