import { BaseService } from './base.service.js';
import {
  IssueSchema,
  CreateIssueInputSchema,
  CreateIssueResponseSchema,
  UpdateIssueInputSchema,
  CommentSchema,
  CommentsPageSchema,
  AddCommentInputSchema,
  UpdateCommentInputSchema,
  TransitionsResponseSchema,
  DoTransitionInputSchema,
  WatchersSchema,
  WorklogSchema,
  WorklogsPageSchema,
  AddWorklogInputSchema,
  type Issue,
  type CreateIssueInput,
  type CreateIssueResponse,
  type UpdateIssueInput,
  type GetIssueOptions,
  type Comment,
  type CommentsPage,
  type AddCommentInput,
  type UpdateCommentInput,
  type TransitionsResponse,
  type DoTransitionInput,
  type Watchers,
  type Worklog,
  type WorklogsPage,
  type AddWorklogInput,
  type UpdateWorklogInput,
} from '../schemas/index.js';

/**
 * Issue service for CRUD operations on Jira issues
 *
 * @example
 * ```typescript
 * const client = new JiraClient({ ... });
 *
 * // Get an issue
 * const issue = await client.issues.get('PROJECT-123');
 *
 * // Create an issue
 * const newIssue = await client.issues.create({
 *   fields: {
 *     project: { key: 'PROJECT' },
 *     summary: 'New issue',
 *     issuetype: { name: 'Task' },
 *   },
 * });
 *
 * // Update an issue
 * await client.issues.update('PROJECT-123', {
 *   fields: { summary: 'Updated summary' },
 * });
 *
 * // Delete an issue
 * await client.issues.delete('PROJECT-123');
 * ```
 */
export class IssueService extends BaseService {
  /**
   * Get an issue by key or ID
   */
  async get(issueIdOrKey: string, options?: GetIssueOptions): Promise<Issue> {
    const params = this.buildParams({
      fields: this.arrayToCommaSeparated(options?.fields),
      expand: this.arrayToCommaSeparated(options?.expand),
      properties: this.arrayToCommaSeparated(options?.properties),
      fieldsByKeys: options?.fieldsByKeys,
      updateHistory: options?.updateHistory,
    });

    return this.getMethod(`/issue/${issueIdOrKey}`, IssueSchema, params);
  }

  /**
   * Create a new issue
   */
  async create(input: CreateIssueInput): Promise<CreateIssueResponse> {
    // Validate input
    const validatedInput = CreateIssueInputSchema.parse(input);
    return this.postMethod('/issue', CreateIssueResponseSchema, validatedInput);
  }

  /**
   * Update an issue
   */
  async update(
    issueIdOrKey: string,
    input: UpdateIssueInput,
    options?: {
      notifyUsers?: boolean;
      overrideScreenSecurity?: boolean;
      overrideEditableFlag?: boolean;
    }
  ): Promise<void> {
    const validatedInput = UpdateIssueInputSchema.parse(input);
    const params = this.buildParams({
      notifyUsers: options?.notifyUsers,
      overrideScreenSecurity: options?.overrideScreenSecurity,
      overrideEditableFlag: options?.overrideEditableFlag,
    });

    await this.putMethodRaw(`/issue/${issueIdOrKey}`, validatedInput, { params } as never);
  }

  /**
   * Delete an issue
   */
  async deleteIssue(issueIdOrKey: string, options?: { deleteSubtasks?: boolean }): Promise<void> {
    const params = this.buildParams({
      deleteSubtasks: options?.deleteSubtasks?.toString(),
    });

    await this.http.delete(this.buildPath(`/issue/${issueIdOrKey}`), { params } as never);
  }

  // Comments

