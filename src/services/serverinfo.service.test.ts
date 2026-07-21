import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ServerInfoService } from './serverinfo.service.js';
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

describe('ServerInfoService', () => {
  let service: ServerInfoService;
  let mockHttp: HttpClient;

  beforeEach(() => {
    mockHttp = createMockHttpClient();
    service = new ServerInfoService(mockHttp, '/rest/api/3');
  });

  describe('get', () => {
    it('should fetch server information', async () => {
      const mockInfo = {
        baseUrl: 'https://example.atlassian.net',
        version: '1001.0.0',
        versionNumbers: [1001, 0, 0],
        deploymentType: 'Cloud',
        buildNumber: 100218,
        buildDate: '2024-01-15T00:00:00.000+0000',
        serverTime: '2024-01-16T10:00:00.000+0000',
        scmInfo: 'abc123',
        serverTitle: 'Jira',
        healthChecks: [{ name: 'Database', description: 'Connectivity', passed: true }],
      };

      vi.mocked(mockHttp.get).mockResolvedValueOnce(createMockResponse(mockInfo));

      const info = await service.get();

      expect(mockHttp.get).toHaveBeenCalledWith('/rest/api/3/serverInfo', undefined, undefined);
      expect(info.version).toBe('1001.0.0');
      expect(info.healthChecks).toHaveLength(1);
    });

    it('should throw when the response is invalid', async () => {
      vi.mocked(mockHttp.get).mockResolvedValueOnce(createMockResponse({ version: 1001 }));

      await expect(service.get()).rejects.toThrow();
    });
  });

  describe('getConfiguration', () => {
    it('should fetch the instance configuration', async () => {
      const mockConfig = {
        votingEnabled: true,
        watchingEnabled: true,
        unassignedIssuesAllowed: false,
        subTasksEnabled: true,
        issueLinkingEnabled: true,
        timeTrackingEnabled: true,
        attachmentsEnabled: true,
        timeTrackingConfiguration: {
          workingHoursPerDay: 8,
          workingDaysPerWeek: 5,
          timeFormat: 'pretty',
          defaultUnit: 'day',
        },
      };

      vi.mocked(mockHttp.get).mockResolvedValueOnce(createMockResponse(mockConfig));

      const config = await service.getConfiguration();

      expect(mockHttp.get).toHaveBeenCalledWith('/rest/api/3/configuration', undefined, undefined);
      expect(config.timeTrackingEnabled).toBe(true);
      expect(config.timeTrackingConfiguration?.workingHoursPerDay).toBe(8);
    });

    it('should throw when the response is invalid', async () => {
      vi.mocked(mockHttp.get).mockResolvedValueOnce(createMockResponse({ votingEnabled: true }));

      await expect(service.getConfiguration()).rejects.toThrow();
    });
  });
});
