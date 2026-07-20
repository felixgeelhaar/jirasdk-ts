import { z } from 'zod';
import { BaseService } from './base.service.js';
import {
  WorkflowSchema,
  WorkflowSearchResultSchema,
  WorkflowStatusSchema,
  WorkflowStatusCategorySchema,
  WorkflowTransitionsResponseSchema,
  WorkflowDoTransitionInputSchema,
  WorkflowSchemeSchema,
  WorkflowSchemeListResultSchema,
  CreateWorkflowSchemeInputSchema,
  UpdateWorkflowSchemeInputSchema,
  WorkflowSchemeIssueTypeInputSchema,
  type Workflow,
  type WorkflowSearchResult,
  type WorkflowStatus,
  type WorkflowStatusCategory,
  type WorkflowTransition,
  type WorkflowDoTransitionInput,
  type WorkflowScheme,
  type WorkflowSchemeListResult,
  type CreateWorkflowSchemeInput,
  type UpdateWorkflowSchemeInput,
  type WorkflowSchemeIssueTypeInput,
  type GetWorkflowTransitionsOptions,
  type ListWorkflowsOptions,
  type ListWorkflowSchemesOptions,
} from '../schemas/workflow/index.js';

const DEFAULT_PAGE_SIZE = 50;

/**
 * Workflow service for workflows, statuses, status categories, transitions
 * and workflow schemes.
 *
 * @example
 * ```typescript
 * const client = new JiraClient({ ... });
 *
 * // Available transitions for an issue
 * const transitions = await client.workflows.getTransitions('PROJ-123');
 *
 * // Perform a transition
 * await client.workflows.doTransition('PROJ-123', { transition: { id: '31' } });
 *
 * // Page through every workflow
 * for await (const workflow of client.workflows.iterate()) {
 *   console.log(workflow.name);
 * }
 * ```
 */
export class WorkflowService extends BaseService {
  /**
   * Get the transitions currently available on an issue
   *
   * `GET /rest/api/3/issue/{issueIdOrKey}/transitions`
   *
   * Note: this overlaps with `IssueService.getTransitions`. It is provided here
   * because the Go SDK exposes it on both services; this variant returns the
   * transition array directly and additionally supports
   * `skipRemoteOnlyCondition`.
   *
   * @param issueIdOrKey - Issue ID or key (e.g. `PROJ-123`)
   * @param options - Optional expand / filtering options
   * @returns The transitions available to the current user
   */
  async getTransitions(
    issueIdOrKey: string,
    options?: GetWorkflowTransitionsOptions
  ): Promise<WorkflowTransition[]> {
    const params = this.buildParams({
      expand: this.arrayToCommaSeparated(options?.expand),
      transitionId: options?.transitionId,
      skipRemoteOnlyCondition: options?.skipRemoteOnlyCondition,
    });

    const result = await this.getMethod(
      `/issue/${issueIdOrKey}/transitions`,
      WorkflowTransitionsResponseSchema,
      params
    );

    return result.transitions;
  }

  /**
   * Perform a workflow transition on an issue
   *
   * `POST /rest/api/3/issue/{issueIdOrKey}/transitions`
   *
   * Note: this overlaps with `IssueService.doTransition`; the Go SDK exposes it
   * on both services.
   *
   * @param issueIdOrKey - Issue ID or key (e.g. `PROJ-123`)
   * @param input - The transition to perform plus optional field/update payloads
   * @returns Nothing; the endpoint responds 204 No Content
   */
  async doTransition(issueIdOrKey: string, input: WorkflowDoTransitionInput): Promise<void> {
    const body = WorkflowDoTransitionInputSchema.parse(input);
    await this.postMethodRaw(`/issue/${issueIdOrKey}/transitions`, body);
  }

  /**
   * Search workflows (paginated)
   *
   * `GET /rest/api/3/workflow/search`
   *
   * @param options - Optional name filter and pagination
   * @returns A page of workflows
   */
  async list(options?: ListWorkflowsOptions): Promise<WorkflowSearchResult> {
    const params = this.buildParams({
      workflowName: options?.workflowName,
      startAt: options?.startAt,
      maxResults: options?.maxResults,
    });

    return this.getMethod('/workflow/search', WorkflowSearchResultSchema, params);
  }

