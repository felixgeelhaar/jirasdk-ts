import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AgileService } from './agile.service.js';
import type { HttpClient, HttpResponse } from '../transport/index.js';

// Create mock HTTP client
function createMockHttpClient(): HttpClient {
  return {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
    request: vi.fn(),
    use: vi.fn(),
    getBaseUrl: vi.fn().mockReturnValue('https://example.atlassian.net'),
    getAuth: vi.fn(),
  } as unknown as HttpClient;
}

function createMockResponse<T>(data: T): HttpResponse<T> {
  return {
    status: 200,
    statusText: 'OK',
    headers: new Headers(),
    data,
    request: { method: 'GET', url: '/test', headers: {} },
    responseTime: 100,
  };
}

function createMockBoard(id: number, name = `Board ${id}`) {
  return {
    id,
    self: `https://example.atlassian.net/rest/agile/1.0/board/${id}`,
    name,
    type: 'scrum',
    location: {
      projectId: 10000,
      projectKey: 'PROJ',
      projectName: 'Project',
      projectTypeKey: 'software',
      displayName: 'Project (PROJ)',
      name: 'Project',
    },
  };
}

function createMockSprint(id: number, state = 'active') {
  return {
    id,
    self: `https://example.atlassian.net/rest/agile/1.0/sprint/${id}`,
    state,
    name: `Sprint ${id}`,
    startDate: '2024-06-01T09:00:00.000Z',
    endDate: '2024-06-14T17:00:00.000Z',
    originBoardId: 123,
    goal: 'Ship it',
  };
}

function createMockEpic(id: number) {
  return {
    id,
    self: `https://example.atlassian.net/rest/agile/1.0/epic/${id}`,
    key: `PROJ-${id}`,
    name: `Epic ${id}`,
    summary: `Epic ${id} summary`,
    color: { key: 'color_4' },
    done: false,
  };
}

function createMockAgileIssue(id: number) {
  return {
    id: String(id),
    key: `PROJ-${id}`,
    self: `https://example.atlassian.net/rest/agile/1.0/issue/${id}`,
    fields: {
      summary: `Issue ${id}`,
      flagged: false,
      closedSprints: [],
    },
  };
}

