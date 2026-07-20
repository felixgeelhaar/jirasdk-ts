import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SecurityLevelService } from './securitylevel.service.js';
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

function createMockLevel(id = '10000') {
  return {
    id,
    self: `https://example.atlassian.net/rest/api/3/securitylevel/${id}`,
    name: 'Internal',
    description: 'Only visible to internal staff',
  };
}

describe('SecurityLevelService', () => {
  let service: SecurityLevelService;
  let mockHttp: HttpClient;

  beforeEach(() => {
    mockHttp = createMockHttpClient();
    service = new SecurityLevelService(mockHttp, '/rest/api/3');
  });

  describe('get', () => {
    it('should fetch a security level by id', async () => {
      vi.mocked(mockHttp.get).mockResolvedValueOnce(createMockResponse(createMockLevel()));

      const level = await service.get('10000');

      expect(mockHttp.get).toHaveBeenCalledWith(
        '/rest/api/3/securitylevel/10000',
        undefined,
        undefined
      );
      expect(level.name).toBe('Internal');
    });

    it('should throw when the response is invalid', async () => {
      vi.mocked(mockHttp.get).mockResolvedValueOnce(createMockResponse({ id: 10000 }));

      await expect(service.get('10000')).rejects.toThrow();
    });
  });

  describe('getIssueSecuritySchemes', () => {
    it('should fetch all issue security schemes', async () => {
      vi.mocked(mockHttp.get).mockResolvedValueOnce(
        createMockResponse({
          issueSecuritySchemes: [
            {
              id: '10001',
              name: 'Default Security Scheme',
              description: 'Default scheme',
              defaultSecurityLevelId: 10000,
              levels: [createMockLevel()],
            },
          ],
        })
      );

      const schemes = await service.getIssueSecuritySchemes();

      expect(mockHttp.get).toHaveBeenCalledWith(
        '/rest/api/3/issuesecurityschemes',
        undefined,
        undefined
      );
      expect(schemes).toHaveLength(1);
      expect(schemes[0]?.levels?.[0]?.id).toBe('10000');
    });

    it('should default to an empty list when the key is absent', async () => {
      vi.mocked(mockHttp.get).mockResolvedValueOnce(createMockResponse({}));

      const schemes = await service.getIssueSecuritySchemes();

      expect(schemes).toEqual([]);
    });
  });

  describe('getIssueSecurityScheme', () => {
    it('should fetch a single issue security scheme', async () => {
      vi.mocked(mockHttp.get).mockResolvedValueOnce(
        createMockResponse({
          id: '10001',
          self: 'https://example.atlassian.net/rest/api/3/issuesecurityschemes/10001',
          name: 'Default Security Scheme',
        })
      );

      const scheme = await service.getIssueSecurityScheme('10001');

      expect(mockHttp.get).toHaveBeenCalledWith(
        '/rest/api/3/issuesecurityschemes/10001',
        undefined,
        undefined
      );
      expect(scheme.name).toBe('Default Security Scheme');
    });
  });
});
