import { z } from 'zod';
import { UserSchema } from '../common/index.js';

/**
 * A single group the current user belongs to
 */
export const UserGroupItemSchema = z
  .object({
    name: z.string().optional(),
    self: z.url().optional(),
  })
  .loose();

export type UserGroupItem = z.infer<typeof UserGroupItemSchema>;

/**
 * Group membership of the current user
 */
export const UserGroupsSchema = z
  .object({
    size: z.number().int().optional(),
    items: z.array(UserGroupItemSchema).optional(),
  })
  .loose();

export type UserGroups = z.infer<typeof UserGroupsSchema>;

/**
 * The currently authenticated user.
 *
 * Extends the common {@link UserSchema} with the group membership and
 * `expand` fields that `GET /rest/api/3/myself` may additionally return.
 */
export const CurrentUserSchema = UserSchema.extend({
  groups: UserGroupsSchema.optional(),
  expand: z.string().optional(),
}).loose();

export type CurrentUser = z.infer<typeof CurrentUserSchema>;

/**
 * Preferences of the current user
 */
export const UserPreferencesSchema = z
  .object({
    locale: z.string().optional(),
    timeZone: z.string().optional(),
  })
  .loose();

export type UserPreferences = z.infer<typeof UserPreferencesSchema>;

/**
 * Input for updating the current user's preferences
 */
export const SetUserPreferencesInputSchema = z.object({
  locale: z.string().optional(),
  timeZone: z.string().optional(),
});

export type SetUserPreferencesInput = z.infer<typeof SetUserPreferencesInputSchema>;

/**
 * Raw key/value map returned when reading a single preference
 */
export const UserPreferenceMapSchema = z.record(z.string(), z.string());

export type UserPreferenceMap = z.infer<typeof UserPreferenceMapSchema>;
