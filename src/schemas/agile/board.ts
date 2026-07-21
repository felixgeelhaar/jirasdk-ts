import { z } from 'zod';

/**
 * Board type ("scrum" or "kanban")
 */
export const BoardTypeSchema = z.enum(['scrum', 'kanban', 'simple']);

export type BoardType = z.infer<typeof BoardTypeSchema>;

/**
 * The project location a board belongs to
 */
export const BoardLocationSchema = z
  .object({
    projectId: z.number().int().optional(),
    projectKey: z.string().optional(),
    projectName: z.string().optional(),
    projectTypeKey: z.string().optional(),
    displayName: z.string().optional(),
    name: z.string().optional(),
    avatarURI: z.string().optional(),
  })
  .loose();

export type BoardLocation = z.infer<typeof BoardLocationSchema>;

/**
 * The saved filter a board is backed by
 */
export const BoardFilterSchema = z
  .object({
    id: z.union([z.number().int(), z.string()]),
    self: z.string().optional(),
  })
  .loose();

export type BoardFilter = z.infer<typeof BoardFilterSchema>;

/**
 * A Jira Software board (Scrum or Kanban)
 *
 * Read path - lenient, since Jira omits most fields depending on board type
 * and the caller's permissions.
 */
export const BoardSchema = z
  .object({
    id: z.number().int(),
    self: z.string().optional(),
    name: z.string(),
    // Not enum-constrained on the read path: Jira Software ships board types
    // beyond scrum/kanban (e.g. "simple") on team-managed projects.
    type: z.string(),
    location: BoardLocationSchema.optional(),
    filter: BoardFilterSchema.optional(),
    canEdit: z.boolean().optional(),
    isPrivate: z.boolean().optional(),
    favourite: z.boolean().optional(),
  })
  .loose();

export type Board = z.infer<typeof BoardSchema>;

/**
 * Paginated board list response (GET /rest/agile/1.0/board)
 */
export const BoardPageSchema = z
  .object({
    startAt: z.number().int(),
    maxResults: z.number().int(),
    total: z.number().int().optional(),
    isLast: z.boolean().optional(),
    values: z.array(BoardSchema),
  })
  .loose();

export type BoardPage = z.infer<typeof BoardPageSchema>;

/**
 * Request body for creating a board
 *
 * Write path - strict.
 */
export const CreateBoardInputSchema = z.object({
  name: z.string().min(1, { error: 'Board name is required' }),
  type: BoardTypeSchema,
  filterId: z.number().int().positive({ error: 'Filter ID is required' }),
});

export type CreateBoardInput = z.infer<typeof CreateBoardInputSchema>;

/**
 * Options for listing boards
 */
export interface GetBoardsOptions {
  /** Starting index for pagination (0-based) */
  startAt?: number;
  /** Maximum number of boards to return per page */
  maxResults?: number;
  /** Filter by board type ("scrum" or "kanban") */
  type?: string;
  /** Filter by (partial) board name */
  name?: string;
  /** Filter by project key or numeric project ID */
  projectKeyOrId?: string;
}

/**
 * Options for reading a board backlog
 */
export interface GetBacklogOptions {
  /** Starting index for pagination (0-based) */
  startAt?: number;
  /** Maximum number of issues to return per page */
  maxResults?: number;
}
