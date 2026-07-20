import { z } from 'zod';
import { BaseService } from './base.service.js';
import { WorklogSchema, WorklogsPageSchema, type Worklog } from '../schemas/issue/index.js';
import {
  TimeTrackingConfigurationSchema,
  TimeTrackingCreateWorklogInputSchema,
  TimeTrackingProviderSchema,
  TimeTrackingUpdateWorklogInputSchema,
  UpdateTimeTrackingConfigurationInputSchema,
  type TimeTrackingConfiguration,
  type TimeTrackingCreateWorklogInput,
  type TimeTrackingProvider,
  type TimeTrackingUpdateWorklogInput,
  type UpdateTimeTrackingConfigurationInput,
  type WorklogListOptions,
} from '../schemas/timetracking/index.js';

/**
 * Time tracking service for provider selection, instance configuration and
 * worklog management.
 *
 * Note: the worklog methods target the same endpoints as `IssueService`'s
 * worklog methods and are provided here for parity with the Go SDK's
 * `timetracking` package. They reuse the shared `Worklog` schema.
 *
 * @example
 * ```typescript
 * const client = new JiraClient({ ... });
 *
 * const providers = await client.timeTracking.getAvailableProviders();
 * await client.timeTracking.selectProvider('JIRA');
 *
 * const worklog = await client.timeTracking.createWorklog('PROJ-123', {
 *   timeSpent: '3h 30m',
 *   comment: 'Worked on bug fix',
 * });
 * ```
 */
export class TimeTrackingService extends BaseService {
  /**
   * List the time tracking providers available on this instance.
   *
   * `GET /rest/api/3/configuration/timetracking/list`
   *
   * @returns Every registered time tracking provider.
   */
  async getAvailableProviders(): Promise<TimeTrackingProvider[]> {
    return this.getMethod('/configuration/timetracking/list', z.array(TimeTrackingProviderSchema));
  }

  /**
   * Get the currently selected time tracking provider.
   *
   * `GET /rest/api/3/configuration/timetracking`
   *
   * @returns The active time tracking provider.
   */
  async getSelectedProvider(): Promise<TimeTrackingProvider> {
    return this.getMethod('/configuration/timetracking', TimeTrackingProviderSchema);
  }

  /**
   * Select the active time tracking provider.
   *
   * `PUT /rest/api/3/configuration/timetracking`
   *
   * @param key - The provider key, e.g. `'JIRA'`.
   * @returns The newly selected provider.
   */
  async selectProvider(key: string): Promise<TimeTrackingProvider> {
    return this.putMethod('/configuration/timetracking', TimeTrackingProviderSchema, { key });
  }

  /**
   * Get the instance-wide time tracking settings.
   *
   * `GET /rest/api/3/configuration/timetracking/options`
   *
   * @returns The current time tracking configuration.
   */
  async getConfiguration(): Promise<TimeTrackingConfiguration> {
    return this.getMethod('/configuration/timetracking/options', TimeTrackingConfigurationSchema);
  }

  /**
   * Update the instance-wide time tracking settings.
   *
   * `PUT /rest/api/3/configuration/timetracking/options`
   *
   * @param input - The settings to change; omitted fields are left untouched.
   * @returns The updated time tracking configuration.
   */
  async updateConfiguration(
    input: UpdateTimeTrackingConfigurationInput
  ): Promise<TimeTrackingConfiguration> {
    const body = UpdateTimeTrackingConfigurationInputSchema.parse(input);
    return this.putMethod(
      '/configuration/timetracking/options',
      TimeTrackingConfigurationSchema,
      body
    );
  }

  /**
   * Get the worklogs recorded against an issue.
   *
   * `GET /rest/api/3/issue/{issueIdOrKey}/worklog`
   *
   * @param issueIdOrKey - The issue ID or key.
   * @param options - Pagination, `started` bounds and expansion.
   * @returns The worklogs for the requested page.
   */
  async getIssueWorklogs(issueIdOrKey: string, options?: WorklogListOptions): Promise<Worklog[]> {
    const params = this.buildParams({
      startAt: options?.startAt,
      maxResults: options?.maxResults,
      startedAfter: options?.startedAfter,
      startedBefore: options?.startedBefore,
      expand: options?.expand,
    });

    const page = await this.getMethod(`/issue/${issueIdOrKey}/worklog`, WorklogsPageSchema, params);
    return page.worklogs;
  }

  /**
   * Get a single worklog by ID.
   *
   * `GET /rest/api/3/issue/{issueIdOrKey}/worklog/{worklogId}`
   *
   * @param issueIdOrKey - The issue ID or key.
   * @param worklogId - The worklog ID.
   * @returns The requested worklog.
   */
  async getWorklog(issueIdOrKey: string, worklogId: string): Promise<Worklog> {
    return this.getMethod(`/issue/${issueIdOrKey}/worklog/${worklogId}`, WorklogSchema);
  }

  /**
   * Add a worklog to an issue.
   *
   * `POST /rest/api/3/issue/{issueIdOrKey}/worklog`
   *
   * @param issueIdOrKey - The issue ID or key.
   * @param input - The worklog to record; supply `timeSpent` or `timeSpentSeconds`.
   * @returns The created worklog.
   */
  async createWorklog(
    issueIdOrKey: string,
    input: TimeTrackingCreateWorklogInput
  ): Promise<Worklog> {
    const body = TimeTrackingCreateWorklogInputSchema.parse(input);
    return this.postMethod(`/issue/${issueIdOrKey}/worklog`, WorklogSchema, body);
  }

  /**
   * Update an existing worklog.
   *
   * `PUT /rest/api/3/issue/{issueIdOrKey}/worklog/{worklogId}`
   *
   * @param issueIdOrKey - The issue ID or key.
   * @param worklogId - The worklog ID.
   * @param input - The fields to change.
   * @returns The updated worklog.
   */
  async updateWorklog(
    issueIdOrKey: string,
    worklogId: string,
    input: TimeTrackingUpdateWorklogInput
  ): Promise<Worklog> {
    const body = TimeTrackingUpdateWorklogInputSchema.parse(input);
    return this.putMethod(`/issue/${issueIdOrKey}/worklog/${worklogId}`, WorklogSchema, body);
  }

  /**
   * Delete a worklog.
   *
   * `DELETE /rest/api/3/issue/{issueIdOrKey}/worklog/{worklogId}`
   *
   * @param issueIdOrKey - The issue ID or key.
   * @param worklogId - The worklog ID.
   * @returns Nothing; the endpoint responds with 204 No Content.
   */
  async deleteWorklog(issueIdOrKey: string, worklogId: string): Promise<void> {
    await this.deleteMethod(`/issue/${issueIdOrKey}/worklog/${worklogId}`);
  }
}
