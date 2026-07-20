import { z } from 'zod';
import { BaseService } from './base.service.js';
import { UserSchema, type User } from '../schemas/common/index.js';

/**
 * User search result schema
 */
const UserSearchResultSchema = z.array(UserSchema);

/**
 * Assignable users response schema
 */
const AssignableUsersSchema = z.array(UserSchema);

/**
 * Bulk user retrieval response (`GET /rest/api/3/user/bulk`)
 */
const BulkUsersPageSchema = z.object({
  self: z.url().optional(),
  nextPage: z.url().optional(),
  maxResults: z.number().int().optional(),
  startAt: z.number().int().optional(),
  total: z.number().int().optional(),
  isLast: z.boolean().optional(),
  values: z.array(UserSchema),
});

/**
 * Default issue-table columns response
 */
const ColumnsSchema = z.array(
  z.object({
    label: z.string().optional(),
    value: z.string(),
  })
);

/**
 * A group the user belongs to
 */
export const GroupItemSchema = z.object({
  name: z.string().optional(),
  self: z.url().optional(),
  groupId: z.string().optional(),
});

export type GroupItem = z.infer<typeof GroupItemSchema>;

const GroupItemsSchema = z.array(GroupItemSchema);

/**
 * A user property
 */
export const UserPropertySchema = z.object({
  key: z.string(),
  value: z.unknown(),
});

export type UserProperty = z.infer<typeof UserPropertySchema>;

/**
 * Options for {@link UserService.bulkGet}
 */
export interface BulkGetUsersOptions {
  /** Account IDs to retrieve (required, repeated as `accountId` query params) */
  accountIds: string[];
  startAt?: number;
  maxResults?: number;
}

/**
 * Options for {@link UserService.findUsersWithAllPermissions}
 */
export interface FindUsersWithAllPermissionsOptions {
  /** Permissions the users must all have (required) */
  permissions: string[];
  issueKey?: string;
  projectKey?: string;
  query?: string;
  startAt?: number;
  maxResults?: number;
}

/**
 * Options for {@link UserService.findUsersWithBrowsePermission}
 */
export interface FindUsersWithBrowsePermissionOptions {
  query?: string;
  issueKey?: string;
  projectKey?: string;
  startAt?: number;
  maxResults?: number;
}

/**
 * User service for user-related operations
 *
 * @example
 * ```typescript
 * const client = new JiraClient({ ... });
 *
 * // Get current user
 * const me = await client.users.getCurrentUser();
 *
 * // Search users
 * const users = await client.users.search({ query: 'john' });
 *
 * // Get assignable users for a project
 * const assignable = await client.users.getAssignable({
 *   project: 'PROJECT',
 * });
 * ```
 */
export class UserService extends BaseService {
  /**
   * Get the currently authenticated user
   */
  async getCurrentUser(options?: { expand?: string[] }): Promise<User> {
    const params = this.buildParams({
      expand: this.arrayToCommaSeparated(options?.expand),
    });

    return this.getMethod('/myself', UserSchema, params);
  }

  /**
   * Get a user by account ID
   */
  async get(accountId: string, options?: { expand?: string[] }): Promise<User> {
    const params = this.buildParams({
      accountId,
      expand: this.arrayToCommaSeparated(options?.expand),
    });

    return this.getMethod('/user', UserSchema, params);
  }

  /**
   * Search for users
   */
  async search(options: {
    query?: string;
    accountId?: string;
    startAt?: number;
    maxResults?: number;
  }): Promise<User[]> {
    const params = this.buildParams({
      query: options.query,
      accountId: options.accountId,
      startAt: options.startAt,
      maxResults: options.maxResults,
    });

    return this.getMethod('/user/search', UserSearchResultSchema, params);
  }

  /**
   * Find users assignable to issues
   */
  async getAssignable(options: {
    query?: string;
    accountId?: string;
    project?: string;
    issueKey?: string;
    startAt?: number;
    maxResults?: number;
  }): Promise<User[]> {
    const params = this.buildParams({
      query: options.query,
      accountId: options.accountId,
      project: options.project,
      issueKey: options.issueKey,
      startAt: options.startAt,
      maxResults: options.maxResults,
    });

    return this.getMethod('/user/assignable/search', AssignableUsersSchema, params);
  }

  /**
   * Find users that can be assigned to issues in a project
   */
  async getAssignableForProject(
    projectKey: string,
    options?: { query?: string; startAt?: number; maxResults?: number }
  ): Promise<User[]> {
    return this.getAssignable({
      project: projectKey,
      ...options,
    });
  }

  /**
   * Find users that can be assigned to a specific issue
   */
  async getAssignableForIssue(
    issueKey: string,
    options?: { query?: string; startAt?: number; maxResults?: number }
  ): Promise<User[]> {
    return this.getAssignable({
      issueKey,
      ...options,
    });
  }

  /**
   * Get users who can browse a project
   */
  async getProjectMembers(
    projectKey: string,
    options?: { query?: string; startAt?: number; maxResults?: number }
  ): Promise<User[]> {
    const params = this.buildParams({
      projectKey,
      query: options?.query,
      startAt: options?.startAt,
      maxResults: options?.maxResults,
    });

    return this.getMethod('/user/viewissue/search', UserSearchResultSchema, params);
  }

