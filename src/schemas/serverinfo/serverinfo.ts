import { z } from 'zod';

// Time tracking settings are owned by the timetracking domain, which is where
// they are also written. Imported rather than redefined so the two stay in sync.
import { TimeTrackingConfigurationSchema } from '../timetracking/index.js';

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
