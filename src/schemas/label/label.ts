import { z } from 'zod';

/**
 * Paginated label page returned by `GET /rest/api/3/label`.
 */
export const LabelPageSchema = z
  .object({
    values: z.array(z.string()),
    startAt: z.number().int().optional(),
    maxResults: z.number().int().optional(),
    total: z.number().int().optional(),
    isLast: z.boolean().optional(),
  })
  .loose();

export type LabelPage = z.infer<typeof LabelPageSchema>;

/**
 * Label suggestions returned by `GET /rest/api/3/label/suggest`.
 */
export const LabelSuggestionsSchema = z
  .object({
    suggestions: z.array(z.string()),
  })
  .loose();

export type LabelSuggestions = z.infer<typeof LabelSuggestionsSchema>;

/**
 * Options for listing labels.
 */
export interface ListLabelsOptions {
  /**
   * Index of the first label to return (0-based).
   */
  startAt?: number;

  /**
   * Maximum number of labels to return per page.
   */
  maxResults?: number;

  /**
   * Filter labels by a substring query.
   */
  query?: string;
}
