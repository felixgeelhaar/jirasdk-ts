import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { BulkService } from './bulk.service.js';
import { AbortError, TimeoutError, ResponseValidationError } from '../errors/index.js';
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

function createMockProgress(status: string) {
  return {
    taskId: 'task-1',
    status,
    progressPercent: status === 'COMPLETE' ? 100 : 40,
    result: { successCount: 2, errorCount: 0 },
  };
}

describe('BulkService', () => {
  let service: BulkService;
  let mockHttp: HttpClient;

  beforeEach(() => {
    mockHttp = createMockHttpClient();
    service = new BulkService(mockHttp, '/rest/api/3');
  });

  describe('createIssues', () => {
    it('should create issues in bulk', async () => {
      const mockResult = {
        issues: [
          { id: '10001', key: 'PROJ-1', self: 'https://example.atlassian.net/rest/api/3/issue/1' },
          { id: '10002', key: 'PROJ-2', self: 'https://example.atlassian.net/rest/api/3/issue/2' },
        ],
        errors: [],
      };

      vi.mocked(mockHttp.post).mockResolvedValueOnce(createMockResponse(mockResult));

      const result = await service.createIssues({
        issueUpdates: [
          { fields: { project: { key: 'PROJ' }, summary: 'One' } },
          { fields: { project: { key: 'PROJ' }, summary: 'Two' } },
        ],
      });

      expect(mockHttp.post).toHaveBeenCalledWith(
        '/rest/api/3/issue/bulk',
        expect.objectContaining({
          issueUpdates: expect.any(Array) as unknown,
        }),
        undefined
      );
      expect(result.issues).toHaveLength(2);
    });

    it('should reject an empty issueUpdates list', async () => {
      await expect(service.createIssues({ issueUpdates: [] })).rejects.toThrow();
      expect(mockHttp.post).not.toHaveBeenCalled();
    });

    it('should reject more than 1000 issues', async () => {
      const issueUpdates = Array.from({ length: 1001 }, (_, i) => ({
        fields: { summary: `Issue ${String(i)}` },
      }));

      await expect(service.createIssues({ issueUpdates })).rejects.toThrow();
      expect(mockHttp.post).not.toHaveBeenCalled();
    });

    it('should throw on an invalid response shape', async () => {
      vi.mocked(mockHttp.post).mockResolvedValueOnce(
        createMockResponse({ issues: [{ id: 10001 }] })
      );

      await expect(
        service.createIssues({ issueUpdates: [{ fields: { summary: 'One' } }] })
      ).rejects.toThrow(ResponseValidationError);
    });
  });

  describe('deleteIssues', () => {
    it('should delete issues in bulk with a request body', async () => {
      vi.mocked(mockHttp.request).mockResolvedValueOnce(createMockResponse(null));

      await service.deleteIssues({ issueIdsOrKeys: ['PROJ-1', 'PROJ-2'] });

      expect(mockHttp.request).toHaveBeenCalledWith({
        method: 'DELETE',
        url: '/rest/api/3/issue/bulk',
        body: { issueIdsOrKeys: ['PROJ-1', 'PROJ-2'] },
      });
    });

    it('should reject an empty issue list', async () => {
      await expect(service.deleteIssues({ issueIdsOrKeys: [] })).rejects.toThrow();
      expect(mockHttp.request).not.toHaveBeenCalled();
    });
  });

  describe('getProgress', () => {
    it('should fetch task progress', async () => {
      vi.mocked(mockHttp.get).mockResolvedValueOnce(
        createMockResponse(createMockProgress('RUNNING'))
      );

      const progress = await service.getProgress('task-1');

      expect(mockHttp.get).toHaveBeenCalledWith('/rest/api/3/task/task-1', undefined, undefined);
      expect(progress.status).toBe('RUNNING');
      expect(progress.progressPercent).toBe(40);
    });
  });

  describe('waitForCompletion', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should return immediately when already complete', async () => {
      vi.mocked(mockHttp.get).mockResolvedValueOnce(
        createMockResponse(createMockProgress('COMPLETE'))
      );

      const progress = await service.waitForCompletion('task-1');

      expect(progress.status).toBe('COMPLETE');
      expect(mockHttp.get).toHaveBeenCalledTimes(1);
    });

    it('should poll until the task reaches a terminal state', async () => {
      vi.mocked(mockHttp.get)
        .mockResolvedValueOnce(createMockResponse(createMockProgress('RUNNING')))
        .mockResolvedValueOnce(createMockResponse(createMockProgress('RUNNING')))
        .mockResolvedValueOnce(createMockResponse(createMockProgress('COMPLETE')));

      const promise = service.waitForCompletion('task-1', { pollIntervalMs: 1000 });

      await vi.advanceTimersByTimeAsync(2000);
      const progress = await promise;

      expect(progress.status).toBe('COMPLETE');
      expect(mockHttp.get).toHaveBeenCalledTimes(3);
    });

    it('should treat FAILED as terminal', async () => {
      vi.mocked(mockHttp.get).mockResolvedValueOnce(
        createMockResponse(createMockProgress('FAILED'))
      );

      const progress = await service.waitForCompletion('task-1');

      expect(progress.status).toBe('FAILED');
    });

    it('should treat CANCELLED as terminal', async () => {
      vi.mocked(mockHttp.get).mockResolvedValueOnce(
        createMockResponse(createMockProgress('CANCELLED'))
      );

      const progress = await service.waitForCompletion('task-1');

      expect(progress.status).toBe('CANCELLED');
    });

    it('should throw a TimeoutError when the deadline would be exceeded', async () => {
      vi.mocked(mockHttp.get).mockResolvedValue(createMockResponse(createMockProgress('RUNNING')));

      const promise = service.waitForCompletion('task-1', {
        pollIntervalMs: 1000,
        timeoutMs: 500,
      });

      await expect(promise).rejects.toThrow(TimeoutError);
    });

    it('should throw an AbortError when the signal is already aborted', async () => {
      const controller = new AbortController();
      controller.abort();

      await expect(
        service.waitForCompletion('task-1', { signal: controller.signal })
      ).rejects.toThrow(AbortError);
      expect(mockHttp.get).not.toHaveBeenCalled();
    });

    it('should throw an AbortError when aborted mid-poll', async () => {
      const controller = new AbortController();
      vi.mocked(mockHttp.get).mockResolvedValue(createMockResponse(createMockProgress('RUNNING')));

      const promise = service.waitForCompletion('task-1', {
        pollIntervalMs: 10_000,
        signal: controller.signal,
      });
      const assertion = expect(promise).rejects.toThrow(AbortError);

      await vi.advanceTimersByTimeAsync(0);
      controller.abort();
      await assertion;
    });
  });
});
