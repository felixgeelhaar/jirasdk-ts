import { BaseService } from './base.service.js';
import { AbortError, TimeoutError } from '../errors/index.js';
import { sleep } from '../utils/index.js';
import {
  BulkOperationProgressSchema,
  CreateIssuesInputSchema,
  CreateIssuesResultSchema,
  DeleteIssuesInputSchema,
  TERMINAL_BULK_OPERATION_STATUSES,
  type BulkOperationProgress,
  type CreateIssuesInput,
  type CreateIssuesResult,
  type DeleteIssuesInput,
  type WaitForCompletionOptions,
} from '../schemas/bulk/index.js';

/**
 * Default interval between progress polls, in milliseconds.
 */
const DEFAULT_POLL_INTERVAL_MS = 5000;

/**
 * Sleep that resolves early when the given signal is aborted.
 */
async function abortableSleep(ms: number, signal?: AbortSignal): Promise<void> {
  if (signal === undefined) {
    return sleep(ms);
  }

  let onAbort: (() => void) | undefined;
  try {
    await Promise.race([
      sleep(ms),
      new Promise<void>((resolve) => {
        onAbort = (): void => {
          resolve();
        };
        signal.addEventListener('abort', onAbort, { once: true });
      }),
    ]);
  } finally {
    if (onAbort !== undefined) {
      signal.removeEventListener('abort', onAbort);
    }
  }
}

/**
 * Bulk operations service for batch processing of Jira issues.
 *
 * Jira enforces a hard limit of 1000 issues per bulk request; inputs larger
 * than that are rejected by the request schema before any call is made.
 *
 * @example
 * ```typescript
 * const client = new JiraClient({ ... });
 *
 * // Create many issues at once
 * const result = await client.bulk.createIssues({
 *   issueUpdates: [
 *     { fields: { project: { key: 'PROJ' }, summary: 'One', issuetype: { name: 'Task' } } },
 *     { fields: { project: { key: 'PROJ' }, summary: 'Two', issuetype: { name: 'Task' } } },
 *   ],
 * });
 *
 * // Wait for a long-running task to finish
 * const progress = await client.bulk.waitForCompletion(taskId, { timeoutMs: 60_000 });
 * ```
 */
export class BulkService extends BaseService {
  /**
   * Create multiple issues in a single request.
   *
   * `POST /rest/api/3/issue/bulk`
   *
   * @param input - The issues to create (1-1000 entries).
   * @returns The created issues plus any per-element errors.
   */
  async createIssues(input: CreateIssuesInput): Promise<CreateIssuesResult> {
    const body = CreateIssuesInputSchema.parse(input);
    return this.postMethod('/issue/bulk', CreateIssuesResultSchema, body);
  }

  /**
   * Delete multiple issues in a single request.
   *
   * `DELETE /rest/api/3/issue/bulk`
   *
   * Warning: this operation cannot be undone.
   *
   * @param input - The issue IDs or keys to delete (1-1000 entries).
   * @returns Nothing; the endpoint responds with 204 No Content.
   */
  async deleteIssues(input: DeleteIssuesInput): Promise<void> {
    const body = DeleteIssuesInputSchema.parse(input);

    // DELETE with a request body is not covered by the inherited helpers.
    await this.http.request({
      method: 'DELETE',
      url: this.buildPath('/issue/bulk'),
      body,
    });
  }

  /**
   * Get the current progress of a long-running bulk operation.
   *
   * `GET /rest/api/3/task/{taskId}`
   *
   * @param taskId - The task identifier returned by the bulk operation.
   * @returns The current progress of the task.
   */
  async getProgress(taskId: string): Promise<BulkOperationProgress> {
    return this.getMethod(`/task/${taskId}`, BulkOperationProgressSchema);
  }

  /**
   * Poll a long-running bulk operation until it reaches a terminal state.
   *
   * Terminal states are `COMPLETE`, `FAILED` and `CANCELLED`. Unlike the Go
   * SDK, this implementation supports both an `AbortSignal` and an overall
   * timeout.
   *
   * `GET /rest/api/3/task/{taskId}` (polled)
   *
   * @param taskId - The task identifier returned by the bulk operation.
   * @param options - Poll interval, overall timeout and abort signal.
   * @returns The final progress of the task.
   * @throws {AbortError} When `options.signal` is aborted.
   * @throws {TimeoutError} When `options.timeoutMs` elapses first.
   */
  async waitForCompletion(
    taskId: string,
    options?: WaitForCompletionOptions
  ): Promise<BulkOperationProgress> {
    const pollIntervalMs =
      options?.pollIntervalMs !== undefined && options.pollIntervalMs > 0
        ? options.pollIntervalMs
        : DEFAULT_POLL_INTERVAL_MS;
    const { timeoutMs, signal } = options ?? {};
    const deadline = timeoutMs !== undefined ? Date.now() + timeoutMs : undefined;

    for (;;) {
      if (signal?.aborted === true) {
        throw new AbortError(`Waiting for bulk task ${taskId} was aborted`);
      }

      const progress = await this.getProgress(taskId);
      if (TERMINAL_BULK_OPERATION_STATUSES.includes(progress.status)) {
        return progress;
      }

      if (deadline !== undefined && Date.now() + pollIntervalMs > deadline) {
        throw new TimeoutError(`Timed out waiting for bulk task ${taskId} to complete`, {
          ...(timeoutMs !== undefined && { timeoutMs }),
        });
      }

      await abortableSleep(pollIntervalMs, signal);
    }
  }
}
