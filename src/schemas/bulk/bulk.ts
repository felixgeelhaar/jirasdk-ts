import { z } from 'zod';
import { UserRefSchema } from '../common/index.js';

/**
 * Maximum number of issues that can be processed in a single bulk operation.
 * Jira enforces a hard limit of 1000 issues per bulk request.
 */
export const MAX_BULK_ISSUES = 1000;

/**
 * Known bulk operation statuses.
 *
 * Note: the underlying `/rest/api/3/task/{taskId}` endpoint can also return
 * other statuses (e.g. `ENQUEUED`, `CANCEL_REQUESTED`, `DEAD`), so the schema
 * keeps `status` as a plain string rather than a closed enum.
 */
export const BulkOperationStatus = {
  Running: 'RUNNING',
  Complete: 'COMPLETE',
  Failed: 'FAILED',
  Cancelled: 'CANCELLED',
} as const;

export type BulkOperationStatusValue =
  (typeof BulkOperationStatus)[keyof typeof BulkOperationStatus];

/**
 * Statuses that mean the operation will not progress any further.
 */
export const TERMINAL_BULK_OPERATION_STATUSES: readonly string[] = [
  BulkOperationStatus.Complete,
  BulkOperationStatus.Failed,
  BulkOperationStatus.Cancelled,
];

/**
 * Operation applied to a single field (add / set / remove).
 */
export const FieldOperationSchema = z.object({
  add: z.unknown().optional(),
  set: z.unknown().optional(),
  remove: z.unknown().optional(),
});

export type FieldOperation = z.infer<typeof FieldOperationSchema>;

/**
 * Actor recorded in history metadata.
 */
export const HistoryMetadataActorSchema = z.object({
  id: z.string().optional(),
  displayName: z.string().optional(),
  type: z.string().optional(),
  avatarUrl: z.string().optional(),
  url: z.string().optional(),
});

export type HistoryMetadataActor = z.infer<typeof HistoryMetadataActorSchema>;

/**
 * Cause recorded in history metadata.
 */
export const HistoryMetadataCauseSchema = z.object({
  id: z.string().optional(),
  type: z.string().optional(),
});

export type HistoryMetadataCause = z.infer<typeof HistoryMetadataCauseSchema>;

/**
 * Metadata describing the origin of a change.
 */
export const HistoryMetadataSchema = z.object({
  type: z.string().optional(),
  description: z.string().optional(),
  actor: HistoryMetadataActorSchema.optional(),
  cause: HistoryMetadataCauseSchema.optional(),
  extraData: z.record(z.string(), z.unknown()).optional(),
});

export type HistoryMetadata = z.infer<typeof HistoryMetadataSchema>;

/**
 * Entity property attached to an issue.
 */
export const EntityPropertySchema = z.object({
  key: z.string(),
  value: z.unknown(),
});

export type EntityProperty = z.infer<typeof EntityPropertySchema>;

/**
 * A single issue create/update payload within a bulk operation.
 */
export const IssueUpdateSchema = z.object({
  fields: z.record(z.string(), z.unknown()),
  update: z.record(z.string(), z.array(FieldOperationSchema)).optional(),
  historyMetadata: HistoryMetadataSchema.optional(),
  properties: z.array(EntityPropertySchema).optional(),
});

export type IssueUpdate = z.infer<typeof IssueUpdateSchema>;

/**
 * Input for creating multiple issues in one request.
 */
export const CreateIssuesInputSchema = z.object({
  issueUpdates: z.array(IssueUpdateSchema).min(1).max(MAX_BULK_ISSUES),
});

export type CreateIssuesInput = z.infer<typeof CreateIssuesInputSchema>;

/**
 * Input for deleting multiple issues in one request.
 */
export const DeleteIssuesInputSchema = z.object({
  issueIdsOrKeys: z.array(z.string()).min(1).max(MAX_BULK_ISSUES),
});

export type DeleteIssuesInput = z.infer<typeof DeleteIssuesInputSchema>;

/**
 * Field-level validation errors for one element of a bulk request.
 */
export const ElementErrorsSchema = z
  .object({
    errorMessages: z.array(z.string()).optional(),
    errors: z.record(z.string(), z.string()).optional(),
  })
  .loose();

export type ElementErrors = z.infer<typeof ElementErrorsSchema>;

/**
 * An error affecting a single element of a bulk operation.
 */
export const BulkOperationErrorSchema = z
  .object({
    status: z.number().int().optional(),
    elementErrors: ElementErrorsSchema.optional(),
    failedElementNumber: z.number().int().optional(),
  })
  .loose();

export type BulkOperationError = z.infer<typeof BulkOperationErrorSchema>;

/**
 * A successfully created issue.
 */
export const CreatedIssueSchema = z
  .object({
    id: z.string(),
    key: z.string(),
    self: z.string(),
  })
  .loose();

export type CreatedIssue = z.infer<typeof CreatedIssueSchema>;

/**
 * Result of a bulk create operation.
 */
export const CreateIssuesResultSchema = z
  .object({
    issues: z.array(CreatedIssueSchema).optional(),
    errors: z.array(BulkOperationErrorSchema).optional(),
  })
  .loose();

export type CreateIssuesResult = z.infer<typeof CreateIssuesResultSchema>;

/**
 * Aggregate result of a completed long-running bulk operation.
 */
export const BulkOperationResultSchema = z
  .object({
    successCount: z.number().int().optional(),
    errorCount: z.number().int().optional(),
    errors: z.array(BulkOperationErrorSchema).optional(),
  })
  .loose();

export type BulkOperationResult = z.infer<typeof BulkOperationResultSchema>;

/**
 * Progress of a long-running bulk operation (`/rest/api/3/task/{taskId}`).
 */
export const BulkOperationProgressSchema = z
  .object({
    taskId: z.string(),
    status: z.string(),
    progressPercent: z.number().optional(),
    message: z.string().optional(),
    result: BulkOperationResultSchema.optional(),
    submittedBy: UserRefSchema.loose().optional(),
    created: z.number().optional(),
    started: z.number().optional(),
    updated: z.number().optional(),
    completed: z.number().optional(),
  })
  .loose();

export type BulkOperationProgress = z.infer<typeof BulkOperationProgressSchema>;

/**
 * Options controlling {@link BulkService.waitForCompletion}.
 */
export interface WaitForCompletionOptions {
  /**
   * How long to wait between progress polls, in milliseconds.
   *
   * @default 5000
   */
  pollIntervalMs?: number;

  /**
   * Give up after this many milliseconds and throw a `TimeoutError`.
   * Omit for no timeout.
   */
  timeoutMs?: number;

  /**
   * Abort the wait early. Throws an `AbortError` when signalled.
   */
  signal?: AbortSignal;
}
