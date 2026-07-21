import { z } from 'zod';
import { BaseService } from './base.service.js';
import {
  AddSharePermissionInputSchema,
  CreateFilterInputSchema,
  DefaultShareScopeSchema,
  FilterPermissionSchema,
  FilterSchema,
  FilterSearchResultSchema,
  UpdateFilterInputSchema,
  type AddSharePermissionInput,
  type CreateFilterInput,
  type Filter,
  type FilterPermission,
  type FilterSearchResult,
  type FilterShareScope,
  type GetFilterOptions,
  type GetMyFiltersOptions,
  type ListFiltersOptions,
  type UpdateFilterInput,
} from '../schemas/filter/index.js';

/**
 * Filter service for managing Jira filters (saved JQL searches)
 *
 * @example
 * ```typescript
 * const client = new JiraClient({ ... });
 *
 * // Create a filter
 * const filter = await client.filters.create({
 *   name: 'My Bugs',
 *   jql: 'project = PROJ AND type = Bug AND resolution = Unresolved',
 * });
 *
 * // Iterate every filter the user can see
 * for await (const f of client.filters.iterate()) {
 *   console.log(f.id, f.name);
 * }
 * ```
 */
export class FilterService extends BaseService {
  /**
   * Get a filter by ID
   *
   * `GET /rest/api/3/filter/{filterId}`
   *
   * @param filterId - ID of the filter
   * @param options - Optional expand and share-permission override
   * @returns The requested filter
   */
  async get(filterId: string, options?: GetFilterOptions): Promise<Filter> {
    const params = this.buildParams({
      expand: this.arrayToCommaSeparated(options?.expand),
      overrideSharePermissions: options?.overrideSharePermissions,
    });

    return this.getMethod(`/filter/${filterId}`, FilterSchema, params);
  }

  /**
   * Create a new filter
   *
   * `POST /rest/api/3/filter`
   *
   * @param input - Filter definition (name and JQL are required)
   * @returns The created filter
   */
  async create(input: CreateFilterInput): Promise<Filter> {
    const body = CreateFilterInputSchema.parse(input);
    return this.postMethod('/filter', FilterSchema, body);
  }

  /**
   * Update an existing filter
   *
   * `PUT /rest/api/3/filter/{filterId}`
   *
   * @param filterId - ID of the filter to update
   * @param input - Fields to change
   * @returns The updated filter
   */
  async update(filterId: string, input: UpdateFilterInput): Promise<Filter> {
    const body = UpdateFilterInputSchema.parse(input);
    return this.putMethod(`/filter/${filterId}`, FilterSchema, body);
  }

  /**
   * Delete a filter
   *
   * `DELETE /rest/api/3/filter/{filterId}`
   *
   * @param filterId - ID of the filter to delete
   * @returns Nothing
   */
  async deleteFilter(filterId: string): Promise<void> {
    await this.deleteMethod(`/filter/${filterId}`);
  }

  /**
   * Search filters with optional filtering and pagination
   *
   * `GET /rest/api/3/filter/search`
   *
   * @param options - Search, sort and pagination options
   * @returns A page of filters
   */
  async list(options?: ListFiltersOptions): Promise<FilterSearchResult> {
    const params = this.buildParams({
      expand: this.arrayToCommaSeparated(options?.expand),
      includeFavourites: options?.includeFavourites,
      orderBy: options?.orderBy,
      startAt: options?.startAt,
      maxResults: options?.maxResults,
      filterName: options?.filterName,
      accountId: options?.accountId,
      groupname: options?.groupname,
      groupId: options?.groupId,
      projectId: options?.projectId,
      id: options?.id,
      overrideSharePermissions: options?.overrideSharePermissions,
    });

    return this.getMethod('/filter/search', FilterSearchResultSchema, params);
  }

  /**
   * Async iterator over every filter matching the given options
   *
   * @param options - Search options (`startAt` is managed by the iterator)
   * @returns An async generator yielding filters page by page
   *
   * @example
   * ```typescript
   * for await (const filter of client.filters.iterate({ filterName: 'bug' })) {
   *   console.log(filter.name);
   * }
   * ```
   */
  async *iterate(
    options?: Omit<ListFiltersOptions, 'startAt'>
  ): AsyncGenerator<Filter, void, undefined> {
    const pageSize = options?.maxResults ?? 50;
    let startAt = 0;

    for (;;) {
      const page = await this.list({ ...options, startAt, maxResults: pageSize });

      for (const filter of page.values) {
        yield filter;
      }

      if (page.values.length === 0) {
        return;
      }

      startAt += page.values.length;

      if (page.isLast === true) {
        return;
      }
      if (page.total !== undefined && startAt >= page.total) {
        return;
      }
      if (page.isLast === undefined && page.total === undefined) {
        return;
      }
    }
  }

