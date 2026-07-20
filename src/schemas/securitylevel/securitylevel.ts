import { z } from 'zod';

/**
 * A Jira issue security level
 */
export const SecurityLevelSchema = z
  .object({
    id: z.string(),
    self: z.url().optional(),
    name: z.string(),
    description: z.string().optional(),
  })
  .loose();

export type SecurityLevel = z.infer<typeof SecurityLevelSchema>;

/**
 * A Jira issue security scheme containing security levels
 *
 * `defaultSecurityLevelId` is returned as a numeric ID by Jira Cloud, but some
 * responses embed the full level object - both shapes are accepted.
 */
export const SecuritySchemeSchema = z
  .object({
    id: z.union([z.string(), z.number()]),
    self: z.url().optional(),
    name: z.string(),
    description: z.string().optional(),
    defaultSecurityLevelId: z.union([z.string(), z.number(), SecurityLevelSchema]).optional(),
    levels: z.array(SecurityLevelSchema).optional(),
  })
  .loose();

export type SecurityScheme = z.infer<typeof SecuritySchemeSchema>;

/**
 * Response wrapper for `GET /rest/api/3/issuesecurityschemes`
 */
export const IssueSecuritySchemesResponseSchema = z
  .object({
    issueSecuritySchemes: z.array(SecuritySchemeSchema).default([]),
  })
  .loose();

export type IssueSecuritySchemesResponse = z.infer<typeof IssueSecuritySchemesResponseSchema>;
