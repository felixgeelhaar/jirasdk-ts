import { z } from 'zod';

/**
 * The colour assigned to an epic on the board
 */
export const EpicColorSchema = z
  .object({
    key: z.string(),
  })
  .loose();

export type EpicColor = z.infer<typeof EpicColorSchema>;

/**
 * An epic
 *
 * Read path - lenient.
 */
export const EpicSchema = z
  .object({
    id: z.number().int(),
    self: z.string().optional(),
    key: z.string(),
    name: z.string(),
    summary: z.string().optional(),
    color: EpicColorSchema.optional(),
    done: z.boolean().optional(),
  })
  .loose();

export type Epic = z.infer<typeof EpicSchema>;

/**
 * Paginated epic list response (GET /rest/agile/1.0/board/{boardId}/epic)
 */
export const EpicPageSchema = z
  .object({
    startAt: z.number().int(),
    maxResults: z.number().int(),
    total: z.number().int().optional(),
    isLast: z.boolean().optional(),
    values: z.array(EpicSchema),
  })
  .loose();

export type EpicPage = z.infer<typeof EpicPageSchema>;

/**
 * Options for listing the epics of a board
 */
export interface GetBoardEpicsOptions {
  /** Starting index for pagination (0-based) */
  startAt?: number;
  /** Maximum number of epics to return per page */
  maxResults?: number;
  /** Filter by completion status */
  done?: boolean;
}
