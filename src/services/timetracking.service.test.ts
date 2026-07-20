import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TimeTrackingService } from './timetracking.service.js';
import { ResponseValidationError } from '../errors/index.js';
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

function createMockWorklog(id = '10000') {
  return {
    self: `https://example.atlassian.net/rest/api/3/issue/PROJ-123/worklog/${id}`,
    id,
    author: { accountId: 'user-1', displayName: 'Alice' },
    comment: 'Worked on bug fix',
    created: '2024-01-15T09:00:00.000+0000',
    updated: '2024-01-15T09:00:00.000+0000',
    started: '2024-01-15T09:00:00.000+0000',
    timeSpent: '3h 30m',
    timeSpentSeconds: 12600,
    issueId: '10001',
  };
}

describe('TimeTrackingService', () => {
  let service: TimeTrackingService;
  let mockHttp: HttpClient;

  beforeEach(() => {
    mockHttp = createMockHttpClient();
    service = new TimeTrackingService(mockHttp, '/rest/api/3');
  });

  describe('getAvailableProviders', () => {
    it('should list available providers', async () => {
      vi.mocked(mockHttp.get).mockResolvedValueOnce(
        createMockResponse([
          { key: 'JIRA', name: 'JIRA provided time tracking' },
          { key: 'Tempo', name: 'Tempo Timesheets' },
        ])
      );

      const providers = await service.getAvailableProviders();

      expect(mockHttp.get).toHaveBeenCalledWith(
        '/rest/api/3/configuration/timetracking/list',
        undefined,
        undefined
      );
      expect(providers).toHaveLength(2);
      expect(providers[0]?.key).toBe('JIRA');
    });

    it('should throw on an invalid response shape', async () => {
      vi.mocked(mockHttp.get).mockResolvedValueOnce(createMockResponse([{ name: 'no key' }]));

      await expect(service.getAvailableProviders()).rejects.toThrow(ResponseValidationError);
    });
  });

  describe('getSelectedProvider', () => {
    it('should get the selected provider', async () => {
      vi.mocked(mockHttp.get).mockResolvedValueOnce(createMockResponse({ key: 'JIRA' }));

      const provider = await service.getSelectedProvider();

      expect(mockHttp.get).toHaveBeenCalledWith(
        '/rest/api/3/configuration/timetracking',
        undefined,
        undefined
      );
      expect(provider.key).toBe('JIRA');
    });
  });

  describe('selectProvider', () => {
    it('should select a provider by key', async () => {
      vi.mocked(mockHttp.put).mockResolvedValueOnce(createMockResponse({ key: 'Tempo' }));

      const provider = await service.selectProvider('Tempo');

      expect(mockHttp.put).toHaveBeenCalledWith(
        '/rest/api/3/configuration/timetracking',
        { key: 'Tempo' },
        undefined
      );
      expect(provider.key).toBe('Tempo');
    });
  });

  describe('getConfiguration', () => {
    it('should get time tracking configuration', async () => {
      vi.mocked(mockHttp.get).mockResolvedValueOnce(
        createMockResponse({
          workingHoursPerDay: 8,
          workingDaysPerWeek: 5,
          timeFormat: 'pretty',
          defaultUnit: 'hour',
        })
      );

      const config = await service.getConfiguration();

      expect(mockHttp.get).toHaveBeenCalledWith(
        '/rest/api/3/configuration/timetracking/options',
        undefined,
        undefined
      );
      expect(config.workingHoursPerDay).toBe(8);
    });
  });

  describe('updateConfiguration', () => {
    it('should update time tracking configuration', async () => {
      vi.mocked(mockHttp.put).mockResolvedValueOnce(
        createMockResponse({
          workingHoursPerDay: 7.5,
          workingDaysPerWeek: 5,
          timeFormat: 'days',
          defaultUnit: 'hour',
        })
      );

      const config = await service.updateConfiguration({
        workingHoursPerDay: 7.5,
        timeFormat: 'days',
      });

      expect(mockHttp.put).toHaveBeenCalledWith(
        '/rest/api/3/configuration/timetracking/options',
        { workingHoursPerDay: 7.5, timeFormat: 'days' },
        undefined
      );
      expect(config.workingHoursPerDay).toBe(7.5);
    });
  });

  describe('getIssueWorklogs', () => {
    it('should get worklogs for an issue', async () => {
      vi.mocked(mockHttp.get).mockResolvedValueOnce(
        createMockResponse({
          startAt: 0,
          maxResults: 50,
          total: 1,
          worklogs: [createMockWorklog()],
        })
      );

      const worklogs = await service.getIssueWorklogs('PROJ-123');

      expect(mockHttp.get).toHaveBeenCalledWith(
        '/rest/api/3/issue/PROJ-123/worklog',
        {},
        undefined
      );
      expect(worklogs).toHaveLength(1);
      expect(worklogs[0]?.timeSpentSeconds).toBe(12600);
    });

    it('should pass list options as query params', async () => {
      vi.mocked(mockHttp.get).mockResolvedValueOnce(
        createMockResponse({ startAt: 0, maxResults: 10, total: 0, worklogs: [] })
      );

      await service.getIssueWorklogs('PROJ-123', {
        startAt: 5,
        maxResults: 10,
        startedAfter: 1700000000000,
        startedBefore: 1800000000000,
        expand: 'properties',
      });

      expect(mockHttp.get).toHaveBeenCalledWith(
        '/rest/api/3/issue/PROJ-123/worklog',
        {
          startAt: 5,
          maxResults: 10,
          startedAfter: 1700000000000,
          startedBefore: 1800000000000,
          expand: 'properties',
        },
        undefined
      );
    });
  });

  describe('getWorklog', () => {
    it('should get a single worklog', async () => {
      vi.mocked(mockHttp.get).mockResolvedValueOnce(createMockResponse(createMockWorklog()));

      const worklog = await service.getWorklog('PROJ-123', '10000');

      expect(mockHttp.get).toHaveBeenCalledWith(
        '/rest/api/3/issue/PROJ-123/worklog/10000',
        undefined,
        undefined
      );
      expect(worklog.id).toBe('10000');
    });

    it('should throw on an invalid response shape', async () => {
      vi.mocked(mockHttp.get).mockResolvedValueOnce(createMockResponse({ id: '10000' }));

      await expect(service.getWorklog('PROJ-123', '10000')).rejects.toThrow(
        ResponseValidationError
      );
    });
  });

  describe('createWorklog', () => {
    it('should create a worklog', async () => {
      vi.mocked(mockHttp.post).mockResolvedValueOnce(createMockResponse(createMockWorklog()));

      const worklog = await service.createWorklog('PROJ-123', {
        comment: 'Worked on bug fix',
        timeSpent: '3h 30m',
        started: '2024-01-15T09:00:00.000+0000',
      });

      expect(mockHttp.post).toHaveBeenCalledWith(
        '/rest/api/3/issue/PROJ-123/worklog',
        {
          comment: 'Worked on bug fix',
          timeSpent: '3h 30m',
          started: '2024-01-15T09:00:00.000+0000',
        },
        undefined
      );
      expect(worklog.timeSpent).toBe('3h 30m');
    });
  });

  describe('updateWorklog', () => {
    it('should update a worklog', async () => {
      vi.mocked(mockHttp.put).mockResolvedValueOnce(
        createMockResponse({ ...createMockWorklog(), timeSpent: '4h', timeSpentSeconds: 14400 })
      );

      const worklog = await service.updateWorklog('PROJ-123', '10000', { timeSpent: '4h' });

      expect(mockHttp.put).toHaveBeenCalledWith(
        '/rest/api/3/issue/PROJ-123/worklog/10000',
        { timeSpent: '4h' },
        undefined
      );
      expect(worklog.timeSpent).toBe('4h');
    });
  });

  describe('deleteWorklog', () => {
    it('should delete a worklog', async () => {
      vi.mocked(mockHttp.delete).mockResolvedValueOnce(createMockResponse(null));

      await service.deleteWorklog('PROJ-123', '10000');

      expect(mockHttp.delete).toHaveBeenCalledWith(
        '/rest/api/3/issue/PROJ-123/worklog/10000',
        undefined
      );
    });
  });
});