describe('AgileService', () => {
  let service: AgileService;
  let mockHttp: HttpClient;

  beforeEach(() => {
    mockHttp = createMockHttpClient();
    service = new AgileService(mockHttp, '/rest/agile/1.0');
  });

  it('defaults to the Agile base path when none is supplied', async () => {
    const defaultService = new AgileService(mockHttp);
    vi.mocked(mockHttp.get).mockResolvedValueOnce(createMockResponse(createMockBoard(1)));

    await defaultService.getBoard(1);

    expect(mockHttp.get).toHaveBeenCalledWith('/rest/agile/1.0/board/1', undefined, undefined);
  });

  describe('getBoards', () => {
    it('lists boards', async () => {
      const page = {
        startAt: 0,
        maxResults: 50,
        total: 2,
        isLast: true,
        values: [createMockBoard(1), createMockBoard(2)],
      };
      vi.mocked(mockHttp.get).mockResolvedValueOnce(createMockResponse(page));

      const result = await service.getBoards();

      expect(mockHttp.get).toHaveBeenCalledWith('/rest/agile/1.0/board', {}, undefined);
      expect(result.values).toHaveLength(2);
      expect(result.values[0]?.name).toBe('Board 1');
    });

    it('passes filter options as query params', async () => {
      const page = { startAt: 0, maxResults: 10, total: 1, isLast: true, values: [] };
      vi.mocked(mockHttp.get).mockResolvedValueOnce(createMockResponse(page));

      await service.getBoards({
        startAt: 10,
        maxResults: 10,
        type: 'scrum',
        name: 'Sprint',
        projectKeyOrId: 'PROJ',
      });

      expect(mockHttp.get).toHaveBeenCalledWith(
        '/rest/agile/1.0/board',
        {
          startAt: 10,
          maxResults: 10,
          type: 'scrum',
          name: 'Sprint',
          projectKeyOrId: 'PROJ',
        },
        undefined
      );
    });

    it('throws when the response does not match the schema', async () => {
      vi.mocked(mockHttp.get).mockResolvedValueOnce(
        createMockResponse({ startAt: 0, maxResults: 50, values: [{ id: 'not-a-number' }] })
      );

      await expect(service.getBoards()).rejects.toThrow();
    });
  });

  describe('getBoard', () => {
    it('fetches a board by ID', async () => {
      vi.mocked(mockHttp.get).mockResolvedValueOnce(createMockResponse(createMockBoard(123)));

      const board = await service.getBoard(123);

      expect(mockHttp.get).toHaveBeenCalledWith('/rest/agile/1.0/board/123', undefined, undefined);
      expect(board.id).toBe(123);
    });
  });

  describe('createBoard', () => {
    it('creates a board', async () => {
      vi.mocked(mockHttp.post).mockResolvedValueOnce(
        createMockResponse(createMockBoard(5, 'Sprint Board'))
      );

      const board = await service.createBoard({
        name: 'Sprint Board',
        type: 'scrum',
        filterId: 10000,
      });

      expect(mockHttp.post).toHaveBeenCalledWith(
        '/rest/agile/1.0/board',
        { name: 'Sprint Board', type: 'scrum', filterId: 10000 },
        undefined
      );
      expect(board.name).toBe('Sprint Board');
    });

    it('rejects invalid input before making a request', async () => {
      await expect(
        service.createBoard({ name: '', type: 'scrum', filterId: 10000 })
      ).rejects.toThrow();
      expect(mockHttp.post).not.toHaveBeenCalled();
    });
  });

  describe('deleteBoard', () => {
    it('deletes a board', async () => {
      vi.mocked(mockHttp.delete).mockResolvedValueOnce(createMockResponse(null));

      await service.deleteBoard(123);

      expect(mockHttp.delete).toHaveBeenCalledWith('/rest/agile/1.0/board/123', undefined);
    });
  });

  describe('getBoardSprints', () => {
    it('lists the sprints of a board', async () => {
      const page = {
        startAt: 0,
        maxResults: 50,
        isLast: true,
        values: [createMockSprint(1), createMockSprint(2, 'future')],
      };
      vi.mocked(mockHttp.get).mockResolvedValueOnce(createMockResponse(page));

      const result = await service.getBoardSprints(123);

      expect(mockHttp.get).toHaveBeenCalledWith('/rest/agile/1.0/board/123/sprint', {}, undefined);
      expect(result.values).toHaveLength(2);
    });

    it('joins an array of states into a comma-separated param', async () => {
      const page = { startAt: 0, maxResults: 50, isLast: true, values: [] };
      vi.mocked(mockHttp.get).mockResolvedValueOnce(createMockResponse(page));

      await service.getBoardSprints(123, { state: ['active', 'future'], maxResults: 25 });

      expect(mockHttp.get).toHaveBeenCalledWith(
        '/rest/agile/1.0/board/123/sprint',
        { maxResults: 25, state: 'active,future' },
        undefined
      );
    });

    it('passes a single state through unchanged', async () => {
      const page = { startAt: 0, maxResults: 50, isLast: true, values: [] };
      vi.mocked(mockHttp.get).mockResolvedValueOnce(createMockResponse(page));

      await service.getBoardSprints(123, { state: 'closed' });

      expect(mockHttp.get).toHaveBeenCalledWith(
        '/rest/agile/1.0/board/123/sprint',
        { state: 'closed' },
        undefined
      );
    });
  });

  describe('getSprint', () => {
    it('fetches a sprint by ID', async () => {
      vi.mocked(mockHttp.get).mockResolvedValueOnce(createMockResponse(createMockSprint(456)));

      const sprint = await service.getSprint(456);

      expect(mockHttp.get).toHaveBeenCalledWith('/rest/agile/1.0/sprint/456', undefined, undefined);
      expect(sprint.id).toBe(456);
    });
  });

  describe('createSprint', () => {
    it('creates a sprint', async () => {
      vi.mocked(mockHttp.post).mockResolvedValueOnce(createMockResponse(createMockSprint(456)));

      const sprint = await service.createSprint({
        name: 'Sprint 25',
        originBoardId: 123,
        startDate: '2024-06-01T09:00:00.000Z',
        endDate: '2024-06-14T17:00:00.000Z',
        goal: 'Ship it',
      });

      expect(mockHttp.post).toHaveBeenCalledWith(
        '/rest/agile/1.0/sprint',
        expect.objectContaining({ name: 'Sprint 25', originBoardId: 123 }),
        undefined
      );
      expect(sprint.name).toBe('Sprint 456');
    });

    it('rejects a sprint without an origin board', async () => {
      await expect(service.createSprint({ name: 'Sprint 25', originBoardId: 0 })).rejects.toThrow();
      expect(mockHttp.post).not.toHaveBeenCalled();
    });
  });

  describe('updateSprint', () => {
    it('partially updates a sprint via POST', async () => {
      vi.mocked(mockHttp.post).mockResolvedValueOnce(createMockResponse(createMockSprint(456)));

      const sprint = await service.updateSprint(456, { state: 'active', goal: 'Updated goal' });

      expect(mockHttp.post).toHaveBeenCalledWith(
        '/rest/agile/1.0/sprint/456',
        { state: 'active', goal: 'Updated goal' },
        undefined
      );
      expect(sprint.state).toBe('active');
    });
  });

  describe('deleteSprint', () => {
    it('deletes a sprint', async () => {
      vi.mocked(mockHttp.delete).mockResolvedValueOnce(createMockResponse(null));

      await service.deleteSprint(456);

      expect(mockHttp.delete).toHaveBeenCalledWith('/rest/agile/1.0/sprint/456', undefined);
    });
  });

  describe('moveIssuesToSprint', () => {
    it('moves issues into a sprint', async () => {
      vi.mocked(mockHttp.post).mockResolvedValueOnce(createMockResponse(null));

      await service.moveIssuesToSprint(456, { issues: ['PROJ-123', 'PROJ-124'] });

      expect(mockHttp.post).toHaveBeenCalledWith(
        '/rest/agile/1.0/sprint/456/issue',
        { issues: ['PROJ-123', 'PROJ-124'] },
        undefined
      );
    });

    it('requires at least one issue', async () => {
      await expect(service.moveIssuesToSprint(456, { issues: [] })).rejects.toThrow();
      expect(mockHttp.post).not.toHaveBeenCalled();
    });
  });

  describe('getBoardEpics', () => {
    it('lists the epics of a board', async () => {
      const page = {
        startAt: 0,
        maxResults: 50,
        total: 1,
        isLast: true,
        values: [createMockEpic(789)],
      };
      vi.mocked(mockHttp.get).mockResolvedValueOnce(createMockResponse(page));

      const result = await service.getBoardEpics(123, { done: false, maxResults: 50 });

      expect(mockHttp.get).toHaveBeenCalledWith(
        '/rest/agile/1.0/board/123/epic',
        { maxResults: 50, done: false },
        undefined
      );
      expect(result.values[0]?.key).toBe('PROJ-789');
    });
  });

  describe('getEpic', () => {
    it('fetches an epic by ID', async () => {
      vi.mocked(mockHttp.get).mockResolvedValueOnce(createMockResponse(createMockEpic(789)));

      const epic = await service.getEpic(789);

      expect(mockHttp.get).toHaveBeenCalledWith('/rest/agile/1.0/epic/789', undefined, undefined);
      expect(epic.id).toBe(789);
    });

    it('fetches an epic by key', async () => {
      vi.mocked(mockHttp.get).mockResolvedValueOnce(createMockResponse(createMockEpic(789)));

      await service.getEpic('PROJ-789');

      expect(mockHttp.get).toHaveBeenCalledWith(
        '/rest/agile/1.0/epic/PROJ-789',
        undefined,
        undefined
      );
    });
  });

  describe('getBacklog', () => {
    it('lists backlog issues', async () => {
      const page = {
        startAt: 0,
        maxResults: 50,
        total: 2,
        issues: [createMockAgileIssue(1), createMockAgileIssue(2)],
      };
      vi.mocked(mockHttp.get).mockResolvedValueOnce(createMockResponse(page));

      const result = await service.getBacklog(123, { startAt: 0, maxResults: 50 });

      expect(mockHttp.get).toHaveBeenCalledWith(
        '/rest/agile/1.0/board/123/backlog',
        { startAt: 0, maxResults: 50 },
        undefined
      );
      expect(result.issues).toHaveLength(2);
      expect(result.issues[0]?.fields?.summary).toBe('Issue 1');
    });
  });

  describe('iterateBoards', () => {
    it('follows pages until isLast', async () => {
      vi.mocked(mockHttp.get)
        .mockResolvedValueOnce(
          createMockResponse({
            startAt: 0,
            maxResults: 2,
            total: 3,
            isLast: false,
            values: [createMockBoard(1), createMockBoard(2)],
          })
        )
        .mockResolvedValueOnce(
          createMockResponse({
            startAt: 2,
            maxResults: 2,
            total: 3,
            isLast: true,
            values: [createMockBoard(3)],
          })
        );

      const seen: number[] = [];
      for await (const board of service.iterateBoards({ maxResults: 2 })) {
        seen.push(board.id);
      }

      expect(seen).toEqual([1, 2, 3]);
      expect(mockHttp.get).toHaveBeenNthCalledWith(
        2,
        '/rest/agile/1.0/board',
        { startAt: 2, maxResults: 2 },
        undefined
      );
    });

    it('stops on an empty page when isLast is absent', async () => {
      vi.mocked(mockHttp.get).mockResolvedValueOnce(
        createMockResponse({ startAt: 0, maxResults: 50, values: [] })
      );

      const boards = await service.allBoards();

      expect(boards).toEqual([]);
      expect(mockHttp.get).toHaveBeenCalledTimes(1);
    });
  });

  describe('iterateBoardSprints', () => {
    it('collects sprints across pages', async () => {
      vi.mocked(mockHttp.get)
        .mockResolvedValueOnce(
          createMockResponse({
            startAt: 0,
            maxResults: 1,
            isLast: false,
            values: [createMockSprint(1)],
          })
        )
        .mockResolvedValueOnce(
          createMockResponse({
            startAt: 1,
            maxResults: 1,
            isLast: true,
            values: [createMockSprint(2)],
          })
        );

      const sprints = await service.allBoardSprints(123, { maxResults: 1 });

      expect(sprints.map((s) => s.id)).toEqual([1, 2]);
    });
  });

  describe('iterateBoardEpics', () => {
    it('collects epics across pages', async () => {
      vi.mocked(mockHttp.get)
        .mockResolvedValueOnce(
          createMockResponse({
            startAt: 0,
            maxResults: 1,
            total: 2,
            isLast: false,
            values: [createMockEpic(1)],
          })
        )
        .mockResolvedValueOnce(
          createMockResponse({
            startAt: 1,
            maxResults: 1,
            total: 2,
            isLast: true,
            values: [createMockEpic(2)],
          })
        );

      const epics = await service.allBoardEpics(123, { maxResults: 1 });

      expect(epics.map((e) => e.key)).toEqual(['PROJ-1', 'PROJ-2']);
    });
  });

  describe('iterateBacklog', () => {
    it('paginates on total since the backlog has no isLast flag', async () => {
      vi.mocked(mockHttp.get)
        .mockResolvedValueOnce(
          createMockResponse({
            startAt: 0,
            maxResults: 2,
            total: 3,
            issues: [createMockAgileIssue(1), createMockAgileIssue(2)],
          })
        )
        .mockResolvedValueOnce(
          createMockResponse({
            startAt: 2,
            maxResults: 2,
            total: 3,
            issues: [createMockAgileIssue(3)],
          })
        );

      const keys: string[] = [];
      for await (const issue of service.iterateBacklog(123, { maxResults: 2 })) {
        keys.push(issue.key);
      }

      expect(keys).toEqual(['PROJ-1', 'PROJ-2', 'PROJ-3']);
      expect(mockHttp.get).toHaveBeenCalledTimes(2);
    });

    it('collects all backlog issues', async () => {
      vi.mocked(mockHttp.get).mockResolvedValueOnce(
        createMockResponse({
          startAt: 0,
          maxResults: 50,
          total: 1,
          issues: [createMockAgileIssue(7)],
        })
      );

      const issues = await service.allBacklog(123);

      expect(issues).toHaveLength(1);
      expect(issues[0]?.key).toBe('PROJ-7');
    });
  });
});