  /**
   * Get comments for an issue
   */
  async getComments(
    issueIdOrKey: string,
    options?: { startAt?: number; maxResults?: number; orderBy?: string; expand?: string[] }
  ): Promise<CommentsPage> {
    const params = this.buildParams({
      startAt: options?.startAt,
      maxResults: options?.maxResults,
      orderBy: options?.orderBy,
      expand: this.arrayToCommaSeparated(options?.expand),
    });

    return this.getMethod(`/issue/${issueIdOrKey}/comment`, CommentsPageSchema, params);
  }

  /**
   * Get a specific comment
   */
  async getComment(
    issueIdOrKey: string,
    commentId: string,
    options?: { expand?: string[] }
  ): Promise<Comment> {
    const params = this.buildParams({
      expand: this.arrayToCommaSeparated(options?.expand),
    });

    return this.getMethod(`/issue/${issueIdOrKey}/comment/${commentId}`, CommentSchema, params);
  }

  /**
   * Add a comment to an issue
   */
  async addComment(
    issueIdOrKey: string,
    input: AddCommentInput,
    options?: { expand?: string[] }
  ): Promise<Comment> {
    const validatedInput = AddCommentInputSchema.parse(input);
    const params = this.buildParams({
      expand: this.arrayToCommaSeparated(options?.expand),
    });

    const response = await this.http.post(
      this.buildPath(`/issue/${issueIdOrKey}/comment`),
      validatedInput,
      { params } as never
    );
    return this.validateResponse(response, CommentSchema);
  }

  /**
   * Update a comment
   */
  async updateComment(
    issueIdOrKey: string,
    commentId: string,
    input: UpdateCommentInput,
    options?: { expand?: string[] }
  ): Promise<Comment> {
    const validatedInput = UpdateCommentInputSchema.parse(input);
    const params = this.buildParams({
      expand: this.arrayToCommaSeparated(options?.expand),
    });

    const response = await this.http.put(
      this.buildPath(`/issue/${issueIdOrKey}/comment/${commentId}`),
      validatedInput,
      { params } as never
    );
    return this.validateResponse(response, CommentSchema);
  }

  /**
   * Delete a comment
   */
  async deleteComment(issueIdOrKey: string, commentId: string): Promise<void> {
    await this.deleteMethod(`/issue/${issueIdOrKey}/comment/${commentId}`);
  }

  // Transitions

  /**
   * Get available transitions for an issue
   */
  async getTransitions(
    issueIdOrKey: string,
    options?: { expand?: string[]; transitionId?: string }
  ): Promise<TransitionsResponse> {
    const params = this.buildParams({
      expand: this.arrayToCommaSeparated(options?.expand),
      transitionId: options?.transitionId,
    });

    return this.getMethod(`/issue/${issueIdOrKey}/transitions`, TransitionsResponseSchema, params);
  }

  /**
   * Transition an issue to a new status
   */
  async doTransition(issueIdOrKey: string, input: DoTransitionInput): Promise<void> {
    const validatedInput = DoTransitionInputSchema.parse(input);
    await this.postMethodRaw(`/issue/${issueIdOrKey}/transitions`, validatedInput);
  }

  // Watchers

  /**
   * Get watchers for an issue
   */
  async getWatchers(issueIdOrKey: string): Promise<Watchers> {
    return this.getMethod(`/issue/${issueIdOrKey}/watchers`, WatchersSchema);
  }

  /**
   * Add a watcher to an issue
   */
  async addWatcher(issueIdOrKey: string, accountId: string): Promise<void> {
    await this.postMethodRaw(`/issue/${issueIdOrKey}/watchers`, JSON.stringify(accountId));
  }

  /**
   * Remove a watcher from an issue
   */
  async removeWatcher(issueIdOrKey: string, accountId: string): Promise<void> {
    await this.http.delete(this.buildPath(`/issue/${issueIdOrKey}/watchers`), {
      params: { accountId },
    } as never);
  }

  // Worklogs

