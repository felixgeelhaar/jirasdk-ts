import { z } from 'zod';

/**
 * A Jira issue priority (e.g. Highest, High, Medium, Low, Lowest)
 */
export const PrioritySchema = z
  .object({
    id: z.string(),
    self: z.url().optional(),
    name: z.string(),
    description: z.string().optional(),
    iconUrl: z.string().optional(),
    statusColor: z.string().optional(),
    isDefault: z.boolean().optional(),
  })
  .loose();

export type Priority = z.infer<typeof PrioritySchema>;

/**
 * Input for creating a priority
 */
export const CreatePriorityInputSchema = z.object({
  name: z.string().min(1, { error: 'Priority name is required' }),
  description: z.string().optional(),
  iconUrl: z.string().optional(),
  statusColor: z.string().optional(),
});

export type CreatePriorityInput = z.infer<typeof CreatePriorityInputSchema>;

/**
 * Input for updating a priority
 */
export const UpdatePriorityInputSchema = z.object({
  name: z.string().optional(),
  description: z.string().optional(),
  iconUrl: z.string().optional(),
  statusColor: z.string().optional(),
});

export type UpdatePriorityInput = z.infer<typeof UpdatePriorityInputSchema>;
