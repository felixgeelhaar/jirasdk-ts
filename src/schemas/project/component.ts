import { z } from 'zod';
import { UserRefSchema } from '../common/index.js';

/**
 * How the default assignee for issues in a component is determined.
 */
export const ComponentAssigneeTypeSchema = z.enum([
  'PROJECT_DEFAULT',
  'COMPONENT_LEAD',
  'PROJECT_LEAD',
  'UNASSIGNED',
]);

export type ComponentAssigneeType = z.infer<typeof ComponentAssigneeTypeSchema>;

/**
 * A project component as returned by the project/component endpoints.
 *
 * Read path: lenient, because Jira omits most fields depending on the
 * endpoint and the caller's permissions.
 */
export const ProjectComponentSchema = z
  .object({
    self: z.url().optional(),
    id: z.string().optional(),
    name: z.string().optional(),
    description: z.string().optional(),
    lead: UserRefSchema.optional(),
    leadAccountId: z.string().optional(),
    assignee: UserRefSchema.optional(),
    assigneeType: ComponentAssigneeTypeSchema.optional(),
    realAssignee: UserRefSchema.optional(),
    realAssigneeType: ComponentAssigneeTypeSchema.optional(),
    isAssigneeTypeValid: z.boolean().optional(),
    project: z.string().optional(),
    projectId: z.number().int().optional(),
  })
  .loose();

export type ProjectComponent = z.infer<typeof ProjectComponentSchema>;

/**
 * List of project components
 */
export const ProjectComponentsSchema = z.array(ProjectComponentSchema);

export type ProjectComponents = z.infer<typeof ProjectComponentsSchema>;

/**
 * Create component input (POST /rest/api/3/component)
 */
export const CreateComponentInputSchema = z.object({
  name: z.string().min(1),
  /** Project ID or key the component belongs to */
  project: z.string().min(1),
  description: z.string().optional(),
  leadAccountId: z.string().optional(),
  assigneeType: ComponentAssigneeTypeSchema.optional(),
});

export type CreateComponentInput = z.infer<typeof CreateComponentInputSchema>;

/**
 * Update component input (PUT /rest/api/3/component/{id})
 */
export const UpdateComponentInputSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  leadAccountId: z.string().optional(),
  assigneeType: ComponentAssigneeTypeSchema.optional(),
});

export type UpdateComponentInput = z.infer<typeof UpdateComponentInputSchema>;