  /**
   * Get multiple users by account ID
   *
   * `GET /rest/api/3/user/bulk`
   *
   * @param options - Account IDs plus optional pagination
   * @returns The matching users
   */
  async bulkGet(options: BulkGetUsersOptions): Promise<User[]> {
    const params = this.buildParams({
      accountId: options.accountIds,
      startAt: options.startAt,
      maxResults: options.maxResults,
    });

    const page = await this.getMethod('/user/bulk', BulkUsersPageSchema, params);
    return page.values;
  }

  /**
   * Get a user's default issue-table columns
   *
   * `GET /rest/api/3/user/columns`
   *
   * @param accountId - Account ID of the user
   * @returns The column IDs, in display order
   */
  async getDefaultColumns(accountId: string): Promise<string[]> {
    const params = this.buildParams({ accountId });
    const columns = await this.getMethod('/user/columns', ColumnsSchema, params);
    return columns.map((column) => column.value);
  }

  /**
   * Set the calling user's default issue-table columns
   *
   * `PUT /rest/api/3/user/columns`
   *
   * Deviates from the Go SDK, which sends a bare JSON array as the body. The
   * documented request body is `UserColumnRequestBody`, an object with a
   * `columns` array — "The ID of a column to set. To set multiple columns, send
   * multiple `columns` parameters."
   *
   * @param columns - Column IDs, e.g. `['issuekey', 'summary', 'status']`
   * @returns Nothing
   */
  async setDefaultColumns(columns: string[]): Promise<void> {
    await this.putMethodRaw('/user/columns', { columns });
  }

  /**
   * Reset a user's default issue-table columns to the system defaults
   *
   * `DELETE /rest/api/3/user/columns`
   *
   * @param accountId - Account ID of the user
   * @returns Nothing
   */
  async resetDefaultColumns(accountId: string): Promise<void> {
    await this.http.request({
      method: 'DELETE',
      url: this.buildPath('/user/columns'),
      params: { accountId },
    });
  }

  /**
   * Get a user property
   *
   * `GET /rest/api/3/user/properties/{propertyKey}`
   *
   * @param accountId - Account ID of the user
   * @param propertyKey - Property key
   * @returns The property key and value
   */
  async getUserProperty(accountId: string, propertyKey: string): Promise<UserProperty> {
    const params = this.buildParams({ accountId });
    return this.getMethod(`/user/properties/${propertyKey}`, UserPropertySchema, params);
  }

  /**
   * Set a user property
   *
   * `PUT /rest/api/3/user/properties/{propertyKey}`
   *
   * @param accountId - Account ID of the user
   * @param propertyKey - Property key
   * @param value - JSON-serialisable property value
   * @returns Nothing
   */
  async setUserProperty(accountId: string, propertyKey: string, value: unknown): Promise<void> {
    await this.http.request({
      method: 'PUT',
      url: this.buildPath(`/user/properties/${propertyKey}`),
      body: value,
      params: { accountId },
    });
  }

  /**
   * Delete a user property
   *
   * `DELETE /rest/api/3/user/properties/{propertyKey}`
   *
   * @param accountId - Account ID of the user
   * @param propertyKey - Property key
   * @returns Nothing
   */
  async deleteUserProperty(accountId: string, propertyKey: string): Promise<void> {
    await this.http.request({
      method: 'DELETE',
      url: this.buildPath(`/user/properties/${propertyKey}`),
      params: { accountId },
    });
  }

  /**
   * Get the groups a user belongs to
   *
   * `GET /rest/api/3/user/groups`
   *
   * @param accountId - Account ID of the user
   * @returns The user's groups
   */
  async getUserGroups(accountId: string): Promise<GroupItem[]> {
    const params = this.buildParams({ accountId });
    return this.getMethod('/user/groups', GroupItemsSchema, params);
  }

  /**
   * Find users who have all of the given permissions
   *
   * `GET /rest/api/3/user/permission/search`
   *
   * @param options - Permissions (required) plus optional filters
   * @returns The matching users
   */
  async findUsersWithAllPermissions(options: FindUsersWithAllPermissionsOptions): Promise<User[]> {
    const params = this.buildParams({
      permissions: this.arrayToCommaSeparated(options.permissions),
      issueKey: options.issueKey,
      projectKey: options.projectKey,
      query: options.query,
      startAt: options.startAt,
      maxResults: options.maxResults,
    });

    return this.getMethod('/user/permission/search', UserSearchResultSchema, params);
  }

  /**
   * Find users who can browse the given issue or project
   *
   * `GET /rest/api/3/user/viewissue/search`
   *
   * @param options - Optional filters
   * @returns The matching users
   */
  async findUsersWithBrowsePermission(
    options?: FindUsersWithBrowsePermissionOptions
  ): Promise<User[]> {
    const params = this.buildParams({
      query: options?.query,
      issueKey: options?.issueKey,
      projectKey: options?.projectKey,
      startAt: options?.startAt,
      maxResults: options?.maxResults,
    });

    return this.getMethod('/user/viewissue/search', UserSearchResultSchema, params);
  }

  /**
   * Find users by display name, email address or account ID
   *
   * Convenience wrapper around {@link UserService.search}.
   *
   * @param name - Search string (required)
   * @param maxResults - Maximum results; defaults to 50 when omitted or <= 0
   * @returns The matching users
   */
  async findByName(name: string, maxResults?: number): Promise<User[]> {
    const limit = maxResults !== undefined && maxResults > 0 ? maxResults : 50;
    return this.search({ query: name, maxResults: limit });
  }
}
