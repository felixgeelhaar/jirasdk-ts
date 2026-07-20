import { z } from 'zod';

/**
 * Input for creating an issue link type
 *
 * The issue link type entity itself is defined once in
 * `src/schemas/issue/link.ts` (`IssueLinkTypeSchema`) and is reused here
 * rather than redefined.
 */
export const CreateIssueLinkTypeInputSchema = z.object({
  name: z.string().min(1, { error: 'name is required' }),
  inward: z.string().min(1, { error: 'inward is required' }),
  outward: z.string().min(1, { error: 'outward is required' }),
});

export type CreateIssueLinkTypeInput = z.infer<typeof CreateIssueLinkTypeInputSchema>;

/**
 * Input for updating an issue link type
 */
export const UpdateIssueLinkTypeInputSchema = z.object({
  name: z.string().optional(),
  inward: z.string().optional(),
  outward: z.string().optional(),
});

export type UpdateIssueLinkTypeInput = z.infer<typeof UpdateIssueLinkTypeInputSchema>;
