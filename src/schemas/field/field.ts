import { z } from 'zod';

/**
 * Field schema definition (the `schema` object attached to a Jira field)
 */
export const FieldSchemaDefinitionSchema = z
  .object({
    type: z.string(),
    items: z.string().optional(),
    system: z.string().optional(),
    custom: z.string().optional(),
    customId: z.number().int().optional(),
  })
  .loose();

export type FieldSchemaDefinition = z.infer<typeof FieldSchemaDefinitionSchema>;

/**
 * Simplified project reference used inside a field scope
 */
export const FieldScopeProjectSchema = z
  .object({
    id: z.string(),
    key: z.string().optional(),
    name: z.string().optional(),
    self: z.url().optional(),
  })
  .loose();

export type FieldScopeProject = z.infer<typeof FieldScopeProjectSchema>;

/**
 * Scope of a custom field (global or project scoped)
 */
export const FieldScopeSchema = z
  .object({
    type: z.string(),
    project: FieldScopeProjectSchema.optional(),
  })
  .loose();

export type FieldScope = z.infer<typeof FieldScopeSchema>;

/**
 * Field usage information (last used)
 */
export const FieldUsageSchema = z
  .object({
    type: z.string().optional(),
    value: z.string().optional(),
  })
  .loose();

export type FieldUsage = z.infer<typeof FieldUsageSchema>;

/**
 * Field configuration scheme reference
 */
export const FieldConfigSchemeSchema = z
  .object({
    id: z.string(),
    name: z.string().optional(),
    description: z.string().optional(),
  })
  .loose();

export type FieldConfigScheme = z.infer<typeof FieldConfigSchemeSchema>;

/**
 * A Jira field (system or custom)
 */
export const FieldSchema = z
  .object({
    id: z.string(),
    key: z.string().optional(),
    name: z.string(),
    custom: z.boolean().optional(),
    orderable: z.boolean().optional(),
    navigable: z.boolean().optional(),
    searchable: z.boolean().optional(),
    clauseNames: z.array(z.string()).optional(),
    schema: FieldSchemaDefinitionSchema.optional(),
    scope: FieldScopeSchema.optional(),
    description: z.string().optional(),
    isLocked: z.boolean().optional(),
    searcherKey: z.string().optional(),
    screensCount: z.number().int().optional(),
    contextsCount: z.number().int().optional(),
    projectsCount: z.number().int().optional(),
    lastUsed: FieldUsageSchema.optional(),
    fieldConfigScheme: FieldConfigSchemeSchema.optional(),
  })
  .loose();

export type Field = z.infer<typeof FieldSchema>;

/**
 * A custom field context
 */
export const FieldContextSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    description: z.string().optional(),
    isGlobalContext: z.boolean().optional(),
    isAnyIssueType: z.boolean().optional(),
  })
  .loose();

export type FieldContext = z.infer<typeof FieldContextSchema>;

/**
 * An option of a select / multi-select custom field
 *
 * Jira has returned this identifier both as a string and as a number
 * depending on the endpoint, so both are accepted.
 */
export const FieldOptionSchema = z
  .object({
    id: z.union([z.string(), z.number()]).optional(),
    value: z.string(),
    disabled: z.boolean().optional(),
    position: z.number().int().optional(),
  })
  .loose();

export type FieldOption = z.infer<typeof FieldOptionSchema>;

/**
 * Mapping between a custom field context and a project
 */
export const ContextProjectMappingSchema = z
  .object({
    contextId: z.string(),
    projectId: z.string().optional(),
    isGlobalContext: z.boolean().optional(),
  })
  .loose();

export type ContextProjectMapping = z.infer<typeof ContextProjectMappingSchema>;

/**
 * Paginated `values` wrapper returned by the field context endpoints
 */
export const FieldContextListResponseSchema = z
  .object({
    values: z.array(FieldContextSchema),
    startAt: z.number().int().optional(),
    maxResults: z.number().int().optional(),
    total: z.number().int().optional(),
    isLast: z.boolean().optional(),
  })
  .loose();