  /**
   * Async iterator over every workflow, transparently paging the API
   *
   * @param options - Optional name filter; `maxResults` sets the page size
   * @returns An async generator yielding each workflow
   */
  async *iterate(
    options?: Omit<ListWorkflowsOptions, 'startAt'>
  ): AsyncGenerator<Workflow, void, undefined> {
    const pageSize = options?.maxResults ?? DEFAULT_PAGE_SIZE;
    let startAt = 0;

    for (;;) {
      const page = await this.list({ ...options, startAt, maxResults: pageSize });

      for (const workflow of page.values) {
        yield workflow;
      }

      if (page.values.length === 0 || page.isLast === true) {
        return;
      }

      startAt += page.values.length;

      if (page.total !== undefined && startAt >= page.total) {
        return;
      }

      if (page.values.length < pageSize) {
        return;
      }
    }
  }

  /**
   * Collect every workflow into an array (loads all pages into memory)
   *
   * @param options - Optional name filter; `maxResults` sets the page size
   * @returns All workflows
   */
  async all(options?: Omit<ListWorkflowsOptions, 'startAt'>): Promise<Workflow[]> {
    const workflows: Workflow[] = [];
    for await (const workflow of this.iterate(options)) {
      workflows.push(workflow);
    }
    return workflows;
  }

  /**
   * Get a workflow by ID or by name
   *
   * `GET /rest/api/3/workflow/{workflowIdOrName}`
   *
   * Mirrors the Go SDK, where `Workflow.Get` accepts either a workflow ID or a
   * workflow name in the same path segment. Names containing spaces or other
   * reserved characters are URL-encoded.
   *
   * @param workflowIdOrName - Workflow ID or workflow name
   * @returns The workflow
   */
  async get(workflowIdOrName: string): Promise<Workflow> {
    return this.getMethod(`/workflow/${encodeURIComponent(workflowIdOrName)}`, WorkflowSchema);
  }

  /**
   * Get every status defined in the Jira instance
   *
   * `GET /rest/api/3/status`
   *
   * @returns All statuses
   */
  async getAllStatuses(): Promise<WorkflowStatus[]> {
    return this.getMethod('/status', z.array(WorkflowStatusSchema));
  }

  /**
   * Get a status by ID or name
   *
   * `GET /rest/api/3/status/{idOrName}`
   *
   * @param statusIdOrName - Status ID or name
   * @returns The status
   */
  async getStatus(statusIdOrName: string): Promise<WorkflowStatus> {
    return this.getMethod(`/status/${encodeURIComponent(statusIdOrName)}`, WorkflowStatusSchema);
  }

  /**
   * Get every status category
   *
   * `GET /rest/api/3/statuscategory`
   *
   * @returns All status categories
   */
  async getStatusCategories(): Promise<WorkflowStatusCategory[]> {
    return this.getMethod('/statuscategory', z.array(WorkflowStatusCategorySchema));
  }

  /**
   * Get a status category by ID or key
   *
   * `GET /rest/api/3/statuscategory/{idOrKey}`
   *
   * @param idOrKey - Status category ID (e.g. `2`) or key (e.g. `done`)
   * @returns The status category
   */
  async getStatusCategory(idOrKey: string): Promise<WorkflowStatusCategory> {
    return this.getMethod(
      `/statuscategory/${encodeURIComponent(idOrKey)}`,
      WorkflowStatusCategorySchema
    );
  }

  /**
   * Get a workflow scheme by ID
   *
   * `GET /rest/api/3/workflowscheme/{id}`
   *
   * @param schemeId - Workflow scheme ID
   * @returns The workflow scheme
   */
  async getWorkflowScheme(schemeId: number): Promise<WorkflowScheme> {
    return this.getMethod(`/workflowscheme/${schemeId}`, WorkflowSchemeSchema);
  }

  /**
   * List workflow schemes (paginated)
   *
   * `GET /rest/api/3/workflowscheme`
   *
   * @param options - Optional pagination
   * @returns A page of workflow schemes
   */
  async listWorkflowSchemes(
    options?: ListWorkflowSchemesOptions
  ): Promise<WorkflowSchemeListResult> {
    const params = this.buildParams({
      startAt: options?.startAt,
      maxResults: options?.maxResults,
    });

    return this.getMethod('/workflowscheme', WorkflowSchemeListResultSchema, params);
  }

