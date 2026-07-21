import { z } from 'zod';
import { UserRefSchema, AccountTypeSchema } from '../common/index.js';

/**
 * A user as returned by the group endpoints.
 *
 * Extends the shared {@link UserRefSchema} with the extra fields the
 * group resource returns.
 */
export const GroupUserSchema = UserRefSchema.extend({
  accountType: AccountTypeSchema.optional(),
  emailAddress: z.email().optional(),
}).loose();

export type GroupUser = z.infer<typeof GroupUserSchema>;

/**
 * The embedded users collection returned when a group is expanded.
 */
export const GroupUsersSchema = z
  .object({
    size: z.number().int().optional(),
    items: z.array(GroupUserSchema).optional(),
    maxResults: z.number().int().optional(),
    startAt: z.number().int().optional(),
  })
  .loose();

export type GroupUsers = z.infer<typeof GroupUsersSchema>;

/**
 * A Jira group.
 */
export const GroupSchema = z
  .object({
    name: z.string(),
    self: z.string().optional(),
    groupId: z.string().optional(),
    expand: z.string().optional(),
    users: GroupUsersSchema.optional(),
  })
  .loose();

export type Group = z.infer<typeof GroupSchema>;

/**
 * Envelope returned by `GET /rest/api/3/groups/picker`.
 */
export const GroupPickerResultSchema = z
  .object({
    header: z.string().optional(),
    total: z.number().int().optional(),
    groups: z.array(GroupSchema),
  })
  .loose();

export type GroupPickerResult = z.infer<typeof GroupPickerResultSchema>;

/**
 * A page of groups, as returned by `GET /rest/api/3/group/bulk`.
 */
export const GroupPageSchema = z
  .object({
    values: z.array(GroupSchema),
    startAt: z.number().int().optional(),
    maxResults: z.number().int().optional(),
    total: z.number().int().optional(),
    isLast: z.boolean().optional(),
  })
  .loose();

export type GroupPage = z.infer<typeof GroupPageSchema>;

/**
 * A page of group members, as returned by `GET /rest/api/3/group/member`.
 */
export const GroupMemberPageSchema = z
  .object({
    values: z.array(GroupUserSchema),
    startAt: z.number().int().optional(),
    maxResults: z.number().int().optional(),
    total: z.number().int().optional(),
    isLast: z.boolean().optional(),
  })
  .loose();

export type GroupMemberPage = z.infer<typeof GroupMemberPageSchema>;

/**
 * Options for searching groups.
 */
export const FindGroupsOptionsSchema = z.object({
  query: z.string().optional(),
  exclude: z.string().optional(),
  maxResults: z.number().int().min(1).optional(),
  userName: z.string().optional(),
});

export type FindGroupsOptions = z.infer<typeof FindGroupsOptionsSchema>;

/**
 * Options for retrieving a single group. One of `groupname` or `groupId`
 * is required.
 */
export const GetGroupOptionsSchema = z.object({
  groupname: z.string().optional(),
  groupId: z.string().optional(),
  expand: z.array(z.string()).optional(),
});

export type GetGroupOptions = z.infer<typeof GetGroupOptionsSchema>;

/**
 * Input for creating a group.
 */
export const CreateGroupInputSchema = z.object({
  name: z.string().min(1, { error: 'group name is required' }),
});

export type CreateGroupInput = z.infer<typeof CreateGroupInputSchema>;

/**
 * Options for deleting a group. One of `groupname` or `groupId` is required.
 */
export const DeleteGroupOptionsSchema = z.object({
  groupname: z.string().optional(),
  groupId: z.string().optional(),
});

export type DeleteGroupOptions = z.infer<typeof DeleteGroupOptionsSchema>;

/**
 * Options for listing the members of a group.
 */
export const GetGroupMembersOptionsSchema = z.object({
  groupname: z.string().optional(),
  groupId: z.string().optional(),
  includeInactiveUsers: z.boolean().optional(),
  startAt: z.number().int().min(0).optional(),
  maxResults: z.number().int().min(1).optional(),
});

export type GetGroupMembersOptions = z.infer<typeof GetGroupMembersOptionsSchema>;

/**
 * Options for adding a user to a group.
 */
export const AddGroupUserOptionsSchema = z.object({
  groupname: z.string().optional(),
  groupId: z.string().optional(),
  accountId: z.string().min(1, { error: 'account ID is required' }),
});

export type AddGroupUserOptions = z.infer<typeof AddGroupUserOptionsSchema>;

/**
 * Options for removing a user from a group.
 */
export const RemoveGroupUserOptionsSchema = z.object({
  groupname: z.string().optional(),
  groupId: z.string().optional(),
  accountId: z.string().optional(),
  username: z.string().optional(),
});

export type RemoveGroupUserOptions = z.infer<typeof RemoveGroupUserOptionsSchema>;

/**
 * Options for bulk group retrieval.
 */
export const BulkGetGroupsOptionsSchema = z.object({
  groupName: z.array(z.string()).optional(),
  groupId: z.array(z.string()).optional(),
  startAt: z.number().int().min(0).optional(),
  maxResults: z.number().int().min(1).optional(),
});

export type BulkGetGroupsOptions = z.infer<typeof BulkGetGroupsOptionsSchema>;
