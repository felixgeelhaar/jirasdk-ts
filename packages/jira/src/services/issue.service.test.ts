import { describe, it, expect, vi, beforeEach } from 'vitest';
import { IssueService } from './issue.service.js';
import type { HttpClient, HttpResponse } from '@felixgeelhaar/sdk-core';

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

function createMockIssue(key: string) {
  return {
    id: '10001',
    key,
    self: `https://example.atlassian.net/rest/api/3/issue/${key}`,
    fields: {
      summary: `Issue ${key}`,
      status: {
        self: 'https://example.atlassian.net/rest/api/3/status/1',
        id: '1',
        name: 'Open',
      },
      issuetype: {
        self: 'https://example.atlassian.net/rest/api/3/issuetype/10001',
        id: '10001',
        name: 'Task',
        subtask: false,
      },
      project: {
        self: 'https://example.atlassian.net/rest/api/3/project/10000',
        id: '10000',
        key: 'PROJECT',
        name: 'Test Project',
      },
      created: '2024-01-15T10:00:00.000Z',
      updated: '2024-01-15T12:00:00.000Z',
      resolutiondate: null,
    },
  };
}

describe('IssueService', () => {
  let service: IssueService;
  let mockHttp: HttpClient;

  beforeEach(() => {
    mockHttp = createMockHttpClient();
    service = new IssueService(mockHttp, '/rest/api/3');
  });

  describe('get', () => {
    it('should fetch an issue by key', async () => {
      const mockIssue = createMockIssue('PROJECT-123');

      vi.mocked(mockHttp.get).mockResolvedValueOnce(createMockResponse(mockIssue));

      const issue = await service.get('PROJECT-123');

      expect(mockHttp.get).toHaveBeenCalledWith('/rest/api/3/issue/PROJECT-123', {}, undefined);
      expect(issue.key).toBe('PROJECT-123');
      expect(issue.fields.summary).toBe('Issue PROJECT-123');
    });

    it('should fetch an issue with expand options', async () => {
      const mockIssue = {
        ...createMockIssue('PROJECT-123'),
        changelog: {
          startAt: 0,
          maxResults: 50,
          total: 0,
          histories: [],
        },
      };

      vi.mocked(mockHttp.get).mockResolvedValueOnce(createMockResponse(mockIssue));

      await service.get('PROJECT-123', { expand: ['changelog', 'renderedFields'] });

      expect(mockHttp.get).toHaveBeenCalledWith(
        '/rest/api/3/issue/PROJECT-123',
        expect.objectContaining({
          expand: 'changelog,renderedFields',
        }),
        undefined
      );
    });
  });

  describe('create', () => {
    it('should create a new issue', async () => {
      const mockResponse = {
        id: '10001',
        key: 'PROJECT-124',
        self: 'https://example.atlassian.net/rest/api/3/issue/10001',
      };

      vi.mocked(mockHttp.post).mockResolvedValueOnce(createMockResponse(mockResponse));

      const result = await service.create({
        fields: {
          project: { key: 'PROJECT' },
          summary: 'New issue',
          issuetype: { name: 'Task' },
        },
      });

      expect(mockHttp.post).toHaveBeenCalledWith(
        '/rest/api/3/issue',
        expect.objectContaining({
          fields: expect.objectContaining({
            summary: 'New issue',
          }),
        }),
        undefined
      );
      expect(result.key).toBe('PROJECT-124');
    });
  });

  describe('update', () => {
    it('should update an issue', async () => {
      vi.mocked(mockHttp.put).mockResolvedValueOnce(createMockResponse(null));

      await service.update('PROJECT-123', {
        fields: { summary: 'Updated summary' },
      });

      expect(mockHttp.put).toHaveBeenCalledWith(
        '/rest/api/3/issue/PROJECT-123',
        expect.objectContaining({
          fields: expect.objectContaining({
            summary: 'Updated summary',
          }),
        }),
        expect.anything()
      );
    });
  });

  describe('deleteIssue', () => {
    it('should delete an issue', async () => {
      vi.mocked(mockHttp.delete).mockResolvedValueOnce(createMockResponse(null));

      await service.deleteIssue('PROJECT-123');

      expect(mockHttp.delete).toHaveBeenCalledWith(
        '/rest/api/3/issue/PROJECT-123',
        expect.anything()
      );
    });

    it('should delete an issue with subtasks', async () => {
      vi.mocked(mockHttp.delete).mockResolvedValueOnce(createMockResponse(null));

      await service.deleteIssue('PROJECT-123', { deleteSubtasks: true });

      expect(mockHttp.delete).toHaveBeenCalledWith(
        '/rest/api/3/issue/PROJECT-123',
        expect.objectContaining({
          params: expect.objectContaining({
            deleteSubtasks: 'true',
          }),
        })
      );
    });
  });

  describe('comments', () => {
    it('should get comments for an issue', async () => {
      const mockComments = {
        startAt: 0,
        maxResults: 50,
        total: 1,
        comments: [
          {
            id: '10000',
            self: 'https://example.atlassian.net/rest/api/3/issue/10001/comment/10000',
            body: 'Test comment',
            author: { accountId: 'user123', displayName: 'Test User' },
            created: '2024-01-15T10:00:00.000Z',
            updated: '2024-01-15T10:00:00.000Z',
          },
        ],
      };

      vi.mocked(mockHttp.get).mockResolvedValueOnce(createMockResponse(mockComments));

      const result = await service.getComments('PROJECT-123');

      expect(mockHttp.get).toHaveBeenCalledWith(
        '/rest/api/3/issue/PROJECT-123/comment',
        {},
        undefined
      );
      expect(result.comments).toHaveLength(1);
    });

    it('should add a comment', async () => {
      const mockComment = {
        id: '10001',
        self: 'https://example.atlassian.net/rest/api/3/issue/10001/comment/10001',
        body: 'New comment',
        author: { accountId: 'user123', displayName: 'Test User' },
        created: '2024-01-15T10:00:00.000Z',
        updated: '2024-01-15T10:00:00.000Z',
      };

      vi.mocked(mockHttp.post).mockResolvedValueOnce(createMockResponse(mockComment));

      const result = await service.addComment('PROJECT-123', { body: 'New comment' });

      expect(mockHttp.post).toHaveBeenCalledWith(
        '/rest/api/3/issue/PROJECT-123/comment',
        expect.objectContaining({ body: 'New comment' }),
        expect.anything()
      );
      expect(result.body).toBe('New comment');
    });

    it('should delete a comment', async () => {
      vi.mocked(mockHttp.delete).mockResolvedValueOnce(createMockResponse(null));

      await service.deleteComment('PROJECT-123', '10000');

      expect(mockHttp.delete).toHaveBeenCalledWith(
        '/rest/api/3/issue/PROJECT-123/comment/10000',
        undefined
      );
    });
  });

  describe('transitions', () => {
    it('should get available transitions', async () => {
      const mockTransitions = {
        transitions: [
          {
            id: '2',
            name: 'In Progress',
            to: {
              self: 'https://example.atlassian.net/rest/api/3/status/3',
              id: '3',
              name: 'In Progress',
            },
          },
          {
            id: '3',
            name: 'Done',
            to: {
              self: 'https://example.atlassian.net/rest/api/3/status/5',
              id: '5',
              name: 'Done',
            },
          },
        ],
      };

      vi.mocked(mockHttp.get).mockResolvedValueOnce(createMockResponse(mockTransitions));

      const result = await service.getTransitions('PROJECT-123');

      expect(mockHttp.get).toHaveBeenCalledWith(
        '/rest/api/3/issue/PROJECT-123/transitions',
        {},
        undefined
      );
      expect(result.transitions).toHaveLength(2);
    });

    it('should perform a transition', async () => {
      vi.mocked(mockHttp.post).mockResolvedValueOnce(createMockResponse(null));

      await service.doTransition('PROJECT-123', {
        transition: { id: '2' },
      });

      expect(mockHttp.post).toHaveBeenCalledWith(
        '/rest/api/3/issue/PROJECT-123/transitions',
        expect.objectContaining({
          transition: { id: '2' },
        }),
        undefined
      );
    });
  });

  describe('watchers', () => {
    it('should get watchers', async () => {
      const mockWatchers = {
        self: 'https://example.atlassian.net/rest/api/3/issue/10001/watchers',
        isWatching: true,
        watchCount: 2,
        watchers: [
          { accountId: 'user1', displayName: 'User 1' },
          { accountId: 'user2', displayName: 'User 2' },
        ],
      };

      vi.mocked(mockHttp.get).mockResolvedValueOnce(createMockResponse(mockWatchers));

      const result = await service.getWatchers('PROJECT-123');

      expect(result.watchCount).toBe(2);
      expect(result.watchers).toHaveLength(2);
    });

    it('should add a watcher', async () => {
      vi.mocked(mockHttp.post).mockResolvedValueOnce(createMockResponse(null));

      await service.addWatcher('PROJECT-123', 'user123');

      expect(mockHttp.post).toHaveBeenCalledWith(
        '/rest/api/3/issue/PROJECT-123/watchers',
        '"user123"',
        undefined
      );
    });

    it('should remove a watcher', async () => {
      vi.mocked(mockHttp.delete).mockResolvedValueOnce(createMockResponse(null));

      await service.removeWatcher('PROJECT-123', 'user123');

      expect(mockHttp.delete).toHaveBeenCalledWith(
        '/rest/api/3/issue/PROJECT-123/watchers',
        expect.objectContaining({
          params: { accountId: 'user123' },
        })
      );
    });
  });

  describe('votes', () => {
    it('should add a vote', async () => {
      vi.mocked(mockHttp.post).mockResolvedValueOnce(createMockResponse(null));

      await service.addVote('PROJECT-123');

      expect(mockHttp.post).toHaveBeenCalledWith(
        '/rest/api/3/issue/PROJECT-123/votes',
        undefined,
        undefined
      );
    });

    it('should remove a vote', async () => {
      vi.mocked(mockHttp.delete).mockResolvedValueOnce(createMockResponse(null));

      await service.removeVote('PROJECT-123');

      expect(mockHttp.delete).toHaveBeenCalledWith(
        '/rest/api/3/issue/PROJECT-123/votes',
        undefined
      );
    });
  });
});
