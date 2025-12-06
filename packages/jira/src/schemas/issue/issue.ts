import { z } from 'zod';
import {
  UserRefSchema,
  UserInputSchema,
  AdfOrStringSchema,
  OptionalJiraDateTimeSchema,
} from '@felixgeelhaar/sdk-core/schemas';
import {
  IssueTypeSchema,
  IssueTypeInputSchema,
  IssueStatusSchema,
  IssuePrioritySchema,
  PriorityInputSchema,
  IssueResolutionSchema,
  IssueProjectSchema,
  ProjectInputSchema,
  ComponentSchema,
  ComponentInputSchema,
  VersionSchema,
  VersionInputSchema,
} from './types.js';

/**
 * Issue reference (parent/subtask)
 */
export const IssueRefSchema = z.object({
  id: z.string().optional(),
  key: z.string(),
  self: z.string().url().optional(),
  fields: z
    .object({
      summary: z.string().optional(),
      status: IssueStatusSchema.optional(),
      issuetype: IssueTypeSchema.optional(),
    })
    .optional(),
});

export type IssueRef = z.infer<typeof IssueRefSchema>;

/**
 * Issue fields schema
 * Uses passthrough() to allow custom fields
 */
export const IssueFieldsSchema = z
  .object({
    // Core fields
    summary: z.string(),
    description: AdfOrStringSchema.nullable().optional(),
    environment: AdfOrStringSchema.nullable().optional(),

    // Type & Status
    issuetype: IssueTypeSchema,
    project: IssueProjectSchema,
    status: IssueStatusSchema,
    resolution: IssueResolutionSchema.nullable().optional(),
    priority: IssuePrioritySchema.nullable().optional(),

    // People
    assignee: UserRefSchema.nullable().optional(),
    reporter: UserRefSchema.nullable().optional(),
    creator: UserRefSchema.nullable().optional(),

    // Relationships
    parent: IssueRefSchema.nullable().optional(),
    subtasks: z.array(IssueRefSchema).optional(),

    // Versions & Components
    fixVersions: z.array(VersionSchema).optional(),
    versions: z.array(VersionSchema).optional(), // Affects Versions
    components: z.array(ComponentSchema).optional(),

    // Labels
    labels: z.array(z.string()).optional(),

    // Dates
    created: OptionalJiraDateTimeSchema,
    updated: OptionalJiraDateTimeSchema,
    resolutiondate: OptionalJiraDateTimeSchema,
    duedate: z.string().nullable().optional(),

    // Time tracking
    timeoriginalestimate: z.number().nullable().optional(),
    timeestimate: z.number().nullable().optional(),
    timespent: z.number().nullable().optional(),
    aggregatetimeoriginalestimate: z.number().nullable().optional(),
    aggregatetimeestimate: z.number().nullable().optional(),
    aggregatetimespent: z.number().nullable().optional(),

    // Counts
    workratio: z.number().optional(),

    // Votes & Watches
    votes: z
      .object({
        self: z.string().url(),
        votes: z.number(),
        hasVoted: z.boolean(),
      })
      .optional(),
    watches: z
      .object({
        self: z.string().url(),
        watchCount: z.number(),
        isWatching: z.boolean(),
      })
      .optional(),

    // Progress
    progress: z
      .object({
        progress: z.number(),
        total: z.number(),
        percent: z.number().optional(),
      })
      .optional(),
    aggregateprogress: z
      .object({
        progress: z.number(),
        total: z.number(),
        percent: z.number().optional(),
      })
      .optional(),
  })
  .passthrough(); // Allow custom fields (customfield_*)

export type IssueFields = z.infer<typeof IssueFieldsSchema>;

/**
 * Full Issue schema
 */
export const IssueSchema = z.object({
  expand: z.string().optional(),
  id: z.string(),
  self: z.string().url(),
  key: z.string(),
  fields: IssueFieldsSchema,
  renderedFields: z.record(z.string(), z.unknown()).optional(),
  names: z.record(z.string(), z.string()).optional(),
  schema: z.record(z.string(), z.unknown()).optional(),
  transitions: z
    .array(
      z.object({
        id: z.string(),
        name: z.string(),
        to: IssueStatusSchema,
        hasScreen: z.boolean().optional(),
        isGlobal: z.boolean().optional(),
        isInitial: z.boolean().optional(),
        isConditional: z.boolean().optional(),
      })
    )
    .optional(),
  operations: z.record(z.string(), z.unknown()).optional(),
  editmeta: z.record(z.string(), z.unknown()).optional(),
  changelog: z
    .object({
      startAt: z.number(),
      maxResults: z.number(),
      total: z.number(),
      histories: z.array(z.record(z.string(), z.unknown())),
    })
    .optional(),
  versionedRepresentations: z.record(z.string(), z.unknown()).optional(),
  fieldsToInclude: z.record(z.string(), z.unknown()).optional(),
});

export type Issue = z.infer<typeof IssueSchema>;

/**
 * Issue create input fields
 */
export const CreateIssueFieldsSchema = z
  .object({
    project: ProjectInputSchema,
    summary: z.string().min(1),
    issuetype: IssueTypeInputSchema,
    description: AdfOrStringSchema.optional(),
    environment: AdfOrStringSchema.optional(),
    priority: PriorityInputSchema.optional(),
    assignee: UserInputSchema.optional(),
    parent: z.object({ key: z.string() }).optional(),
    labels: z.array(z.string()).optional(),
    components: z.array(ComponentInputSchema).optional(),
    fixVersions: z.array(VersionInputSchema).optional(),
    versions: z.array(VersionInputSchema).optional(),
    duedate: z.string().optional(),
    // Custom fields via passthrough
  })
  .passthrough();

export type CreateIssueFields = z.infer<typeof CreateIssueFieldsSchema>;

/**
 * Create issue input
 */
export const CreateIssueInputSchema = z.object({
  fields: CreateIssueFieldsSchema,
  update: z.record(z.string(), z.array(z.record(z.string(), z.unknown()))).optional(),
  transition: z.object({ id: z.string() }).optional(),
});

export type CreateIssueInput = z.infer<typeof CreateIssueInputSchema>;

/**
 * Update issue input
 */
export const UpdateIssueInputSchema = z.object({
  fields: z.record(z.string(), z.unknown()).optional(),
  update: z.record(z.string(), z.array(z.record(z.string(), z.unknown()))).optional(),
  transition: z.object({ id: z.string() }).optional(),
  historyMetadata: z.record(z.string(), z.unknown()).optional(),
  properties: z.array(z.record(z.string(), z.unknown())).optional(),
});

export type UpdateIssueInput = z.infer<typeof UpdateIssueInputSchema>;

/**
 * Create issue response
 */
export const CreateIssueResponseSchema = z.object({
  id: z.string(),
  key: z.string(),
  self: z.string().url(),
  transition: z
    .object({
      status: z.number(),
      errorCollection: z
        .object({
          errorMessages: z.array(z.string()).optional(),
          errors: z.record(z.string(), z.string()).optional(),
        })
        .optional(),
    })
    .optional(),
});

export type CreateIssueResponse = z.infer<typeof CreateIssueResponseSchema>;

/**
 * Get issue options
 */
export const GetIssueOptionsSchema = z.object({
  fields: z.array(z.string()).optional(),
  expand: z.array(z.string()).optional(),
  properties: z.array(z.string()).optional(),
  fieldsByKeys: z.boolean().optional(),
  updateHistory: z.boolean().optional(),
});

export type GetIssueOptions = z.infer<typeof GetIssueOptionsSchema>;
