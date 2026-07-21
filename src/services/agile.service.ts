import { BaseService } from './base.service.js';
import type { HttpClient } from '../transport/index.js';
import {
  BoardSchema,
  BoardPageSchema,
  CreateBoardInputSchema,
  SprintSchema,
  SprintPageSchema,
  CreateSprintInputSchema,
  UpdateSprintInputSchema,
  MoveIssuesToSprintInputSchema,
  EpicSchema,
  EpicPageSchema,
  AgileIssuePageSchema,
  type Board,
  type BoardPage,
  type CreateBoardInput,
  type GetBoardsOptions,
  type GetBacklogOptions,
  type Sprint,
  type SprintPage,
  type CreateSprintInput,
  type UpdateSprintInput,
  type MoveIssuesToSprintInput,
  type GetBoardSprintsOptions,
  type Epic,
  type EpicPage,
  type GetBoardEpicsOptions,
  type AgileIssue,
  type AgileIssuePage,
} from '../schemas/agile/index.js';

/** Default page size used by the async iterators */
const DEFAULT_PAGE_SIZE = 50;

/** Base path of the Jira Agile (Jira Software) REST API */
const AGILE_BASE_PATH = '/rest/agile/1.0';

/**
 * Agile service for boards, sprints, epics and backlogs.
 *
 * Unlike the other services this one talks to the Jira Agile API
 * (`/rest/agile/1.0`) rather than the platform API (`/rest/api/3`).
 *
 * @example
 * ```typescript
 * const client = new JiraClient({ ... });
 *
 * // List scrum boards
 * const boards = await client.agile.getBoards({ type: 'scrum' });
 *
 * // Iterate every sprint of a board
 * for await (const sprint of client.agile.iterateBoardSprints(123)) {
 *   console.log(sprint.name, sprint.state);
 * }
 * ```
 */
export class AgileService extends BaseService {
  constructor(http: HttpClient, basePath: string = AGILE_BASE_PATH) {
    super(http, basePath);
  }

  // ---------------------------------------------------------------------------
  // Boards
  // ---------------------------------------------------------------------------

  /**
   * List boards, optionally filtered by type, name or project.
   *
   * `GET /rest/agile/1.0/board`
   *
   * @param options - Pagination and filter options
   * @returns A page of boards
   */
  async getBoards(options?: GetBoardsOptions): Promise<BoardPage> {
    const params = this.buildParams({
      startAt: options?.startAt,
      maxResults: options?.maxResults,
      type: options?.type,
      name: options?.name,
      projectKeyOrId: options?.projectKeyOrId,
    });

    return this.getMethod('/board', BoardPageSchema, params);
  }

  /**
   * Get a single board by ID.
   *
   * `GET /rest/agile/1.0/board/{boardId}`
   *
   * @param boardId - Numeric ID of the board
   * @returns The board
   */
  async getBoard(boardId: number): Promise<Board> {
    return this.getMethod(`/board/${boardId}`, BoardSchema);
  }

  /**
   * Create a board backed by an existing saved filter.
   *
   * `POST /rest/agile/1.0/board`
   *
   * @param input - Board name, type and the ID of the filter to back it
   * @returns The created board
   */
  async createBoard(input: CreateBoardInput): Promise<Board> {
    const body = CreateBoardInputSchema.parse(input);
    return this.postMethod('/board', BoardSchema, body);
  }

  /**
   * Delete a board.
   *
   * `DELETE /rest/agile/1.0/board/{boardId}`
   *
   * @param boardId - Numeric ID of the board
   */
  async deleteBoard(boardId: number): Promise<void> {
    await this.deleteMethod(`/board/${boardId}`);
  }

  // ---------------------------------------------------------------------------
  // Sprints
  // ---------------------------------------------------------------------------

  /**
   * List the sprints of a board.
   *
   * `GET /rest/agile/1.0/board/{boardId}/sprint`
   *
   * @param boardId - Numeric ID of the board
   * @param options - Pagination and state filter options
   * @returns A page of sprints
   */
  async getBoardSprints(boardId: number, options?: GetBoardSprintsOptions): Promise<SprintPage> {
    const params = this.buildParams({
      startAt: options?.startAt,
      maxResults: options?.maxResults,
      state: Array.isArray(options?.state) ? options.state.join(',') : options?.state,
    });

    return this.getMethod(`/board/${boardId}/sprint`, SprintPageSchema, params);
  }

  /**
   * Get a single sprint by ID.
   *
   * `GET /rest/agile/1.0/sprint/{sprintId}`
   *
   * @param sprintId - Numeric ID of the sprint
   * @returns The sprint
   */
  async getSprint(sprintId: number): Promise<Sprint> {
    return this.getMethod(`/sprint/${sprintId}`, SprintSchema);
  }

