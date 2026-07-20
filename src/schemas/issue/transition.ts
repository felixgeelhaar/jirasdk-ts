import { z } from 'zod';
import { IssueStatusSchema } from './types.js';

/**
 * Issue Transition
 */
export const TransitionSchema = z.object({
  id: z.string(),
  name: z.string(),
  to: IssueStatusSchema,
  hasScreen: z.boolean().optional(),
  isGlobal: z.boolean().optional(),
  isInitial: z.boolean().optional(),
  isConditional: z.boolean().optional(),
  isLooped: z.boolean().optional(),
  fields: z.record(z.string(), z.unknown()).optional(),
});

export type Transition = z.infer<typeof TransitionSchema>;

/**
 * Transitions response
 */
export const TransitionsResponseSchema = z.object({
  expand: z.string().optional(),
  transitions: z.array(TransitionSchema),
});

export type TransitionsResponse = z.infer<typeof TransitionsResponseSchema>;

/**
 * Do transition input
 */
export const DoTransitionInputSchema = z.object({
  transition: z.object({
    id: z.string(),
  }),
  fields: z.record(z.string(), z.unknown()).optional(),
  update: z.record(z.string(), z.array(z.record(z.string(), z.unknown()))).optional(),
  historyMetadata: z.record(z.string(), z.unknown()).optional(),
  properties: z.array(z.record(z.string(), z.unknown())).optional(),
});

export type DoTransitionInput = z.infer<typeof DoTransitionInputSchema>;
