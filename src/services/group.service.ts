import { BaseService } from './base.service.js';
import {
  GroupSchema,
  GroupPageSchema,
  GroupPickerResultSchema,
  GroupMemberPageSchema,
  CreateGroupInputSchema,
  type Group,
  type GroupUser,
  type GroupPage,
  type GroupMemberPage,
  type FindGroupsOptions,
  type GetGroupOptions,
  type CreateGroupInput,
  type DeleteGroupOptions,
  type GetGroupMembersOptions,
  type AddGroupUserOptions,
  type RemoveGroupUserOptions,
  type BulkGetGroupsOptions,
} from '../schemas/group/index.js';

/**
 * Group service for managing Jira groups and their membership.
 *
 * Every method takes an options object rather than positional identifiers,
 * mirroring the Go SDK — most group endpoints accept either a group name or
 * a group ID.
 *
 * @example
 * ```typescript
 * const client = new JiraClient({ ... });
 *
 * // Search for groups
 * const groups = await client.groups.find({ query: 'jira', maxResults: 50 });
 *
 * // Read a group and its members
 * const group = await client.groups.get({ groupname: 'jira-administrators', expand: ['users'] });
 *
 * // Iterate every member
 * for await (const user of client.groups.iterateMembers({ groupname: 'jira-users' })) {
 *   console.log(user.accountId);
 * }
 * ```
 */
export class GroupService extends BaseService {
  /**
   * Search for groups whose name matches a query.
   *
   * `GET /rest/api/3/groups/picker`
   *
   * @param options - Query string, exclusions, page size and an optional user filter
   * @returns The matching groups
   */
  async find(options?: FindGroupsOptions): Promise<Group[]> {
    const params = this.buildParams({
      query: options?.query,
      exclude: options?.exclude,
      maxResults: options?.maxResults,
      userName: options?.userName,
    });

    const result = await this.getMethod('/groups/picker', GroupPickerResultSchema, params);
    return result.groups;
  }

  /**
   * Get a single group, optionally expanding its users.
   *
   * `GET /rest/api/3/group`
   *
   * @param options - One of `groupname` or `groupId`, plus optional `expand`
   * @returns The group
   */
  async get(options: GetGroupOptions): Promise<Group> {
    this.requireGroupIdentifier(options);

    const params = this.buildParams({
      groupname: options.groupname,
      groupId: options.groupId,
      expand: options.expand,
    });

    return this.getMethod('/group', GroupSchema, params);
  }

  /**
   * Create a group.
   *
   * `POST /rest/api/3/group`
   *
   * @param input - The name of the group to create
   * @returns The created group
   */
  async create(input: CreateGroupInput): Promise<Group> {
    const body = CreateGroupInputSchema.parse(input);
    return this.postMethod('/group', GroupSchema, body);
  }

  /**
   * Delete a group.
   *
   * `DELETE /rest/api/3/group`
   *
   * @param options - One of `groupname` or `groupId`
   * @returns Nothing
   */
  async deleteGroup(options: DeleteGroupOptions): Promise<void> {
    this.requireGroupIdentifier(options);

    const params = this.buildParams({
      groupname: options.groupname,
      groupId: options.groupId,
    });

    await this.http.delete(this.buildPath('/group'), { params });
  }

  /**
   * Get the members of a group.
   *
   * `GET /rest/api/3/group/member`
   *
   * @param options - One of `groupname` or `groupId`, plus pagination options
   * @returns The members on the requested page
   */
  async getMembers(options: GetGroupMembersOptions): Promise<GroupUser[]> {
    const page = await this.getMembersPage(options);
    return page.values;
  }

  /**
   * Async iterator over every member of a group, paging transparently.
   *
   * `GET /rest/api/3/group/member`
   *
   * @param options - Group identifier and page size (`startAt` is managed by the iterator)
   * @returns An async generator yielding group members
   */
  async *iterateMembers(
    options: Omit<GetGroupMembersOptions, 'startAt'>
  ): AsyncGenerator<GroupUser, void, undefined> {
    const pageSize = options.maxResults ?? 50;
    let startAt = 0;

    for (;;) {
      const page = await this.getMembersPage({ ...options, startAt, maxResults: pageSize });

      for (const user of page.values) {
        yield user;
      }

      if (page.values.length === 0) {
        return;
      }

      startAt += page.values.length;

      if (this.isLastPage(page, startAt, pageSize)) {
        return;
      }
    }
  }

  /**
   * Collect every member of a group into an array.
   *
   * `GET /rest/api/3/group/member`
   *
   * @param options - Group identifier and page size
   * @returns All members across all pages
   */
  async allMembers(options: Omit<GetGroupMembersOptions, 'startAt'>): Promise<GroupUser[]> {
    const users: GroupUser[] = [];
    for await (const user of this.iterateMembers(options)) {
      users.push(user);
    }
    return users;
  }

