import { z } from 'zod';
import { UserRefSchema, OptionalJiraDateTimeSchema } from '../common/index.js';
import {
  IssueTypeSchema,
  IssueStatusSchema,
  IssuePrioritySchema,
  IssueProjectSchema,
} from '../issue/index.js';
import { SprintSchema } from './sprint.js';
import { EpicSchema } from './epic.js';

/**
 * Fields of an issue as returned by the Agile API.
 *
 * The Agile API returns the same field bag as the platform API plus a few
 * board-specific fields (`sprint`, `closedSprints`, `epic`, `flagged`).
 * Everything is optional because callers can restrict the returned fields,
 * and unknown/custom fields are preserved via `.loose()`.
 */
export const AgileIssueFieldsSchema = z
  .object({
    summary: z.string().optional(),
    issuetype: IssueTypeSchema.optional(),
    project: IssueProjectSchema.optional(),
    status: IssueStatusSchema.optional(),
    priority: IssuePrioritySchema.nullable().optional(),
    assignee: UserRefSchema.nullable().optional(),
    reporter: UserRefSchema.nullable().optional(),
    creator: UserRefSchema.nullable().optional(),
    labels: z.array(z.string()).optional(),
    created: OptionalJiraDateTimeSchema.optional(),
    updated: OptionalJiraDateTimeSchema.optional(),

    // Agile-specific fields
    /** The sprint the issue currently belongs to, if any */
    sprint: SprintSchema.nullable().optional(),
    /** Sprints the issue was previously part of */
    closedSprints: z.array(SprintSchema).optional(),
    /** The epic the issue belongs to, if any */
    epic: EpicSchema.nullable().optional(),
    /** Whether the issue is flagged (impediment) */
    flagged: z.boolean().optional(),
  })
  .loose();

export type AgileIssueFields = z.infer<typeof AgileIssueFieldsSchema>;

/**
 * An issue as returned by the Agile API (backlog, sprint and board endpoints).
 */
export const AgileIssueSchema = z
  .object({
    id: z.string(),
    key: z.string(),
    self: z.string().optional(),
    expand: z.string().optional(),
    fields: AgileIssueFieldsSchema.optional(),
  })
  .loose();

export type AgileIssue = z.infer<typeof AgileIssueSchema>;

/**
 * Paginated issue list response
 * (GET /rest/agile/1.0/board/{boardId}/backlog)
 *
 * Unlike board/sprint/epic listings this response uses `issues` rather than
 * `values` and carries no `isLast` flag.
 */
export const AgileIssuePageSchema = z
  .object({
    expand: z.string().optional(),
    startAt: z.number().int(),
    maxResults: z.number().int(),
    total: z.number().int(),
    issues: z.array(AgileIssueSchema),
  })
  .loose();

export type AgileIssuePage = z.infer<typeof AgileIssuePageSchema>;
