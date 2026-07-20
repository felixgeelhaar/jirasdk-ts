import { z } from 'zod';
import { AdfOrStringSchema } from '../common/index.js';

/**
 * A time tracking provider registered with the Jira instance.
 */
export const TimeTrackingProviderSchema = z
  .object({
    key: z.string(),
    name: z.string().optional(),
    url: z.string().optional(),
  })
  .loose();

export type TimeTrackingProvider = z.infer<typeof TimeTrackingProviderSchema>;

/**
 * Instance-wide time tracking settings.
 */
export const TimeTrackingConfigurationSchema = z
  .object({
    workingHoursPerDay: z.number(),
    workingDaysPerWeek: z.number(),
    timeFormat: z.string(),
    defaultUnit: z.string(),
  })
  .loose();

export type TimeTrackingConfiguration = z.infer<typeof TimeTrackingConfigurationSchema>;

/**
 * Input for updating instance-wide time tracking settings.
 *
 * All fields are optional; Jira keeps the current value for anything omitted.
 */
export const UpdateTimeTrackingConfigurationInputSchema = z.object({
  workingHoursPerDay: z.number().positive().optional(),
  workingDaysPerWeek: z.number().positive().optional(),
  timeFormat: z.string().optional(),
  defaultUnit: z.string().optional(),
});

export type UpdateTimeTrackingConfigurationInput = z.infer<
  typeof UpdateTimeTrackingConfigurationInputSchema
>;

/**
 * A key/value property attached to a worklog.
 */
export const WorklogPropertySchema = z.object({
  key: z.string(),
  value: z.unknown(),
});

export type WorklogProperty = z.infer<typeof WorklogPropertySchema>;

/**
 * Input for creating a worklog through the time tracking service.
 *
 * Named with a `TimeTracking` prefix to avoid colliding with the issue
 * service's `AddWorklogInput` / `UpdateWorklogInput`, which target the same
 * endpoints but require `started`.
 */
export const TimeTrackingCreateWorklogInputSchema = z.object({
  comment: AdfOrStringSchema.optional(),
  started: z.string().optional(),
  timeSpent: z.string().optional(),
  timeSpentSeconds: z.number().int().min(0).optional(),
  properties: z.array(WorklogPropertySchema).optional(),
});

export type TimeTrackingCreateWorklogInput = z.infer<typeof TimeTrackingCreateWorklogInputSchema>;

/**
 * Input for updating a worklog through the time tracking service.
 */
export const TimeTrackingUpdateWorklogInputSchema = TimeTrackingCreateWorklogInputSchema;

export type TimeTrackingUpdateWorklogInput = z.infer<typeof TimeTrackingUpdateWorklogInputSchema>;

/**
 * Options for listing the worklogs of an issue.
 */
export interface WorklogListOptions {
  /**
   * Index of the first worklog to return (0-based).
   */
  startAt?: number;

  /**
   * Maximum number of worklogs to return.
   */
  maxResults?: number;

  /**
   * Only return worklogs started after this epoch-millisecond timestamp.
   */
  startedAfter?: number;

  /**
   * Only return worklogs started before this epoch-millisecond timestamp.
   */
  startedBefore?: number;

  /**
   * Comma-separated list of entities to expand.
   */
  expand?: string;
}