  /**
   * Add a user to a group.
   *
   * `POST /rest/api/3/group/user`
   *
   * @param options - Group identifier plus the `accountId` of the user to add
   * @returns The updated group
   */
  async addUser(options: AddGroupUserOptions): Promise<Group> {
    this.requireGroupIdentifier(options);

    if (options.accountId === '') {
      throw new Error('account ID is required');
    }

    const params = this.buildParams({
      groupname: options.groupname,
      groupId: options.groupId,
    });

    const response = await this.http.post(
      this.buildPath('/group/user'),
      { accountId: options.accountId },
      { params }
    );

    return this.validateResponse(response, GroupSchema);
  }

  /**
   * Remove a user from a group.
   *
   * `DELETE /rest/api/3/group/user`
   *
   * @param options - Group identifier plus one of `accountId` or `username`
   * @returns Nothing
   */
  async removeUser(options: RemoveGroupUserOptions): Promise<void> {
    this.requireGroupIdentifier(options);

    if (
      (options.accountId === undefined || options.accountId === '') &&
      (options.username === undefined || options.username === '')
    ) {
      throw new Error('account ID or username is required');
    }

    const params = this.buildParams({
      groupname: options.groupname,
      groupId: options.groupId,
      accountId: options.accountId,
      username: options.username,
    });

    await this.http.delete(this.buildPath('/group/user'), { params });
  }

  /**
   * Get multiple groups by name or ID.
   *
   * `GET /rest/api/3/group/bulk`
   *
   * @param options - `groupName` and/or `groupId` lists, plus pagination options
   * @returns The groups on the requested page
   */
  async bulkGet(options: BulkGetGroupsOptions): Promise<Group[]> {
    const page = await this.bulkGetPage(options);
    return page.values;
  }

  /**
   * Async iterator over every group matched by a bulk lookup.
   *
   * `GET /rest/api/3/group/bulk`
   *
   * @param options - Group name/ID lists and page size (`startAt` is managed by the iterator)
   * @returns An async generator yielding groups
   */
  async *iterateBulk(
    options: Omit<BulkGetGroupsOptions, 'startAt'>
  ): AsyncGenerator<Group, void, undefined> {
    const pageSize = options.maxResults ?? 50;
    let startAt = 0;

    for (;;) {
      const page = await this.bulkGetPage({ ...options, startAt, maxResults: pageSize });

      for (const group of page.values) {
        yield group;
      }

      if (page.values.length === 0) {
        return;
      }

      startAt += page.values.length;

      if (this.isLastPage(page, startAt, pageSize)) {
        return;
      }
    }
  }

  /**
   * Collect every group matched by a bulk lookup into an array.
   *
   * `GET /rest/api/3/group/bulk`
   *
   * @param options - Group name/ID lists and page size
   * @returns All matching groups across all pages
   */
  async allBulk(options: Omit<BulkGetGroupsOptions, 'startAt'>): Promise<Group[]> {
    const groups: Group[] = [];
    for await (const group of this.iterateBulk(options)) {
      groups.push(group);
    }
    return groups;
  }

  /**
   * Fetch a single page of group members, including its pagination metadata.
   */
  private async getMembersPage(options: GetGroupMembersOptions): Promise<GroupMemberPage> {
    this.requireGroupIdentifier(options);

    const params = this.buildParams({
      groupname: options.groupname,
      groupId: options.groupId,
      includeInactiveUsers: options.includeInactiveUsers,
      startAt: options.startAt,
      maxResults: options.maxResults,
    });

    return this.getMethod('/group/member', GroupMemberPageSchema, params);
  }

  /**
   * Fetch a single page of bulk group results, including its pagination metadata.
   */
  private async bulkGetPage(options: BulkGetGroupsOptions): Promise<GroupPage> {
    if (
      (options.groupName === undefined || options.groupName.length === 0) &&
      (options.groupId === undefined || options.groupId.length === 0)
    ) {
      throw new Error('group names or IDs are required');
    }

    const params = this.buildParams({
      groupName: options.groupName,
      groupId: options.groupId,
      startAt: options.startAt,
      maxResults: options.maxResults,
    });

    return this.getMethod('/group/bulk', GroupPageSchema, params);
  }

  /**
   * Guard shared by the endpoints that accept either a group name or a group ID.
   */
  private requireGroupIdentifier(options: {
    groupname?: string | undefined;
    groupId?: string | undefined;
  }): void {
    const hasName = options.groupname !== undefined && options.groupname !== '';
    const hasId = options.groupId !== undefined && options.groupId !== '';

    if (!hasName && !hasId) {
      throw new Error('group name or ID is required');
    }
  }

  /**
   * Decide whether a page is the final one.
   */
  private isLastPage(
    page: { total?: number | undefined; isLast?: boolean | undefined; values: unknown[] },
    consumed: number,
    pageSize: number
  ): boolean {
    if (page.isLast === true) {
      return true;
    }
    if (page.total !== undefined) {
      return consumed >= page.total;
    }
    return page.values.length < pageSize;
  }
}