  /**
   * Async iterator over every workflow scheme, transparently paging the API
   *
   * @param options - Optional pagination; `maxResults` sets the page size
   * @returns An async generator yielding each workflow scheme
   */
  async *iterateWorkflowSchemes(
    options?: Omit<ListWorkflowSchemesOptions, 'startAt'>
  ): AsyncGenerator<WorkflowScheme, void, undefined> {
    const pageSize = options?.maxResults ?? DEFAULT_PAGE_SIZE;
    let startAt = 0;

    for (;;) {
      const page = await this.listWorkflowSchemes({ startAt, maxResults: pageSize });

      for (const scheme of page.values) {
        yield scheme;
      }

      if (page.values.length === 0 || page.isLast === true) {
        return;
      }

      startAt += page.values.length;

      if (page.total !== undefined && startAt >= page.total) {
        return;
      }

      if (page.values.length < pageSize) {
        return;
      }
    }
  }

  /**
   * Collect every workflow scheme into an array (loads all pages into memory)
   *
   * @param options - Optional pagination; `maxResults` sets the page size
   * @returns All workflow schemes
   */
  async allWorkflowSchemes(
    options?: Omit<ListWorkflowSchemesOptions, 'startAt'>
  ): Promise<WorkflowScheme[]> {
    const schemes: WorkflowScheme[] = [];
    for await (const scheme of this.iterateWorkflowSchemes(options)) {
      schemes.push(scheme);
    }
    return schemes;
  }

  /**
   * Create a workflow scheme
   *
   * `POST /rest/api/3/workflowscheme`
   *
   * @param input - Scheme name plus optional description, default workflow and
   * issue type mappings
   * @returns The created workflow scheme
   */
  async createWorkflowScheme(input: CreateWorkflowSchemeInput): Promise<WorkflowScheme> {
    const body = CreateWorkflowSchemeInputSchema.parse(input);
    return this.postMethod('/workflowscheme', WorkflowSchemeSchema, body);
  }

  /**
   * Update a workflow scheme
   *
   * `PUT /rest/api/3/workflowscheme/{id}`
   *
   * @param schemeId - Workflow scheme ID
   * @param input - Fields to update
   * @returns The updated workflow scheme
   */
  async updateWorkflowScheme(
    schemeId: number,
    input: UpdateWorkflowSchemeInput
  ): Promise<WorkflowScheme> {
    const body = UpdateWorkflowSchemeInputSchema.parse(input);
    return this.putMethod(`/workflowscheme/${schemeId}`, WorkflowSchemeSchema, body);
  }

  /**
   * Delete a workflow scheme
   *
   * `DELETE /rest/api/3/workflowscheme/{id}`
   *
   * @param schemeId - Workflow scheme ID
   * @returns Nothing; the endpoint responds 204 No Content
   */
  async deleteWorkflowScheme(schemeId: number): Promise<void> {
    await this.deleteMethod(`/workflowscheme/${schemeId}`);
  }

  /**
   * Set the workflow used by an issue type within a workflow scheme
   *
   * `PUT /rest/api/3/workflowscheme/{id}/issuetype/{issueType}`
   *
   * @param schemeId - Workflow scheme ID
   * @param input - The issue type, its workflow and whether to update the draft
   * @returns Nothing; the endpoint responds 204 No Content
   */
  async setWorkflowSchemeIssueType(
    schemeId: number,
    input: WorkflowSchemeIssueTypeInput
  ): Promise<void> {
    const body = WorkflowSchemeIssueTypeInputSchema.parse(input);
    await this.putMethodRaw(
      `/workflowscheme/${schemeId}/issuetype/${encodeURIComponent(body.issueType)}`,
      body
    );
  }

  /**
   * Remove the workflow mapping for an issue type within a workflow scheme
   *
   * `DELETE /rest/api/3/workflowscheme/{id}/issuetype/{issueType}`
   *
   * @param schemeId - Workflow scheme ID
   * @param issueType - Issue type ID
   * @returns Nothing; the endpoint responds 204 No Content
   */
  async deleteWorkflowSchemeIssueType(schemeId: number, issueType: string): Promise<void> {
    await this.deleteMethod(
      `/workflowscheme/${schemeId}/issuetype/${encodeURIComponent(issueType)}`
    );
  }
}
