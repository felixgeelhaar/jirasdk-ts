import { z } from 'zod';

/**
 * Simplified project reference used inside an issue type scope
 */
export const IssueTypeScopeProjectSchema = z
  .object({
    id: z.string(),
    key: z.string().optional(),
    name: z.string().optional(),
  })
  .loose();

export type IssueTypeScopeProject = z.infer<typeof IssueTypeScopeProjectSchema>;

/**
 * Scope of an issue type (global or project scoped)
 */
export const IssueTypeScopeSchema = z
  .object({
    type: z.string(),
    project: IssueTypeScopeProjectSchema.optional(),
  })
  .loose();

export type IssueTypeScope = z.infer<typeof IssueTypeScopeSchema>;

/**
 * Full issue type representation returned by the `/issuetype` resource.
 *
 * This is a superset of the embedded `IssueType` used inside issue payloads:
 * it additionally carries `scope` and treats `self` as optional.
 */
export const IssueTypeDetailsSchema = z
  .object({
    id: z.string(),
    self: z.url().optional(),
    name: z.string(),
    description: z.string().optional(),
    iconUrl: z.url().optional(),
    subtask: z.boolean().optional(),
    avatarId: z.number().int().optional(),
    hierarchyLevel: z.number().int().optional(),
    scope: IssueTypeScopeSchema.optional(),
  })
  .loose();

export type IssueTypeDetails = z.infer<typeof IssueTypeDetailsSchema>;

/**
 * An issue type scheme
 */
export const IssueTypeSchemeSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    description: z.string().optional(),
    defaultIssueTypeId: z.string().optional(),
    isDefault: z.boolean().optional(),
  })
  .loose();

export type IssueTypeScheme = z.infer<typeof IssueTypeSchemeSchema>;

/**
 * Mapping between an issue type scheme and an issue type
 */
export const IssueTypeSchemeMappingSchema = z
  .object({
    issueTypeSchemeId: z.string(),
    issueTypeId: z.string(),
  })
  .loose();

export type IssueTypeSchemeMapping = z.infer<typeof IssueTypeSchemeMappingSchema>;

/**
 * Paginated `values` wrapper returned by the issue type scheme endpoint
 */
export const IssueTypeSchemeListResponseSchema = z
  .object({
    values: z.array(IssueTypeSchemeSchema),
    startAt: z.number().int().optional(),
    maxResults: z.number().int().optional(),
    total: z.number().int().optional(),
    isLast: z.boolean().optional(),
  })
  .loose();

export type IssueTypeSchemeListResponse = z.infer<typeof IssueTypeSchemeListResponseSchema>;

/**
 * Paginated `values` wrapper returned by the issue type scheme mapping endpoint
 */
export const IssueTypeSchemeMappingListResponseSchema = z
  .object({
    values: z.array(IssueTypeSchemeMappingSchema),
    startAt: z.number().int().optional(),
    maxResults: z.number().int().optional(),
    total: z.number().int().optional(),
    isLast: z.boolean().optional(),
  })
  .loose();

export type IssueTypeSchemeMappingListResponse = z.infer<
  typeof IssueTypeSchemeMappingListResponseSchema
>;

/**
 * Input for creating an issue type
 */
export const CreateIssueTypeInputSchema = z.object({
  name: z.string().min(1, { error: 'issue type name is required' }),
  description: z.string().optional(),
  /** "subtask" or "standard" */
  type: z.enum(['subtask', 'standard']).optional(),
});

export type CreateIssueTypeInput = z.infer<typeof CreateIssueTypeInputSchema>;

/**
 * Input for updating an issue type
 */
export const UpdateIssueTypeInputSchema = z.object({
  name: z.string().optional(),
  description: z.string().optional(),
  avatarId: z.number().int().optional(),
});

export type UpdateIssueTypeInput = z.infer<typeof UpdateIssueTypeInputSchema>;

/**
 * Input for creating an issue type scheme
 *
 * Required since Jira Cloud CHANGE-2999/3000 (February 2026): creating an
 * issue type no longer auto-adds it to the Default Work Type Scheme.
 */
export const CreateIssueTypeSchemeInputSchema = z.object({
  name: z.string().min(1, { error: 'scheme name is required' }),
  description: z.string().optional(),
  defaultIssueTypeId: z.string().optional(),
  issueTypeIds: z.array(z.string()),
});

export type CreateIssueTypeSchemeInput = z.infer<typeof CreateIssueTypeSchemeInputSchema>;

/**
 * Input for updating an issue type scheme
 */
export const UpdateIssueTypeSchemeInputSchema = z.object({
  name: z.string().optional(),
  description: z.string().optional(),
  defaultIssueTypeId: z.string().optional(),
});

export type UpdateIssueTypeSchemeInput = z.infer<typeof UpdateIssueTypeSchemeInputSchema>;

/**
 * Input for adding issue types to an issue type scheme
 */
export const AddIssueTypesToSchemeInputSchema = z.object({
  issueTypeIds: z.array(z.string()).min(1, { error: 'at least one issue type ID is required' }),
});

export type AddIssueTypesToSchemeInput = z.infer<typeof AddIssueTypesToSchemeInputSchema>;

/**
 * Options for listing issue type schemes
 */
export const ListIssueTypeSchemesOptionsSchema = z.object({
  startAt: z.number().int().min(0).optional(),
  maxResults: z.number().int().min(1).optional(),
});

export type ListIssueTypeSchemesOptions = z.infer<typeof ListIssueTypeSchemesOptionsSchema>;

/**
 * Options for retrieving issue type scheme to issue type mappings
 */
export const GetIssueTypeSchemeMappingsOptionsSchema = z.object({
  issueTypeSchemeIds: z.array(z.string()).optional(),
  startAt: z.number().int().min(0).optional(),
  maxResults: z.number().int().min(1).optional(),
});

export type GetIssueTypeSchemeMappingsOptions = z.infer<
  typeof GetIssueTypeSchemeMappingsOptionsSchema
>;
