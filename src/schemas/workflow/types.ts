import { z } from 'zod';

/**
 * Status category as returned by the workflow/status endpoints
 *
 * Named `WorkflowStatusCategory` to avoid colliding with the issue domain's
 * `StatusCategory`, which models the same concept but with stricter fields.
 */
export const WorkflowStatusCategorySchema = z
  .object({
    self: z.url().optional(),
    id: z.number().int(),
    key: z.string(),
    colorName: z.string().optional(),
    name: z.string(),
  })
  .loose();

export type WorkflowStatusCategory = z.infer<typeof WorkflowStatusCategorySchema>;

/**
 * Issue status as returned by the workflow/status endpoints
 */
export const WorkflowStatusSchema = z
  .object({
    self: z.url().optional(),
    id: z.string(),
    name: z.string(),
    description: z.string().optional(),
    iconUrl: z.string().optional(),
    untranslatedName: z.string().optional(),
    statusCategory: WorkflowStatusCategorySchema.optional(),
  })
  .loose();

export type WorkflowStatus = z.infer<typeof WorkflowStatusSchema>;

/**
 * Schema of a field exposed on a transition screen
 */
export const WorkflowFieldSchemaSchema = z
  .object({
    type: z.string().optional(),
    items: z.string().optional(),
    system: z.string().optional(),
    custom: z.string().optional(),
    customId: z.number().int().optional(),
  })
  .loose();

export type WorkflowFieldSchema = z.infer<typeof WorkflowFieldSchemaSchema>;

/**
 * Information about a single field on a transition screen
 */
export const WorkflowFieldInfoSchema = z
  .object({
    required: z.boolean(),
    schema: WorkflowFieldSchemaSchema.optional(),
    name: z.string().optional(),
    key: z.string().optional(),
    hasDefaultValue: z.boolean().optional(),
    operations: z.array(z.string()).optional(),
    allowedValues: z.array(z.unknown()).optional(),
  })
  .loose();

export type WorkflowFieldInfo = z.infer<typeof WorkflowFieldInfoSchema>;

/**
 * A workflow transition available on an issue
 *
 * Named `WorkflowTransition` to avoid colliding with the issue domain's
 * `Transition` schema.
 */
export const WorkflowTransitionSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    to: WorkflowStatusSchema.optional(),
    hasScreen: z.boolean().optional(),
    isGlobal: z.boolean().optional(),
    isInitial: z.boolean().optional(),
    isAvailable: z.boolean().optional(),
    isConditional: z.boolean().optional(),
    isLooped: z.boolean().optional(),
    fields: z.record(z.string(), WorkflowFieldInfoSchema).optional(),
  })
  .loose();

export type WorkflowTransition = z.infer<typeof WorkflowTransitionSchema>;

/**
 * Envelope returned by GET /issue/{issueIdOrKey}/transitions
 */
export const WorkflowTransitionsResponseSchema = z
  .object({
    expand: z.string().optional(),
    transitions: z.array(WorkflowTransitionSchema),
  })
  .loose();

export type WorkflowTransitionsResponse = z.infer<typeof WorkflowTransitionsResponseSchema>;

/**
 * A Jira workflow
 */
export const WorkflowSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    description: z.string().optional(),
    statuses: z.array(WorkflowStatusSchema).optional(),
    isDefault: z.boolean().optional(),
    transitions: z.array(WorkflowTransitionSchema).optional(),
  })
  .loose();

export type Workflow = z.infer<typeof WorkflowSchema>;

/**
 * Paginated envelope returned by GET /workflow/search
 */
export const WorkflowSearchResultSchema = z
  .object({
    startAt: z.number().int().optional(),
    maxResults: z.number().int().optional(),
    total: z.number().int().optional(),
    isLast: z.boolean().optional(),
    values: z.array(WorkflowSchema),
  })
  .loose();

export type WorkflowSearchResult = z.infer<typeof WorkflowSearchResultSchema>;

/**
 * Input for performing a workflow transition on an issue
 *
 * Named `WorkflowDoTransitionInput` to avoid colliding with the issue domain's
 * `DoTransitionInput`.
 */
export const WorkflowDoTransitionInputSchema = z.object({
  transition: z.object({
    id: z.string().min(1, { error: 'transition id is required' }),
  }),
  fields: z.record(z.string(), z.unknown()).optional(),
  update: z.record(z.string(), z.unknown()).optional(),
});

export type WorkflowDoTransitionInput = z.infer<typeof WorkflowDoTransitionInputSchema>;

/**
 * Options for {@link WorkflowService.getTransitions}
 */
export interface GetWorkflowTransitionsOptions {
  /** Additional information to include in the response */
  expand?: string[];
  /** Restrict the response to a single transition */
  transitionId?: string;
  /** Skip transitions whose conditions apply only to remote applications */
  skipRemoteOnlyCondition?: boolean;
}

/**
 * Options for {@link WorkflowService.list}
 */
export interface ListWorkflowsOptions {
  /** Filter by workflow name */
  workflowName?: string;
  /** Index of the first result to return */
  startAt?: number;
  /** Maximum number of results to return */
  maxResults?: number;
}
