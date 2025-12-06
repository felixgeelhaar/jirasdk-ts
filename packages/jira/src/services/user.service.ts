import { z } from 'zod';
import { BaseService } from './base.service.js';
import { UserSchema, type User } from '@felixgeelhaar/sdk-core/schemas';

/**
 * User search result schema
 */
const UserSearchResultSchema = z.array(UserSchema);

/**
 * Assignable users response schema
 */
const AssignableUsersSchema = z.array(UserSchema);

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
}
