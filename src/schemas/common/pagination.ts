import { z } from 'zod';

/**
 * Standard pagination parameters for Jira API requests
 */
export const PaginationParamsSchema = z.object({
  startAt: z.number().int().min(0).default(0),
  maxResults: z.number().int().min(1).max(100).default(50),
});

export type PaginationParams = z.infer<typeof PaginationParamsSchema>;

/**
 * Standard paginated response wrapper
 */
export function createPaginatedResponseSchema<T extends z.ZodType>(
  itemSchema: T
): z.ZodObject<{
  startAt: z.ZodNumber;
  maxResults: z.ZodNumber;
  total: z.ZodNumber;
  isLast: z.ZodOptional<z.ZodBoolean>;
  values: z.ZodArray<T>;
}> {
  return z.object({
    startAt: z.number().int().min(0),
    maxResults: z.number().int().min(0),
    total: z.number().int().min(0),
    isLast: z.boolean().optional(),
    values: z.array(itemSchema),
  });
}

export interface PaginatedResponse<T> {
  startAt: number;
  maxResults: number;
  total: number;
  isLast?: boolean;
  values: T[];
}

/**
 * Search-specific pagination (uses 'issues' instead of 'values')
 */
export const SearchPaginationSchema = z.object({
  startAt: z.number().int().min(0),
  maxResults: z.number().int().min(0),
  total: z.number().int().min(0),
});

export type SearchPagination = z.infer<typeof SearchPaginationSchema>;
