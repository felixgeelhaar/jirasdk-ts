import { z } from 'zod';

/**
 * Sprint state
 */
export const SprintStateSchema = z.enum(['future', 'active', 'closed']);

export type SprintState = z.infer<typeof SprintStateSchema>;

/**
 * A Scrum sprint
 *
 * Read path - lenient. Dates are only present once a sprint has been
 * started/completed, and `goal` is optional.
 */
export const SprintSchema = z
  .object({
    id: z.number().int(),
    self: z.string().optional(),
    // Left as a plain string on the read path so unknown future states do not
    // break deserialization.
    state: z.string(),
    name: z.string(),
    /** ISO 8601 datetime */
    startDate: z.string().optional(),
    /** ISO 8601 datetime */
    endDate: z.string().optional(),
    /** ISO 8601 datetime */
    completeDate: z.string().optional(),
    originBoardId: z.number().int().optional(),
    goal: z.string().optional(),
  })
  .loose();

export type Sprint = z.infer<typeof SprintSchema>;

/**
 * Paginated sprint list response (GET /rest/agile/1.0/board/{boardId}/sprint)
 *
 * Note: this endpoint does not always return `total`.
 */
export const SprintPageSchema = z
  .object({
    startAt: z.number().int(),
    maxResults: z.number().int(),
    total: z.number().int().optional(),
    isLast: z.boolean().optional(),
    values: z.array(SprintSchema),
  })
  .loose();

export type SprintPage = z.infer<typeof SprintPageSchema>;

/**
 * Request body for creating a sprint
 *
 * Write path - strict.
 */
export const CreateSprintInputSchema = z.object({
  name: z.string().min(1, { error: 'Sprint name is required' }),
  originBoardId: z.number().int().positive({ error: 'Origin board ID is required' }),
  /** ISO 8601 datetime, e.g. "2024-06-01T09:00:00.000Z" */
  startDate: z.string().optional(),
  /** ISO 8601 datetime, e.g. "2024-06-14T17:00:00.000Z" */
  endDate: z.string().optional(),
  goal: z.string().optional(),
});

export type CreateSprintInput = z.infer<typeof CreateSprintInputSchema>;

/**
 * Request body for updating a sprint (partial update)
 *
 * Write path - strict.
 */
export const UpdateSprintInputSchema = z.object({
  name: z.string().optional(),
  state: SprintStateSchema.optional(),
  /** ISO 8601 datetime */
  startDate: z.string().optional(),
  /** ISO 8601 datetime */
  endDate: z.string().optional(),
  goal: z.string().optional(),
});

export type UpdateSprintInput = z.infer<typeof UpdateSprintInputSchema>;

/**
 * Request body for moving issues into a sprint
 *
 * Write path - strict. Jira accepts at most 50 issues per call.
 */
export const MoveIssuesToSprintInputSchema = z.object({
  /** Issue keys or IDs */
  issues: z.array(z.string()).min(1, { error: 'At least one issue is required' }),
});

export type MoveIssuesToSprintInput = z.infer<typeof MoveIssuesToSprintInputSchema>;

/**
 * Options for listing the sprints of a board
 */
export interface GetBoardSprintsOptions {
  /** Starting index for pagination (0-based) */
  startAt?: number;
  /** Maximum number of sprints to return per page */
  maxResults?: number;
  /** Filter by sprint state; either a single state or a list */
  state?: SprintState | SprintState[];
}
