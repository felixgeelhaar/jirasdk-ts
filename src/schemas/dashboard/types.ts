import { z } from 'zod';

/**
 * Colors a dashboard gadget can be rendered in
 */
export const GadgetColorSchema = z.enum([
  'blue',
  'red',
  'yellow',
  'green',
  'cyan',
  'purple',
  'gray',
  'white',
]);

export type GadgetColor = z.infer<typeof GadgetColorSchema>;

/**
 * Position of a gadget on the dashboard grid
 */
export const GadgetPositionSchema = z.object({
  row: z.number().int().min(0),
  column: z.number().int().min(0),
});

export type GadgetPosition = z.infer<typeof GadgetPositionSchema>;

/**
 * Minimal project reference inside a dashboard share permission
 */
export const DashboardProjectRefSchema = z
  .object({
    id: z.string().optional(),
    key: z.string().optional(),
    name: z.string().optional(),
  })
  .loose();

export type DashboardProjectRef = z.infer<typeof DashboardProjectRefSchema>;

/**
 * Project role reference inside a dashboard share permission
 */
export const DashboardRoleRefSchema = z
  .object({
    id: z.string().optional(),
    name: z.string().optional(),
  })
  .loose();

export type DashboardRoleRef = z.infer<typeof DashboardRoleRefSchema>;

/**
 * Group reference inside a dashboard share permission
 */
export const DashboardGroupRefSchema = z
  .object({
    name: z.string().optional(),
    groupId: z.string().optional(),
  })
  .loose();

export type DashboardGroupRef = z.infer<typeof DashboardGroupRefSchema>;
