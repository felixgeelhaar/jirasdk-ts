import { z } from 'zod';
import { AvatarUrlsSchema } from '@felixgeelhaar/sdk-core/schemas';

/**
 * Project Category
 */
export const ProjectCategorySchema = z.object({
  self: z.url(),
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
});

export type ProjectCategory = z.infer<typeof ProjectCategorySchema>;

/**
 * Project Type
 */
export const ProjectTypeSchema = z.enum(['software', 'service_desk', 'business']);

export type ProjectType = z.infer<typeof ProjectTypeSchema>;

/**
 * Project Style
 */
export const ProjectStyleSchema = z.enum(['classic', 'next-gen']);

export type ProjectStyle = z.infer<typeof ProjectStyleSchema>;

/**
 * Project Lead
 */
export const ProjectLeadSchema = z.object({
  self: z.url().optional(),
  accountId: z.string(),
  displayName: z.string(),
  active: z.boolean().optional(),
  avatarUrls: AvatarUrlsSchema.optional(),
});

export type ProjectLead = z.infer<typeof ProjectLeadSchema>;

/**
 * Insight object for projects
 */
export const InsightSchema = z.object({
  totalIssueCount: z.number().int().optional(),
  lastIssueUpdateTime: z.string().optional(),
});

export type Insight = z.infer<typeof InsightSchema>;
