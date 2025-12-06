import { z } from 'zod';
import { AvatarUrlsSchema, UserRefSchema } from '@felixgeelhaar/sdk-core/schemas';
import { IssueTypeSchema, ComponentSchema, VersionSchema } from '../issue/types.js';
import {
  ProjectCategorySchema,
  ProjectTypeSchema,
  ProjectStyleSchema,
  ProjectLeadSchema,
  InsightSchema,
} from './types.js';

/**
 * Project Reference (minimal)
 */
export const ProjectRefSchema = z.object({
  self: z.string().url().optional(),
  id: z.string(),
  key: z.string(),
  name: z.string(),
  avatarUrls: AvatarUrlsSchema.optional(),
});

export type ProjectRef = z.infer<typeof ProjectRefSchema>;

/**
 * Full Project Schema
 */
export const ProjectSchema = z.object({
  self: z.string().url(),
  id: z.string(),
  key: z.string(),
  name: z.string(),
  description: z.string().optional(),
  lead: ProjectLeadSchema.optional(),
  components: z.array(ComponentSchema).optional(),
  issueTypes: z.array(IssueTypeSchema).optional(),
  url: z.string().url().optional(),
  email: z.string().email().optional(),
  assigneeType: z.enum(['PROJECT_LEAD', 'UNASSIGNED']).optional(),
  versions: z.array(VersionSchema).optional(),
  roles: z.record(z.string()).optional(),
  avatarUrls: AvatarUrlsSchema.optional(),
  projectCategory: ProjectCategorySchema.optional(),
  projectTypeKey: ProjectTypeSchema.optional(),
  simplified: z.boolean().optional(),
  style: ProjectStyleSchema.optional(),
  favourite: z.boolean().optional(),
  isPrivate: z.boolean().optional(),
  insight: InsightSchema.optional(),
  deleted: z.boolean().optional(),
  retentionTillDate: z.string().optional(),
  deletedDate: z.string().optional(),
  deletedBy: UserRefSchema.optional(),
  archived: z.boolean().optional(),
  archivedDate: z.string().optional(),
  archivedBy: UserRefSchema.optional(),
  uuid: z.string().uuid().optional(),
  // Additional properties for detailed responses
  properties: z.record(z.unknown()).optional(),
  permissions: z.record(z.unknown()).optional(),
});

export type Project = z.infer<typeof ProjectSchema>;

/**
 * Create Project Input
 */
export const CreateProjectInputSchema = z.object({
  key: z.string().min(1).max(10),
  name: z.string().min(1).max(80),
  description: z.string().optional(),
  lead: z.string().optional(), // Account ID
  leadAccountId: z.string().optional(),
  url: z.string().url().optional(),
  assigneeType: z.enum(['PROJECT_LEAD', 'UNASSIGNED']).optional(),
  avatarId: z.number().int().optional(),
  issueSecurityScheme: z.number().int().optional(),
  permissionScheme: z.number().int().optional(),
  notificationScheme: z.number().int().optional(),
  categoryId: z.number().int().optional(),
  projectTypeKey: ProjectTypeSchema.optional(),
  projectTemplateKey: z.string().optional(),
  workflowScheme: z.number().int().optional(),
  issueTypeScreenScheme: z.number().int().optional(),
  issueTypeScheme: z.number().int().optional(),
  fieldConfigurationScheme: z.number().int().optional(),
});

export type CreateProjectInput = z.infer<typeof CreateProjectInputSchema>;

/**
 * Update Project Input
 */
export const UpdateProjectInputSchema = z.object({
  key: z.string().min(1).max(10).optional(),
  name: z.string().min(1).max(80).optional(),
  description: z.string().optional(),
  lead: z.string().optional(),
  leadAccountId: z.string().optional(),
  url: z.string().url().nullable().optional(),
  assigneeType: z.enum(['PROJECT_LEAD', 'UNASSIGNED']).optional(),
  avatarId: z.number().int().optional(),
  issueSecurityScheme: z.number().int().optional(),
  permissionScheme: z.number().int().optional(),
  notificationScheme: z.number().int().optional(),
  categoryId: z.number().int().optional(),
});

export type UpdateProjectInput = z.infer<typeof UpdateProjectInputSchema>;

/**
 * Project Search Result
 */
export const ProjectSearchResultSchema = z.object({
  self: z.string().url().optional(),
  maxResults: z.number().int(),
  startAt: z.number().int(),
  total: z.number().int(),
  isLast: z.boolean().optional(),
  values: z.array(ProjectSchema),
});

export type ProjectSearchResult = z.infer<typeof ProjectSearchResultSchema>;

/**
 * Get Projects Options
 */
export const GetProjectsOptionsSchema = z.object({
  startAt: z.number().int().min(0).optional(),
  maxResults: z.number().int().min(1).max(50).optional(),
  orderBy: z
    .enum([
      'category',
      '-category',
      'key',
      '-key',
      'name',
      '-name',
      'owner',
      '-owner',
      'issueCount',
      '-issueCount',
      'lastIssueUpdatedDate',
      '-lastIssueUpdatedDate',
      'archivedDate',
      '+archivedDate',
      '-archivedDate',
    ])
    .optional(),
  id: z.array(z.number().int()).optional(),
  keys: z.array(z.string()).optional(),
  query: z.string().optional(),
  typeKey: ProjectTypeSchema.optional(),
  categoryId: z.number().int().optional(),
  action: z.enum(['view', 'browse', 'edit']).optional(),
  expand: z.string().optional(),
  status: z.array(z.enum(['live', 'archived', 'deleted'])).optional(),
  properties: z.array(z.string()).optional(),
  propertyQuery: z.string().optional(),
});

export type GetProjectsOptions = z.infer<typeof GetProjectsOptionsSchema>;
