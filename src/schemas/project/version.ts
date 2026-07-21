import { z } from 'zod';
import { JiraDateSchema } from '../common/index.js';

/**
 * A project version (release) as returned by the project/version endpoints.
 *
 * Read path: lenient, because Jira omits most fields depending on the
 * endpoint and the caller's permissions.
 */
export const ProjectVersionSchema = z
  .object({
    self: z.url().optional(),
    id: z.string().optional(),
    name: z.string().optional(),
    description: z.string().optional(),
    archived: z.boolean().optional(),
    released: z.boolean().optional(),
    overdue: z.boolean().optional(),
    startDate: z.string().optional(),
    releaseDate: z.string().optional(),
    userStartDate: z.string().optional(),
    userReleaseDate: z.string().optional(),
    project: z.string().optional(),
    projectId: z.number().int().optional(),
    moveUnfixedIssuesTo: z.url().optional(),
    operations: z.array(z.record(z.string(), z.unknown())).optional(),
    issuesStatusForFixVersion: z.record(z.string(), z.unknown()).optional(),
  })
  .loose();

export type ProjectVersion = z.infer<typeof ProjectVersionSchema>;

/**
 * List of project versions
 */
export const ProjectVersionsSchema = z.array(ProjectVersionSchema);

export type ProjectVersions = z.infer<typeof ProjectVersionsSchema>;

/**
 * Create version input (POST /rest/api/3/version)
 */
export const CreateVersionInputSchema = z.object({
  name: z.string().min(1),
  /** Project ID or key the version belongs to */
  project: z.string().min(1),
  description: z.string().optional(),
  /** Numeric project ID; returned by the API, normally not set on creation */
  projectId: z.number().int().optional(),
  archived: z.boolean().optional(),
  released: z.boolean().optional(),
  startDate: JiraDateSchema.optional(),
  releaseDate: JiraDateSchema.optional(),
});

export type CreateVersionInput = z.infer<typeof CreateVersionInputSchema>;

/**
 * Update version input (PUT /rest/api/3/version/{id})
 */
export const UpdateVersionInputSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  archived: z.boolean().optional(),
  released: z.boolean().optional(),
  startDate: JiraDateSchema.optional(),
  releaseDate: JiraDateSchema.optional(),
});

export type UpdateVersionInput = z.infer<typeof UpdateVersionInputSchema>;
