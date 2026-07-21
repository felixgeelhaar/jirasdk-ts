import { z } from 'zod';
import { UserRefSchema } from '../common/index.js';
import {
  DashboardGroupRefSchema,
  DashboardProjectRefSchema,
  DashboardRoleRefSchema,
  GadgetColorSchema,
  GadgetPositionSchema,
} from './types.js';

/**
 * Owner of a dashboard (lenient — Jira may omit fields)
 */
export const DashboardOwnerSchema = UserRefSchema.loose();

export type DashboardOwner = z.infer<typeof DashboardOwnerSchema>;

/**
 * A share or edit permission attached to a dashboard
 */
export const DashboardSharePermissionSchema = z
  .object({
    id: z.number().int().optional(),
    type: z.string(),
    project: DashboardProjectRefSchema.optional(),
    role: DashboardRoleRefSchema.optional(),
    group: DashboardGroupRefSchema.optional(),
    user: DashboardOwnerSchema.optional(),
  })
  .loose();

export type DashboardSharePermission = z.infer<typeof DashboardSharePermissionSchema>;

/**
 * A Jira dashboard
 */
export const DashboardSchema = z
  .object({
    id: z.string().optional(),
    name: z.string(),
    description: z.string().optional(),
    owner: DashboardOwnerSchema.optional(),
    sharePermissions: z.array(DashboardSharePermissionSchema).optional(),
    editPermissions: z.array(DashboardSharePermissionSchema).optional(),
    self: z.url().optional(),
    isFavourite: z.boolean().optional(),
    rank: z.number().int().optional(),
    view: z.string().optional(),
    isWritable: z.boolean().optional(),
    systemDashboard: z.boolean().optional(),
    popularity: z.number().int().optional(),
  })
  .loose();

export type Dashboard = z.infer<typeof DashboardSchema>;

/**
 * Paginated result returned by `GET /rest/api/3/dashboard`
 */
export const DashboardListResultSchema = z
  .object({
    startAt: z.number().int().optional(),
    maxResults: z.number().int().optional(),
    total: z.number().int().optional(),
    prev: z.url().optional(),
    next: z.url().optional(),
    dashboards: z.array(DashboardSchema),
  })
  .loose();

export type DashboardListResult = z.infer<typeof DashboardListResultSchema>;

/**
 * A gadget placed on a dashboard
 */
export const DashboardGadgetSchema = z
  .object({
    id: z.number().int().optional(),
    moduleKey: z.string().optional(),
    uri: z.string().optional(),
    color: z.string().optional(),
    position: GadgetPositionSchema.optional(),
    title: z.string().optional(),
    properties: z.record(z.string(), z.unknown()).optional(),
  })
  .loose();

export type DashboardGadget = z.infer<typeof DashboardGadgetSchema>;

/**
 * Response of `GET /rest/api/3/dashboard/{id}/gadget`
 */
export const DashboardGadgetListSchema = z
  .object({
    gadgets: z.array(DashboardGadgetSchema),
  })
  .loose();

export type DashboardGadgetList = z.infer<typeof DashboardGadgetListSchema>;

/**
 * Share permission payload sent when creating/updating dashboards
 */
export const DashboardSharePermissionInputSchema = z.object({
  type: z.string().min(1, { error: 'permission type is required' }),
  project: DashboardProjectRefSchema.optional(),
  role: DashboardRoleRefSchema.optional(),
  group: DashboardGroupRefSchema.optional(),
});

export type DashboardSharePermissionInput = z.infer<typeof DashboardSharePermissionInputSchema>;

/**
 * Input for creating (or copying) a dashboard
 */
export const CreateDashboardInputSchema = z.object({
  name: z.string().min(1, { error: 'name is required' }),
  description: z.string().optional(),
  sharePermissions: z.array(DashboardSharePermissionInputSchema).optional(),
  editPermissions: z.array(DashboardSharePermissionInputSchema).optional(),
});

export type CreateDashboardInput = z.infer<typeof CreateDashboardInputSchema>;

/**
 * Input for updating a dashboard (all fields optional)
 */
export const UpdateDashboardInputSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  sharePermissions: z.array(DashboardSharePermissionInputSchema).optional(),
  editPermissions: z.array(DashboardSharePermissionInputSchema).optional(),
});

export type UpdateDashboardInput = z.infer<typeof UpdateDashboardInputSchema>;

/**
 * Input for adding a gadget to a dashboard
 */
export const AddGadgetInputSchema = z.object({
  moduleKey: z.string().min(1, { error: 'gadget module key is required' }),
  uri: z.string().optional(),
  color: GadgetColorSchema.optional(),
  position: GadgetPositionSchema.optional(),
  title: z.string().optional(),
  ignoreUriAndModuleKeyValidation: z.boolean().optional(),
});

export type AddGadgetInput = z.infer<typeof AddGadgetInputSchema>;

/**
 * Input for updating a gadget on a dashboard
 */
export const UpdateGadgetInputSchema = z.object({
  color: GadgetColorSchema.optional(),
  position: GadgetPositionSchema.optional(),
  title: z.string().optional(),
});

export type UpdateGadgetInput = z.infer<typeof UpdateGadgetInputSchema>;

/**
 * Options for listing dashboards (`GET /rest/api/3/dashboard`)
 */
export interface ListDashboardsOptions {
  /** `favourite` or `my` */
  filter?: string;
  /** Zero-based index of the first result */
  startAt?: number;
  /** Maximum number of results per page */
  maxResults?: number;
}
