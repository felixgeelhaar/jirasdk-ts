import { BaseService } from './base.service.js';
import {
  AllPermissionsResponseSchema,
  MyPermissionsSchema,
  PermissionSchemeSchema,
  PermissionSchemesResponseSchema,
  ProjectRoleSchema,
  ProjectRolesSchema,
  CreatePermissionSchemeInputSchema,
  UpdatePermissionSchemeInputSchema,
  AddActorInputSchema,
  type Permission,
  type MyPermissions,
  type MyPermissionsOptions,
  type PermissionScheme,
  type ListPermissionSchemesOptions,
  type GetPermissionSchemeOptions,
  type CreatePermissionSchemeInput,
  type UpdatePermissionSchemeInput,
  type ProjectRole,
  type ProjectRoles,
  type ProjectRoleActorType,
  type AddActorInput,
} from '../schemas/permission/index.js';

/**
 * Permission service for Jira permissions, permission schemes and project roles
 *
 * @example
 * ```typescript
 * const client = new JiraClient({ ... });
 *
 * // All permissions known to Jira
 * const permissions = await client.permissions.getAllPermissions();
 *
 * // The current user's permissions in a project
 * const mine = await client.permissions.getMyPermissions({ projectKey: 'PROJ' });
 * ```
 */
export class PermissionService extends BaseService {
  /**
   * Get all permissions available in Jira
   *
   * `GET /rest/api/3/permissions`
   *
   * @returns All permission definitions
   */
  async getAllPermissions(): Promise<Permission[]> {
    const result = await this.getMethod('/permissions', AllPermissionsResponseSchema);
    return Array.isArray(result.permissions)
      ? result.permissions
      : Object.values(result.permissions);
  }

  /**
   * Get the current user's permissions, optionally scoped to a project or issue
   *
   * `GET /rest/api/3/mypermissions`
   *
   * @param options - Project/issue scope and the permission keys to check
   * @returns The permission grant status keyed by permission key
   */
  async getMyPermissions(options?: MyPermissionsOptions): Promise<MyPermissions> {
    const params = this.buildParams({
      projectKey: options?.projectKey,
      projectId: options?.projectId,
      issueKey: options?.issueKey,
      issueId: options?.issueId,
      permissions: this.arrayToCommaSeparated(options?.permissions),
    });

    return this.getMethod('/mypermissions', MyPermissionsSchema, params);
  }

  /**
   * List all permission schemes
   *
   * `GET /rest/api/3/permissionscheme`
   *
   * @param options - Optional expand values
   * @returns All permission schemes
   */
  async listPermissionSchemes(options?: ListPermissionSchemesOptions): Promise<PermissionScheme[]> {
    const params = this.buildParams({
      expand: options?.expand,
    });

    const result = await this.getMethod(
      '/permissionscheme',
      PermissionSchemesResponseSchema,
      params
    );
    return result.permissionSchemes;
  }

  /**
   * Get a permission scheme by ID
   *
   * `GET /rest/api/3/permissionscheme/{schemeId}`
   *
   * @param schemeId - ID of the permission scheme
   * @param options - Optional expand values
   * @returns The permission scheme
   */
  async getPermissionScheme(
    schemeId: number,
    options?: GetPermissionSchemeOptions
  ): Promise<PermissionScheme> {
    const params = this.buildParams({
      expand: options?.expand,
    });

    return this.getMethod(`/permissionscheme/${String(schemeId)}`, PermissionSchemeSchema, params);
  }

  /**
   * Create a permission scheme
   *
   * `POST /rest/api/3/permissionscheme`
   *
   * @param input - Name, description and optional permission grants
   * @returns The created permission scheme
   */
  async createPermissionScheme(input: CreatePermissionSchemeInput): Promise<PermissionScheme> {
    const body = CreatePermissionSchemeInputSchema.parse(input);
    return this.postMethod('/permissionscheme', PermissionSchemeSchema, body);
  }

  /**
   * Update a permission scheme
   *
   * `PUT /rest/api/3/permissionscheme/{schemeId}`
   *
   * @param schemeId - ID of the permission scheme
   * @param input - Fields to update
   * @returns The updated permission scheme
   */
  async updatePermissionScheme(
    schemeId: number,
    input: UpdatePermissionSchemeInput
  ): Promise<PermissionScheme> {
    const body = UpdatePermissionSchemeInputSchema.parse(input);
    return this.putMethod(`/permissionscheme/${String(schemeId)}`, PermissionSchemeSchema, body);
  }

  /**
   * Delete a permission scheme
   *
   * `DELETE /rest/api/3/permissionscheme/{schemeId}`
   *
   * @param schemeId - ID of the permission scheme
   * @returns Nothing
   */
  async deletePermissionScheme(schemeId: number): Promise<void> {
    await this.deleteMethod(`/permissionscheme/${String(schemeId)}`);
  }

  /**
   * Get all roles of a project as a map of role name to role URL
   *
   * `GET /rest/api/3/project/{projectIdOrKey}/role`
   *
   * @param projectIdOrKey - Project key or ID
   * @returns Map of role name to the role's REST URL
   */
  async getProjectRoles(projectIdOrKey: string): Promise<ProjectRoles> {
    return this.getMethod(`/project/${projectIdOrKey}/role`, ProjectRolesSchema);
  }

  /**
   * Get details of a single project role, including its actors
   *
   * `GET /rest/api/3/project/{projectIdOrKey}/role/{roleId}`
   *
   * @param projectIdOrKey - Project key or ID
   * @param roleId - ID of the project role
   * @returns The project role
   */
  async getProjectRole(projectIdOrKey: string, roleId: number): Promise<ProjectRole> {
    return this.getMethod(`/project/${projectIdOrKey}/role/${String(roleId)}`, ProjectRoleSchema);
  }

  /**
   * Add users and/or groups as actors of a project role
   *
   * `POST /rest/api/3/project/{projectIdOrKey}/role/{roleId}`
   *
   * @param projectIdOrKey - Project key or ID
   * @param roleId - ID of the project role
   * @param input - Account IDs and/or group names to add
   * @returns The updated project role
   */
  async addActorsToProjectRole(
    projectIdOrKey: string,
    roleId: number,
    input: AddActorInput
  ): Promise<ProjectRole> {
    const body = AddActorInputSchema.parse(input);
    return this.postMethod(
      `/project/${projectIdOrKey}/role/${String(roleId)}`,
      ProjectRoleSchema,
      body
    );
  }

  /**
   * Remove an actor from a project role
   *
   * `DELETE /rest/api/3/project/{projectIdOrKey}/role/{roleId}?{actorType}={actor}`
   *
   * @param projectIdOrKey - Project key or ID
   * @param roleId - ID of the project role
   * @param actorType - Whether the actor is a `user`, `group` or `groupId`
   * @param actor - Account ID, group name or group ID of the actor
   * @returns Nothing
   */
  async removeActorFromProjectRole(
    projectIdOrKey: string,
    roleId: number,
    actorType: ProjectRoleActorType,
    actor: string
  ): Promise<void> {
    const params = this.buildParams({ [actorType]: actor });

    await this.http.delete(this.buildPath(`/project/${projectIdOrKey}/role/${String(roleId)}`), {
      params,
    });
  }
}
