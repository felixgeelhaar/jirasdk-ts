import { z } from 'zod';

/**
 * A Jira permission definition
 *
 * Jira may omit `id` for built-in permissions returned by
 * `GET /rest/api/3/permissions`, so it is optional here.
 */
export const PermissionSchema = z
  .object({
    id: z.string().optional(),
    key: z.string(),
    name: z.string(),
    type: z.string(),
    description: z.string().optional(),
  })
  .loose();

export type Permission = z.infer<typeof PermissionSchema>;

/**
 * Response wrapper for `GET /rest/api/3/permissions`
 *
 * Jira returns `permissions` keyed by permission key, but older/other
 * deployments return a plain array - both shapes are accepted.
 */
export const AllPermissionsResponseSchema = z
  .object({
    permissions: z.union([z.array(PermissionSchema), z.record(z.string(), PermissionSchema)]),
  })
  .loose();

export type AllPermissionsResponse = z.infer<typeof AllPermissionsResponseSchema>;

/**
 * Entity that holds a permission (user, group, projectRole, applicationRole, ...)
 */
export const PermissionHolderSchema = z
  .object({
    type: z.string(),
    parameter: z.string().optional(),
    value: z.string().optional(),
    expand: z.string().optional(),
  })
  .loose();

export type PermissionHolder = z.infer<typeof PermissionHolderSchema>;

/**
 * A permission grant within a permission scheme
 */
export const PermissionGrantSchema = z
  .object({
    id: z.number().int().optional(),
    self: z.url().optional(),
    holder: PermissionHolderSchema.optional(),
    permission: z.string(),
  })
  .loose();

export type PermissionGrant = z.infer<typeof PermissionGrantSchema>;

/**
 * Permission holder as supplied when creating a scheme (write path, strict)
 */
export const PermissionHolderInputSchema = z.object({
  type: z.string().min(1),
  parameter: z.string().optional(),
  value: z.string().optional(),
});

export type PermissionHolderInput = z.infer<typeof PermissionHolderInputSchema>;

/**
 * Permission grant as supplied when creating a scheme (write path, strict)
 */
export const PermissionGrantInputSchema = z.object({
  permission: z.string().min(1),
  holder: PermissionHolderInputSchema.optional(),
});

export type PermissionGrantInput = z.infer<typeof PermissionGrantInputSchema>;

/**
 * A Jira permission scheme
 */
export const PermissionSchemeSchema = z
  .object({
    id: z.number().int(),
    self: z.url().optional(),
    name: z.string(),
    description: z.string().optional(),
    permissions: z.array(PermissionGrantSchema).optional(),
    expand: z.string().optional(),
  })
  .loose();

export type PermissionScheme = z.infer<typeof PermissionSchemeSchema>;

/**
 * Response wrapper for `GET /rest/api/3/permissionscheme`
 */
export const PermissionSchemesResponseSchema = z
  .object({
    permissionSchemes: z.array(PermissionSchemeSchema).default([]),
  })
  .loose();

export type PermissionSchemesResponse = z.infer<typeof PermissionSchemesResponseSchema>;

/**
 * Grant status of a single permission for the current user
 */
export const PermissionStatusSchema = z
  .object({
    id: z.string().optional(),
    key: z.string(),
    name: z.string(),
    type: z.string(),
    description: z.string().optional(),
    havePermission: z.boolean(),
  })
  .loose();

export type PermissionStatus = z.infer<typeof PermissionStatusSchema>;

/**
 * Current user's permissions, keyed by permission key
 */
export const MyPermissionsSchema = z
  .object({
    permissions: z.record(z.string(), PermissionStatusSchema),
  })
  .loose();

export type MyPermissions = z.infer<typeof MyPermissionsSchema>;

/**
 * Options for retrieving the current user's permissions
 */
export const MyPermissionsOptionsSchema = z.object({
  /** Project key to check permissions against */
  projectKey: z.string().optional(),
  /** Project ID to check permissions against */
  projectId: z.string().optional(),
  /** Issue key to check permissions against */
  issueKey: z.string().optional(),
  /** Issue ID to check permissions against */
  issueId: z.string().optional(),
  /** Permission keys to restrict the response to */
  permissions: z.array(z.string()).optional(),
});

export type MyPermissionsOptions = z.infer<typeof MyPermissionsOptionsSchema>;

/**
 * Options for listing permission schemes
 */
export const ListPermissionSchemesOptionsSchema = z.object({
  expand: z.array(z.string()).optional(),
});

export type ListPermissionSchemesOptions = z.infer<typeof ListPermissionSchemesOptionsSchema>;

/**
 * Options for retrieving a single permission scheme
 */
export const GetPermissionSchemeOptionsSchema = z.object({
  expand: z.array(z.string()).optional(),
});

export type GetPermissionSchemeOptions = z.infer<typeof GetPermissionSchemeOptionsSchema>;

/**
 * Input for creating a permission scheme
 */
export const CreatePermissionSchemeInputSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  permissions: z.array(PermissionGrantInputSchema).optional(),
});

export type CreatePermissionSchemeInput = z.infer<typeof CreatePermissionSchemeInputSchema>;

/**
 * Input for updating a permission scheme
 */
export const UpdatePermissionSchemeInputSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
});

export type UpdatePermissionSchemeInput = z.infer<typeof UpdatePermissionSchemeInputSchema>;
