import { z } from 'zod';
import { UserRefSchema } from '../common/index.js';
import {
  FilterGroupRefSchema,
  FilterProjectRefSchema,
  FilterRoleRefSchema,
  FilterShareScopeSchema,
} from './types.js';

/**
 * Owner of a filter (lenient — Jira may omit fields depending on privacy settings)
 */
export const FilterOwnerSchema = UserRefSchema.loose();

export type FilterOwner = z.infer<typeof FilterOwnerSchema>;

/**
 * A share or edit permission attached to a filter
 */
export const FilterPermissionSchema = z
  .object({
    id: z.number().int().optional(),
    type: z.string(),
    project: FilterProjectRefSchema.optional(),
    group: FilterGroupRefSchema.optional(),
    user: FilterOwnerSchema.optional(),
    role: FilterRoleRefSchema.optional(),
    view: z.boolean().optional(),
    edit: z.boolean().optional(),
  })
  .loose();

export type FilterPermission = z.infer<typeof FilterPermissionSchema>;

/**
 * A single filter subscription
 */
export const FilterSubscriptionSchema = z
  .object({
    id: z.number().int().optional(),
    user: FilterOwnerSchema.optional(),
    group: FilterGroupRefSchema.optional(),
  })
  .loose();

export type FilterSubscription = z.infer<typeof FilterSubscriptionSchema>;

/**
 * Container for a filter's subscriptions
 */
export const FilterSubscriptionsSchema = z
  .object({
    size: z.number().int().optional(),
    items: z.array(FilterSubscriptionSchema).optional(),
    'max-results': z.number().int().optional(),
    'start-index': z.number().int().optional(),
    'end-index': z.number().int().optional(),
  })
  .loose();

export type FilterSubscriptions = z.infer<typeof FilterSubscriptionsSchema>;

/**
 * A Jira filter (saved JQL search)
 */
export const FilterSchema = z
  .object({
    id: z.string(),
    self: z.url().optional(),
    name: z.string(),
    description: z.string().optional(),
    owner: FilterOwnerSchema.optional(),
    jql: z.string().optional(),
    viewUrl: z.url().optional(),
    searchUrl: z.url().optional(),
    favourite: z.boolean().optional(),
    favouritedCount: z.number().int().optional(),
    sharePermissions: z.array(FilterPermissionSchema).optional(),
    editPermissions: z.array(FilterPermissionSchema).optional(),
    subscriptions: FilterSubscriptionsSchema.optional(),
    approximateLastUsed: z.string().optional(),
  })
  .loose();

export type Filter = z.infer<typeof FilterSchema>;

/**
 * Paginated result returned by `GET /rest/api/3/filter/search`
 */
export const FilterSearchResultSchema = z
  .object({
    self: z.url().optional(),
    nextPage: z.url().optional(),
    maxResults: z.number().int().optional(),
    startAt: z.number().int().optional(),
    total: z.number().int().optional(),
    isLast: z.boolean().optional(),
    values: z.array(FilterSchema),
  })
  .loose();

export type FilterSearchResult = z.infer<typeof FilterSearchResultSchema>;

/**
 * Response of `GET /rest/api/3/filter/defaultShareScope`
 */
export const DefaultShareScopeSchema = z.object({
  scope: FilterShareScopeSchema,
});

export type DefaultShareScope = z.infer<typeof DefaultShareScopeSchema>;

/**
 * Share permission payload sent when creating/updating filters
 */
export const FilterPermissionInputSchema = z.object({
  type: z.string(),
  project: FilterProjectRefSchema.optional(),
  group: FilterGroupRefSchema.optional(),
  user: z.object({ accountId: z.string() }).optional(),
  role: FilterRoleRefSchema.optional(),
  view: z.boolean().optional(),
  edit: z.boolean().optional(),
});

export type FilterPermissionInput = z.infer<typeof FilterPermissionInputSchema>;

/**
 * Input for creating a filter
 */
export const CreateFilterInputSchema = z.object({
  name: z.string().min(1, { error: 'filter name is required' }),
  description: z.string().optional(),
  jql: z.string().min(1, { error: 'JQL query is required' }),
  favourite: z.boolean().optional(),
  sharePermissions: z.array(FilterPermissionInputSchema).optional(),
  editPermissions: z.array(FilterPermissionInputSchema).optional(),
});

export type CreateFilterInput = z.infer<typeof CreateFilterInputSchema>;

/**
 * Input for updating a filter (all fields optional)
 */
export const UpdateFilterInputSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  jql: z.string().min(1).optional(),
  favourite: z.boolean().optional(),
  sharePermissions: z.array(FilterPermissionInputSchema).optional(),
  editPermissions: z.array(FilterPermissionInputSchema).optional(),
});

export type UpdateFilterInput = z.infer<typeof UpdateFilterInputSchema>;

/**
 * Input for adding a share permission to a filter
 */
export const AddSharePermissionInputSchema = z.object({
  type: z.string().min(1, { error: 'permission type is required' }),
  projectId: z.string().optional(),
  groupname: z.string().optional(),
  groupId: z.string().optional(),
  projectRoleId: z.string().optional(),
  accountId: z.string().optional(),
  rights: z.number().int().optional(),
});

export type AddSharePermissionInput = z.infer<typeof AddSharePermissionInputSchema>;

/**
 * Options for listing/searching filters (`GET /rest/api/3/filter/search`)
 */
export interface ListFiltersOptions {
  /** Additional information to include in the response */
  expand?: string[];
  /** Include the current user's favourite filters */
  includeFavourites?: boolean;
  /** Sort field, e.g. `name`, `-name`, `favourite_count` */
  orderBy?: string;
  /** Zero-based index of the first result */
  startAt?: number;
  /** Maximum number of results per page (max 100) */
  maxResults?: number;
  /** Filter by (partial) filter name */
  filterName?: string;
  /** Filter by owner account ID */
  accountId?: string;
  /** Filter by a group that has view permission */
  groupname?: string;
  /** Filter by a group ID that has view permission */
  groupId?: string;
  /** Filter by an associated project ID */
  projectId?: string;
  /** Filter by specific filter IDs */
  id?: string[];
  /** Include filters the user does not have permission to edit */
  overrideSharePermissions?: boolean;
}

/**
 * Options for `GET /rest/api/3/filter/{id}`
 */
export interface GetFilterOptions {
  expand?: string[];
  overrideSharePermissions?: boolean;
}

/**
 * Options for `GET /rest/api/3/filter/my`
 */
export interface GetMyFiltersOptions {
  expand?: string[];
  includeFavourites?: boolean;
}
