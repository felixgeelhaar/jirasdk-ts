import { z } from 'zod';

/**
 * User actor of a project role
 */
export const ProjectRoleActorUserSchema = z
  .object({
    accountId: z.string(),
  })
  .loose();

export type ProjectRoleActorUser = z.infer<typeof ProjectRoleActorUserSchema>;

/**
 * Group actor of a project role
 */
export const ProjectRoleActorGroupSchema = z
  .object({
    name: z.string(),
    displayName: z.string().optional(),
    groupId: z.string().optional(),
  })
  .loose();

export type ProjectRoleActorGroup = z.infer<typeof ProjectRoleActorGroupSchema>;

/**
 * An actor (user or group) assigned to a project role
 */
export const ProjectRoleActorSchema = z
  .object({
    id: z.number().int(),
    displayName: z.string(),
    /** `atlassian-user-role-actor` or `atlassian-group-role-actor` */
    type: z.string(),
    name: z.string().optional(),
    actorUser: ProjectRoleActorUserSchema.optional(),
    actorGroup: ProjectRoleActorGroupSchema.optional(),
  })
  .loose();

export type ProjectRoleActor = z.infer<typeof ProjectRoleActorSchema>;

/**
 * Minimal project reference used inside a role scope
 */
export const ProjectRoleScopeProjectSchema = z
  .object({
    id: z.string(),
    key: z.string().optional(),
    name: z.string().optional(),
  })
  .loose();

export type ProjectRoleScopeProject = z.infer<typeof ProjectRoleScopeProjectSchema>;

/**
 * Scope of a project role
 */
export const ProjectRoleScopeSchema = z
  .object({
    type: z.string(),
    project: ProjectRoleScopeProjectSchema.optional(),
  })
  .loose();

export type ProjectRoleScope = z.infer<typeof ProjectRoleScopeSchema>;

/**
 * A project role with its actors
 */
export const ProjectRoleSchema = z
  .object({
    self: z.url().optional(),
    id: z.number().int(),
    name: z.string(),
    description: z.string().optional(),
    actors: z.array(ProjectRoleActorSchema).optional(),
    scope: ProjectRoleScopeSchema.optional(),
  })
  .loose();

export type ProjectRole = z.infer<typeof ProjectRoleSchema>;

/**
 * Map of project role name to the role's REST URL,
 * as returned by `GET /rest/api/3/project/{projectIdOrKey}/role`
 */
export const ProjectRolesSchema = z.record(z.string(), z.string());

export type ProjectRoles = z.infer<typeof ProjectRolesSchema>;

/**
 * Input for adding actors to a project role
 */
export const AddActorInputSchema = z.object({
  /** Account IDs of users to add */
  user: z.array(z.string()).optional(),
  /** Names of groups to add */
  group: z.array(z.string()).optional(),
});

export type AddActorInput = z.infer<typeof AddActorInputSchema>;

/**
 * Type of actor removed from a project role
 */
export const ProjectRoleActorTypeSchema = z.enum(['user', 'group', 'groupId']);

export type ProjectRoleActorType = z.infer<typeof ProjectRoleActorTypeSchema>;