  /**
   * Create a future sprint on a Scrum board.
   *
   * `POST /rest/agile/1.0/sprint`
   *
   * @param input - Sprint name, origin board and optional dates/goal
   * @returns The created sprint
   */
  async createSprint(input: CreateSprintInput): Promise<Sprint> {
    const body = CreateSprintInputSchema.parse(input);
    return this.postMethod('/sprint', SprintSchema, body);
  }

  /**
   * Partially update a sprint (name, state, dates, goal).
   *
   * `POST /rest/agile/1.0/sprint/{sprintId}`
   *
   * @param sprintId - Numeric ID of the sprint
   * @param input - Fields to change; omitted fields are left untouched
   * @returns The updated sprint
   */
  async updateSprint(sprintId: number, input: UpdateSprintInput): Promise<Sprint> {
    const body = UpdateSprintInputSchema.parse(input);
    return this.postMethod(`/sprint/${sprintId}`, SprintSchema, body);
  }

  /**
   * Delete a sprint. Issues in the sprint are moved back to the backlog.
   *
   * `DELETE /rest/agile/1.0/sprint/{sprintId}`
   *
   * @param sprintId - Numeric ID of the sprint
   */
  async deleteSprint(sprintId: number): Promise<void> {
    await this.deleteMethod(`/sprint/${sprintId}`);
  }

  /**
   * Move issues into a sprint. Jira accepts at most 50 issues per call.
   *
   * `POST /rest/agile/1.0/sprint/{sprintId}/issue`
   *
   * @param sprintId - Numeric ID of the target sprint
   * @param input - Issue keys or IDs to move
   */
  async moveIssuesToSprint(sprintId: number, input: MoveIssuesToSprintInput): Promise<void> {
    const body = MoveIssuesToSprintInputSchema.parse(input);
    await this.postMethodRaw(`/sprint/${sprintId}/issue`, body);
  }

  // ---------------------------------------------------------------------------
  // Epics
  // ---------------------------------------------------------------------------

  /**
   * List the epics of a board.
   *
   * `GET /rest/agile/1.0/board/{boardId}/epic`
   *
   * @param boardId - Numeric ID of the board
   * @param options - Pagination and completion-status filter options
   * @returns A page of epics
   */
  async getBoardEpics(boardId: number, options?: GetBoardEpicsOptions): Promise<EpicPage> {
    const params = this.buildParams({
      startAt: options?.startAt,
      maxResults: options?.maxResults,
      done: options?.done,
    });

    return this.getMethod(`/board/${boardId}/epic`, EpicPageSchema, params);
  }

  /**
   * Get a single epic by ID or key.
   *
   * `GET /rest/agile/1.0/epic/{epicIdOrKey}`
   *
   * @param epicIdOrKey - Numeric ID or issue key of the epic
   * @returns The epic
   */
  async getEpic(epicIdOrKey: number | string): Promise<Epic> {
    return this.getMethod(`/epic/${epicIdOrKey}`, EpicSchema);
  }

  // ---------------------------------------------------------------------------
  // Backlog
  // ---------------------------------------------------------------------------

  /**
   * List the issues on a board's backlog (issues not assigned to a sprint).
   *
   * `GET /rest/agile/1.0/board/{boardId}/backlog`
   *
   * @param boardId - Numeric ID of the board
   * @param options - Pagination options
   * @returns A page of backlog issues
   */
  async getBacklog(boardId: number, options?: GetBacklogOptions): Promise<AgileIssuePage> {
    const params = this.buildParams({
      startAt: options?.startAt,
      maxResults: options?.maxResults,
    });

    return this.getMethod(`/board/${boardId}/backlog`, AgileIssuePageSchema, params);
  }

  // ---------------------------------------------------------------------------
  // Async iterators
  // ---------------------------------------------------------------------------

  /**
   * Iterate every board, transparently following `startAt`/`isLast` pagination.
   *
   * @param options - Filter options; `startAt` is managed by the iterator
   * @returns An async generator yielding boards one at a time
   *
   * @example
   * ```typescript
   * for await (const board of client.agile.iterateBoards({ type: 'scrum' })) {
   *   console.log(board.name);
   * }
   * ```
   */
  async *iterateBoards(
    options?: Omit<GetBoardsOptions, 'startAt'>
  ): AsyncGenerator<Board, void, undefined> {
    const pageSize = options?.maxResults ?? DEFAULT_PAGE_SIZE;
    let startAt = 0;

    for (;;) {
      const page = await this.getBoards({ ...options, startAt, maxResults: pageSize });

      for (const board of page.values) {
        yield board;
      }

      if (isLastPage(page.values.length, startAt, page.isLast, page.total)) {
        return;
      }
      startAt += page.values.length;
    }
  }

  /**
   * Collect every board into an array (loads all pages into memory).
   *
   * @param options - Filter options; `startAt` is managed internally
   * @returns All matching boards
   */
  async allBoards(options?: Omit<GetBoardsOptions, 'startAt'>): Promise<Board[]> {
    const boards: Board[] = [];
    for await (const board of this.iterateBoards(options)) {
      boards.push(board);
    }
    return boards;
  }

