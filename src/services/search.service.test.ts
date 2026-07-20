/* eslint-disable @typescript-eslint/no-deprecated -- the legacy search methods stay supported, so they stay tested */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SearchService } from './search.service.js';
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

describe('SearchService', () => {
  let service: SearchService;
  let mockHttp: HttpClient;

  beforeEach(() => {
    mockHttp = createMockHttpClient();
    service = new SearchService(mockHttp, '/rest/api/3');
  });

  describe('search', () => {
    it('should execute a JQL search', async () => {
      const mockResult = {
        startAt: 0,
        maxResults: 50,
        total: 2,
        issues: [createMockIssue('PROJECT-1'), createMockIssue('PROJECT-2')],
      };

      vi.mocked(mockHttp.post).mockResolvedValueOnce(createMockResponse(mockResult));

      const result = await service.search({
        jql: 'project = PROJECT',
      });

      expect(mockHttp.post).toHaveBeenCalledWith(
        '/rest/api/3/search',
        expect.objectContaining({
          jql: 'project = PROJECT',
          startAt: 0,
          maxResults: 50,
        }),
        undefined
      );
      expect(result.total).toBe(2);
      expect(result.issues).toHaveLength(2);
    });

    it('should pass all search options', async () => {
      const mockResult = {
        startAt: 10,
        maxResults: 25,
        total: 100,
        issues: [],
      };

      vi.mocked(mockHttp.post).mockResolvedValueOnce(createMockResponse(mockResult));

      await service.search({
        jql: 'project = PROJECT AND status = Open',
        startAt: 10,
        maxResults: 25,
        fields: ['summary', 'status'],
        expand: ['changelog'],
        validateQuery: 'strict',
      });

      expect(mockHttp.post).toHaveBeenCalledWith(
        '/rest/api/3/search',
        expect.objectContaining({
          jql: 'project = PROJECT AND status = Open',
          startAt: 10,
          maxResults: 25,
          fields: ['summary', 'status'],
          expand: ['changelog'],
          validateQuery: 'strict',
        }),
        undefined
      );
    });
  });

  describe('jql', () => {
    it('should be a convenience method for search', async () => {
      const mockResult = {
        startAt: 0,
        maxResults: 50,
        total: 1,
        issues: [createMockIssue('PROJECT-1')],
      };

      vi.mocked(mockHttp.post).mockResolvedValueOnce(createMockResponse(mockResult));

      const result = await service.jql('project = PROJECT');

      expect(mockHttp.post).toHaveBeenCalledWith(
        '/rest/api/3/search',
        expect.objectContaining({
          jql: 'project = PROJECT',
        }),
        undefined
      );
      expect(result.issues).toHaveLength(1);
    });

    it('should accept additional options', async () => {
      const mockResult = {
        startAt: 0,
        maxResults: 10,
        total: 1,
        issues: [],
      };

      vi.mocked(mockHttp.post).mockResolvedValueOnce(createMockResponse(mockResult));

      await service.jql('project = PROJECT', { maxResults: 10 });

      expect(mockHttp.post).toHaveBeenCalledWith(
        '/rest/api/3/search',
        expect.objectContaining({
          jql: 'project = PROJECT',
          maxResults: 10,
        }),
        undefined
      );
    });
  });

  describe('iterate', () => {
    it('should iterate through all pages', async () => {
      const page1 = {
        startAt: 0,
        maxResults: 2,
        total: 5,
        issues: [createMockIssue('PROJECT-1'), createMockIssue('PROJECT-2')],
      };

      const page2 = {
        startAt: 2,
        maxResults: 2,
        total: 5,
        issues: [createMockIssue('PROJECT-3'), createMockIssue('PROJECT-4')],
      };

      const page3 = {
        startAt: 4,
        maxResults: 2,
        total: 5,
        issues: [createMockIssue('PROJECT-5')],
      };

      vi.mocked(mockHttp.post)
        .mockResolvedValueOnce(createMockResponse(page1))
        .mockResolvedValueOnce(createMockResponse(page2))
        .mockResolvedValueOnce(createMockResponse(page3));

      const issues = [];
      for await (const issue of service.iterate('project = PROJECT', { maxResults: 2 })) {
        issues.push(issue);
      }

      expect(issues).toHaveLength(5);
      expect(mockHttp.post).toHaveBeenCalledTimes(3);
    });

    it('should handle single page results', async () => {
      const mockResult = {
        startAt: 0,
        maxResults: 50,
        total: 2,
        issues: [createMockIssue('PROJECT-1'), createMockIssue('PROJECT-2')],
      };

      vi.mocked(mockHttp.post).mockResolvedValueOnce(createMockResponse(mockResult));

      const issues = [];
      for await (const issue of service.iterate('project = PROJECT')) {
        issues.push(issue);
      }

      expect(issues).toHaveLength(2);
      expect(mockHttp.post).toHaveBeenCalledTimes(1);
    });
  });

  describe('all', () => {
    it('should return all issues as an array', async () => {
      const mockResult = {
        startAt: 0,
        maxResults: 50,
        total: 3,
        issues: [
          createMockIssue('PROJECT-1'),
          createMockIssue('PROJECT-2'),
          createMockIssue('PROJECT-3'),
        ],
      };

      vi.mocked(mockHttp.post).mockResolvedValueOnce(createMockResponse(mockResult));

      const issues = await service.all('project = PROJECT');

      expect(issues).toHaveLength(3);
      expect(issues[0]!.key).toBe('PROJECT-1');
    });
  });

  describe('searchJql', () => {
    it('should post to the enhanced endpoint with only the jql field by default', async () => {
      vi.mocked(mockHttp.post).mockResolvedValueOnce(createMockResponse({ issues: [] }));

      const result = await service.searchJql({ jql: 'project = PROJECT' });

      expect(mockHttp.post).toHaveBeenCalledWith(
        '/rest/api/3/search/jql',
        { jql: 'project = PROJECT' },
        undefined
      );
      expect(result.issues).toHaveLength(0);
      expect(result.nextPageToken).toBeUndefined();
    });

    it('should pass all enhanced options through', async () => {
      vi.mocked(mockHttp.post).mockResolvedValueOnce(createMockResponse({ issues: [] }));

      await service.searchJql({
        jql: 'project = PROJECT',
        fields: ['*all'],
        expand: ['changelog'],
        maxResults: 5000,
        nextPageToken: 'token-1',
        fieldsByKeys: true,
        properties: ['prop'],
        validateQuery: 'strict',
      });

      expect(mockHttp.post).toHaveBeenCalledWith(
        '/rest/api/3/search/jql',
        {
          jql: 'project = PROJECT',
          fields: ['*all'],
          expand: ['changelog'],
          maxResults: 5000,
          nextPageToken: 'token-1',
          fieldsByKeys: true,
          properties: ['prop'],
          validateQuery: 'strict',
        },
        undefined
      );
    });

    it('should accept id-only issues (the default field selection)', async () => {
      vi.mocked(mockHttp.post).mockResolvedValueOnce(
        createMockResponse({
          issues: [
            {
              id: '10001',
              key: 'PROJECT-1',
              self: 'https://example.atlassian.net/rest/api/3/issue/10001',
            },
          ],
          nextPageToken: 'next',
        })
      );

      const result = await service.searchJql({ jql: 'project = PROJECT' });

      expect(result.issues[0]?.fields).toBeUndefined();
      expect(result.nextPageToken).toBe('next');
    });

    it('should accept partially populated fields', async () => {
      vi.mocked(mockHttp.post).mockResolvedValueOnce(
        createMockResponse({
          issues: [
            {
              id: '10001',
              key: 'PROJECT-1',
              self: 'https://example.atlassian.net/rest/api/3/issue/10001',
              fields: { summary: 'Only a summary' },
            },
          ],
        })
      );

      const result = await service.searchJql({ jql: 'project = PROJECT', fields: ['summary'] });

      expect(result.issues[0]?.fields?.summary).toBe('Only a summary');
    });

    it('should reject a malformed response', async () => {
      vi.mocked(mockHttp.post).mockResolvedValueOnce(createMockResponse({ issues: 'nope' }));

      await expect(service.searchJql({ jql: 'project = PROJECT' })).rejects.toThrow();
    });
  });

  describe('iterateJql', () => {
    it('should follow nextPageToken until it is absent', async () => {
      vi.mocked(mockHttp.post)
        .mockResolvedValueOnce(
          createMockResponse({
            issues: [createMockIssue('PROJECT-1'), createMockIssue('PROJECT-2')],
            nextPageToken: 'token-2',
          })
        )
        .mockResolvedValueOnce(
          createMockResponse({ issues: [createMockIssue('PROJECT-3')] })
        );

      const issues = [];
      for await (const issue of service.iterateJql('project = PROJECT', { fields: ['*all'] })) {
        issues.push(issue);
      }

      expect(issues).toHaveLength(3);
      expect(mockHttp.post).toHaveBeenCalledTimes(2);
      expect(vi.mocked(mockHttp.post).mock.calls[0]?.[1]).toEqual(
        expect.objectContaining({ maxResults: 100 })
      );
      expect(vi.mocked(mockHttp.post).mock.calls[1]?.[1]).toEqual(
        expect.objectContaining({ nextPageToken: 'token-2' })
      );
    });

    it('should stop on an empty page even if a token is returned', async () => {
      vi.mocked(mockHttp.post).mockResolvedValueOnce(
        createMockResponse({ issues: [], nextPageToken: 'token-2' })
      );

      const issues = [];
      for await (const issue of service.iterateJql('project = PROJECT')) {
        issues.push(issue);
      }

      expect(issues).toHaveLength(0);
      expect(mockHttp.post).toHaveBeenCalledTimes(1);
    });
  });

  describe('allJql', () => {
    it('should collect every page into an array', async () => {
      vi.mocked(mockHttp.post)
        .mockResolvedValueOnce(
          createMockResponse({
            issues: [createMockIssue('PROJECT-1')],
            nextPageToken: 'token-2',
          })
        )
        .mockResolvedValueOnce(
          createMockResponse({ issues: [createMockIssue('PROJECT-2')] })
        );

      const issues = await service.allJql('project = PROJECT', {
        fields: ['*navigable'],
        maxResults: 10,
      });

      expect(issues).toHaveLength(2);
      expect(issues[0]?.key).toBe('PROJECT-1');
      expect(vi.mocked(mockHttp.post).mock.calls[0]?.[1]).toEqual(
        expect.objectContaining({ maxResults: 10, fields: ['*navigable'] })
      );
    });
  });

  describe('count', () => {
    it('should return the total count', async () => {
      const mockResult = {
        startAt: 0,
        maxResults: 0,
        total: 42,
        issues: [],
      };

      vi.mocked(mockHttp.post).mockResolvedValueOnce(createMockResponse(mockResult));

      const count = await service.count('project = PROJECT');

      expect(mockHttp.post).toHaveBeenCalledWith(
        '/rest/api/3/search',
        expect.objectContaining({
          jql: 'project = PROJECT',
          maxResults: 0,
          fields: [],
        }),
        undefined
      );
      expect(count).toBe(42);
    });
  });
});