  /**
   * Get worklogs for an issue
   */
  async getWorklogs(
    issueIdOrKey: string,
    options?: {
      startAt?: number;
      maxResults?: number;
      startedAfter?: number;
      startedBefore?: number;
      expand?: string[];
    }
  ): Promise<WorklogsPage> {
    const params = this.buildParams({
      startAt: options?.startAt,
      maxResults: options?.maxResults,
      startedAfter: options?.startedAfter,
      startedBefore: options?.startedBefore,
      expand: this.arrayToCommaSeparated(options?.expand),
    });

    return this.getMethod(`/issue/${issueIdOrKey}/worklog`, WorklogsPageSchema, params);
  }

  /**
   * Get a specific worklog
   */
  async getWorklog(
    issueIdOrKey: string,
    worklogId: string,
    options?: { expand?: string[] }
  ): Promise<Worklog> {
    const params = this.buildParams({
      expand: this.arrayToCommaSeparated(options?.expand),
    });

    return this.getMethod(`/issue/${issueIdOrKey}/worklog/${worklogId}`, WorklogSchema, params);
  }

  /**
   * Add a worklog to an issue
   */
  async addWorklog(
    issueIdOrKey: string,
    input: AddWorklogInput,
    options?: {
      notifyUsers?: boolean;
      adjustEstimate?: 'new' | 'leave' | 'manual' | 'auto';
      newEstimate?: string;
      reduceBy?: string;
      expand?: string[];
    }
  ): Promise<Worklog> {
    const validatedInput = AddWorklogInputSchema.parse(input);
    const params = this.buildParams({
      notifyUsers: options?.notifyUsers,
      adjustEstimate: options?.adjustEstimate,
      newEstimate: options?.newEstimate,
      reduceBy: options?.reduceBy,
      expand: this.arrayToCommaSeparated(options?.expand),
    });

    const response = await this.http.post(
      this.buildPath(`/issue/${issueIdOrKey}/worklog`),
      validatedInput,
      { params } as never
    );
    return this.validateResponse(response, WorklogSchema);
  }

  /**
   * Update a worklog
   */
  async updateWorklog(
    issueIdOrKey: string,
    worklogId: string,
    input: UpdateWorklogInput,
    options?: {
      notifyUsers?: boolean;
      adjustEstimate?: 'new' | 'leave' | 'manual' | 'auto';
      newEstimate?: string;
      expand?: string[];
    }
  ): Promise<Worklog> {
    const validatedInput = AddWorklogInputSchema.parse(input);
    const params = this.buildParams({
      notifyUsers: options?.notifyUsers,
      adjustEstimate: options?.adjustEstimate,
      newEstimate: options?.newEstimate,
      expand: this.arrayToCommaSeparated(options?.expand),
    });

    const response = await this.http.put(
      this.buildPath(`/issue/${issueIdOrKey}/worklog/${worklogId}`),
      validatedInput,
      { params } as never
    );
    return this.validateResponse(response, WorklogSchema);
  }

  /**
   * Delete a worklog
   */
  async deleteWorklog(
    issueIdOrKey: string,
    worklogId: string,
    options?: {
      notifyUsers?: boolean;
      adjustEstimate?: 'new' | 'leave' | 'manual' | 'auto';
      newEstimate?: string;
      increaseBy?: string;
    }
  ): Promise<void> {
    const params = this.buildParams({
      notifyUsers: options?.notifyUsers,
      adjustEstimate: options?.adjustEstimate,
      newEstimate: options?.newEstimate,
      increaseBy: options?.increaseBy,
    });

    await this.http.delete(this.buildPath(`/issue/${issueIdOrKey}/worklog/${worklogId}`), {
      params,
    } as never);
  }

  // Votes

  /**
   * Add your vote to an issue
   */
  async addVote(issueIdOrKey: string): Promise<void> {
    await this.postMethodRaw(`/issue/${issueIdOrKey}/votes`);
  }

  /**
   * Remove your vote from an issue
   */
  async removeVote(issueIdOrKey: string): Promise<void> {
    await this.deleteMethod(`/issue/${issueIdOrKey}/votes`);
  }
}