  /**
   * Iterate every sprint of a board, following `startAt`/`isLast` pagination.
   *
   * @param boardId - Numeric ID of the board
   * @param options - Filter options; `startAt` is managed by the iterator
   * @returns An async generator yielding sprints one at a time
   */
  async *iterateBoardSprints(
    boardId: number,
    options?: Omit<GetBoardSprintsOptions, 'startAt'>
  ): AsyncGenerator<Sprint, void, undefined> {
    const pageSize = options?.maxResults ?? DEFAULT_PAGE_SIZE;
    let startAt = 0;

    for (;;) {
      const page = await this.getBoardSprints(boardId, {
        ...options,
        startAt,
        maxResults: pageSize,
      });

      for (const sprint of page.values) {
        yield sprint;
      }

      if (isLastPage(page.values.length, startAt, page.isLast, page.total)) {
        return;
      }
      startAt += page.values.length;
    }
  }

  /**
   * Collect every sprint of a board into an array.
   *
   * @param boardId - Numeric ID of the board
   * @param options - Filter options; `startAt` is managed internally
   * @returns All matching sprints
   */
  async allBoardSprints(
    boardId: number,
    options?: Omit<GetBoardSprintsOptions, 'startAt'>
  ): Promise<Sprint[]> {
    const sprints: Sprint[] = [];
    for await (const sprint of this.iterateBoardSprints(boardId, options)) {
      sprints.push(sprint);
    }
    return sprints;
  }

  /**
   * Iterate every epic of a board, following `startAt`/`isLast` pagination.
   *
   * @param boardId - Numeric ID of the board
   * @param options - Filter options; `startAt` is managed by the iterator
   * @returns An async generator yielding epics one at a time
   */
  async *iterateBoardEpics(
    boardId: number,
    options?: Omit<GetBoardEpicsOptions, 'startAt'>
  ): AsyncGenerator<Epic, void, undefined> {
    const pageSize = options?.maxResults ?? DEFAULT_PAGE_SIZE;
    let startAt = 0;

    for (;;) {
      const page = await this.getBoardEpics(boardId, { ...options, startAt, maxResults: pageSize });

      for (const epic of page.values) {
        yield epic;
      }

      if (isLastPage(page.values.length, startAt, page.isLast, page.total)) {
        return;
      }
      startAt += page.values.length;
    }
  }

  /**
   * Collect every epic of a board into an array.
   *
   * @param boardId - Numeric ID of the board
   * @param options - Filter options; `startAt` is managed internally
   * @returns All matching epics
   */
  async allBoardEpics(
    boardId: number,
    options?: Omit<GetBoardEpicsOptions, 'startAt'>
  ): Promise<Epic[]> {
    const epics: Epic[] = [];
    for await (const epic of this.iterateBoardEpics(boardId, options)) {
      epics.push(epic);
    }
    return epics;
  }

  /**
   * Iterate every issue on a board's backlog, following `startAt`/`total`
   * pagination (the backlog endpoint does not return `isLast`).
   *
   * @param boardId - Numeric ID of the board
   * @param options - Pagination options; `startAt` is managed by the iterator
   * @returns An async generator yielding backlog issues one at a time
   */
  async *iterateBacklog(
    boardId: number,
    options?: Omit<GetBacklogOptions, 'startAt'>
  ): AsyncGenerator<AgileIssue, void, undefined> {
    const pageSize = options?.maxResults ?? DEFAULT_PAGE_SIZE;
    let startAt = 0;

    for (;;) {
      const page = await this.getBacklog(boardId, { ...options, startAt, maxResults: pageSize });

      for (const issue of page.issues) {
        yield issue;
      }

      if (isLastPage(page.issues.length, startAt, undefined, page.total)) {
        return;
      }
      startAt += page.issues.length;
    }
  }

  /**
   * Collect every backlog issue of a board into an array.
   *
   * @param boardId - Numeric ID of the board
   * @param options - Pagination options; `startAt` is managed internally
   * @returns All backlog issues
   */
  async allBacklog(
    boardId: number,
    options?: Omit<GetBacklogOptions, 'startAt'>
  ): Promise<AgileIssue[]> {
    const issues: AgileIssue[] = [];
    for await (const issue of this.iterateBacklog(boardId, options)) {
      issues.push(issue);
    }
    return issues;
  }
}

/**
 * Decide whether pagination should stop after the page just consumed.
 *
 * Agile endpoints signal the end of a result set either with `isLast` or, when
 * that is absent, by `startAt + count` reaching `total`. An empty page always
 * terminates so a misbehaving server cannot spin the loop forever.
 */
function isLastPage(
  count: number,
  startAt: number,
  isLast: boolean | undefined,
  total: number | undefined
): boolean {
  if (count === 0) {
    return true;
  }
  if (isLast !== undefined) {
    return isLast;
  }
  if (total !== undefined) {
    return startAt + count >= total;
  }
  return false;
}
