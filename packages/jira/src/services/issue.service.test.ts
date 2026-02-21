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

  describe('attachments', () => {
    it('should add an attachment', async () => {
      const mockAttachments = [
        {
          self: 'https://example.atlassian.net/rest/api/3/attachment/10000',
          id: '10000',
          filename: 'test.txt',
          created: '2024-01-15T10:00:00.000Z',
          size: 100,
          mimeType: 'text/plain',
          content: 'https://example.atlassian.net/rest/api/3/attachment/content/10000',
        },
      ];

      vi.mocked(mockHttp.post).mockResolvedValueOnce(createMockResponse(mockAttachments));

      const file = new Blob(['test content'], { type: 'text/plain' });
      const result = await service.addAttachment('PROJECT-123', file, 'test.txt');

      expect(mockHttp.post).toHaveBeenCalledWith(
        '/rest/api/3/issue/PROJECT-123/attachments',
        expect.any(FormData),
        expect.objectContaining({
          headers: expect.objectContaining({
            'X-Atlassian-Token': 'no-check',
          }),
        })
      );
      expect(result).toHaveLength(1);
      expect(result[0].filename).toBe('test.txt');
    });

    it('should get attachment metadata', async () => {
      const mockMetadata = {
        id: 10000,
        self: 'https://example.atlassian.net/rest/api/3/attachment/10000',
        filename: 'test.txt',
        author: { accountId: 'user123', displayName: 'Test User' },
        created: '2024-01-15T10:00:00.000Z',
        size: 100,
        mimeType: 'text/plain',
        content: 'https://example.atlassian.net/rest/api/3/attachment/content/10000',
      };

      vi.mocked(mockHttp.get).mockResolvedValueOnce(createMockResponse(mockMetadata));

      const result = await service.getAttachment('10000');

      expect(mockHttp.get).toHaveBeenCalledWith(
        '/rest/api/3/attachment/10000',
        undefined,
        undefined
      );
      expect(result.filename).toBe('test.txt');
    });

    it('should download attachment content', async () => {
      const mockBlob = new Blob(['file content'], { type: 'text/plain' });

      vi.mocked(mockHttp.request).mockResolvedValueOnce(createMockResponse(mockBlob));

      const result = await service.downloadAttachment('10000');

      expect(mockHttp.request).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'GET',
          url: '/rest/api/3/attachment/content/10000',
          headers: expect.objectContaining({
            Accept: '*/*',
          }),
          metadata: { rawResponse: true },
        })
      );
      expect(result).toBeInstanceOf(Blob);
    });

    it('should delete an attachment', async () => {
      vi.mocked(mockHttp.delete).mockResolvedValueOnce(createMockResponse(null));

      await service.deleteAttachment('10000');

      expect(mockHttp.delete).toHaveBeenCalledWith('/rest/api/3/attachment/10000', undefined);
    });
  });

  describe('issue links', () => {
    it('should get issue links', async () => {
      const mockIssueWithLinks = {
        ...createMockIssue('PROJECT-123'),
        fields: {
          ...createMockIssue('PROJECT-123').fields,
          issuelinks: [
            {
              id: '10000',
              self: 'https://example.atlassian.net/rest/api/3/issueLink/10000',
              type: {
                id: '10001',
                name: 'Blocks',
                inward: 'is blocked by',
                outward: 'blocks',
              },
              outwardIssue: {
                id: '10002',
                key: 'PROJECT-456',
                self: 'https://example.atlassian.net/rest/api/3/issue/10002',
                fields: {
                  summary: 'Blocked issue',
                  status: {
                    self: 'https://example.atlassian.net/rest/api/3/status/1',
                    id: '1',
                    name: 'Open',
                  },
                },
              },
            },
          ],
        },
      };

      vi.mocked(mockHttp.get).mockResolvedValueOnce(createMockResponse(mockIssueWithLinks));

      const result = await service.getIssueLinks('PROJECT-123');

      expect(mockHttp.get).toHaveBeenCalledWith(
        '/rest/api/3/issue/PROJECT-123',
        expect.objectContaining({
          fields: 'issuelinks',
        }),
        undefined
      );
      expect(result).toHaveLength(1);
      expect(result[0].type.name).toBe('Blocks');
    });

    it('should create an issue link', async () => {
      vi.mocked(mockHttp.post).mockResolvedValueOnce(createMockResponse(null));

      await service.createIssueLink({
        type: { name: 'Blocks' },
        inwardIssue: { key: 'PROJECT-123' },
        outwardIssue: { key: 'PROJECT-456' },
      });

      expect(mockHttp.post).toHaveBeenCalledWith(
        '/rest/api/3/issueLink',
        expect.objectContaining({
          type: { name: 'Blocks' },
          inwardIssue: { key: 'PROJECT-123' },
          outwardIssue: { key: 'PROJECT-456' },
        }),
        undefined
      );
    });

    it('should get an issue link by ID', async () => {
      const mockLink = {
        id: '10000',
        self: 'https://example.atlassian.net/rest/api/3/issueLink/10000',
        type: {
          id: '10001',
          name: 'Blocks',
          inward: 'is blocked by',
          outward: 'blocks',
        },
        inwardIssue: {
          id: '10001',
          key: 'PROJECT-123',
        },
        outwardIssue: {
          id: '10002',
          key: 'PROJECT-456',
        },
      };

      vi.mocked(mockHttp.get).mockResolvedValueOnce(createMockResponse(mockLink));

      const result = await service.getIssueLink('10000');

      expect(mockHttp.get).toHaveBeenCalledWith(
        '/rest/api/3/issueLink/10000',
        undefined,
        undefined
      );
      expect(result.type.name).toBe('Blocks');
    });

    it('should delete an issue link', async () => {
      vi.mocked(mockHttp.delete).mockResolvedValueOnce(createMockResponse(null));

      await service.deleteIssueLink('10000');

      expect(mockHttp.delete).toHaveBeenCalledWith('/rest/api/3/issueLink/10000', undefined);
    });

    it('should list issue link types', async () => {
      const mockTypes = {
        issueLinkTypes: [
          {
            id: '10000',
            name: 'Blocks',
            inward: 'is blocked by',
            outward: 'blocks',
            self: 'https://example.atlassian.net/rest/api/3/issueLinkType/10000',
          },
          {
            id: '10001',
            name: 'Duplicate',
            inward: 'is duplicated by',
            outward: 'duplicates',
            self: 'https://example.atlassian.net/rest/api/3/issueLinkType/10001',
          },
        ],
      };

      vi.mocked(mockHttp.get).mockResolvedValueOnce(createMockResponse(mockTypes));

      const result = await service.listIssueLinkTypes();

      expect(mockHttp.get).toHaveBeenCalledWith('/rest/api/3/issueLinkType', undefined, undefined);
      expect(result.issueLinkTypes).toHaveLength(2);
    });

    it('should get a specific issue link type', async () => {
      const mockType = {
        id: '10000',
        name: 'Blocks',
        inward: 'is blocked by',
        outward: 'blocks',
        self: 'https://example.atlassian.net/rest/api/3/issueLinkType/10000',
      };

      vi.mocked(mockHttp.get).mockResolvedValueOnce(createMockResponse(mockType));

      const result = await service.getIssueLinkType('10000');

      expect(mockHttp.get).toHaveBeenCalledWith(
        '/rest/api/3/issueLinkType/10000',
        undefined,
        undefined
      );
      expect(result.name).toBe('Blocks');
    });
  });
});
