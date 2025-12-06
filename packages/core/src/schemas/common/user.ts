import { z } from 'zod';

/**
 * Avatar URLs in various sizes
 */
export const AvatarUrlsSchema = z.object({
  '48x48': z.string().url().optional(),
  '24x24': z.string().url().optional(),
  '16x16': z.string().url().optional(),
  '32x32': z.string().url().optional(),
});

export type AvatarUrls = z.infer<typeof AvatarUrlsSchema>;

/**
 * User account type
 */
export const AccountTypeSchema = z.enum(['atlassian', 'app', 'customer']);

export type AccountType = z.infer<typeof AccountTypeSchema>;

/**
 * Jira user representation
 */
export const UserSchema = z.object({
  self: z.string().url(),
  accountId: z.string(),
  accountType: AccountTypeSchema.optional(),
  emailAddress: z.string().email().optional(),
  displayName: z.string(),
  active: z.boolean(),
  timeZone: z.string().optional(),
  locale: z.string().optional(),
  avatarUrls: AvatarUrlsSchema.optional(),
});

export type User = z.infer<typeof UserSchema>;

/**
 * Partial user reference (used in responses where not all fields are included)
 */
export const UserRefSchema = z.object({
  self: z.string().url().optional(),
  accountId: z.string(),
  displayName: z.string().optional(),
  active: z.boolean().optional(),
  avatarUrls: AvatarUrlsSchema.optional(),
});

export type UserRef = z.infer<typeof UserRefSchema>;

/**
 * User input for assignment (only accountId needed)
 */
export const UserInputSchema = z.object({
  accountId: z.string(),
});

export type UserInput = z.infer<typeof UserInputSchema>;
