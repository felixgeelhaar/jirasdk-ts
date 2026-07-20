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
 * Autocomplete suggestions returned by
 * `GET /rest/api/3/jql/autocompletedata/suggestions` (`AutoCompleteSuggestions`).
 *
 * The Go SDK's `{suggestions: [...]}` envelope belongs to a
 * `/rest/api/3/label/suggest` endpoint that does not exist in the v3 API.
 */
export const LabelSuggestionsSchema = z
  .object({
    results: z
      .array(
        z
          .object({
            value: z.string().optional(),
            displayName: z.string().optional(),
          })
          .loose()
      )
      .optional(),
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
}