export type FieldContextListResponse = z.infer<typeof FieldContextListResponseSchema>;

/**
 * Paginated `values` wrapper returned by the field option endpoints
 */
export const FieldOptionListResponseSchema = z
  .object({
    values: z.array(FieldOptionSchema),
    startAt: z.number().int().optional(),
    maxResults: z.number().int().optional(),
    total: z.number().int().optional(),
    isLast: z.boolean().optional(),
  })
  .loose();

export type FieldOptionListResponse = z.infer<typeof FieldOptionListResponseSchema>;

/**
 * Paginated `values` wrapper returned by the context project mapping endpoint
 */
export const ContextProjectMappingListResponseSchema = z
  .object({
    values: z.array(ContextProjectMappingSchema),
    startAt: z.number().int().optional(),
    maxResults: z.number().int().optional(),
    total: z.number().int().optional(),
    isLast: z.boolean().optional(),
  })
  .loose();

export type ContextProjectMappingListResponse = z.infer<
  typeof ContextProjectMappingListResponseSchema
>;

/**
 * Input for creating a custom field
 */
export const CreateFieldInputSchema = z.object({
  name: z.string().min(1, { error: 'field name is required' }),
  description: z.string().optional(),
  type: z.string().min(1, { error: 'field type is required' }),
  searcherKey: z.string().min(1, { error: 'searcher key is required' }),
});

export type CreateFieldInput = z.infer<typeof CreateFieldInputSchema>;

/**
 * Input for updating a custom field
 */
export const UpdateFieldInputSchema = z.object({
  name: z.string().optional(),
  description: z.string().optional(),
  searcherKey: z.string().optional(),
});

export type UpdateFieldInput = z.infer<typeof UpdateFieldInputSchema>;

/**
 * Input for creating a custom field context
 */
export const CreateFieldContextInputSchema = z.object({
  name: z.string().min(1, { error: 'context name is required' }),
  description: z.string().optional(),
  projectIds: z.array(z.string()).optional(),
  issueTypeIds: z.array(z.string()).optional(),
});

export type CreateFieldContextInput = z.infer<typeof CreateFieldContextInputSchema>;

/**
 * Input for updating a custom field context
 */
export const UpdateFieldContextInputSchema = z.object({
  name: z.string().optional(),
  description: z.string().optional(),
});

export type UpdateFieldContextInput = z.infer<typeof UpdateFieldContextInputSchema>;

/**
 * Input for creating a custom field option
 */
export const CreateFieldOptionInputSchema = z.object({
  value: z.string().min(1, { error: 'option value is required' }),
  disabled: z.boolean().optional(),
});

export type CreateFieldOptionInput = z.infer<typeof CreateFieldOptionInputSchema>;

/**
 * Input for associating projects with a custom field context
 *
 * Required since Jira Cloud CHANGE-3033 (February 2026): creating a custom
 * field no longer auto-associates it with projects.
 */
export const AssociateContextProjectsInputSchema = z.object({
  projectIds: z.array(z.string()).min(1, { error: 'at least one project ID is required' }),
});

export type AssociateContextProjectsInput = z.infer<typeof AssociateContextProjectsInputSchema>;

/**
 * Input for removing projects from a custom field context
 */
export const RemoveContextProjectsInputSchema = z.object({
  projectIds: z.array(z.string()).min(1, { error: 'at least one project ID is required' }),
});

export type RemoveContextProjectsInput = z.infer<typeof RemoveContextProjectsInputSchema>;

/**
 * Options for retrieving context-to-project mappings
 */
export const GetContextProjectMappingsOptionsSchema = z.object({
  contextIds: z.array(z.string()).optional(),
  startAt: z.number().int().min(0).optional(),
  maxResults: z.number().int().min(1).optional(),
});

export type GetContextProjectMappingsOptions = z.infer<
  typeof GetContextProjectMappingsOptionsSchema
>;