  /**
   * Collect every filter matching the given options into an array
   *
   * Loads all pages into memory — prefer `iterate()` for large result sets.
   *
   * @param options - Search options (`startAt` is managed internally)
   * @returns All matching filters
   */
  async all(options?: Omit<ListFiltersOptions, 'startAt'>): Promise<Filter[]> {
    const filters: Filter[] = [];
    for await (const filter of this.iterate(options)) {
      filters.push(filter);
    }
    return filters;
  }

  /**
   * Get the current user's favourite filters
   *
   * `GET /rest/api/3/filter/favourite`
   *
   * @param options - Optional expand
   * @returns The current user's favourite filters
   */
  async getFavorites(options?: { expand?: string[] }): Promise<Filter[]> {
    const params = this.buildParams({
      expand: this.arrayToCommaSeparated(options?.expand),
    });

    return this.getMethod('/filter/favourite', z.array(FilterSchema), params);
  }

  /**
   * Get filters owned by the current user
   *
   * `GET /rest/api/3/filter/my`
   *
   * @param options - Optional expand and whether to include favourites
   * @returns Filters owned by the current user
   */
  async getMyFilters(options?: GetMyFiltersOptions): Promise<Filter[]> {
    const params = this.buildParams({
      expand: this.arrayToCommaSeparated(options?.expand),
      includeFavourites: options?.includeFavourites,
    });

    return this.getMethod('/filter/my', z.array(FilterSchema), params);
  }

  /**
   * Mark a filter as a favourite of the current user
   *
   * `PUT /rest/api/3/filter/{filterId}/favourite`
   *
   * @param filterId - ID of the filter
   * @returns The updated filter
   */
  async setFavorite(filterId: string): Promise<Filter> {
    return this.putMethod(`/filter/${filterId}/favourite`, FilterSchema);
  }

  /**
   * Remove a filter from the current user's favourites
   *
   * `DELETE /rest/api/3/filter/{filterId}/favourite`
   *
   * @param filterId - ID of the filter
   * @returns The updated filter
   */
  async removeFavorite(filterId: string): Promise<Filter> {
    return this.deleteMethodWithResponse(`/filter/${filterId}/favourite`, FilterSchema);
  }

  /**
   * Get the default share scope for the current user
   *
   * `GET /rest/api/3/filter/defaultShareScope`
   *
   * @returns The default share scope (`GLOBAL`, `AUTHENTICATED` or `PRIVATE`)
   */
  async getDefaultShareScope(): Promise<FilterShareScope> {
    const result = await this.getMethod('/filter/defaultShareScope', DefaultShareScopeSchema);
    return result.scope;
  }

  /**
   * Set the default share scope for the current user
   *
   * `PUT /rest/api/3/filter/defaultShareScope`
   *
   * @param scope - The scope to set (`GLOBAL`, `AUTHENTICATED` or `PRIVATE`)
   * @returns Nothing
   */
  async setDefaultShareScope(scope: FilterShareScope): Promise<void> {
    await this.putMethodRaw('/filter/defaultShareScope', { scope });
  }

  /**
   * Get a single share permission of a filter
   *
   * `GET /rest/api/3/filter/{filterId}/permission/{permissionId}`
   *
   * @param filterId - ID of the filter
   * @param permissionId - ID of the share permission
   * @returns The share permission
   */
  async getSharePermission(filterId: string, permissionId: number): Promise<FilterPermission> {
    return this.getMethod(
      `/filter/${filterId}/permission/${String(permissionId)}`,
      FilterPermissionSchema
    );
  }

  /**
   * Add a share permission to a filter
   *
   * `POST /rest/api/3/filter/{filterId}/permission`
   *
   * @param filterId - ID of the filter
   * @param input - Share permission to add (`type` is required)
   * @returns The filter's share permissions after the addition
   */
  async addSharePermission(
    filterId: string,
    input: AddSharePermissionInput
  ): Promise<FilterPermission[]> {
    const body = AddSharePermissionInputSchema.parse(input);
    return this.postMethod(`/filter/${filterId}/permission`, z.array(FilterPermissionSchema), body);
  }

  /**
   * Remove a share permission from a filter
   *
   * `DELETE /rest/api/3/filter/{filterId}/permission/{permissionId}`
   *
   * @param filterId - ID of the filter
   * @param permissionId - ID of the share permission to remove
   * @returns Nothing
   */
  async deleteSharePermission(filterId: string, permissionId: number): Promise<void> {
    await this.deleteMethod(`/filter/${filterId}/permission/${String(permissionId)}`);
  }
}
