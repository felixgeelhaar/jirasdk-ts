import { z } from 'zod';

/**
 * Minimal user reference embedded in a workflow scheme
 */
export const WorkflowSchemeUserSchema = z
  .object({
    self: z.url().optional(),
    accountId: z.string().optional(),
    emailAddress: z.email().optional(),
    displayName: z.string().optional(),
    active: z.boolean().optional(),
  })
  .loose();

export type WorkflowSchemeUser = z.infer<typeof WorkflowSchemeUserSchema>;

/**
 * A workflow scheme, mapping issue types to workflows
 */
export const WorkflowSchemeSchema = z
  .object({
    id: z.number().int(),
    name: z.string(),
    description: z.string().optional(),
    defaultWorkflow: z.string().optional(),
    issueTypeMappings: z.record(z.string(), z.string()).optional(),
    draft: z.boolean().optional(),
    lastModifiedUser: WorkflowSchemeUserSchema.optional(),
    lastModified: z.string().optional(),
    self: z.url().optional(),
  })
  .loose();

export type WorkflowScheme = z.infer<typeof WorkflowSchemeSchema>;

/**
 * Paginated envelope returned by GET /workflowscheme
 */
export const WorkflowSchemeListResultSchema = z
  .object({
    startAt: z.number().int().optional(),
    maxResults: z.number().int().optional(),
    total: z.number().int().optional(),
    isLast: z.boolean().optional(),
    values: z.array(WorkflowSchemeSchema),
  })
  .loose();

export type WorkflowSchemeListResult = z.infer<typeof WorkflowSchemeListResultSchema>;

/**
 * Input for creating a workflow scheme
 */
export const CreateWorkflowSchemeInputSchema = z.object({
  name: z.string().min(1, { error: 'name is required' }),
  description: z.string().optional(),
  defaultWorkflow: z.string().optional(),
  issueTypeMappings: z.record(z.string(), z.string()).optional(),
});

export type CreateWorkflowSchemeInput = z.infer<typeof CreateWorkflowSchemeInputSchema>;

/**
 * Input for updating a workflow scheme
 */
export const UpdateWorkflowSchemeInputSchema = z.object({
  name: z.string().optional(),
  description: z.string().optional(),
  defaultWorkflow: z.string().optional(),
  issueTypeMappings: z.record(z.string(), z.string()).optional(),
});

export type UpdateWorkflowSchemeInput = z.infer<typeof UpdateWorkflowSchemeInputSchema>;

/**
 * Input for mapping an issue type to a workflow within a workflow scheme
 */
export const WorkflowSchemeIssueTypeInputSchema = z.object({
  issueType: z.string().min(1, { error: 'issueType is required' }),
  workflow: z.string().optional(),
  updateDraftIfNeeded: z.boolean().optional(),
});

export type WorkflowSchemeIssueTypeInput = z.infer<typeof WorkflowSchemeIssueTypeInputSchema>;

/**
 * Options for {@link WorkflowService.listWorkflowSchemes}
 */
export interface ListWorkflowSchemesOptions {
  /** Index of the first result to return */
  startAt?: number;
  /** Maximum number of results to return */
  maxResults?: number;
}
