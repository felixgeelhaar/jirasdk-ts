import { z } from 'zod';
import { AvatarUrlsSchema } from '@felixgeelhaar/sdk-core/schemas';

/**
 * Issue Type
 */
export const IssueTypeSchema = z.object({
  self: z.string().url(),
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  iconUrl: z.string().url().optional(),
  subtask: z.boolean(),
  avatarId: z.number().optional(),
  hierarchyLevel: z.number().optional(),
});

export type IssueType = z.infer<typeof IssueTypeSchema>;

/**
 * Issue Type input for creation
 */
export const IssueTypeInputSchema = z.union([
  z.object({ id: z.string() }),
  z.object({ name: z.string() }),
]);

export type IssueTypeInput = z.infer<typeof IssueTypeInputSchema>;

/**
 * Status Category
 */
export const StatusCategorySchema = z.object({
  self: z.string().url(),
  id: z.number(),
  key: z.string(),
  colorName: z.string(),
  name: z.string(),
});

export type StatusCategory = z.infer<typeof StatusCategorySchema>;

/**
 * Issue Status
 */
export const IssueStatusSchema = z.object({
  self: z.string().url(),
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  iconUrl: z.string().url().optional(),
  statusCategory: StatusCategorySchema.optional(),
});

export type IssueStatus = z.infer<typeof IssueStatusSchema>;

/**
 * Issue Priority
 */
export const IssuePrioritySchema = z.object({
  self: z.string().url(),
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  iconUrl: z.string().url().optional(),
});

export type IssuePriority = z.infer<typeof IssuePrioritySchema>;

/**
 * Priority input for creation/update
 */
export const PriorityInputSchema = z.union([
  z.object({ id: z.string() }),
  z.object({ name: z.string() }),
]);

export type PriorityInput = z.infer<typeof PriorityInputSchema>;

/**
 * Issue Resolution
 */
export const IssueResolutionSchema = z.object({
  self: z.string().url(),
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
});

export type IssueResolution = z.infer<typeof IssueResolutionSchema>;

/**
 * Resolution input
 */
export const ResolutionInputSchema = z.union([
  z.object({ id: z.string() }),
  z.object({ name: z.string() }),
]);

export type ResolutionInput = z.infer<typeof ResolutionInputSchema>;

/**
 * Project reference in issue
 */
export const IssueProjectSchema = z.object({
  self: z.string().url(),
  id: z.string(),
  key: z.string(),
  name: z.string(),
  projectTypeKey: z.enum(['software', 'service_desk', 'business']).optional(),
  simplified: z.boolean().optional(),
  avatarUrls: AvatarUrlsSchema.optional(),
});

export type IssueProject = z.infer<typeof IssueProjectSchema>;

/**
 * Project input for creation
 */
export const ProjectInputSchema = z.union([
  z.object({ id: z.string() }),
  z.object({ key: z.string() }),
]);

export type ProjectInput = z.infer<typeof ProjectInputSchema>;

/**
 * Component
 */
export const ComponentSchema = z.object({
  self: z.string().url(),
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
});

export type Component = z.infer<typeof ComponentSchema>;

/**
 * Component input
 */
export const ComponentInputSchema = z.union([
  z.object({ id: z.string() }),
  z.object({ name: z.string() }),
]);

export type ComponentInput = z.infer<typeof ComponentInputSchema>;

/**
 * Version (Fix Version / Affects Version)
 */
export const VersionSchema = z.object({
  self: z.string().url(),
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  archived: z.boolean().optional(),
  released: z.boolean().optional(),
  releaseDate: z.string().optional(),
  startDate: z.string().optional(),
  projectId: z.number().optional(),
});

export type Version = z.infer<typeof VersionSchema>;

/**
 * Version input
 */
export const VersionInputSchema = z.union([
  z.object({ id: z.string() }),
  z.object({ name: z.string() }),
]);

export type VersionInput = z.infer<typeof VersionInputSchema>;
