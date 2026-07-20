import { z } from 'zod';

/**
 * Simplified project reference embedded in a screen scope
 *
 * Named `ScreenProject` to avoid colliding with the project domain's `Project`.
 */
export const ScreenProjectSchema = z
  .object({
    id: z.string(),
    key: z.string().optional(),
    name: z.string().optional(),
  })
  .loose();

export type ScreenProject = z.infer<typeof ScreenProjectSchema>;

/**
 * The scope a screen belongs to (global or project-scoped)
 */
export const ScreenScopeSchema = z
  .object({
    type: z.string(),
    project: ScreenProjectSchema.optional(),
  })
  .loose();

export type ScreenScope = z.infer<typeof ScreenScopeSchema>;

/**
 * A field placed on (or available for) a screen tab
 */
export const ScreenFieldSchema = z
  .object({
    id: z.string(),
    name: z.string().optional(),
    position: z.number().int().optional(),
  })
  .loose();

export type ScreenField = z.infer<typeof ScreenFieldSchema>;

/**
 * A tab within a screen
 */
export const ScreenTabSchema = z
  .object({
    id: z.number().int().optional(),
    name: z.string(),
    position: z.number().int().optional(),
    fields: z.array(ScreenFieldSchema).optional(),
  })
  .loose();

export type ScreenTab = z.infer<typeof ScreenTabSchema>;

/**
 * A Jira screen
 */
export const ScreenSchema = z
  .object({
    id: z.number().int().optional(),
    name: z.string(),
    description: z.string().optional(),
    scope: ScreenScopeSchema.optional(),
    tabs: z.array(ScreenTabSchema).optional(),
  })
  .loose();

export type Screen = z.infer<typeof ScreenSchema>;

/**
 * Paginated envelope returned by GET /screens
 */
export const ScreenListResultSchema = z
  .object({
    startAt: z.number().int().optional(),
    maxResults: z.number().int().optional(),
    total: z.number().int().optional(),
    isLast: z.boolean().optional(),
    values: z.array(ScreenSchema),
  })
  .loose();

export type ScreenListResult = z.infer<typeof ScreenListResultSchema>;

/**
 * Input for creating a screen
 */
export const CreateScreenInputSchema = z.object({
  name: z.string().min(1, { error: 'name is required' }),
  description: z.string().optional(),
});

export type CreateScreenInput = z.infer<typeof CreateScreenInputSchema>;

/**
 * Input for updating a screen
 */
export const UpdateScreenInputSchema = z.object({
  name: z.string().optional(),
  description: z.string().optional(),
});

export type UpdateScreenInput = z.infer<typeof UpdateScreenInputSchema>;

/**
 * Input for creating a screen tab
 */
export const CreateScreenTabInputSchema = z.object({
  name: z.string().min(1, { error: 'name is required' }),
});

export type CreateScreenTabInput = z.infer<typeof CreateScreenTabInputSchema>;

/**
 * Input for updating a screen tab
 */
export const UpdateScreenTabInputSchema = z.object({
  name: z.string().optional(),
});

export type UpdateScreenTabInput = z.infer<typeof UpdateScreenTabInputSchema>;

/**
 * Input for adding a field to a screen tab
 */
export const AddScreenFieldInputSchema = z.object({
  fieldId: z.string().min(1, { error: 'fieldId is required' }),
});

export type AddScreenFieldInput = z.infer<typeof AddScreenFieldInputSchema>;

/**
 * Options for {@link ScreenService.list}
 */
export interface ListScreensOptions {
  /** Index of the first result to return */
  startAt?: number;
  /** Maximum number of results to return */
  maxResults?: number;
}
