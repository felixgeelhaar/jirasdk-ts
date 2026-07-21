import { z } from 'zod';

/**
 * A Jira issue resolution (e.g. Fixed, Won't Fix, Duplicate)
 */
export const ResolutionSchema = z
  .object({
    id: z.string(),
    self: z.url().optional(),
    name: z.string().optional(),
    description: z.string().optional(),
    isDefault: z.boolean().optional(),
  })
  .loose();

export type Resolution = z.infer<typeof ResolutionSchema>;

/**
 * Input for creating a resolution
 */
export const CreateResolutionInputSchema = z.object({
  name: z.string().min(1, { error: 'Resolution name is required' }),
  description: z.string().optional(),
});

export type CreateResolutionInput = z.infer<typeof CreateResolutionInputSchema>;

/**
 * Input for updating a resolution
 */
export const UpdateResolutionInputSchema = z.object({
  name: z.string().optional(),
  description: z.string().optional(),
});

export type UpdateResolutionInput = z.infer<typeof UpdateResolutionInputSchema>;
