import { z } from 'zod';

/**
 * Share permission type for a filter
 *
 * - `global` — visible to everyone, including anonymous users
 * - `loggedin` / `authenticated` — visible to any logged-in user
 * - `project` — visible to members of a project
 * - `group` — visible to members of a group
 * - `user` — visible to a single user
 * - `projectRole` — visible to a project role
 */
export const FilterPermissionTypeSchema = z.enum([
  'global',
  'loggedin',
  'authenticated',
  'project',
  'group',
  'user',
  'projectRole',
]);

export type FilterPermissionType = z.infer<typeof FilterPermissionTypeSchema>;

/**
 * Default share scope for the current user's filters
 */
export const FilterShareScopeSchema = z.enum(['GLOBAL', 'AUTHENTICATED', 'PRIVATE']);

export type FilterShareScope = z.infer<typeof FilterShareScopeSchema>;

/**
 * Minimal project reference used inside filter share permissions
 */
export const FilterProjectRefSchema = z
  .object({
    id: z.string().optional(),
    key: z.string().optional(),
    name: z.string().optional(),
    self: z.url().optional(),
  })
  .loose();

export type FilterProjectRef = z.infer<typeof FilterProjectRefSchema>;

/**
 * User group reference used inside filter share permissions
 */
export const FilterGroupRefSchema = z
  .object({
    name: z.string().optional(),
    groupId: z.string().optional(),
    self: z.url().optional(),
  })
  .loose();

export type FilterGroupRef = z.infer<typeof FilterGroupRefSchema>;

/**
 * Project role reference used inside filter share permissions
 */
export const FilterRoleRefSchema = z
  .object({
    id: z.string().optional(),
    name: z.string().optional(),
    self: z.url().optional(),
  })
  .loose();

export type FilterRoleRef = z.infer<typeof FilterRoleRefSchema>;
