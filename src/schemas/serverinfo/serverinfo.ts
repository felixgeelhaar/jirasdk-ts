import { z } from 'zod';

/**
 * A single health check result reported by the Jira instance
 */
export const HealthCheckSchema = z
  .object({
    name: z.string(),
    description: z.string().optional(),
    passed: z.boolean(),
  })
  .loose();

export type HealthCheck = z.infer<typeof HealthCheckSchema>;

/**
 * Information about the Jira instance
 */
export const ServerInfoSchema = z
  .object({
    baseUrl: z.string(),
    version: z.string(),
    versionNumbers: z.array(z.number().int()).optional(),
    deploymentType: z.string().optional(),
    buildNumber: z.number().int().optional(),
    buildDate: z.string().optional(),
    serverTime: z.string().optional(),
    scmInfo: z.string().optional(),
    serverTitle: z.string().optional(),
    healthChecks: z.array(HealthCheckSchema).optional(),
  })
  .loose();

export type ServerInfo = z.infer<typeof ServerInfoSchema>;

/**
 * Time tracking settings of the Jira instance
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
 * Global configuration of the Jira instance
 */
export const JiraConfigurationSchema = z
  .object({
    votingEnabled: z.boolean(),
    watchingEnabled: z.boolean(),
    unassignedIssuesAllowed: z.boolean(),
    subTasksEnabled: z.boolean(),
    issueLinkingEnabled: z.boolean(),
    timeTrackingEnabled: z.boolean(),
    attachmentsEnabled: z.boolean(),
    timeTrackingConfiguration: TimeTrackingConfigurationSchema.optional(),
  })
  .loose();

export type JiraConfiguration = z.infer<typeof JiraConfigurationSchema>;
